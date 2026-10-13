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


def test_health_endpoints():
    r_live = client.get("/health/live")
    assert r_live.status_code == 200
    assert r_live.json()["status"] == "live"

    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"


def test_login_success_and_session():
    # Login as Institution Admin
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["authenticated"] is True
    assert data["account"]["email"] == "admin@apex.edu"
    assert data["active_membership"]["institution_slug"] == "apex-tech"
    assert "institution_admin" in data["active_membership"]["roles"]
    assert data["csrf_token"] is not None
    assert settings.session_cookie_name in res.cookies


def test_login_invalid_password():
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "WrongPassword!"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_unauthenticated_access_denied():
    # Attempt to access protected endpoint without cookie/token
    res = client.get("/internal/v1/institution")
    assert res.status_code == 401


def test_csrf_protection_on_state_changing_requests():
    # 1. Login to get cookie & CSRF token
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200
    cookie_val = login_res.cookies[settings.session_cookie_name]
    csrf_token = login_res.json()["csrf_token"]

    # 2. Attempt state-changing request WITHOUT X-CSRF-Token header -> must be rejected 403
    patch_res = client.patch(
        "/internal/v1/institution",
        json={"name": "Hacked Name"},
        cookies={settings.session_cookie_name: cookie_val},
    )
    assert patch_res.status_code == 403
    assert "CSRF" in patch_res.json()["detail"]

    # 3. Attempt with valid X-CSRF-Token header -> must succeed
    patch_ok = client.patch(
        "/internal/v1/institution",
        json={"name": "Apex Institute of Technology"},
        headers={"X-CSRF-Token": csrf_token},
        cookies={settings.session_cookie_name: cookie_val},
    )
    assert patch_ok.status_code == 200


def test_role_enforcement():
    # Login as student
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert login_res.status_code == 200
    cookie_val = login_res.cookies[settings.session_cookie_name]
    csrf_token = login_res.json()["csrf_token"]

    # Student attempts to access admin-only endpoint: PATCH /institution
    patch_res = client.patch(
        "/internal/v1/institution",
        json={"name": "Student Hacked Name"},
        headers={"X-CSRF-Token": csrf_token},
        cookies={settings.session_cookie_name: cookie_val},
    )
    assert patch_res.status_code == 403
    assert "Access denied" in patch_res.json()["detail"]


def test_logout_revokes_session():
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    cookie_val = login_res.cookies[settings.session_cookie_name]
    csrf_token = login_res.json()["csrf_token"]

    # Call logout
    logout_res = client.post(
        "/internal/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
        cookies={settings.session_cookie_name: cookie_val},
    )
    assert logout_res.status_code == 200

    # Attempt to reuse revoked cookie -> must be 401
    check_res = client.get(
        "/internal/v1/institution",
        cookies={settings.session_cookie_name: cookie_val},
    )
    assert check_res.status_code == 401
