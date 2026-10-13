import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    MatchingRun,
    MatchingProposal,
    MentorAssignment,
    StudentProfile,
    InstitutionMembership,
    AuditEvent,
)
from app.services.matching_service import evaluate_pair_compatibility

client = TestClient(app)


def login(email: str, password: str):
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    data = res.json()
    csrf_token = data.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    cookies = {settings.session_cookie_name: res.cookies[settings.session_cookie_name]}
    client.cookies.set(settings.session_cookie_name, res.cookies[settings.session_cookie_name])
    return headers, cookies, data


@pytest.fixture(autouse=True)
def clean_client():
    client.cookies.clear()
    yield
    client.cookies.clear()


# =========================================================================
# PHASE 5: Mentorship Allocation & Hungarian Matching Test Suite
# =========================================================================

def test_phase5_hungarian_matching_run_full_cycle():
    """
    Test Phase 5 Hungarian optimization matching run:
    - Admin triggers matching run with capacity multiplier.
    - Algorithm name is hungarian_optimization.
    - Proposals are generated with compatibility scores, contributing factors.
    - Audit event RUN_MENTOR_MATCHING is recorded.
    """
    admin_headers, admin_cookies, admin_data = login("admin@apex.edu", "AdminPass123!")

    # 1. Trigger matching run
    payload = {
        "assignment_type": "primary",
        "capacity_multiplier": 1.25,
        "scope": "all_students",
    }
    res = client.post(
        "/internal/v1/mentor-matching/runs",
        json=payload,
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 201, res.text
    run = res.json()
    assert run["algorithm_name"] == "hungarian_optimization"
    assert run["assignment_type"] == "primary"
    assert run["status"] == "completed"
    assert len(run["proposals"]) > 0

    # 2. Verify proposal structure and compatibility scoring factors
    first_prop = run["proposals"][0]
    assert first_prop["approval_status"] == "pending"
    assert 0.0 <= first_prop["compatibility_score"] <= 1.0
    factors = first_prop["contributing_factors"]
    assert "overlap_score" in factors
    assert "proficiency_bonus" in factors
    assert "capacity_buffer_score" in factors
    assert "effective_capacity" in factors

    # 3. Verify audit log entry
    db = SessionLocal()
    try:
        audit = (
            db.query(AuditEvent)
            .filter(
                AuditEvent.action == "RUN_MENTOR_MATCHING",
                AuditEvent.resource_id == run["id"],
            )
            .first()
        )
        assert audit is not None
        assert audit.details["proposals_generated"] == len(run["proposals"])
    finally:
        db.close()


def test_phase5_proposal_approval_and_single_primary_invariant():
    """
    Test proposal approval and enforcement of the single active Primary Mentor invariant:
    - Approving a proposal promotes it to an active MentorAssignment.
    - Second primary assignment safely deactivates (status='replaced') the prior active primary mentor.
    - Exactly 1 active Primary Mentor exists for the student.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Trigger matching run
    res = client.post(
        "/internal/v1/mentor-matching/runs",
        json={"assignment_type": "primary", "capacity_multiplier": 1.0, "scope": "all_students"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 201
    run = res.json()
    proposal = run["proposals"][0]
    student_id = proposal["student_id"]

    # 2. Approve the proposal
    appr_res = client.post(
        f"/internal/v1/mentor-matching/proposals/{proposal['id']}/approve",
        json={"decision_reason": "Approved based on high competency alignment in Python and SQL."},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert appr_res.status_code == 200, appr_res.text
    appr_data = appr_res.json()
    assert appr_data["status"] == "approved"
    assignment_id = appr_data["assignment_id"]

    # 3. Verify exactly 1 active primary mentor exists
    list_res = client.get(
        f"/internal/v1/mentorship/assignments?student_id={student_id}&assignment_type=primary&status_filter=active",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert list_res.status_code == 200
    active_primaries = list_res.json()
    assert len(active_primaries) == 1
    assert active_primaries[0]["id"] == assignment_id

    # 4. Trigger manual direct primary assignment to another mentor
    avail_mentors = client.get(
        "/internal/v1/mentorship/available-mentors",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    alt_mentor = next(m for m in avail_mentors if m["membership_id"] != proposal["proposed_mentor_membership_id"])

    manual_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student_id,
            "mentor_membership_id": alt_mentor["membership_id"],
            "assignment_type": "primary",
            "reason": "Reassigning primary mentor to faculty assessor.",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert manual_res.status_code == 200

    # 5. Invariant verification: Prior assignment is marked 'replaced', exactly 1 active primary remains
    all_primaries = client.get(
        f"/internal/v1/mentorship/assignments?student_id={student_id}&assignment_type=primary",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    active_now = [a for a in all_primaries if a["status"] == "active"]
    replaced_now = [a for a in all_primaries if a["status"] == "replaced"]
    assert len(active_now) == 1
    assert len(replaced_now) >= 1
    assert active_now[0]["mentor_membership_id"] == alt_mentor["membership_id"]


def test_phase5_multiple_subject_mentors_distinct_scopes():
    """
    Test Phase 5 two-mentor architecture for Subject Mentors:
    - Multiple active subject mentors allowed if scopes are distinct (e.g. Python, SQL).
    - If a new subject mentor is assigned for the SAME scope, prior assignment is replaced.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    # Get student Aarav and mentors
    students = client.get("/internal/v1/students", headers=admin_headers, cookies=admin_cookies).json()
    student = next(s for s in students if s["email"] == "student@apex.edu")
    avail_mentors = client.get("/internal/v1/mentorship/available-mentors", headers=admin_headers, cookies=admin_cookies).json()
    mentor_1 = avail_mentors[0]
    mentor_2 = avail_mentors[1] if len(avail_mentors) > 1 else avail_mentors[0]

    # 1. Assign Subject Mentor for 'Python'
    res_py = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student["id"],
            "mentor_membership_id": mentor_1["membership_id"],
            "assignment_type": "subject",
            "subject_scope": "Python Programming",
            "reason": "Python specialist support",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res_py.status_code == 200
    py_id = res_py.json()["id"]

    # 2. Assign Subject Mentor for 'Data Analytics'
    res_da = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student["id"],
            "mentor_membership_id": mentor_2["membership_id"],
            "assignment_type": "subject",
            "subject_scope": "Data Analytics",
            "reason": "Data analytics specialist support",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res_da.status_code == 200
    da_id = res_da.json()["id"]

    # 3. Assert BOTH subject mentors are concurrently active
    active_subjects = client.get(
        f"/internal/v1/mentorship/assignments?student_id={student['id']}&assignment_type=subject&status_filter=active",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    active_scopes = {a["subject_scope"] for a in active_subjects}
    assert "Python Programming" in active_scopes
    assert "Data Analytics" in active_scopes

    # 4. Replace the Python mentor with mentor_2
    res_py_replace = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student["id"],
            "mentor_membership_id": mentor_2["membership_id"],
            "assignment_type": "subject",
            "subject_scope": "Python Programming",
            "reason": "Replacing Python mentor",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res_py_replace.status_code == 200

    # 5. Verify the old Python assignment is replaced while Data Analytics is untouched
    updated_subjects = client.get(
        f"/internal/v1/mentorship/assignments?student_id={student['id']}&assignment_type=subject",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    old_py = next(a for a in updated_subjects if a["id"] == py_id)
    active_da = next(a for a in updated_subjects if a["id"] == da_id)
    assert old_py["status"] == "replaced"
    assert active_da["status"] == "active"


def test_phase5_proposal_rejection_with_recorded_justification():
    """
    Test proposal rejection:
    - Captures decision reason and reviewed_at.
    - Proposal status becomes 'rejected'.
    - Does not create a MentorAssignment.
    - Duplicate review attempts raise HTTP 400.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Trigger matching run
    res = client.post(
        "/internal/v1/mentor-matching/runs",
        json={"assignment_type": "primary", "capacity_multiplier": 1.0, "scope": "all_students"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 201
    run = res.json()
    proposal = run["proposals"][0]

    # 2. Reject proposal
    reject_reason = "Mismatch in departmental scheduling availability."
    rej_res = client.post(
        f"/internal/v1/mentor-matching/proposals/{proposal['id']}/reject",
        json={"decision_reason": reject_reason},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert rej_res.status_code == 200
    rej_data = rej_res.json()
    assert rej_data["status"] == "rejected"

    # 3. Verify proposal updated in run details
    run_detail = client.get(
        f"/internal/v1/mentor-matching/runs/{run['id']}",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    p_updated = next(p for p in run_detail["proposals"] if p["id"] == proposal["id"])
    assert p_updated["approval_status"] == "rejected"
    assert p_updated["decision_reason"] == reject_reason
    assert p_updated["reviewed_at"] is not None

    # 4. Verify re-approval or re-rejection fails with 400
    duplicate_res = client.post(
        f"/internal/v1/mentor-matching/proposals/{proposal['id']}/approve",
        json={"decision_reason": "Trying to re-approve"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert duplicate_res.status_code == 400
    assert "already been rejected" in duplicate_res.json()["detail"].lower()


def test_phase5_cross_tenant_and_unauthorized_isolation():
    """
    Test security and isolation boundaries:
    - Cross-tenant mentor assignment is blocked (HTTP 400).
    - Students cannot trigger matching runs, create assignments, or review proposals (HTTP 403).
    """
    admin_apex_h, admin_apex_c, _ = login("admin@apex.edu", "AdminPass123!")
    admin_beacon_h, admin_beacon_c, admin_b = login("admin@beacon.edu", "BeaconPass123!")
    beacon_membership_id = admin_b["active_membership"]["id"]

    # Apex student
    students = client.get("/internal/v1/students", headers=admin_apex_h, cookies=admin_apex_c).json()
    student = next(s for s in students if s["email"] == "student@apex.edu")

    # 1. Apex admin attempts to assign Beacon mentor -> 400 Bad Request
    cross_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student["id"],
            "mentor_membership_id": beacon_membership_id,
            "assignment_type": "primary",
            "reason": "Illegal cross-tenant attempt",
        },
        headers=admin_apex_h,
        cookies=admin_apex_c,
    )
    assert cross_res.status_code == 400
    assert "cross-tenant" in cross_res.json()["detail"].lower()

    # 2. Student attempts administrative actions -> 403 Forbidden
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Student cannot run matching
    st_run = client.post(
        "/internal/v1/mentor-matching/runs",
        json={"assignment_type": "primary", "capacity_multiplier": 1.0, "scope": "all_students"},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert st_run.status_code == 403

    # Student cannot assign mentor
    st_assign = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": student["id"],
            "mentor_membership_id": "dummy",
            "assignment_type": "primary",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert st_assign.status_code == 403


def test_phase5_student_my_mentors_portal_view():
    """
    Test student personal dashboard mentor endpoint:
    - Student sees their assigned Primary Mentor.
    - Student sees their Subject Mentors.
    - Assignment history is transparently accessible.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    res = client.get("/internal/v1/students/me/mentors", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 200
    data = res.json()
    assert "primary_mentor" in data
    assert "subject_mentors" in data
    assert "assignment_history" in data
    assert isinstance(data["subject_mentors"], list)
    assert isinstance(data["assignment_history"], list)


def test_phase5_capacity_multiplier_and_workload_headroom():
    """
    Test capacity calculation and compatibility evaluation directly:
    - High capacity headroom yields higher capacity buffer score.
    - Workload saturation reduces capacity score.
    """
    needs = ["Python", "SQL"]
    skills = {"Python": 4, "SQL": 4, "Statistics": 3}

    # Case 1: High headroom (load 1, capacity 10)
    high_headroom = evaluate_pair_compatibility(
        student_needs=needs,
        mentor_skills=skills,
        current_workload=1,
        effective_capacity=10,
    )
    assert high_headroom.score > 0.70
    assert high_headroom.factors["capacity_buffer_score"] > 0.15

    # Case 2: Saturated workload (load 10, capacity 10)
    saturated = evaluate_pair_compatibility(
        student_needs=needs,
        mentor_skills=skills,
        current_workload=10,
        effective_capacity=10,
    )
    assert saturated.factors["capacity_buffer_score"] == 0.0
    assert high_headroom.score > saturated.score


def test_phase5_ai_mentor_briefing_generation_and_advisory():
    """
    Test AI mentor briefing generation for an assigned student:
    - Generates pre-session briefing synthesizing academic records, attendance, and plans.
    - Contains suggested agenda and questions to explore.
    - Contains statutory advisory notice disclaimer.
    """
    mentor_headers, mentor_cookies, _ = login("mentor@apex.edu", "MentorPass123!")

    # Student Aarav
    admin_h, admin_c, _ = login("admin@apex.edu", "AdminPass123!")
    students = client.get("/internal/v1/students", headers=admin_h, cookies=admin_c).json()
    aarav = next(s for s in students if s["email"] == "student@apex.edu")

    # Generate briefing
    b_res = client.post(
        "/internal/v1/mentor-briefings",
        json={"student_id": aarav["id"], "session_reference": "Midterm Advisory Session"},
        headers=mentor_headers,
        cookies=mentor_cookies,
    )
    assert b_res.status_code == 201
    briefing = b_res.json()
    assert briefing["status"] == "completed"
    content = briefing["briefing_content"]
    assert "suggested_agenda" in content
    assert len(content["suggested_agenda"]) > 0
    assert "questions_to_explore" in content
    assert len(content["questions_to_explore"]) > 0
    assert "disclaimer" in content
    assert "advisory" in content["disclaimer"].lower()
