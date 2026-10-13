from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Institution,
    InstitutionLicence,
    LicenceEvent,
    AuditEvent,
)
from app.schemas import (
    LicenceCreateRequest,
    LicenceModifyRequest,
    LicenceRenewRequest,
    LicenceActionRequest,
    LicenceResponse,
    LicenceEventResponse,
)
from app.security import (
    require_super_admin,
    require_roles,
    CurrentUser,
)
from app.services.licence_service import (
    compute_licence_usage,
    record_licence_event,
    get_active_licence,
)

router = APIRouter(tags=["Licence & Subscription Management"])


def _to_licence_response(db: Session, lic: InstitutionLicence) -> LicenceResponse:
    inst = db.query(Institution).filter(Institution.id == lic.institution_id).first()
    usage = compute_licence_usage(db, lic)
    return LicenceResponse(
        id=lic.id,
        institution_id=lic.institution_id,
        institution_name=inst.name if inst else "Unknown",
        plan_tier=lic.plan_tier,
        status=lic.status,
        max_students=lic.max_students,
        max_mentors=lic.max_mentors,
        permitted_features=lic.permitted_features or [],
        starts_at=lic.starts_at,
        expires_at=lic.expires_at,
        created_at=lic.created_at,
        updated_at=lic.updated_at,
        current_students=usage["current_students"],
        current_mentors=usage["current_mentors"],
        days_until_expiry=usage["days_until_expiry"],
        student_usage_pct=usage["student_usage_pct"],
        mentor_usage_pct=usage["mentor_usage_pct"],
    )


# 1. Issue new licence (Super Admin)
@router.post("/platform/licences", response_model=LicenceResponse)
def issue_licence(
    req: LicenceCreateRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == req.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=req.duration_days)

    lic = InstitutionLicence(
        institution_id=req.institution_id,
        plan_tier=req.plan_tier,
        status="active",
        max_students=req.max_students,
        max_mentors=req.max_mentors,
        permitted_features=req.permitted_features,
        starts_at=now,
        expires_at=expires_at,
    )
    db.add(lic)
    db.flush()

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="issued",
        after_state={
            "plan_tier": lic.plan_tier,
            "max_students": lic.max_students,
            "max_mentors": lic.max_mentors,
            "permitted_features": lic.permitted_features,
            "expires_at": lic.expires_at.isoformat(),
        },
        reason="Initial licence issuance",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 2. List all licences with usage vs limits (Super Admin)
@router.get("/platform/licences", response_model=list[LicenceResponse])
def list_licences(
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    licences = db.query(InstitutionLicence).order_by(InstitutionLicence.created_at.desc()).all()
    return [_to_licence_response(db, lic) for lic in licences]


# 3. List expiring licences (Super Admin)
@router.get("/platform/licences/expiring", response_model=list[LicenceResponse])
def list_expiring_licences(
    days: int = 30,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    licences = (
        db.query(InstitutionLicence)
        .filter(
            InstitutionLicence.status.in_(["active", "expiring_soon"]),
            InstitutionLicence.expires_at <= cutoff,
        )
        .order_by(InstitutionLicence.expires_at.asc())
        .all()
    )
    return [_to_licence_response(db, lic) for lic in licences]


# 4. Get licence details (Super Admin)
@router.get("/platform/licences/{licence_id}", response_model=LicenceResponse)
def get_licence_detail(
    licence_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")
    return _to_licence_response(db, lic)


# 5. Get active licence for institution (Super Admin)
@router.get("/platform/licences/institution/{institution_id}", response_model=Optional[LicenceResponse])
def get_institution_licence(
    institution_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = get_active_licence(db, institution_id)
    if not lic:
        return None
    return _to_licence_response(db, lic)


# 6. Modify licence seats / plan / features (Super Admin)
@router.put("/platform/licences/{licence_id}", response_model=LicenceResponse)
def modify_licence(
    licence_id: str,
    req: LicenceModifyRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")

    before_state = {
        "plan_tier": lic.plan_tier,
        "max_students": lic.max_students,
        "max_mentors": lic.max_mentors,
        "permitted_features": lic.permitted_features,
    }

    if req.plan_tier:
        lic.plan_tier = req.plan_tier
    if req.max_students is not None:
        lic.max_students = req.max_students
    if req.max_mentors is not None:
        lic.max_mentors = req.max_mentors
    if req.permitted_features is not None:
        lic.permitted_features = req.permitted_features

    after_state = {
        "plan_tier": lic.plan_tier,
        "max_students": lic.max_students,
        "max_mentors": lic.max_mentors,
        "permitted_features": lic.permitted_features,
    }

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="modified",
        before_state=before_state,
        after_state=after_state,
        reason=req.reason or "Licence parameters updated by Super Admin",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 7. Renew licence (extend expiry) (Super Admin)
@router.post("/platform/licences/{licence_id}/renew", response_model=LicenceResponse)
def renew_licence(
    licence_id: str,
    req: LicenceRenewRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")

    before_state = {"status": lic.status, "expires_at": lic.expires_at.isoformat()}

    now = datetime.now(timezone.utc)
    base_time = lic.expires_at if lic.expires_at > now else now
    lic.expires_at = base_time + timedelta(days=req.extend_days)
    lic.status = "active"

    after_state = {"status": lic.status, "expires_at": lic.expires_at.isoformat()}

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="renewed",
        before_state=before_state,
        after_state=after_state,
        reason=req.reason or f"Extended by {req.extend_days} days",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 8. Suspend licence (Super Admin)
@router.post("/platform/licences/{licence_id}/suspend", response_model=LicenceResponse)
def suspend_licence(
    licence_id: str,
    req: LicenceActionRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")

    before_state = {"status": lic.status}
    lic.status = "suspended"
    after_state = {"status": lic.status}

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="suspended",
        before_state=before_state,
        after_state=after_state,
        reason=req.reason or "Licence suspended by Super Admin",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 9. Reactivate licence (Super Admin)
@router.post("/platform/licences/{licence_id}/reactivate", response_model=LicenceResponse)
def reactivate_licence(
    licence_id: str,
    req: LicenceActionRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")

    now = datetime.now(timezone.utc)
    if lic.expires_at <= now:
        raise HTTPException(status_code=400, detail="Cannot reactivate expired licence. Renew it first.")

    before_state = {"status": lic.status}
    lic.status = "active"
    after_state = {"status": lic.status}

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="reactivated",
        before_state=before_state,
        after_state=after_state,
        reason=req.reason or "Licence reactivated by Super Admin",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 10. Revoke licence (Super Admin)
@router.post("/platform/licences/{licence_id}/revoke", response_model=LicenceResponse)
def revoke_licence(
    licence_id: str,
    req: LicenceActionRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    lic = db.query(InstitutionLicence).filter(InstitutionLicence.id == licence_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="Licence not found")

    before_state = {"status": lic.status}
    lic.status = "revoked"
    after_state = {"status": lic.status}

    record_licence_event(
        db=db,
        licence_id=lic.id,
        institution_id=lic.institution_id,
        actor_account_id=current_user.account.id,
        event_type="revoked",
        before_state=before_state,
        after_state=after_state,
        reason=req.reason or "Licence revoked by Super Admin",
    )

    db.commit()
    db.refresh(lic)
    return _to_licence_response(db, lic)


# 11. Event History for licence (Super Admin)
@router.get("/platform/licences/{licence_id}/events", response_model=list[LicenceEventResponse])
def get_licence_events(
    licence_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    events = (
        db.query(LicenceEvent)
        .filter(LicenceEvent.licence_id == licence_id)
        .order_by(LicenceEvent.occurred_at.desc())
        .all()
    )
    return events


# 12. Institution Admin view of own licence
@router.get("/institutions/{inst_id}/licence", response_model=Optional[LicenceResponse])
def get_own_institution_licence(
    inst_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    if current_user.institution_id != inst_id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cross-tenant access forbidden")

    lic = get_active_licence(db, inst_id)
    if not lic:
        return None
    return _to_licence_response(db, lic)
