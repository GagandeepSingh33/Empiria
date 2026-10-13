from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    SupportRequest,
    SupportQueue,
    InterventionRecord,
    StudentProfile,
    AuditEvent,
)
from app.schemas import (
    SupportRequestCreate,
    SupportRequestResponse,
    InterventionCreate,
    InterventionResponse,
)
from app.security import (
    require_authenticated,
    require_roles,
    get_current_student_profile,
    CurrentUser,
)

router = APIRouter(tags=["Support Requests & Interventions"])


@router.post("/support-requests", response_model=SupportRequestResponse)
def create_support_request(
    req: SupportRequestCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    # Find default queue
    queue = (
        db.query(SupportQueue)
        .filter(SupportQueue.institution_id == current_user.institution_id, SupportQueue.is_active.is_(True))
        .first()
    )

    sreq = SupportRequest(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        queue_id=queue.id if queue else None,
        subject=req.subject,
        message=req.message,
        status="open",
    )
    db.add(sreq)
    db.commit()
    db.refresh(sreq)

    return SupportRequestResponse(
        id=sreq.id,
        student_id=sreq.student_id,
        student_name=f"{student_profile.first_name} {student_profile.last_name}",
        subject=sreq.subject,
        message=sreq.message,
        status=sreq.status,
        created_at=sreq.created_at,
        updated_at=sreq.updated_at,
    )


@router.get("/support-requests", response_model=list[SupportRequestResponse])
def list_support_requests(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    is_staff = current_user.has_role("institution_admin", "mentor_advisor", "faculty_assessor")

    query = db.query(SupportRequest).filter(SupportRequest.institution_id == current_user.institution_id)

    if not is_staff:
        # Restricted to student's own requests
        profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                StudentProfile.account_id == current_user.account.id,
            )
            .first()
        )
        if not profile:
            return []
        query = query.filter(SupportRequest.student_id == profile.id)

    requests = query.order_by(SupportRequest.created_at.desc()).all()

    res = []
    for r in requests:
        st_name = "Student"
        if r.student:
            st_name = f"{r.student.first_name} {r.student.last_name}"
        res.append(
            SupportRequestResponse(
                id=r.id,
                student_id=r.student_id,
                student_name=st_name,
                subject=r.subject,
                message=r.message,
                status=r.status,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return res


@router.post("/support-requests/{request_id}/interventions", response_model=InterventionResponse)
def record_intervention(
    request_id: str,
    req: InterventionCreate,
    current_user: CurrentUser = Depends(require_roles("mentor_advisor", "institution_admin")),
    db: Session = Depends(get_db),
):
    sreq = (
        db.query(SupportRequest)
        .filter(
            SupportRequest.institution_id == current_user.institution_id,
            SupportRequest.id == request_id,
        )
        .first()
    )
    if not sreq:
        raise HTTPException(status_code=404, detail="Support request not found")

    intervention = InterventionRecord(
        institution_id=current_user.institution_id,
        student_id=sreq.student_id,
        support_request_id=sreq.id,
        responsible_membership_id=current_user.membership.id,
        intervention_date=req.intervention_date,
        agreed_actions=req.agreed_actions,
        follow_up_date=req.follow_up_date,
        notes=req.notes,
        status="active",
    )
    db.add(intervention)

    sreq.status = "resolved"

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id,
            action="INTERVENTION_RECORDED",
            resource_type="intervention_records",
            purpose=f"Recorded intervention for student {sreq.student_id}",
        )
    )
    db.commit()
    db.refresh(intervention)

    staff_name = current_user.account.display_name
    return InterventionResponse(
        id=intervention.id,
        student_id=intervention.student_id,
        responsible_staff_name=staff_name,
        intervention_date=intervention.intervention_date,
        agreed_actions=intervention.agreed_actions,
        follow_up_date=intervention.follow_up_date,
        status=intervention.status,
        notes=intervention.notes,
        created_at=intervention.created_at,
    )


@router.get("/support-requests/{request_id}/interventions", response_model=list[InterventionResponse])
def list_interventions(
    request_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    sreq = (
        db.query(SupportRequest)
        .filter(
            SupportRequest.institution_id == current_user.institution_id,
            SupportRequest.id == request_id,
        )
        .first()
    )
    if not sreq:
        raise HTTPException(status_code=404, detail="Support request not found")

    records = (
        db.query(InterventionRecord)
        .filter(
            InterventionRecord.institution_id == current_user.institution_id,
            InterventionRecord.support_request_id == request_id,
        )
        .all()
    )

    res = []
    for r in records:
        staff_name = "Advisor"
        if r.responsible_membership and r.responsible_membership.account:
            staff_name = r.responsible_membership.account.display_name
        res.append(
            InterventionResponse(
                id=r.id,
                student_id=r.student_id,
                responsible_staff_name=staff_name,
                intervention_date=r.intervention_date,
                agreed_actions=r.agreed_actions,
                follow_up_date=r.follow_up_date,
                status=r.status,
                notes=r.notes,
                created_at=r.created_at,
            )
        )
    return res
