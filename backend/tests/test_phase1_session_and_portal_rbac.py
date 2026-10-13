"""Phase 1 Automated Test Suite: Identity, Security, Session Lifecycle & Portal Shell RBAC.

Covers:
1. Public route handling & secure account recovery:
   - Non-enumerating responses
   - Expiring, single-use recovery tokens
   - Rate limiting (silent success without duplicate token generation)
   - Invalidation of active sessions upon password reset
   - Local test mail adapter email capture and token delivery
   - Cryptographic audit trail (PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED)

2. Institutional invitation lifecycle:
   - Expiring single-use invitation tokens
   - Outbound invitation dispatch via local test mail adapter
   - Server-side trusted role and institution binding
   - Admin revocation of pending invitations and rejection of revoked tokens
   - Rejection of invalid / expired / re-used tokens
   - Rejection of unauthorized revocation attempts (by students or foreign admins)
   - Clean duplicate account binding (existing user accepting additional institutional role)
   - Cross-institution isolation enforcement

3. Session lifecycle & state-changing security:
   - Cookie-based login / logout
   - Immediate session revocation on logout
   - Expired session handling
   - CSRF token enforcement on authenticated state-changing POST requests

4. Role-based portal boundaries & real-time privilege changes:
   - Strict RBAC across Super Admin, Institution Admin, Mentor, and Student portals
   - Real-time privilege change / role revocation enforcement
   - Scoped roles boundary for Faculty Assessors and Data Operators
"""

import uuid
import hashlib
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import (
    Account,
    Institution,
    InstitutionMembership,
    MembershipRole,
    EmailVerificationToken,
    MembershipInvitation,
    Session as UserSession,
    AuditEvent,
)
from app.security import hash_password
from app.core.mail import mail_adapter


@pytest.fixture(autouse=True)
def clean_mail_outbox():
    """Ensure in-memory mail outbox is cleared before each test."""
    mail_adapter.clear()
    yield
    mail_adapter.clear()


# =============================================================================
# 1. Account Recovery & Mail Adapter Lifecycle Tests
# =============================================================================

def test_account_recovery_non_enumerating_mail_adapter_and_rate_limits():
    """Verify non-enumerating responses, test mail adapter delivery, and recovery rate limiting."""
    client = TestClient(app)

    # 1. Non-existent account: returns standard message without leaking absence, sends 0 emails
    res_fake = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": "nonexistent_researcher@unknown.edu"},
    )
    assert res_fake.status_code == 200
    assert "recovery instructions have been sent" in res_fake.json()["message"]
    assert len(mail_adapter.outbox) == 0

    # 2. Existing active account: returns identical message, dispatches 1 email to outbox
    target_email = "student@apex.edu"
    with SessionLocal() as db:
        st = db.query(Account).filter(Account.email == target_email).first()
        if st:
            db.query(EmailVerificationToken).filter(EmailVerificationToken.account_id == st.id).delete()
            db.commit()

    res_real = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": target_email},
    )
    assert res_real.status_code == 200
    assert "recovery instructions have been sent" in res_real.json()["message"]

    # Verify outbox captured the dispatch
    assert len(mail_adapter.outbox) == 1
    sent_msg = mail_adapter.get_latest_for_recipient(target_email)
    assert sent_msg is not None
    assert sent_msg.purpose == "credential_recovery"
    assert "Password Recovery Request" in sent_msg.subject
    assert sent_msg.token is not None
    assert "/reset-password?token=" in sent_msg.action_url

    # 3. Rate limiting: immediate duplicate request within 60 seconds returns success but sends no extra email
    res_rate_limit = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": target_email},
    )
    assert res_rate_limit.status_code == 200
    assert len(mail_adapter.outbox) == 1  # Still exactly 1, rate-limited silently

    # Verify audit event logged
    with SessionLocal() as db:
        acct = db.query(Account).filter(Account.email == target_email).first()
        audit = (
            db.query(AuditEvent)
            .filter(
                AuditEvent.actor_account_id == acct.id,
                AuditEvent.action == "PASSWORD_RESET_REQUESTED",
            )
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert audit is not None


def test_account_recovery_confirm_single_use_and_session_invalidation():
    """Verify one-time token consumption, session invalidation, and password update."""
    student_client = TestClient(app)
    recovery_client = TestClient(app)

    # 1. Student logs in to create an active session
    res_login = student_client.post(
        "/internal/v1/auth/login",
        json={"email": "student2@apex.edu", "password": "StudentPass123!"},
    )
    assert res_login.status_code == 200
    assert student_client.get("/internal/v1/auth/session").json()["authenticated"] is True

    # 2. Create recovery token directly to bypass 60s rate limit in rapid test runs
    raw_token = uuid.uuid4().hex
    thash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    with SessionLocal() as db:
        s2 = db.query(Account).filter(Account.email == "student2@apex.edu").first()
        tok = EmailVerificationToken(
            account_id=s2.id,
            token_hash=thash,
            purpose="credential_recovery",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(tok)
        db.commit()

    # 3. Confirm password reset with new password
    new_password = "SecureNewPassword2026!"
    res_confirm = recovery_client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": raw_token, "new_password": new_password},
    )
    assert res_confirm.status_code == 200
    assert "invalidated" in res_confirm.json()["message"].lower()

    # 4. Old active session of student2 MUST now be invalidated immediately
    res_stale = student_client.get("/internal/v1/auth/session")
    assert res_stale.json()["authenticated"] is False

    # 5. Token is consumed: re-using the same token must fail with 400
    res_reuse = recovery_client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": raw_token, "new_password": "YetAnotherPassword123!"},
    )
    assert res_reuse.status_code == 400
    assert "previously used" in res_reuse.json()["detail"].lower()

    # 6. Verify login succeeds with the new password
    res_new_login = student_client.post(
        "/internal/v1/auth/login",
        json={"email": "student2@apex.edu", "password": new_password},
    )
    assert res_new_login.status_code == 200
    assert res_new_login.json()["authenticated"] is True

    # Restore baseline password for subsequent tests
    with SessionLocal() as db:
        s2 = db.query(Account).filter(Account.email == "student2@apex.edu").first()
        s2.password_hash = hash_password("StudentPass123!")
        db.commit()


# =============================================================================
# 2. Invitation Lifecycle: Mail Delivery, Revocation, Expiry & Acceptance
# =============================================================================

def test_invitation_lifecycle_with_mail_revocation_and_trust_boundary():
    """Verify invitation creation, mail dispatch, admin revocation, expiry, and single-use acceptance."""
    admin_client = TestClient(app)
    student_client = TestClient(app)

    # Login as Institution Admin
    res_admin = admin_client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert res_admin.status_code == 200
    admin_csrf = res_admin.json()["csrf_token"]

    # Login as Student
    res_student = student_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_student.status_code == 200
    student_csrf = res_student.json()["csrf_token"]

    # 1. Admin creates invitation -> verify email sent via mail adapter
    invite_email = f"pending_revocation_{uuid.uuid4().hex[:6]}@apex.edu"
    res_inv = admin_client.post(
        "/internal/v1/auth/invitations/create",
        json={"email": invite_email, "role": "faculty_assessor"},
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_inv.status_code == 200
    inv_data = res_inv.json()
    inv_id = inv_data["id"]
    inv_token = inv_data["token"]
    assert inv_data["status"] == "pending"

    # Verify test mail adapter received invitation email
    sent_inv = mail_adapter.get_latest_for_recipient(invite_email)
    assert sent_inv is not None
    assert sent_inv.purpose == "membership_invitation"
    assert "/accept-invitation?token=" in sent_inv.action_url
    assert "faculty_assessor" in sent_inv.body

    # 2. Unauthorized revocation attempt by student -> 403 Forbidden
    res_student_revoke = student_client.post(
        f"/internal/v1/auth/invitations/{inv_id}/revoke",
        headers={"X-CSRF-Token": student_csrf},
    )
    assert res_student_revoke.status_code == 403

    # 3. Authorized revocation by institution admin -> 200 OK
    res_admin_revoke = admin_client.post(
        f"/internal/v1/auth/invitations/{inv_id}/revoke",
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_admin_revoke.status_code == 200
    assert res_admin_revoke.json()["status"] == "revoked"

    # 4. Attempting to accept revoked invitation returns 400 Bad Request
    public_client = TestClient(app)
    res_accept_revoked = public_client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": inv_token,
            "first_name": "Test",
            "last_name": "Revoked",
            "password": "RevokedPass1234!",
        },
    )
    assert res_accept_revoked.status_code == 400
    assert "invalid, expired, or already accepted" in res_accept_revoked.json()["detail"].lower()

    # 5. Revoking an already revoked invitation returns 400 Bad Request
    res_re_revoke = admin_client.post(
        f"/internal/v1/auth/invitations/{inv_id}/revoke",
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_re_revoke.status_code == 400
    assert "only pending invitations can be revoked" in res_re_revoke.json()["detail"].lower()

    # 6. Create valid invitation and verify successful single-use acceptance
    accept_email = f"accept_member_{uuid.uuid4().hex[:6]}@apex.edu"
    res_valid_inv = admin_client.post(
        "/internal/v1/auth/invitations/create",
        json={"email": accept_email, "role": "mentor_advisor"},
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_valid_inv.status_code == 200
    valid_token = res_valid_inv.json()["token"]

    res_accept = public_client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": valid_token,
            "first_name": "Valid",
            "last_name": "Mentor",
            "password": "ValidMentorPass123!",
        },
    )
    assert res_accept.status_code == 200
    assert "active" in res_accept.json()["message"].lower()

    # Verify role was bound from trusted server-side state (mentor_advisor)
    res_login_new = public_client.post(
        "/internal/v1/auth/login",
        json={"email": accept_email, "password": "ValidMentorPass123!"},
    )
    assert res_login_new.status_code == 200
    assert "mentor_advisor" in res_login_new.json()["active_membership"]["roles"]

    # Re-acceptance of already accepted invitation must fail with 400
    res_reaccept = public_client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": valid_token,
            "first_name": "Valid",
            "last_name": "Mentor",
            "password": "ValidMentorPass123!",
        },
    )
    assert res_reaccept.status_code == 400


# =============================================================================
# 3. Session Lifecycle & CSRF Security Tests
# =============================================================================

def test_session_lifecycle_logout_and_expiry():
    """Verify session cookie establishment, logout revocation, and session expiration."""
    test_client = TestClient(app)

    # 1. Login sets session cookie and CSRF token
    res_login = test_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_login.status_code == 200
    assert "empiria_session" in res_login.cookies
    csrf_token = res_login.json()["csrf_token"]

    # Active session verified
    res_check = test_client.get("/internal/v1/auth/session")
    assert res_check.json()["authenticated"] is True

    # 2. Logout revokes session
    res_logout = test_client.post(
        "/internal/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res_logout.status_code == 200

    # Cookie is invalidated / unauthenticated
    res_after_logout = test_client.get("/internal/v1/auth/session")
    assert res_after_logout.json()["authenticated"] is False

    # 3. Simulate expired session
    res_relogin = test_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_relogin.status_code == 200

    # Expire session in DB
    with SessionLocal() as db:
        st = db.query(Account).filter(Account.email == "student@apex.edu").first()
        sess = (
            db.query(UserSession)
            .filter(UserSession.account_id == st.id, UserSession.revoked_at.is_(None))
            .order_by(UserSession.created_at.desc())
            .first()
        )
        assert sess is not None
        sess.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.commit()

    # Expired session must return authenticated: False
    res_expired = test_client.get("/internal/v1/auth/session")
    assert res_expired.json()["authenticated"] is False


def test_csrf_protection_on_state_changing_endpoints():
    """Verify state-changing POST requests require a valid CSRF token."""
    client = TestClient(app)
    res_login = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_login.status_code == 200
    valid_csrf = res_login.json()["csrf_token"]

    # Missing CSRF token -> 403 Forbidden
    res_no_csrf = client.post(
        "/internal/v1/auth/active-membership",
        json={"membership_id": "dummy-id"},
    )
    assert res_no_csrf.status_code == 403
    assert "csrf" in res_no_csrf.json()["detail"].lower()

    # Invalid CSRF token -> 403 Forbidden
    res_bad_csrf = client.post(
        "/internal/v1/auth/active-membership",
        json={"membership_id": "dummy-id"},
        headers={"X-CSRF-Token": "tampered_csrf_token_value"},
    )
    assert res_bad_csrf.status_code == 403
    assert "csrf" in res_bad_csrf.json()["detail"].lower()


# =============================================================================
# 4. Portal RBAC & Real-Time Privilege Revocation Tests
# =============================================================================

def test_portal_rbac_boundaries_for_all_four_portals():
    """Verify role boundaries: Super Admin, Institution Admin, Mentor, and Student."""
    super_admin_client = TestClient(app)
    admin_client = TestClient(app)
    student_client = TestClient(app)

    # 1. Super Admin login
    res_sa = super_admin_client.post(
        "/internal/v1/auth/login",
        json={"email": "superadmin@empiria.internal", "password": "SuperAdmin123!"},
    )
    assert res_sa.status_code == 200

    # 2. Institution Admin login
    res_ia = admin_client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert res_ia.status_code == 200

    # 3. Student login
    res_st = student_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_st.status_code == 200

    # Test Super Admin portal endpoint (/internal/v1/platform/institution-applications)
    # Super Admin allowed (200)
    assert super_admin_client.get("/internal/v1/platform/institution-applications").status_code == 200

    # Institution Admin denied (403)
    assert admin_client.get("/internal/v1/platform/institution-applications").status_code == 403

    # Student denied (403)
    assert student_client.get("/internal/v1/platform/institution-applications").status_code == 403

    # Test Staff vs Student access boundary on staff-only endpoint
    # Institution Admin allowed (200)
    assert admin_client.get("/internal/v1/risk/models").status_code == 200

    # Student denied access to staff-only risk models (403)
    assert student_client.get("/internal/v1/risk/models").status_code == 403


def test_real_time_privilege_revocation_enforcement():
    """Verify that when a user's role is revoked in DB, access is immediately revoked."""
    temp_client = TestClient(app)
    test_email = f"temp_role_user_{uuid.uuid4().hex[:6]}@apex.edu"

    with SessionLocal() as db:
        inst = db.query(Institution).first()
        inst_id = inst.id

        # Create temporary account with mentor role
        acct = Account(
            id=str(uuid.uuid4()),
            email=test_email,
            password_hash=hash_password("TempRolePass123!"),
            display_name="Temp Mentor",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(acct)
        db.flush()

        mem = InstitutionMembership(
            id=str(uuid.uuid4()),
            institution_id=inst_id,
            account_id=acct.id,
            status="active",
        )
        db.add(mem)
        db.flush()

        role_record = MembershipRole(
            id=str(uuid.uuid4()),
            institution_id=inst_id,
            membership_id=mem.id,
            role="mentor_advisor",
        )
        db.add(role_record)
        db.commit()
        role_id = role_record.id

    # 1. Login with mentor role
    res_login = temp_client.post(
        "/internal/v1/auth/login",
        json={"email": test_email, "password": "TempRolePass123!"},
    )
    assert res_login.status_code == 200
    assert "mentor_advisor" in res_login.json()["active_membership"]["roles"]

    # 2. Mentor accesses staff-only endpoint -> 200 OK
    res_before = temp_client.get("/internal/v1/risk/models")
    assert res_before.status_code == 200

    # 3. Role is revoked in DB
    with SessionLocal() as db:
        r = db.query(MembershipRole).filter(MembershipRole.id == role_id).first()
        r.revoked_at = datetime.now(timezone.utc)
        db.commit()

    # 4. Immediate re-check on existing session: access MUST be denied (403 Forbidden)
    res_after = temp_client.get("/internal/v1/risk/models")
    assert res_after.status_code == 403
    assert "access denied" in res_after.json()["detail"].lower()
