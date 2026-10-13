import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_cross_tenant_isolation():
    # 1. Login as Institution B Admin (Beacon University)
    login_b = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@beacon.edu", "password": "BeaconPass123!"},
    )
    assert login_b.status_code == 200
    cookies_b = {settings.session_cookie_name: login_b.cookies[settings.session_cookie_name]}

    # 2. Beacon Admin queries students
    students_res = client.get("/internal/v1/students", cookies=cookies_b)
    assert students_res.status_code == 200
    students_b = students_res.json()

    # Must only contain Beacon students (BEACON-CS-101), NEVER Apex students (APEX-CSE-2026-*)
    for s in students_b:
        assert not s["student_identifier"].startswith("APEX-")
        assert s["student_identifier"].startswith("BEACON-")


def test_student_idor_protection():
    # 1. Login as Student 1 (Aarav Sharma)
    login_1 = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert login_1.status_code == 200
    cookies_1 = {settings.session_cookie_name: login_1.cookies[settings.session_cookie_name]}

    # 2. Login as Student 2 (Priya Patel) to get her ID
    login_2 = client.post(
        "/internal/v1/auth/login",
        json={"email": "student2@apex.edu", "password": "StudentPass123!"},
    )
    assert login_2.status_code == 200
    cookies_2 = {settings.session_cookie_name: login_2.cookies[settings.session_cookie_name]}
    priya_prof = client.get("/internal/v1/students", cookies=cookies_2).json()[0]
    priya_id = priya_prof["id"]

    # 3. Student 1 attempts to directly fetch Student 2's profile by ID in URL -> must be denied (404 non-disclosing)
    res_idor = client.get(f"/internal/v1/students/{priya_id}", cookies=cookies_1)
    assert res_idor.status_code == 404


def test_student_cannot_self_verify_evidence():
    # Student records evidence through the API
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    cookies = {settings.session_cookie_name: login_res.cookies[settings.session_cookie_name]}
    csrf_token = login_res.json()["csrf_token"]

    # Get framework competency
    fw_res = client.get("/internal/v1/competency-frameworks", cookies=cookies).json()
    comp_id = fw_res[0]["current_version"]["competencies"][0]["id"]

    create_res = client.post(
        "/internal/v1/evidence-items",
        json={
            "title": "Completed independent online project",
            "description": "Student claim of mastery",
            "competency_id": comp_id,
        },
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert create_res.status_code == 200

    # Verify that evidence status is strictly 'self_reported' and NOT 'assessment_verified'
    items = client.get("/internal/v1/evidence-items", cookies=cookies).json()
    created_item = next(i for i in items if i["title"] == "Completed independent online project")
    assert created_item["evidence_status"] == "self_reported"
