import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session as DBSession
import bcrypt

from app.config import settings
from app.database import get_db, set_tenant_context
from app.models import Account, Session as UserSession, InstitutionMembership, MembershipRole, StudentProfile


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def generate_session_token() -> tuple[str, str]:
    """Returns (raw_token, token_hash)"""
    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def generate_csrf_token() -> str:
    return secrets.token_hex(32)


class CurrentUser:
    def __init__(
        self,
        account: Account,
        session: UserSession,
        membership: Optional[InstitutionMembership] = None,
        roles: list[str] = None,
    ):
        self.account = account
        self.session = session
        self.membership = membership
        self.roles = roles or []
        self.institution_id = membership.institution_id if membership else None
        self.is_super_admin = account.is_super_admin

    @property
    def active_membership(self):
        return self.membership

    @property
    def account_id(self) -> Optional[str]:
        return self.account.id if self.account else None

    @property
    def membership_id(self) -> Optional[str]:
        return self.membership.id if self.membership else None

    def has_role(self, *role_names: str) -> bool:
        if self.is_super_admin and "platform_super_admin" in role_names:
            return True
        return any(r in role_names for r in self.roles)


def get_current_user_optional(
    request: Request, db: DBSession = Depends(get_db)
) -> Optional[CurrentUser]:
    # Extract session token from cookie or Authorization header
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        set_tenant_context(db, None)
        return None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session_rec = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash == token_hash,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not session_rec:
        set_tenant_context(db, None)
        return None

    account = db.query(Account).filter(Account.id == session_rec.account_id).first()
    if not account or account.status != "active":
        set_tenant_context(db, None)
        return None

    membership = None
    roles = []
    if session_rec.active_membership_id:
        membership = (
            db.query(InstitutionMembership)
            .filter(
                InstitutionMembership.id == session_rec.active_membership_id,
                InstitutionMembership.status == "active",
            )
            .first()
        )
        if membership:
            role_recs = (
                db.query(MembershipRole)
                .filter(
                    MembershipRole.membership_id == membership.id,
                    MembershipRole.revoked_at.is_(None),
                )
                .all()
            )
            roles = [r.role for r in role_recs]
            set_tenant_context(db, membership.institution_id)
        else:
            set_tenant_context(db, None)
    else:
        set_tenant_context(db, None)

    # CSRF check for state-changing requests using cookie
    if request.cookies.get(settings.session_cookie_name) and request.method in (
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ):
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header or not secrets.compare_digest(csrf_header, session_rec.csrf_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing or invalid",
            )

    return CurrentUser(account=account, session=session_rec, membership=membership, roles=roles)


def require_authenticated(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
) -> CurrentUser:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return current_user


def require_super_admin(
    current_user: CurrentUser = Depends(require_authenticated),
) -> CurrentUser:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform Super Admin privileges required",
        )
    return current_user


def require_roles(*allowed_roles: str):
    def dependency(current_user: CurrentUser = Depends(require_authenticated)) -> CurrentUser:
        if current_user.is_super_admin:
            return current_user
        if not any(r in allowed_roles for r in current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return dependency


require_role = require_roles


def get_current_student_profile(
    current_user: CurrentUser = Depends(require_authenticated),
    db: DBSession = Depends(get_db),
) -> StudentProfile:
    """Retrieves the StudentProfile bound to current user's active membership or account."""
    if not current_user.membership:
        raise HTTPException(status_code=404, detail="Student profile not found")

    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            (
                (StudentProfile.membership_id == current_user.membership.id)
                | (StudentProfile.account_id == current_user.account.id)
                | (StudentProfile.email == current_user.account.email)
            ),
        )
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile
