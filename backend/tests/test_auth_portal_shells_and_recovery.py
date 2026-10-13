import pytest
from datetime import datetime, timezone, timedelta
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
    AuditEvent,
)
from app.security import hash_password


client = TestClient(app)


def test_credential_recovery_non_enumerating_and_rate_limiting():
    # 0. Clean any recent tokens for student to prevent cross-suite rate limiting
    db = SessionLocal()
    st = db.query(Account).filter(Account.email == "student@apex.edu").first()
    if st:
        db.query(EmailVerificationToken).filter(EmailVerificationToken.account_id == st.id).delete()
        db.commit()
    db.close()

    # 1. Non-existent account returns identical success response
    res_fake = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": "nonexistent_evaluator@apex.edu"},
    )
    assert res_fake.status_code == 200
    assert "recovery instructions have been sent" in res_fake.json()["message"]
    assert "recovery_token" not in res_fake.json()

    # 2. Existing active account returns success response and generates token
    res_real = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": "student@apex.edu"},
    )
    assert res_real.status_code == 200
    assert "recovery instructions have been sent" in res_real.json()["message"]
    token = res_real.json().get("recovery_token")
    assert token is not None

    # 3. Rate limiting: immediate re-request within 60s does not generate duplicate token
    res_rate_limit = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": "student@apex.edu"},
    )
    assert res_rate_limit.status_code == 200
    # Should silently not issue a new token
    assert "recovery_token" not in res_rate_limit.json()


def test_credential_recovery_confirm_lifecycle():
    # Clean any recent tokens for student2
    db = SessionLocal()
    st2 = db.query(Account).filter(Account.email == "student2@apex.edu").first()
    if st2:
        db.query(EmailVerificationToken).filter(EmailVerificationToken.account_id == st2.id).delete()
        db.commit()
    db.close()

    # Request token for student2
    res_req = client.post(
        "/internal/v1/auth/credential-recovery",
        json={"email": "student2@apex.edu"},
    )
    assert res_req.status_code == 200
    token = res_req.json().get("recovery_token")
    assert token is not None

    # Password too short (<8 chars)
    res_short = client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": token, "new_password": "short"},
    )
    assert res_short.status_code == 400

    # Successful reset
    new_password = "BrandNewSecurePass123!"
    res_confirm = client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": token, "new_password": new_password},
    )
    assert res_confirm.status_code == 200
    assert "invalidated" in res_confirm.json()["message"]

    # Re-use of consumed token is rejected
    res_reuse = client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": token, "new_password": "AnotherPassword123!"},
    )
    assert res_reuse.status_code == 400
    assert "previously used" in res_reuse.json()["detail"].lower()

    # Verify student2 can log in with new password
    res_login = client.post(
        "/internal/v1/auth/login",
        json={"email": "student2@apex.edu", "password": new_password},
    )
    assert res_login.status_code == 200
    assert res_login.json()["authenticated"] is True

    # Restore original password for subsequent test suites
    client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": token, "new_password": "StudentPass123!"},
    )  # will fail because token is consumed, let's restore via DB directly or separate token
    with SessionLocal() as db:
        s2 = db.query(Account).filter(Account.email == "student2@apex.edu").first()
        if s2:
            s2.password_hash = hash_password("StudentPass123!")
            db.commit()


def test_invitation_lifecycle_create_and_accept():
    import uuid
    admin_client = TestClient(app)
    student_client = TestClient(app)

    # 1. Login as Institution Admin
    res_admin = admin_client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert res_admin.status_code == 200
    admin_csrf = res_admin.json()["csrf_token"]

    # 2. Student attempting to create invitation fails with 403
    res_student = student_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_student.status_code == 200
    student_csrf = res_student.json()["csrf_token"]

    res_forbidden = student_client.post(
        "/internal/v1/auth/invitations/create",
        json={"email": f"newuser_{uuid.uuid4().hex[:6]}@apex.edu", "role": "student"},
        headers={"X-CSRF-Token": student_csrf},
    )
    assert res_forbidden.status_code == 403

    # 3. Admin creates invitation for new mentor
    invite_email = f"new_mentor_{uuid.uuid4().hex[:6]}@apex.edu"
    res_invite = admin_client.post(
        "/internal/v1/auth/invitations/create",
        json={"email": invite_email, "role": "mentor_advisor"},
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_invite.status_code == 200
    invite_data = res_invite.json()
    assert invite_data["email"] == invite_email
    assert invite_data["role"] == "mentor_advisor"
    assert invite_data["status"] == "pending"
    invitation_token = invite_data["token"]
    assert invitation_token is not None

    # 4. Accept invitation (public endpoint)
    res_accept = client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": invitation_token,
            "first_name": "Devin",
            "last_name": "Mentor",
            "password": "MentorPassSecure123!",
        },
    )
    assert res_accept.status_code == 200
    assert "active" in res_accept.json()["message"].lower()

    # 5. Token cannot be accepted twice
    res_accept_twice = client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": invitation_token,
            "first_name": "Devin",
            "last_name": "Mentor",
            "password": "MentorPassSecure123!",
        },
    )
    assert res_accept_twice.status_code == 400

    # 6. Newly invited user can log in with their created credentials
    res_new_login = client.post(
        "/internal/v1/auth/login",
        json={"email": invite_email, "password": "MentorPassSecure123!"},
    )
    assert res_new_login.status_code == 200
    login_data = res_new_login.json()
    assert login_data["authenticated"] is True
    assert "mentor_advisor" in login_data["active_membership"]["roles"]


def test_csrf_enforcement_on_state_changing_requests():
    """Verify CSRF token is strictly enforced for cookie-authenticated state-changing POST requests."""
    test_client = TestClient(app)

    # 1. Login to establish cookie session
    res_login = test_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_login.status_code == 200
    valid_csrf = res_login.json()["csrf_token"]

    # 2. State-changing request WITHOUT X-CSRF-Token header -> 403 Forbidden
    res_missing_csrf = test_client.post(
        "/internal/v1/auth/active-membership",
        json={"membership_id": "nonexistent"},
    )
    assert res_missing_csrf.status_code == 403
    assert "csrf" in res_missing_csrf.json()["detail"].lower()

    # 3. State-changing request with INVALID X-CSRF-Token header -> 403 Forbidden
    res_invalid_csrf = test_client.post(
        "/internal/v1/auth/active-membership",
        json={"membership_id": "nonexistent"},
        headers={"X-CSRF-Token": "invalid_tampered_csrf_token_value_here"},
    )
    assert res_invalid_csrf.status_code == 403
    assert "csrf" in res_invalid_csrf.json()["detail"].lower()

    # 4. Safe GET request succeeds without CSRF header
    res_get = test_client.get("/internal/v1/auth/session")
    assert res_get.status_code == 200
    assert res_get.json()["authenticated"] is True


def test_session_revocation_on_password_reset():
    """Verify all active sessions are invalidated immediately when password is reset."""
    import uuid

    # 1. Login to obtain an active session
    victim_client = TestClient(app)
    res_login = victim_client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert res_login.status_code == 200
    assert victim_client.get("/internal/v1/auth/session").json()["authenticated"] is True

    # 2. Request credential recovery
    recovery_client = TestClient(app)
    # Wait or simulate token creation directly
    with SessionLocal() as db:
        st = db.query(Account).filter(Account.email == "student@apex.edu").first()
        raw_token = uuid.uuid4().hex
        import hashlib
        thash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        tok = EmailVerificationToken(
            account_id=st.id,
            token_hash=thash,
            purpose="credential_recovery",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(tok)
        db.commit()

    # 3. Confirm password reset
    res_confirm = recovery_client.post(
        "/internal/v1/auth/credential-recovery/confirm",
        json={"token": raw_token, "new_password": "NewStudentPass123!"},
    )
    assert res_confirm.status_code == 200

    # 4. The victim's previous session MUST now be rejected (401 / unauthenticated)
    res_victim_check = victim_client.get("/internal/v1/auth/session")
    assert res_victim_check.json()["authenticated"] is False

    # 5. Restore original password for test suite idempotency
    with SessionLocal() as db:
        st = db.query(Account).filter(Account.email == "student@apex.edu").first()
        if st:
            st.password_hash = hash_password("StudentPass123!")
            db.commit()


def test_invitation_token_expiration_and_duplicate_account_handling():
    """Verify expired invitation tokens are rejected, and existing accounts cleanly bind new memberships."""
    import uuid
    import hashlib

    # 1. Create expired invitation token directly in DB
    raw_expired_token = uuid.uuid4().hex
    thash = hashlib.sha256(raw_expired_token.encode("utf-8")).hexdigest()

    with SessionLocal() as db:
        inst = db.query(Institution).first()
        inst_id = inst.id
        inv_expired = MembershipInvitation(
            institution_id=inst_id,
            email=f"expired_invite_{uuid.uuid4().hex[:6]}@apex.edu",
            role="student",
            token_hash=thash,
            invited_by_membership_id="system",
            status="pending",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=2),  # expired
        )
        db.add(inv_expired)
        db.commit()

    # 2. Attempting to accept expired invitation returns 400
    res_expired = client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": raw_expired_token,
            "first_name": "Late",
            "last_name": "Student",
            "password": "Password12345!",
        },
    )
    assert res_expired.status_code == 400
    assert "expired" in res_expired.json()["detail"].lower()

    # 3. Duplicate Account handling: invite an existing user to another role/membership
    raw_dup_token = uuid.uuid4().hex
    thash_dup = hashlib.sha256(raw_dup_token.encode("utf-8")).hexdigest()
    dup_email = f"existing_member_{uuid.uuid4().hex[:6]}@apex.edu"
    with SessionLocal() as db:
        # Create an existing account with an initial membership
        acct_existing = Account(
            id=str(uuid.uuid4()),
            email=dup_email,
            password_hash=hash_password("ExistingPass123!"),
            display_name="Existing Member",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(acct_existing)
        db.flush()
        mem_existing = InstitutionMembership(
            id=str(uuid.uuid4()),
            institution_id=inst_id,
            account_id=acct_existing.id,
            status="active",
        )
        db.add(mem_existing)
        db.flush()
        db.add(MembershipRole(id=str(uuid.uuid4()), institution_id=inst_id, membership_id=mem_existing.id, role="student"))

        inv_dup = MembershipInvitation(
            institution_id=inst_id,
            email=dup_email,  # already exists in accounts table
            role="data_operator",
            token_hash=thash_dup,
            invited_by_membership_id="system",
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
        db.add(inv_dup)
        db.commit()

    # Accept invitation for existing account -> must succeed and bind role without duplicate key error
    res_dup_accept = client.post(
        "/internal/v1/auth/invitations/accept",
        json={
            "token": raw_dup_token,
            "first_name": "Existing",
            "last_name": "Member",
            "password": "ExistingPass123!",
        },
    )
    assert res_dup_accept.status_code == 200
    assert "active" in res_dup_accept.json()["message"].lower()


def test_cross_institution_invitation_isolation():
    """Verify institution admin cannot invite members into a foreign institution."""
    import uuid
    admin_client = TestClient(app)

    res_admin = admin_client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert res_admin.status_code == 200
    admin_csrf = res_admin.json()["csrf_token"]

    # Attempt to create invitation for foreign institution
    res_foreign = admin_client.post(
        "/internal/v1/auth/invitations/create",
        json={
            "email": f"cross_inst_{uuid.uuid4().hex[:6]}@other.edu",
            "role": "mentor_advisor",
            "institution_id": "00000000-0000-0000-0000-000000000000",
        },
        headers={"X-CSRF-Token": admin_csrf},
    )
    assert res_foreign.status_code == 403
    assert "different institution" in res_foreign.json()["detail"].lower()

