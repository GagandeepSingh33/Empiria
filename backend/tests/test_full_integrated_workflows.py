import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_client_cookies():
    client.cookies.clear()
    yield
    client.cookies.clear()

def login(email: str, password: str):
    res = client.post("/internal/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    csrf = res.json()["csrf_token"]
    cookie_val = res.cookies[settings.session_cookie_name]
    headers = {"X-CSRF-Token": csrf}
    cookies = {settings.session_cookie_name: cookie_val}
    return headers, cookies, res.json()

def test_landing_page_institutional_application_and_superadmin_review():
    # 1. Public submits application without logging in (Public endpoint)
    submit_res = client.post(
        "/internal/v1/institution-applications",
        json={
            "institution_name": "Imperial Institute of Data Science",
            "representative_name": "Prof. Charles Xavier",
            "representative_email": "charles@imperialds.edu",
            "verification_summary": "Accredited data analytics program",
        },
    )
    assert submit_res.status_code == 200, submit_res.text
    app_data = submit_res.json()
    assert app_data["status"] == "submitted"
    app_id = app_data["id"]

    # 2. Regular student tries to list applications -> 403 Forbidden
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    forbidden_res = client.get(
        "/internal/v1/platform/institution-applications",
        headers=st_headers,
        cookies=st_cookies,
    )
    assert forbidden_res.status_code == 403

    # 3. Super Admin logs in and reviews application
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")
    list_res = client.get(
        "/internal/v1/platform/institution-applications",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert list_res.status_code == 200
    apps = list_res.json()
    assert any(a["id"] == app_id for a in apps)

    # 4. Super Admin approves application
    review_res = client.post(
        f"/internal/v1/platform/institution-applications/{app_id}/review",
        json={"decision": "approved", "reason": "Accredited syllabus verified"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"

def test_mentorship_reassignment_preserves_history():
    # Admin logs in
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    # Find student profile for student@apex.edu
    students_res = client.get("/internal/v1/students", headers=admin_headers, cookies=admin_cookies)
    assert students_res.status_code == 200
    aarav = next(s for s in students_res.json() if s["email"] == "student@apex.edu")

    # Get available mentors
    mentors_res = client.get("/internal/v1/mentorship/available-mentors", headers=admin_headers, cookies=admin_cookies)
    assert mentors_res.status_code == 200
    mentors = mentors_res.json()
    assert len(mentors) >= 2

    m1 = mentors[0]
    m2 = mentors[1]

    # Assign m1 as primary
    a1_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": m1["membership_id"],
            "assignment_type": "primary",
            "reason": "Initial primary lead",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert a1_res.status_code == 200
    a1_id = a1_res.json()["id"]

    # Now replace primary with m2
    a2_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": m2["membership_id"],
            "assignment_type": "primary",
            "reason": "Rotational transition to m2",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert a2_res.status_code == 200
    a2_id = a2_res.json()["id"]

    # Verify a1 was archived as replaced with ended_at
    history_res = client.get(
        f"/internal/v1/mentorship/assignments?student_id={aarav['id']}",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert history_res.status_code == 200
    history = history_res.json()
    a1_record = next(h for h in history if h["id"] == a1_id)
    a2_record = next(h for h in history if h["id"] == a2_id)

    assert a1_record["status"] in ("replaced", "ended")
    assert a1_record["ended_at"] is not None
    assert a2_record["status"] == "active"

def test_full_bidirectional_messaging_and_notifications_lifecycle():
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    m_headers, m_cookies, _ = login("mentor@apex.edu", "MentorPass123!")

    # Student checks my mentors
    my_mentors_res = client.get("/internal/v1/students/me/mentors", headers=st_headers, cookies=st_cookies)
    assert my_mentors_res.status_code == 200
    my_mentors = my_mentors_res.json()
    assert my_mentors["primary_mentor"] is not None
    pm_mem_id = my_mentors["primary_mentor"]["membership_id"]

    # Student creates conversation with primary mentor
    conv_res = client.post(
        "/internal/v1/conversations",
        json={
            "recipient_membership_id": pm_mem_id,
            "conversation_kind": "primary_mentoring",
            "subject": "Portfolio Career Direction Query",
            "message_body": "Hello Mentor, what project should I focus on next?",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert conv_res.status_code == 200
    conv = conv_res.json()
    conv_id = conv["id"]
    assert conv["subject"] == "Portfolio Career Direction Query"
    assert len(conv["messages"]) == 1

    # Mentor checks notifications
    m_notifs_res = client.get("/internal/v1/notifications", headers=m_headers, cookies=m_cookies)
    assert m_notifs_res.status_code == 200
    m_notifs = m_notifs_res.json()["notifications"]
    notif = next((n for n in m_notifs if n["conversation_id"] == conv_id), None)
    assert notif is not None
    assert notif["is_read"] is False

    # Mentor marks notification read
    mark_res = client.patch(
        f"/internal/v1/notifications/{notif['id']}/read",
        headers=m_headers,
        cookies=m_cookies,
    )
    assert mark_res.status_code == 200
    assert mark_res.json()["is_read"] is True

    # Mentor replies to conversation
    reply_res = client.post(
        f"/internal/v1/conversations/{conv_id}/messages",
        json={"body": "Focus on the end-to-end SQL customer segmentation task."},
        headers=m_headers,
        cookies=m_cookies,
    )
    assert reply_res.status_code == 200
    assert reply_res.json()["body"] == "Focus on the end-to-end SQL customer segmentation task."

    # Student reads conversation and sees reply
    student_conv_res = client.get(
        f"/internal/v1/conversations/{conv_id}",
        headers=st_headers,
        cookies=st_cookies,
    )
    assert student_conv_res.status_code == 200
    st_messages = student_conv_res.json()["messages"]
    assert len(st_messages) == 2
    assert st_messages[1]["body"] == "Focus on the end-to-end SQL customer segmentation task."

    # Student marks conversation resolved
    status_res = client.patch(
        f"/internal/v1/conversations/{conv_id}/status",
        json={"status": "resolved"},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "resolved"

    # Negative authorization test: Tenant B user attempts to access Tenant A conversation -> 404 or 403
    b_headers, b_cookies, _ = login("admin@beacon.edu", "BeaconPass123!")
    bad_access = client.get(
        f"/internal/v1/conversations/{conv_id}",
        headers=b_headers,
        cookies=b_cookies,
    )
    assert bad_access.status_code in (403, 404), f"Tenant isolation breach: {bad_access.status_code}"
