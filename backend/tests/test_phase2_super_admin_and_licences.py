import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.core.mail import mail_adapter
from app.models import (
    Institution,
    InstitutionApplication,
    InstitutionLicence,
    LicenceEvent,
    InstitutionStatusHistory,
    StudentProfile,
    MentorProfile,
    AuditEvent,
    Account,
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
    return headers, res.cookies, data


@pytest.fixture(autouse=True)
def clean_client():
    client.cookies.clear()
    yield
    client.cookies.clear()


# =========================================================================
# EXIT GATE: End-to-End Application -> Approval -> First Admin Onboarding
#            -> Licence Assignment -> Seat & Feature Limit Enforcement
# =========================================================================

def test_end_to_end_exit_gate_application_approval_admin_onboarding_and_licence_enforcement():
    mail_adapter.clear_outbox()
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    # 1. Institution application submission (Public)
    unique_suffix = str(uuid.uuid4())[:8]
    inst_name = f"Horizon Polytechnic {unique_suffix}"
    admin_email = f"lead.admin.{unique_suffix}@horizon.edu"

    app_res = client.post(
        "/internal/v1/institution-applications",
        json={
            "institution_name": inst_name,
            "representative_name": "Dr. Sarah Jenkins",
            "representative_email": admin_email,
            "verification_summary": "State university accreditation document verified by board.",
        },
    )
    assert app_res.status_code == 200
    app_data = app_res.json()
    app_id = app_data["id"]
    assert app_data["status"] == "submitted"

    # 2. Super Admin reviews & approves application
    review_res = client.post(
        f"/internal/v1/platform/institution-applications/{app_id}/review",
        json={"decision": "approved", "reason": "Accreditation approved for institutional launch."},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert review_res.status_code == 200
    reviewed_app = review_res.json()
    assert reviewed_app["status"] == "approved"
    new_inst_id = reviewed_app["created_institution_id"]
    assert new_inst_id is not None

    # Verify initial status history recorded
    with SessionLocal() as db:
        history = db.query(InstitutionStatusHistory).filter(InstitutionStatusHistory.institution_id == new_inst_id).all()
        assert len(history) == 1
        assert history[0].previous_status == "none"
        assert history[0].new_status == "active"

        # Verify default licence issued
        licence = db.query(InstitutionLicence).filter(InstitutionLicence.institution_id == new_inst_id).first()
        assert licence is not None
        assert licence.status == "active"
        assert licence.plan_tier == "standard"
        assert licence.max_students == 500
        assert licence.max_mentors == 50

    # 3. First administrator invitation dispatched via mail adapter
    outbox = mail_adapter.get_outbox()
    assert len(outbox) >= 1
    invite_email = next((e for e in outbox if e["recipient"] == admin_email), None)
    assert invite_email is not None
    assert invite_email["role"] == "institution_admin"
    raw_token = invite_email["token"]
    assert raw_token is not None

    # 4. First administrator accepts invitation
    accept_res = client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": raw_token,
            "first_name": "Sarah",
            "last_name": "Jenkins",
            "password": "SarahAdminPassword123!",
        },
    )
    assert accept_res.status_code == 200
    assert "accepted successfully" in accept_res.json()["message"]

    # 5. Admin logs in with newly established credentials
    client.cookies.clear()
    admin_headers, admin_cookies, admin_session = login(admin_email, "SarahAdminPassword123!")
    assert admin_session["authenticated"] is True
    assert admin_session["account"]["email"] == admin_email
    assert admin_session["active_membership"]["institution_id"] == new_inst_id
    assert "institution_admin" in admin_session["active_membership"]["roles"]

    # 6. SEAT LIMIT ENFORCEMENT: Super Admin constrains licence to 1 student seat
    with SessionLocal() as db:
        lic = db.query(InstitutionLicence).filter(InstitutionLicence.institution_id == new_inst_id).first()
        lic_id = lic.id

    mod_res = client.put(
        f"/internal/v1/platform/licences/{lic_id}",
        json={"max_students": 1, "reason": "Testing seat enforcement constraint"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["max_students"] == 1

    # Institution admin creates student 1 -> SUCCEEDS
    s1_res = client.post(
        "/internal/v1/students",
        json={
            "student_identifier": f"HORIZON-{unique_suffix}-001",
            "first_name": "Alex",
            "last_name": "Carter",
            "email": f"alex.{unique_suffix}@horizon.edu",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert s1_res.status_code == 200
    assert s1_res.json()["student_identifier"] == f"HORIZON-{unique_suffix}-001"

    # Institution admin attempts to create student 2 -> BLOCKED with 403 Forbidden
    s2_res = client.post(
        "/internal/v1/students",
        json={
            "student_identifier": f"HORIZON-{unique_suffix}-002",
            "first_name": "Jordan",
            "last_name": "Lee",
            "email": f"jordan.{unique_suffix}@horizon.edu",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert s2_res.status_code == 403
    assert "seat limit" in s2_res.json()["detail"].lower()

    # Super Admin upgrades licence to 250 students -> student 2 SUCCEEDS
    upgrade_res = client.put(
        f"/internal/v1/platform/licences/{lic_id}",
        json={"max_students": 250, "reason": "Institutional capacity expansion"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert upgrade_res.status_code == 200
    assert upgrade_res.json()["max_students"] == 250

    s2_retry_res = client.post(
        "/internal/v1/students",
        json={
            "student_identifier": f"HORIZON-{unique_suffix}-002",
            "first_name": "Jordan",
            "last_name": "Lee",
            "email": f"jordan.{unique_suffix}@horizon.edu",
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert s2_retry_res.status_code == 200

    # 7. FEATURE ENTITLEMENT ENFORCEMENT:
    # Trigger risk scoring without ai_risk_scoring feature
    client.put(
        f"/internal/v1/platform/licences/{lic_id}",
        json={"permitted_features": ["basic_analytics"], "reason": "Downgrade features"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    risk_res = client.post(
        "/internal/v1/risk/scoring-runs",
        json={"cutoff_scope": "midterm"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert risk_res.status_code == 403
    assert "not permitted" in risk_res.json()["detail"].lower()


# =========================================================================
# LICENCE LIFECYCLE: Issue, Renew, Modify, Suspend, Reactivate, Revoke, History
# =========================================================================

def test_licence_full_lifecycle_and_event_auditing():
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    with SessionLocal() as db:
        inst = db.query(Institution).filter(Institution.slug == "apex-tech").first()
        inst_id = inst.id

    # 1. Issue custom licence
    issue_res = client.post(
        "/internal/v1/platform/licences",
        json={
            "institution_id": inst_id,
            "plan_tier": "professional",
            "max_students": 750,
            "max_mentors": 75,
            "duration_days": 180,
            "permitted_features": ["basic_analytics", "mentor_matching", "ai_risk_scoring"],
        },
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert issue_res.status_code == 200
    lic_data = issue_res.json()
    lic_id = lic_data["id"]
    assert lic_data["plan_tier"] == "professional"
    assert lic_data["max_students"] == 750
    assert lic_data["status"] == "active"

    # 2. Modify licence parameters
    mod_res = client.put(
        f"/internal/v1/platform/licences/{lic_id}",
        json={
            "plan_tier": "enterprise",
            "max_students": 1200,
            "max_mentors": 120,
            "reason": "Mid-year institutional expansion",
        },
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["plan_tier"] == "enterprise"
    assert mod_res.json()["max_students"] == 1200

    # 3. Renew licence
    renew_res = client.post(
        f"/internal/v1/platform/licences/{lic_id}/renew",
        json={"extend_days": 365, "reason": "Contract renewal for 2027"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert renew_res.status_code == 200
    assert renew_res.json()["days_until_expiry"] >= 365

    # 4. Suspend licence
    susp_res = client.post(
        f"/internal/v1/platform/licences/{lic_id}/suspend",
        json={"reason": "Audit review temporary hold"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert susp_res.status_code == 200
    assert susp_res.json()["status"] == "suspended"

    # 5. Reactivate licence
    react_res = client.post(
        f"/internal/v1/platform/licences/{lic_id}/reactivate",
        json={"reason": "Audit review cleared"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert react_res.status_code == 200
    assert react_res.json()["status"] == "active"

    # 6. Revoke licence
    rev_res = client.post(
        f"/internal/v1/platform/licences/{lic_id}/revoke",
        json={"reason": "Replaced by enterprise master contract"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"

    # 7. Verify event history
    events_res = client.get(
        f"/internal/v1/platform/licences/{lic_id}/events",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["event_type"] for e in events]
    assert "issued" in event_types
    assert "modified" in event_types
    assert "renewed" in event_types
    assert "suspended" in event_types
    assert "reactivated" in event_types
    assert "revoked" in event_types


# =========================================================================
# INSTITUTION STATUS MANAGEMENT & HISTORY
# =========================================================================

def test_institution_status_management_and_history():
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    with SessionLocal() as db:
        inst = db.query(Institution).filter(Institution.slug == "beacon-univ").first()
        inst_id = inst.id

    # 1. Suspend institution
    s_res = client.post(
        f"/internal/v1/platform/institutions/{inst_id}/status",
        json={"status": "suspended", "reason": "Non-payment grace period expired"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert s_res.status_code == 200
    assert s_res.json()["status"] == "suspended"

    # 2. Reactivate institution
    r_res = client.post(
        f"/internal/v1/platform/institutions/{inst_id}/status",
        json={"status": "reactivated", "reason": "Invoice settled in full"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "active"

    # 3. Query status history
    h_res = client.get(
        f"/internal/v1/platform/institutions/{inst_id}/status-history",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert h_res.status_code == 200
    history = h_res.json()
    assert len(history) >= 2
    transitions = [(h["previous_status"], h["new_status"]) for h in history]
    assert ("active", "suspended") in transitions
    assert ("suspended", "active") in transitions

    # 4. Detailed institution profile
    detail_res = client.get(
        f"/internal/v1/platform/institutions/{inst_id}",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["name"] == "Beacon University"
    assert detail["status"] == "active"
    assert "student_count" in detail
    assert "mentor_count" in detail
    assert "admin_accounts" in detail


# =========================================================================
# PLATFORM USERS & SUPER ADMIN GOVERNANCE
# =========================================================================

def test_platform_users_and_super_admin_governance():
    sa_headers, sa_cookies, sa_data = login("superadmin@empiria.internal", "SuperAdmin123!")
    sa_account_id = sa_data["account"]["id"]

    # 1. List users
    users_res = client.get(
        "/internal/v1/platform/users",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 2

    # Find a non-super-admin user (e.g. admin@apex.edu)
    target_user = next((u for u in users if u["email"] == "admin@apex.edu"), None)
    assert target_user is not None
    target_id = target_user["id"]

    # 2. Grant super admin role
    grant_res = client.post(
        f"/internal/v1/platform/users/{target_id}/super-admin",
        json={"is_super_admin": True, "reason": "Appointed interim platform administrator"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["is_super_admin"] is True

    # 3. Revoke super admin role
    revoke_res = client.post(
        f"/internal/v1/platform/users/{target_id}/super-admin",
        json={"is_super_admin": False, "reason": "Interim appointment concluded"},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["is_super_admin"] is False

    # 4. Attempt to revoke own super admin role -> Rejected
    self_rev_res = client.post(
        f"/internal/v1/platform/users/{sa_account_id}/super-admin",
        json={"is_super_admin": False},
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert self_rev_res.status_code == 400

    # 5. Query user access history
    hist_res = client.get(
        f"/internal/v1/platform/users/{target_id}/access-history",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert "sessions" in hist
    assert "audit_events" in hist


# =========================================================================
# OPERATIONS & OBSERVABILITY: Liveness, Readiness, Background Jobs, Alerts
# =========================================================================

def test_operations_observability_and_health():
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    # 1. Health & Operations Endpoints
    r_live = client.get("/health/live")
    assert r_live.status_code == 200
    assert r_live.json()["status"] == "live"

    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"

    r_ops = client.get(
        "/internal/v1/platform/operations/health",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert r_ops.status_code == 200
    ops_data = r_ops.json()
    assert ops_data["status"] == "healthy"
    assert ops_data["liveness"] is True
    assert ops_data["readiness"] is True
    assert ops_data["database_latency_ms"] >= 0

    # 2. Background jobs monitoring
    jobs_res = client.get(
        "/internal/v1/platform/operations/background-jobs",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert jobs_res.status_code == 200
    jobs_data = jobs_res.json()
    assert "total_jobs" in jobs_data
    assert "recent_jobs" in jobs_data

    # 3. System errors & active alerts
    err_res = client.get(
        "/internal/v1/platform/operations/system-errors",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert err_res.status_code == 200
    assert "active_alerts_count" in err_res.json()

    # 4. Integration health
    int_res = client.get(
        "/internal/v1/platform/operations/integration-health",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert int_res.status_code == 200
    int_data = int_res.json()
    assert int_data["database"]["status"] == "connected"
    assert int_data["email_service"]["status"] == "connected"
    assert int_data["ml_engine"]["status"] == "operational"

    # 5. Audit stream
    audit_res = client.get(
        "/internal/v1/platform/operations/audit-history?limit=10",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert audit_res.status_code == 200
    assert isinstance(audit_res.json(), list)


# =========================================================================
# REAL PERSISTED KPIS (NO HARD-CODED DEMO NUMBERS)
# =========================================================================

def test_real_persisted_kpis_derived_from_database():
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    kpi_res = client.get(
        "/internal/v1/platform/reports/summary",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()

    # Verify counts match live persisted DB rows exactly
    with SessionLocal() as db:
        expected_insts = db.query(Institution).count()
        expected_students = db.query(StudentProfile).filter(StudentProfile.status == "active").count()
        expected_mentors = db.query(MentorProfile).count()
        expected_apps = db.query(InstitutionApplication).count()

    assert kpis["total_institutions"] == expected_insts
    assert kpis["total_students"] == expected_students
    assert kpis["total_mentors"] == expected_mentors
    assert kpis["total_applications"] == expected_apps
    assert isinstance(kpis["active_licences"], int)
    assert isinstance(kpis["institutions_requiring_attention"], int)
    assert isinstance(kpis["total_audit_events_24h"], int)


# =========================================================================
# GLOBAL POLICIES & STANDARDS CONFIGURATION
# =========================================================================

def test_global_security_policies_and_standards():
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")

    # 1. Update & read security policies
    put_pol = client.put(
        "/internal/v1/platform/config/security-policies",
        json={
            "min_password_length": 12,
            "require_special_char": True,
            "session_timeout_minutes": 60,
            "mfa_enforced_for_admins": True,
            "max_failed_logins_before_lockout": 4,
        },
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert put_pol.status_code == 200
    assert put_pol.json()["min_password_length"] == 12

    get_pol = client.get(
        "/internal/v1/platform/config/security-policies",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert get_pol.status_code == 200
    assert get_pol.json()["min_password_length"] == 12

    # 2. Update & read notification settings
    put_notif = client.put(
        "/internal/v1/platform/config/notification-settings",
        json={
            "smtp_enabled": True,
            "smtp_host": "smtp.eu.empiria.internal",
            "smtp_port": 587,
            "sender_email": "alerts@empiria.internal",
            "alerts_email": "security-ops@empiria.internal",
            "notifications_enabled": True,
        },
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert put_notif.status_code == 200
    assert put_notif.json()["smtp_host"] == "smtp.eu.empiria.internal"

    # 3. Standards
    std_res = client.get(
        "/internal/v1/platform/config/standards",
        headers=sa_headers,
        cookies=sa_cookies,
    )
    assert std_res.status_code == 200
    assert "FERPA" in std_res.json()["compliance_frameworks"]


# =========================================================================
# PRIVILEGED AUTHORIZATION BOUNDARIES & AUDIT TRAIL
# =========================================================================

def test_privileged_authorization_and_audit_boundaries():
    # 1. Unauthenticated request to /platform/institutions -> 401 Unauthorized
    client.cookies.clear()
    unauth_res = client.get("/internal/v1/platform/institutions")
    assert unauth_res.status_code == 401

    # 2. Non-super admin request (e.g. Student) -> 403 Forbidden
    student_headers, student_cookies, _ = login("student@apex.edu", "StudentPass123!")
    forbidden_res = client.get(
        "/internal/v1/platform/institutions",
        headers=student_headers,
        cookies=student_cookies,
    )
    assert forbidden_res.status_code == 403

    # 3. CSRF enforcement on state-changing platform request
    sa_headers, sa_cookies, _ = login("superadmin@empiria.internal", "SuperAdmin123!")
    bad_csrf_headers = {"X-CSRF-Token": "invalid_csrf_token"}
    csrf_res = client.post(
        "/internal/v1/platform/licences",
        json={"institution_id": "none"},
        headers=bad_csrf_headers,
        cookies=sa_cookies,
    )
    assert csrf_res.status_code == 403
    assert "csrf" in csrf_res.json()["detail"].lower()
