from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    MentorAssignment,
    MentorProfile,
    MentorExpertise,
    StudentProfile,
    InstitutionMembership,
    MembershipRole,
    FrameworkCompetency,
    Notification,
    Account,
    AuditEvent,
    now_utc,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Mentorship Management"])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class MentorAssignmentCreate(BaseModel):
    student_id: str
    mentor_membership_id: str
    assignment_type: str  # 'primary' or 'subject'
    subject_scope: Optional[str] = None  # e.g., 'SQL', 'Python', 'Statistics', 'Data Analysis'
    framework_competency_id: Optional[str] = None
    reason: Optional[str] = None


class MentorReassignRequest(BaseModel):
    student_id: str
    new_mentor_membership_id: str
    assignment_type: str = "primary"  # 'primary' or 'subject'
    subject_scope: Optional[str] = None
    framework_competency_id: Optional[str] = None
    reason: str = Field(..., min_length=3)


class MentorAssignmentResponse(BaseModel):
    id: str
    institution_id: str
    student_id: str
    student_name: str
    student_email: str
    mentor_membership_id: str
    mentor_account_id: str
    mentor_name: str
    mentor_email: str
    assignment_type: str
    subject_scope: Optional[str]
    framework_competency_id: Optional[str]
    status: str
    reason: Optional[str]
    assigned_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


class AvailableMentorResponse(BaseModel):
    membership_id: str
    account_id: str
    name: str
    email: str
    roles: list[str]


class MentorExpertiseCreate(BaseModel):
    subject_name: str = Field(..., min_length=1, max_length=100)
    proficiency_level: int = Field(default=4, ge=1, le=5)
    competency_id: Optional[str] = None


class MentorExpertiseResponse(BaseModel):
    id: str
    subject_name: str
    proficiency_level: int
    competency_id: Optional[str] = None

    class Config:
        from_attributes = True


class MentorProfileUpdate(BaseModel):
    biography: Optional[str] = None
    department_name: Optional[str] = None
    availability_status: Optional[str] = None  # available, at_capacity, unavailable
    max_capacity: Optional[int] = Field(None, ge=1, le=100)


class MentorProfileResponse(BaseModel):
    id: str
    institution_id: str
    membership_id: str
    mentor_name: str
    mentor_email: str
    biography: Optional[str]
    department_name: Optional[str]
    availability_status: str
    max_capacity: int
    active_primary_count: int = 0
    active_subject_count: int = 0
    total_active_mentees: int = 0
    expertise: List[MentorExpertiseResponse] = []

    class Config:
        from_attributes = True



# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/mentorship/assignments", response_model=list[MentorAssignmentResponse])
def list_mentor_assignments(
    student_id: Optional[str] = None,
    mentor_membership_id: Optional[str] = None,
    assignment_type: Optional[str] = None,
    status: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(MentorAssignment).filter(
        MentorAssignment.institution_id == current_user.institution_id
    )

    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "mentor_advisor", "data_operator", "platform_super_admin")

    if not is_staff:
        # Students can only see their own assignments
        student_prof = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id)
                | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )
        if not student_prof:
            return []
        query = query.filter(MentorAssignment.student_id == student_prof.id)
    else:
        # If user is mentor_advisor/faculty_assessor and NOT institution_admin, scope to their own assignments
        if not current_user.has_role("institution_admin", "data_operator", "platform_super_admin"):
            # Find all mentor memberships associated with current user
            mentor_mems = db.query(InstitutionMembership).filter(
                InstitutionMembership.institution_id == current_user.institution_id,
                InstitutionMembership.account_id == current_user.account.id,
            ).all()
            mentor_mem_ids = [m.id for m in mentor_mems]
            if current_user.active_membership.id not in mentor_mem_ids:
                mentor_mem_ids.append(current_user.active_membership.id)
            query = query.filter(MentorAssignment.mentor_membership_id.in_(mentor_mem_ids))
            if student_id:
                query = query.filter(MentorAssignment.student_id == student_id)
        else:
            if student_id:
                query = query.filter(MentorAssignment.student_id == student_id)
            if mentor_membership_id:
                query = query.filter(MentorAssignment.mentor_membership_id == mentor_membership_id)

    effective_status = status or status_filter
    if assignment_type:
        query = query.filter(MentorAssignment.assignment_type == assignment_type)
    if effective_status and effective_status != "all":
        query = query.filter(MentorAssignment.status == effective_status)

    assignments = query.order_by(MentorAssignment.assigned_at.desc()).all()

    res = []
    for a in assignments:
        st = a.student
        mem = a.mentor_membership
        acc = mem.account if mem else None
        res.append(
            MentorAssignmentResponse(
                id=a.id,
                institution_id=a.institution_id,
                student_id=a.student_id,
                student_name=f"{st.first_name} {st.last_name}" if st else "Student",
                student_email=st.email if st else "",
                mentor_membership_id=a.mentor_membership_id,
                mentor_account_id=acc.id if acc else "",
                mentor_name=acc.display_name if acc else "Mentor",
                mentor_email=acc.email if acc else "",
                assignment_type=a.assignment_type,
                subject_scope=a.subject_scope,
                framework_competency_id=a.framework_competency_id,
                status=a.status,
                reason=a.reason,
                assigned_at=a.assigned_at,
                ended_at=a.ended_at,
            )
        )
    return res


@router.post("/mentorship/assignments", response_model=MentorAssignmentResponse)
def create_mentor_assignment(
    req: MentorAssignmentCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    # Verify student belongs to current institution
    student = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            StudentProfile.id == req.student_id,
        )
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found in institution")

    # Verify mentor membership belongs to current institution and has mentor/assessor role
    mentor_mem = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.institution_id == current_user.institution_id,
            InstitutionMembership.id == req.mentor_membership_id,
            InstitutionMembership.status == "active",
        )
        .first()
    )
    if not mentor_mem:
        raise HTTPException(
            status_code=400,
            detail="Selected mentor does not have an active membership in this institution (cross-tenant assignment prohibited)",
        )

    roles = [
        r.role
        for r in db.query(MembershipRole)
        .filter(MembershipRole.membership_id == mentor_mem.id, MembershipRole.revoked_at.is_(None))
        .all()
    ]
    if not any(r in ("mentor_advisor", "faculty_assessor", "institution_admin") for r in roles):
        raise HTTPException(
            status_code=400,
            detail="Selected staff member does not hold a mentor or assessor role",
        )

    if req.assignment_type not in ("primary", "subject"):
        raise HTTPException(status_code=400, detail="Assignment type must be 'primary' or 'subject'")

    now = datetime.now(timezone.utc)

    # RULE 5.1 & M-002: Exactly one active Primary Mentor at a time.
    if req.assignment_type == "primary":
        existing_primary = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.institution_id == current_user.institution_id,
                MentorAssignment.student_id == student.id,
                MentorAssignment.assignment_type == "primary",
                MentorAssignment.status == "active",
            )
            .all()
        )
        for ep in existing_primary:
            ep.status = "replaced"
            ep.ended_at = now
            ep.reason = f"Replaced by new Primary Mentor assignment on {now.strftime('%Y-%m-%d %H:%M')}"

    # RULE 5.2: For Subject Mentor, replace existing active assignment for same subject scope
    if req.assignment_type == "subject":
        if not req.subject_scope and not req.framework_competency_id:
            raise HTTPException(
                status_code=400,
                detail="Subject mentor assignment requires a subject_scope (e.g., 'SQL', 'Python') or competency ID",
            )
        scope_to_match = (req.subject_scope or "").strip().lower()
        existing_subjects = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.institution_id == current_user.institution_id,
                MentorAssignment.student_id == student.id,
                MentorAssignment.assignment_type == "subject",
                MentorAssignment.status == "active",
            )
            .all()
        )
        for es in existing_subjects:
            es_scope = (es.subject_scope or "").strip().lower()
            if (req.subject_scope and es_scope == scope_to_match) or (
                req.framework_competency_id and es.framework_competency_id == req.framework_competency_id
            ):
                es.status = "replaced"
                es.ended_at = now
                es.reason = f"Replaced by new Subject Mentor assignment on {now.strftime('%Y-%m-%d %H:%M')}"

    # Create new assignment
    assignment = MentorAssignment(
        institution_id=current_user.institution_id,
        student_id=student.id,
        mentor_membership_id=mentor_mem.id,
        assignment_type=req.assignment_type,
        subject_scope=req.subject_scope,
        framework_competency_id=req.framework_competency_id,
        assigned_by_membership_id=current_user.active_membership.id,
        status="active",
        reason=req.reason,
        assigned_at=now,
    )
    db.add(assignment)
    db.flush()

    # Create persistent notification for student if student has an account
    student_membership = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.institution_id == current_user.institution_id,
            (InstitutionMembership.account_id == student.account_id)
            if student.account_id
            else (InstitutionMembership.id == student.membership_id),
        )
        .first()
    )
    if student_membership:
        mentor_name = mentor_mem.account.display_name if mentor_mem.account else "Your Mentor"
        title_text = (
            f"Primary Mentor Assigned: {mentor_name}"
            if req.assignment_type == "primary"
            else f"Subject Mentor ({req.subject_scope}) Assigned: {mentor_name}"
        )
        db.add(
            Notification(
                institution_id=current_user.institution_id,
                recipient_membership_id=student_membership.id,
                notification_type="mentor_assignment_changed",
                title=title_text,
                event_key=f"mentor-assign-{assignment.id}",
                is_read=False,
            )
        )

    # Audit event
    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_account_id=current_user.account.id,
            actor_membership_id=current_user.active_membership.id,
            action="create_mentor_assignment",
            resource_type="mentor_assignment",
            resource_id=assignment.id,
            purpose=f"Assigned {req.assignment_type} mentor {mentor_mem.id} to student {student.id}",
        )
    )

    db.commit()
    db.refresh(assignment)

    st = assignment.student
    acc = mentor_mem.account
    return MentorAssignmentResponse(
        id=assignment.id,
        institution_id=assignment.institution_id,
        student_id=assignment.student_id,
        student_name=f"{st.first_name} {st.last_name}" if st else "Student",
        student_email=st.email if st else "",
        mentor_membership_id=assignment.mentor_membership_id,
        mentor_account_id=acc.id if acc else "",
        mentor_name=acc.display_name if acc else "Mentor",
        mentor_email=acc.email if acc else "",
        assignment_type=assignment.assignment_type,
        subject_scope=assignment.subject_scope,
        framework_competency_id=assignment.framework_competency_id,
        status=assignment.status,
        reason=assignment.reason,
        assigned_at=assignment.assigned_at,
        ended_at=assignment.ended_at,
    )


@router.patch("/mentorship/assignments/{assignment_id}/end", response_model=MentorAssignmentResponse)
def end_mentor_assignment(
    assignment_id: str,
    reason: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(MentorAssignment)
        .filter(
            MentorAssignment.institution_id == current_user.institution_id,
            MentorAssignment.id == assignment_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Mentor assignment not found")

    now = datetime.now(timezone.utc)
    assignment.status = "ended"
    assignment.ended_at = now
    if reason:
        assignment.reason = reason

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_account_id=current_user.account.id,
            actor_membership_id=current_user.active_membership.id,
            action="end_mentor_assignment",
            resource_type="mentor_assignment",
            resource_id=assignment.id,
            purpose=f"Ended {assignment.assignment_type} mentor assignment for student {assignment.student_id}",
        )
    )

    db.commit()
    db.refresh(assignment)

    st = assignment.student
    mem = assignment.mentor_membership
    acc = mem.account if mem else None
    return MentorAssignmentResponse(
        id=assignment.id,
        institution_id=assignment.institution_id,
        student_id=assignment.student_id,
        student_name=f"{st.first_name} {st.last_name}" if st else "Student",
        student_email=st.email if st else "",
        mentor_membership_id=assignment.mentor_membership_id,
        mentor_account_id=acc.id if acc else "",
        mentor_name=acc.display_name if acc else "Mentor",
        mentor_email=acc.email if acc else "",
        assignment_type=assignment.assignment_type,
        subject_scope=assignment.subject_scope,
        framework_competency_id=assignment.framework_competency_id,
        status=assignment.status,
        reason=assignment.reason,
        assigned_at=assignment.assigned_at,
        ended_at=assignment.ended_at,
    )


@router.get("/mentorship/available-mentors", response_model=list[AvailableMentorResponse])
def get_available_mentors(
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.institution_id == current_user.institution_id,
            InstitutionMembership.status == "active",
        )
        .all()
    )

    res = []
    for m in memberships:
        roles = [
            r.role
            for r in db.query(MembershipRole)
            .filter(MembershipRole.membership_id == m.id, MembershipRole.revoked_at.is_(None))
            .all()
        ]
        if any(r in ("mentor_advisor", "faculty_assessor") for r in roles) and m.account:
            res.append(
                AvailableMentorResponse(
                    membership_id=m.id,
                    account_id=m.account_id,
                    name=m.account.display_name,
                    email=m.account.email,
                    roles=roles,
                )
            )
    return res


@router.get("/students/me/mentors")
def get_my_mentors(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    student_prof = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            (StudentProfile.account_id == current_user.account.id)
            | (StudentProfile.email == current_user.account.email),
        )
        .first()
    )
    if not student_prof:
        return {"primary_mentor": None, "subject_mentors": [], "assignment_history": []}

    assignments = (
        db.query(MentorAssignment)
        .filter(
            MentorAssignment.institution_id == current_user.institution_id,
            MentorAssignment.student_id == student_prof.id,
        )
        .order_by(MentorAssignment.assigned_at.desc())
        .all()
    )

    primary_mentor = None
    subject_mentors = []
    history = []

    for a in assignments:
        mem = a.mentor_membership
        acc = mem.account if mem else None
        item = {
            "assignment_id": a.id,
            "membership_id": a.mentor_membership_id,
            "name": acc.display_name if acc else "Mentor",
            "email": acc.email if acc else "",
            "assignment_type": a.assignment_type,
            "subject_scope": a.subject_scope,
            "status": a.status,
            "assigned_at": a.assigned_at,
            "ended_at": a.ended_at,
        }
        history.append(item)
        if a.status == "active":
            if a.assignment_type == "primary" and not primary_mentor:
                primary_mentor = item
            elif a.assignment_type == "subject":
                subject_mentors.append(item)

    return {
        "student_profile_id": student_prof.id,
        "student_name": f"{student_prof.first_name} {student_prof.last_name}",
        "primary_mentor": primary_mentor,
        "subject_mentors": subject_mentors,
        "assignment_history": history,
    }
