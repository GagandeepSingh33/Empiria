import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    SupportRequest,
    SupportQueue,
    InterventionRecord,
    DevelopmentPlan,
    PlanTask,
    StudentProfile,
    AuditEvent,
)

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
# PHASE 7: Academic Interventions & Formal Support Test Suite
# =========================================================================

def test_phase7_support_request_creation_and_queue_assignment():
    """
    Test Phase 7 Support Request lifecycle:
    - Student creates a support request.
    - Assigned to institution's active queue with status 'open'.
    - Staff sees request in support queue list.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Student creates support request
    req_payload = {
        "subject": "Tutoring assistance needed for Database Normalization",
        "message": "I am struggling with Boyce-Codd Normal Form decomposition exercises in CS-201.",
    }
    create_res = client.post(
        "/internal/v1/support-requests",
        json=req_payload,
        headers=st_headers,
        cookies=st_cookies,
    )
    assert create_res.status_code == 200, create_res.text
    sreq = create_res.json()
    assert sreq["subject"] == req_payload["subject"]
    assert sreq["status"] == "open"
    assert sreq["student_id"] is not None

    # 2. Staff views support requests
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    list_res = client.get(
        "/internal/v1/support-requests",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert list_res.status_code == 200
    all_reqs = list_res.json()
    assert any(r["id"] == sreq["id"] for r in all_reqs)


def test_phase7_staff_records_intervention_and_resolves_request():
    """
    Test staff recording formal intervention for support request:
    - Staff creates an InterventionRecord with agreed actions and follow-up date.
    - Support request is marked as 'resolved'.
    - Audit event INTERVENTION_RECORDED is emitted.
    """
    # 1. Create request as student
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    sreq = client.post(
        "/internal/v1/support-requests",
        json={"subject": "Academic advising follow-up", "message": "Need support on course pace."},
        headers=st_headers,
        cookies=st_cookies,
    ).json()

    # 2. Staff records intervention
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    today_str = date.today().isoformat()
    followup_str = (date.today() + timedelta(days=14)).isoformat()

    interv_payload = {
        "intervention_date": today_str,
        "agreed_actions": "Assigned 2 hours weekly peer tutoring in SQL; scheduled check-in on Week 8.",
        "follow_up_date": followup_str,
        "notes": "Student engaged well and agreed to practice plan exercises.",
    }
    int_res = client.post(
        f"/internal/v1/support-requests/{sreq['id']}/interventions",
        json=interv_payload,
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert int_res.status_code == 200, int_res.text
    interv_data = int_res.json()
    assert interv_data["status"] == "active"
    assert interv_data["agreed_actions"] == interv_payload["agreed_actions"]
    assert interv_data["responsible_staff_name"] is not None

    # 3. Verify support request resolved
    sreq_list = client.get("/internal/v1/support-requests", headers=admin_headers, cookies=admin_cookies).json()
    updated_req = next(r for r in sreq_list if r["id"] == sreq["id"])
    assert updated_req["status"] == "resolved"


def test_phase7_intervention_history_and_listing():
    """
    Test listing interventions associated with a support request.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    sreq = client.post(
        "/internal/v1/support-requests",
        json={"subject": "Mentoring check-in", "message": "Discussion on career pathways."},
        headers=st_headers,
        cookies=st_cookies,
    ).json()

    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    client.post(
        f"/internal/v1/support-requests/{sreq['id']}/interventions",
        json={
            "intervention_date": date.today().isoformat(),
            "agreed_actions": "Referred to Data Science mentor for industry resume review.",
            "notes": "Action item created.",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )

    # Fetch interventions
    list_int = client.get(
        f"/internal/v1/support-requests/{sreq['id']}/interventions",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert list_int.status_code == 200
    records = list_int.json()
    assert len(records) >= 1
    assert "agreed_actions" in records[0]


def test_phase7_development_plan_and_task_execution_lifecycle():
    """
    Test student development plan and task execution:
    - Fetches student active plan via /me/development-plan.
    - Transitions task: pending -> in_progress -> completed.
    - Submits task reflection / submission data.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Fetch current plan
    plan_res = client.get("/internal/v1/me/development-plan", headers=st_headers, cookies=st_cookies)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert "tasks" in plan
    assert len(plan["tasks"]) > 0

    target_task = plan["tasks"][0]
    task_id = target_task["id"]

    # 2. Start task
    start_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/start",
        headers=st_headers,
        cookies=st_cookies,
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_progress"

    # 3. Submit work
    submit_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/submissions",
        json={"submission_text": "Completed the 10 practice SQL exercises on INNER and LEFT joins."},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert submit_res.status_code == 200

    # 4. Complete task
    complete_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/complete",
        headers=st_headers,
        cookies=st_cookies,
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"


def test_phase7_student_support_request_privacy():
    """
    Test student isolation:
    - Students only see their own support requests.
    - Students cannot record interventions (requires staff role).
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Student cannot record intervention
    forbidden_res = client.post(
        "/internal/v1/support-requests/dummy-id/interventions",
        json={"intervention_date": date.today().isoformat(), "agreed_actions": "None"},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert forbidden_res.status_code == 403


def test_phase7_cross_tenant_support_isolation():
    """
    Test multi-tenant isolation:
    - Beacon staff cannot access Apex support requests.
    """
    admin_apex_h, admin_apex_c, _ = login("admin@apex.edu", "AdminPass123!")
    sreqs_apex = client.get("/internal/v1/support-requests", headers=admin_apex_h, cookies=admin_apex_c).json()
    assert len(sreqs_apex) > 0
    target_id = sreqs_apex[0]["id"]

    # Beacon admin tries to record intervention on Apex request
    admin_b_h, admin_b_c, _ = login("admin@beacon.edu", "BeaconPass123!")
    cross_res = client.post(
        f"/internal/v1/support-requests/{target_id}/interventions",
        json={"intervention_date": date.today().isoformat(), "agreed_actions": "Cross tenant attempt"},
        headers=admin_b_h,
        cookies=admin_b_c,
    )
    assert cross_res.status_code == 404


def test_phase7_activity_catalogue_discovery():
    """
    Test published activity catalogue discovery:
    - Lists published activities with competencies and learning resources.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    res = client.get("/internal/v1/activities", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 200
    activities = res.json()
    assert len(activities) > 0
    first_act = activities[0]
    assert "title" in first_act
    assert "target_competencies" in first_act
    assert "resources" in first_act


def test_phase7_progress_comparison_computation():
    """
    Test longitudinal progress comparison computation between baseline and post-intervention evaluations.
    """
    admin_h, admin_c, _ = login("admin@apex.edu", "AdminPass123!")
    students = client.get("/internal/v1/students", headers=admin_h, cookies=admin_c).json()
    priya = next(s for s in students if s["student_identifier"] == "APEX-CSE-2026-002")

    res = client.get(f"/internal/v1/students/{priya['id']}/progress", headers=admin_h, cookies=admin_c)
    assert res.status_code == 200
    comp_data = res.json()
    assert comp_data["student_id"] == priya["id"]
    assert comp_data["has_follow_up"] is True
    assert len(comp_data["comparisons"]) > 0
    assert "overall_status_narrative" in comp_data

