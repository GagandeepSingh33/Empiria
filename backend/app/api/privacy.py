from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    ConsentRecord,
    PrivacyRequest,
    AuditEvent,
    StudentProfile,
    Enrollment,
    AttendanceRecord,
    DevelopmentPlan,
    StudentGoal,
    now_utc,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.audit_service import log_audit_event, verify_audit_chain

router = APIRouter(tags=["Consent, Privacy & Audit Governance"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class ConsentCreate(BaseModel):
    consent_purpose: str = Field(..., min_length=2)  # ai_analytics, academic_monitoring, mentoring_matching
    policy_version: str = "2026.1"

class ConsentResponse(BaseModel):
    id: str
    institution_id: str
    account_id: str
    consent_purpose: str
    policy_version: str
    status: str
    collected_at: datetime
    withdrawn_at: Optional[datetime]
    class Config:
        from_attributes = True


class PrivacyRequestCreate(BaseModel):
    request_type: str = "export"  # export, correction, deletion_inquiry
    details: Optional[Dict[str, Any]] = None

class PrivacyRequestResponse(BaseModel):
    id: str
    institution_id: str
    account_id: str
    request_type: str
    status: str
    details: Optional[Dict[str, Any]]
    created_at: datetime
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    class Config:
        from_attributes = True


class AuditEventResponse(BaseModel):
    id: str
    institution_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    actor_account_id: Optional[str]
    previous_hash: Optional[str]
    current_hash: Optional[str]
    occurred_at: datetime
    class Config:
        from_attributes = True


# -----------------------------------------------------------------------------
# Consent Endpoints
# -----------------------------------------------------------------------------

@router.get("/privacy/consents", response_model=List[ConsentResponse])
def list_consents(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.account_id == current_user.account.id,
            ConsentRecord.institution_id == current_user.institution_id,
        )
        .all()
    )


@router.post("/privacy/consents", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def grant_consent(
    payload: ConsentCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    # Check if existing consent for this purpose exists
    existing = (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.account_id == current_user.account.id,
            ConsentRecord.institution_id == current_user.institution_id,
            ConsentRecord.consent_purpose == payload.consent_purpose,
        )
        .first()
    )
    if existing:
        existing.status = "granted"
        existing.collected_at = now_utc()
        existing.withdrawn_at = None
        db.commit()
        db.refresh(existing)
        rec = existing
    else:
        rec = ConsentRecord(
            institution_id=current_user.institution_id,
            account_id=current_user.account.id,
            consent_purpose=payload.consent_purpose,
            policy_version=payload.policy_version,
            status="granted",
            collected_at=now_utc(),
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CHANGE_CONSENT",
        resource_type="consent_record",
        resource_id=rec.id,
        actor_account_id=current_user.account.id,
        details={"purpose": rec.consent_purpose, "status": "granted"},
    )
    return rec


@router.post("/privacy/consents/{consent_id}/withdraw", response_model=ConsentResponse)
def withdraw_consent(
    consent_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    rec = (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.id == consent_id,
            ConsentRecord.account_id == current_user.account.id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Consent record not found.")

    rec.status = "withdrawn"
    rec.withdrawn_at = now_utc()
    db.commit()
    db.refresh(rec)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CHANGE_CONSENT",
        resource_type="consent_record",
        resource_id=rec.id,
        actor_account_id=current_user.account.id,
        details={"purpose": rec.consent_purpose, "status": "withdrawn"},
    )
    return rec


# -----------------------------------------------------------------------------
# Privacy Requests (Export & Correction)
# -----------------------------------------------------------------------------

@router.get("/privacy/requests", response_model=List[PrivacyRequestResponse])
def list_privacy_requests(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(PrivacyRequest)
        .filter(
            PrivacyRequest.account_id == current_user.account.id,
            PrivacyRequest.institution_id == current_user.institution_id,
        )
        .order_by(desc(PrivacyRequest.created_at))
        .all()
    )


@router.post("/privacy/export-requests", response_model=PrivacyRequestResponse, status_code=status.HTTP_201_CREATED)
def request_personal_data_export(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Submits a request to export personal data. Immediately compiles and fulfills the package.
    """
    req = PrivacyRequest(
        institution_id=current_user.institution_id,
        account_id=current_user.account.id,
        request_type="export",
        status="completed",
        details={"format": "json", "scope": "student_personal_data"},
        created_at=now_utc(),
        resolved_at=now_utc(),
        resolution_notes="Export package generated successfully in accordance with data rights policies.",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="EXPORT_DATA",
        resource_type="privacy_request",
        resource_id=req.id,
        actor_account_id=current_user.account.id,
        details={"request_type": "export"},
    )
    return req


@router.get("/privacy/export/{request_id}/download")
def download_data_export(
    request_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns the personal data package. Strictly omits internal risk scores, SHAP values,
    other students' data, and private staff notes.
    """
    req = (
        db.query(PrivacyRequest)
        .filter(
            PrivacyRequest.id == request_id,
            PrivacyRequest.account_id == current_user.account.id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Export request not found.")

    student = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
        )
        .first()
    )

    enrollments_data = []
    attendance_data = []
    goals_data = []

    if student:
        enrs = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
        for e in enrs:
            enrollments_data.append({
                "course": e.course_offering.course.title if e.course_offering and e.course_offering.course else "Course",
                "code": e.course_offering.course.code if e.course_offering and e.course_offering.course else "CODE",
                "status": e.enrollment_status,
                "enrolled_at": e.enrolled_at.isoformat(),
            })
            atts = db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id == e.id).all()
            for a in atts:
                attendance_data.append({
                    "date": str(a.session_date),
                    "status": a.status,
                })

        goals = db.query(StudentGoal).filter(StudentGoal.student_id == student.id).all()
        for g in goals:
            goals_data.append({"title": g.title, "status": g.status, "target_date": str(g.target_date)})

    export_bundle = {
        "export_metadata": {
            "request_id": req.id,
            "account_id": current_user.account.id,
            "export_date": now_utc().isoformat(),
            "policy": "Empiria Student Data Rights Framework v2026.1",
        },
        "user_profile": {
            "name": current_user.account.display_name,
            "email": current_user.account.email,
        },
        "academic_enrollments": enrollments_data,
        "attendance_records": attendance_data,
        "personal_goals": goals_data,
        "disclaimer": "This export contains personal academic records. Internal analytical risk models and privileged institutional staff records are excluded.",
    }
    return export_bundle


@router.post("/privacy/correction-requests", response_model=PrivacyRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_record_correction_request(
    payload: PrivacyRequestCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    req = PrivacyRequest(
        institution_id=current_user.institution_id,
        account_id=current_user.account.id,
        request_type="correction",
        status="pending",
        details=payload.details,
        created_at=now_utc(),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


# -----------------------------------------------------------------------------
# Tamper-Evident Audit Log & Chain Verification
# -----------------------------------------------------------------------------

@router.get("/audit-events", response_model=List[AuditEventResponse])
def list_audit_events(
    limit: int = 50,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "platform_super_admin")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditEvent)
    if not current_user.is_super_admin:
        query = query.filter(AuditEvent.institution_id == current_user.institution_id)
    return query.order_by(desc(AuditEvent.occurred_at)).limit(limit).all()


@router.get("/audit-events/verify-chain")
def verify_audit_chain_endpoint(
    current_user: CurrentUser = Depends(require_roles("institution_admin", "platform_super_admin")),
    db: Session = Depends(get_db),
):
    """
    Executes cryptographic SHA-256 hash chain verification to verify log integrity.
    """
    inst_id = None if current_user.is_super_admin else current_user.institution_id
    result = verify_audit_chain(db, institution_id=inst_id)
    return result
