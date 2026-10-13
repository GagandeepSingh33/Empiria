from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import (
    InstitutionLicence,
    LicenceEvent,
    InstitutionMembership,
    MembershipRole,
    StudentProfile,
    MentorProfile,
    AuditEvent,
)


def get_active_licence(db: Session, institution_id: str) -> Optional[InstitutionLicence]:
    now = datetime.now(timezone.utc)
    # Check for active or expiring_soon licence that has not expired
    licence = (
        db.query(InstitutionLicence)
        .filter(
            InstitutionLicence.institution_id == institution_id,
            InstitutionLicence.status.in_(["active", "expiring_soon"]),
            InstitutionLicence.expires_at > now,
        )
        .order_by(InstitutionLicence.created_at.desc())
        .first()
    )
    return licence


def compute_licence_usage(db: Session, licence: InstitutionLicence) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    # Auto-adjust expiry status if needed
    if licence.expires_at <= now and licence.status in ("active", "expiring_soon"):
        licence.status = "expired"
        db.commit()
    elif licence.expires_at <= now + timedelta(days=30) and licence.status == "active":
        licence.status = "expiring_soon"
        db.commit()

    # Calculate actual enrolled students and mentors
    student_count = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == licence.institution_id,
            StudentProfile.status == "active",
        )
        .count()
    )

    mentor_count = (
        db.query(MentorProfile)
        .filter(
            MentorProfile.institution_id == licence.institution_id,
        )
        .count()
    )

    days_until_expiry = max(0, (licence.expires_at - now).days)
    student_pct = round((student_count / licence.max_students * 100), 1) if licence.max_students > 0 else 0.0
    mentor_pct = round((mentor_count / licence.max_mentors * 100), 1) if licence.max_mentors > 0 else 0.0

    return {
        "current_students": student_count,
        "current_mentors": mentor_count,
        "days_until_expiry": days_until_expiry,
        "student_usage_pct": student_pct,
        "mentor_usage_pct": mentor_pct,
    }


def check_seat_limit(db: Session, institution_id: str, role: str) -> None:
    """Verifies that an institution has remaining seat capacity for the specified role.
    Raises HTTPException 403 if licence is missing, inactive, expired, or limit exceeded.
    """
    licence = get_active_licence(db, institution_id)
    if not licence:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution does not have an active licence. Contact platform administrator.",
        )

    usage = compute_licence_usage(db, licence)

    if role == "student":
        if usage["current_students"] >= licence.max_students:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Student seat limit of {licence.max_students} exceeded under {licence.plan_tier} plan. Please upgrade licence.",
            )
    elif role in ("mentor_advisor", "faculty_assessor"):
        if usage["current_mentors"] >= licence.max_mentors:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Mentor seat limit of {licence.max_mentors} exceeded under {licence.plan_tier} plan. Please upgrade licence.",
            )


def check_feature_entitlement(db: Session, institution_id: str, feature_key: str) -> None:
    """Verifies that the institution's active licence permits the requested feature.
    Raises HTTPException 403 if feature is not entitled.
    """
    licence = get_active_licence(db, institution_id)
    if not licence:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active institutional licence found. Feature access restricted.",
        )

    permitted = licence.permitted_features or []
    if feature_key not in permitted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Feature '{feature_key}' is not permitted under the institution's {licence.plan_tier} licence tier.",
        )


def record_licence_event(
    db: Session,
    licence_id: str,
    institution_id: str,
    actor_account_id: Optional[str],
    event_type: str,
    before_state: Optional[dict[str, Any]] = None,
    after_state: Optional[dict[str, Any]] = None,
    reason: Optional[str] = None,
) -> LicenceEvent:
    event = LicenceEvent(
        licence_id=licence_id,
        institution_id=institution_id,
        actor_account_id=actor_account_id,
        event_type=event_type,
        before_state=before_state,
        after_state=after_state,
        reason=reason,
    )
    db.add(event)
    db.flush()

    # Also log to immutable audit events chain
    db.add(
        AuditEvent(
            institution_id=institution_id,
            actor_account_id=actor_account_id,
            action=f"LICENCE_{event_type.upper()}",
            resource_type="institution_licences",
            resource_id=licence_id,
            purpose=reason or f"Licence event: {event_type}",
            details={"event_type": event_type, "before": before_state, "after": after_state},
        )
    )
    return event
