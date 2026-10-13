import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_mentor_matching_proposals_and_approval():
    # 1. Staff Login
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. Trigger Hungarian Optimization Matching Run
    match_res = client.post(
        "/internal/v1/mentor-matching/runs",
        json={"assignment_type": "primary", "capacity_multiplier": 1.25, "scope": "all_students"},
        headers=headers,
    )
    assert match_res.status_code == 201
    run_data = match_res.json()
    assert run_data["algorithm_name"] == "hungarian_optimization"
    assert len(run_data["proposals"]) > 0

    proposal = run_data["proposals"][0]
    prop_id = proposal["id"]
    assert "compatibility_score" in proposal
    assert proposal["approval_status"] == "pending"

    # 3. Approve Proposal
    approve_res = client.post(
        f"/internal/v1/mentor-matching/proposals/{prop_id}/approve",
        json={"decision_reason": "High compatibility score in Python and SQL analytics."},
        headers=headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 4. Invariant: Student has exactly 1 active primary mentor
    student_id = proposal["student_id"]
    assignments = client.get(f"/internal/v1/mentorship/assignments?student_id={student_id}").json()
    active_primary = [
        a for a in assignments
        if a["assignment_type"] == "primary" and a["status"] == "active"
    ]
    assert len(active_primary) == 1


def test_ai_mentor_briefing_generation():
    # 1. Mentor Login
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "mentor@apex.edu", "password": "MentorPass123!"},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # Fetch assigned student
    my_students = client.get("/internal/v1/mentorship/assignments").json()
    assert len(my_students) > 0
    student_id = my_students[0]["student_id"]

    # 2. Generate Briefing
    briefing_res = client.post(
        "/internal/v1/mentor-briefings",
        json={"student_id": student_id, "session_reference": "Midterm Check-in"},
        headers=headers,
    )
    assert briefing_res.status_code == 201
    b_data = briefing_res.json()
    assert b_data["status"] == "completed"
    content = b_data["briefing_content"]
    assert len(content["suggested_agenda"]) > 0
    assert len(content["questions_to_explore"]) > 0
    assert "advisory" in content["disclaimer"].lower() or "notice" in content["disclaimer"].lower()

    # 3. List Briefings
    list_res = client.get("/internal/v1/mentor-briefings")
    assert list_res.status_code == 200
    assert len(list_res.json()) > 0
