from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    MentorBriefing,
    MentorAssignment,
    StudentProfile,
    now_utc,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.briefing_service import generate_mentor_briefing
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["AI Mentor Briefings"])


class BriefingGenerateRequest(BaseModel):
    student_id: str
    session_reference: Optional[str] = "Pre-Session Advisory Meeting"

class BriefingSummaryResponse(BaseModel):
    id: str
    institution_id: str
    mentor_membership_id: str
    student_id: str
    student_name: Optional[str] = None
    session_reference: Optional[str]
    generation_method: str
    provider_model: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class BriefingDetailResponse(BaseModel):
    id: str
    institution_id: str
    mentor_membership_id: str
    student_id: str
    student_name: Optional[str] = None
    session_reference: Optional[str]
    generation_method: str
    provider_model: str
    status: str
    briefing_content: Dict[str, Any]
    created_at: datetime
    class Config:
        from_attributes = True


@router.post("/mentor-briefings", response_model=BriefingDetailResponse, status_code=status.HTTP_201_CREATED)
def create_mentor_briefing(
    payload: BriefingGenerateRequest,
    current_user: CurrentUser = Depends(require_roles("mentor_advisor", "faculty_assessor", "institution_admin")),
    db: Session = Depends(get_db),
):
    """
    Generates a pre-session briefing synthesizing authorized student facts into discussion agendas.
    """
    # Verify student exists in this institution
    student = (
        db.query(StudentProfile)
        .filter(StudentProfile.id == payload.student_id, StudentProfile.institution_id == current_user.institution_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    briefing = generate_mentor_briefing(
        db,
        institution_id=current_user.institution_id,
        mentor_membership_id=current_user.membership.id if current_user.membership else "",
        student_id=payload.student_id,
        session_reference=payload.session_reference,
    )

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="GENERATE_MENTOR_BRIEFING",
        resource_type="mentor_briefing",
        resource_id=briefing.id,
        actor_account_id=current_user.account.id,
        details={"student_id": payload.student_id, "generation_method": briefing.generation_method},
    )

    return BriefingDetailResponse(
        id=briefing.id,
        institution_id=briefing.institution_id,
        mentor_membership_id=briefing.mentor_membership_id,
        student_id=briefing.student_id,
        student_name=f"{student.first_name} {student.last_name}",
        session_reference=briefing.session_reference,
        generation_method=briefing.generation_method,
        provider_model=briefing.provider_model,
        status=briefing.status,
        briefing_content=briefing.briefing_content,
        created_at=briefing.created_at,
    )


@router.get("/mentor-briefings", response_model=List[BriefingSummaryResponse])
def list_mentor_briefings(
    student_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles("mentor_advisor", "faculty_assessor", "institution_admin")),
    db: Session = Depends(get_db),
):
    query = db.query(MentorBriefing).filter(MentorBriefing.institution_id == current_user.institution_id)

    # If mentor role, restrict to own briefings unless admin
    if not current_user.has_role("institution_admin") and current_user.membership:
        query = query.filter(MentorBriefing.mentor_membership_id == current_user.membership.id)

    if student_id:
        query = query.filter(MentorBriefing.student_id == student_id)

    briefings = query.order_by(desc(MentorBriefing.created_at)).all()

    res = []
    for b in briefings:
        s_name = f"{b.student.first_name} {b.student.last_name}" if b.student else "Student"
        res.append(
            BriefingSummaryResponse(
                id=b.id,
                institution_id=b.institution_id,
                mentor_membership_id=b.mentor_membership_id,
                student_id=b.student_id,
                student_name=s_name,
                session_reference=b.session_reference,
                generation_method=b.generation_method,
                provider_model=b.provider_model,
                status=b.status,
                created_at=b.created_at,
            )
        )
    return res


@router.get("/mentor-briefings/{briefing_id}", response_model=BriefingDetailResponse)
def get_briefing_detail(
    briefing_id: str,
    current_user: CurrentUser = Depends(require_roles("mentor_advisor", "faculty_assessor", "institution_admin")),
    db: Session = Depends(get_db),
):
    briefing = (
        db.query(MentorBriefing)
        .filter(MentorBriefing.id == briefing_id, MentorBriefing.institution_id == current_user.institution_id)
        .first()
    )
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found.")

    s_name = f"{briefing.student.first_name} {briefing.student.last_name}" if briefing.student else "Student"
    return BriefingDetailResponse(
        id=briefing.id,
        institution_id=briefing.institution_id,
        mentor_membership_id=briefing.mentor_membership_id,
        student_id=briefing.student_id,
        student_name=s_name,
        session_reference=briefing.session_reference,
        generation_method=briefing.generation_method,
        provider_model=briefing.provider_model,
        status=briefing.status,
        briefing_content=briefing.briefing_content,
        created_at=briefing.created_at,
    )
