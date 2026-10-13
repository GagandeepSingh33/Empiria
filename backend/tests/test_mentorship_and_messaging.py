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


def login_user(email: str, password: str):
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    csrf = res.json()["csrf_token"]
    cookie_val = res.cookies[settings.session_cookie_name]
    headers = {"X-CSRF-Token": csrf}
    cookies = {settings.session_cookie_name: cookie_val}
    return res.json(), headers, cookies


def test_primary_and_subject_mentor_assignments():
    """M-001, M-002, M-003: Admin assigns Primary Mentor and Subject Mentors with replacement rules."""
    # 1. Login as Apex Admin
    admin_data, admin_headers, admin_cookies = login_user("admin@apex.edu", "AdminPass123!")

    # Get available mentors
    mentors_res = client.get(
        "/internal/v1/mentorship/available-mentors",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert mentors_res.status_code == 200
    avail = mentors_res.json()
    assert len(avail) >= 2

    # Get student Aarav
    students_res = client.get("/internal/v1/students", headers=admin_headers, cookies=admin_cookies)
    assert students_res.status_code == 200
    students = students_res.json()
    aarav = next(s for s in students if s["email"] == "student@apex.edu")

    # M-001: Assign Rajesh Verma as Primary Mentor
    mentor_rajesh = next(m for m in avail if m["email"] == "mentor@apex.edu")
    assign_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": mentor_rajesh["membership_id"],
            "assignment_type": "primary",
            "reason": "Test Primary Assignment",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    assert assign_data["assignment_type"] == "primary"
    assert assign_data["status"] == "active"
    assert assign_data["student_email"] == "student@apex.edu"

    # M-002: Assign a second primary mentor -> safely replaces prior active primary mentor
    mentor_faculty = next(m for m in avail if m["email"] == "faculty@apex.edu")
    assign_res2 = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": mentor_faculty["membership_id"],
            "assignment_type": "primary",
            "reason": "Replacing Primary Assignment",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert assign_res2.status_code == 200

    # Verify only ONE active primary mentor exists
    list_active = client.get(
        f"/internal/v1/mentorship/assignments?student_id={aarav['id']}&assignment_type=primary&status_filter=active",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    assert len(list_active) == 1
    assert list_active[0]["mentor_email"] == "faculty@apex.edu"

    # M-003: Assign Subject Mentor for SQL
    sql_assign = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": mentor_faculty["membership_id"],
            "assignment_type": "subject",
            "subject_scope": "SQL",
            "reason": "SQL Specialist",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert sql_assign.status_code == 200
    assert sql_assign.json()["assignment_type"] == "subject"
    assert sql_assign.json()["subject_scope"] == "SQL"


def test_cross_tenant_and_unauthorized_mentor_assignment_rejected():
    """M-004, M-005: Security checks on mentor assignment."""
    # M-005: Student cannot assign their own mentor
    student_data, st_headers, st_cookies = login_user("student@apex.edu", "StudentPass123!")
    st_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": "dummy-id",
            "mentor_membership_id": "dummy-mem",
            "assignment_type": "primary",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert st_res.status_code == 403

    # M-004: Tenant A admin cannot assign Tenant B mentor
    admin_b, b_headers, b_cookies = login_user("admin@beacon.edu", "BeaconPass123!")
    beacon_mem = admin_b["active_membership"]["id"]

    admin_a, a_headers, a_cookies = login_user("admin@apex.edu", "AdminPass123!")
    students = client.get("/internal/v1/students", headers=a_headers, cookies=a_cookies).json()
    aarav = next(s for s in students if s["email"] == "student@apex.edu")

    cross_res = client.post(
        "/internal/v1/mentorship/assignments",
        json={
            "student_id": aarav["id"],
            "mentor_membership_id": beacon_mem,
            "assignment_type": "primary",
        },
        headers=a_headers,
        cookies=a_cookies,
    )
    assert cross_res.status_code == 400
    assert "cross-tenant" in cross_res.json()["detail"].lower()


def test_student_my_mentors_endpoint():
    """M-006, M-007: Student My Mentors endpoint returns distinct Primary and Subject mentors."""
    # Aarav Sharma has assignments seeded
    st_data, st_headers, st_cookies = login_user("student@apex.edu", "StudentPass123!")
    res = client.get("/internal/v1/students/me/mentors", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 200
    data = res.json()
    assert "primary_mentor" in data
    assert "subject_mentors" in data
    assert "assignment_history" in data

    # Priya Patel has NO mentor assigned -> honest empty state (M-007)
    p_data, p_headers, p_cookies = login_user("student2@apex.edu", "StudentPass123!")
    res_p = client.get("/internal/v1/students/me/mentors", headers=p_headers, cookies=p_cookies)
    assert res_p.status_code == 200
    data_p = res_p.json()
    assert data_p["primary_mentor"] is None
    assert len(data_p["subject_mentors"]) == 0


def test_bidirectional_messaging_and_notifications():
    """C-001 to C-005, N-001 to N-005: Student-Mentor query and reply lifecycle with notifications."""
    # 1. Aarav Sharma logs in and views seeded conversation
    st_data, st_headers, st_cookies = login_user("student@apex.edu", "StudentPass123!")
    convs = client.get("/internal/v1/conversations", headers=st_headers, cookies=st_cookies).json()
    assert len(convs) >= 1
    target_conv = next((c for c in convs if "Window Functions" in c["subject"]), convs[0])

    # Check unread notifications for Aarav
    notifs_res = client.get("/internal/v1/notifications", headers=st_headers, cookies=st_cookies).json()
    assert "unread_count" in notifs_res
    assert len(notifs_res["notifications"]) >= 1

    # 2. Open conversation detail -> marks notification as read (N-004, N-005)
    conv_detail = client.get(
        f"/internal/v1/conversations/{target_conv['id']}",
        headers=st_headers,
        cookies=st_cookies,
    ).json()
    assert conv_detail["id"] == target_conv["id"]
    assert len(conv_detail["messages"]) >= 2

    # Verify notification is now marked read
    notifs_res2 = client.get("/internal/v1/notifications", headers=st_headers, cookies=st_cookies).json()
    unread_ids = [n["id"] for n in notifs_res2["notifications"] if not n["is_read"]]
    # The read conversation's notification is marked as read
    target_notif = next((n for n in notifs_res2["notifications"] if n["conversation_id"] == target_conv["id"]), None)
    if target_notif:
        assert target_notif["is_read"] is True

    # 3. Student replies to the mentor in the conversation
    import uuid
    st_req_key = f"st-req-{uuid.uuid4().hex}"
    reply_res = client.post(
        f"/internal/v1/conversations/{target_conv['id']}/messages",
        json={"body": "Thank you Prof. Rao! That makes complete sense. I will practise on the tasks.", "client_request_key": st_req_key},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert reply_res.status_code == 200
    assert reply_res.json()["body"] == "Thank you Prof. Rao! That makes complete sense. I will practise on the tasks."

    # 4. Prof Sunita Rao (faculty@apex.edu) logs in and checks notifications (N-002)
    fac_data, fac_headers, fac_cookies = login_user("faculty@apex.edu", "FacultyPass123!")
    fac_notifs = client.get("/internal/v1/notifications", headers=fac_headers, cookies=fac_cookies).json()
    assert fac_notifs["unread_count"] >= 1
    assert any("Aarav" in n["title"] or "reply" in n["title"].lower() for n in fac_notifs["notifications"])

    # Mentor views conversation and replies
    fac_conv = client.get(
        f"/internal/v1/conversations/{target_conv['id']}",
        headers=fac_headers,
        cookies=fac_cookies,
    ).json()
    assert len(fac_conv["messages"]) >= 3

    fac_req_key = f"fac-req-{uuid.uuid4().hex}"
    fac_reply = client.post(
        f"/internal/v1/conversations/{target_conv['id']}/messages",
        json={"body": "Best of luck with your practice tasks, Aarav!", "client_request_key": fac_req_key},
        headers=fac_headers,
        cookies=fac_cookies,
    )
    assert fac_reply.status_code == 200

    # 5. Non-participant (Student 2 / Priya) attempts to access conversation -> must be denied (C-009)
    p_data, p_headers, p_cookies = login_user("student2@apex.edu", "StudentPass123!")
    unauth_res = client.get(
        f"/internal/v1/conversations/{target_conv['id']}",
        headers=p_headers,
        cookies=p_cookies,
    )
    assert unauth_res.status_code in (403, 404)

    # 6. Institution Admin attempts routine access to private conversation -> rejected 403 (C-011)
    admin_data, a_headers, a_cookies = login_user("admin@apex.edu", "AdminPass123!")
    admin_conv_res = client.get(
        f"/internal/v1/conversations/{target_conv['id']}",
        headers=a_headers,
        cookies=a_cookies,
    )
    assert admin_conv_res.status_code == 403
    assert "exceptional access" in admin_conv_res.json()["detail"].lower()
