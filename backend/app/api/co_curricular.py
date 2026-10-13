from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    CoCurricularActivity,
    CoCurricularEnrollment,
    ActivityPracticeSession,
    ActivityEvidenceItem,
    StudentProfile,
    Enrollment,
    AcademicTerm,
    AuditEvent,
    now_utc,
    generate_uuid,
)
from app.security import (
    require_authenticated,
    require_roles,
    get_current_student_profile,
    CurrentUser,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/co-curricular", tags=["Co-Curricular Two-Pathway Engine"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class ActivityCreate(BaseModel):
    category: str
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    supported_modalities: List[str] = ["text", "video_upload"]
    default_rubric_id: Optional[str] = None

class ActivityResponse(BaseModel):
    id: str
    institution_id: str
    category: str
    name: str
    slug: str
    description: Optional[str]
    supported_modalities: List[str]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    activity_id: str
    aspiration_level: str = "recreational"  # recreational, intermediate, competitive, professional
    current_proficiency_level: str = "not_assessed"  # not_assessed, beginner, developing, proficient, advanced
    weekly_hours_target: float = Field(default=4.0, ge=0.5, le=40.0)

class EnrollmentUpdate(BaseModel):
    aspiration_level: Optional[str] = None
    current_proficiency_level: Optional[str] = None
    weekly_hours_target: Optional[float] = None
    status: Optional[str] = None  # active, paused, archived

class EnrollmentResponse(BaseModel):
    id: str
    institution_id: str
    student_id: str
    activity_id: str
    activity_name: Optional[str] = None
    activity_category: Optional[str] = None
    aspiration_level: str
    current_proficiency_level: str
    weekly_hours_target: float
    status: str
    started_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


class PracticeSessionCreate(BaseModel):
    enrollment_id: str
    session_type: str = "independent"  # independent, ai_guided, peer_skill_swap, mentor_coached
    duration_minutes: int = Field(..., ge=5, le=480)
    focus_technique: str = Field(..., min_length=2, max_length=255)
    notes: Optional[str] = None
    self_evaluation_score: Optional[float] = Field(None, ge=1.0, le=10.0)
    session_date: Optional[date] = None

class PracticeSessionResponse(BaseModel):
    id: str
    institution_id: str
    enrollment_id: str
    session_type: str
    duration_minutes: int
    focus_technique: str
    notes: Optional[str]
    self_evaluation_score: Optional[float]
    session_date: date
    created_at: datetime
    class Config:
        from_attributes = True


class EvidenceCreate(BaseModel):
    activity_id: str
    title: str = Field(..., min_length=2, max_length=255)
    evidence_type: str  # audio_recording, video_clip, motion_pose_data, project_submission, portfolio_link
    storage_uri: Optional[str] = None
    storage_checksum_sha256: str = Field(..., min_length=16, max_length=64)
    is_private_to_student: bool = True

class EvidenceResponse(BaseModel):
    id: str
    institution_id: str
    student_id: str
    activity_id: str
    title: str
    evidence_type: str
    storage_uri: Optional[str]
    storage_checksum_sha256: str
    evaluation_status: str
    is_private_to_student: bool
    created_at: datetime
    class Config:
        from_attributes = True


class WorkloadPlannerResponse(BaseModel):
    student_id: str
    weekly_total_budget_hours: float
    sleep_and_recovery_hours: float
    academic_classes_hours: float
    academic_study_hours: float
    co_curricular_committed_hours: float
    available_discretionary_hours: float
    is_exam_period_active: bool
    recommended_co_curricular_throttle: float  # 1.0 = normal, 0.5 = maintenance drills
    overcommitment_risk: str  # optimal, balanced, high, critical
    plan_guidelines: List[str]


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/activities", response_model=List[ActivityResponse])
def list_cocurricular_activities(
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(CoCurricularActivity).filter(
        CoCurricularActivity.institution_id == current_user.institution_id,
        CoCurricularActivity.is_active == True,
    )
    if category:
        query = query.filter(CoCurricularActivity.category == category)
    return query.order_by(CoCurricularActivity.name).all()


@router.post("/activities", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_cocurricular_activity(
    payload: ActivityCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    existing = db.query(CoCurricularActivity).filter(
        CoCurricularActivity.institution_id == current_user.institution_id,
        CoCurricularActivity.slug == payload.slug,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Activity slug already exists in this institution.")

    act = CoCurricularActivity(
        institution_id=current_user.institution_id,
        category=payload.category,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        supported_modalities=payload.supported_modalities,
        default_rubric_id=payload.default_rubric_id,
        is_active=True,
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return act


@router.get("/enrollments", response_model=List[EnrollmentResponse])
def list_student_enrollments(
    student_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "mentor_advisor", "data_operator")

    query = db.query(CoCurricularEnrollment).filter(
        CoCurricularEnrollment.institution_id == current_user.institution_id
    )

    if not is_staff:
        # Student sees own enrollments
        st = db.query(StudentProfile).filter(
            StudentProfile.institution_id == current_user.institution_id,
            (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
        ).first()
        if not st:
            return []
        query = query.filter(CoCurricularEnrollment.student_id == st.id)
    else:
        if student_id:
            query = query.filter(CoCurricularEnrollment.student_id == student_id)

    enrollments = query.order_by(desc(CoCurricularEnrollment.started_at)).all()
    res = []
    for e in enrollments:
        res.append(
            EnrollmentResponse(
                id=e.id,
                institution_id=e.institution_id,
                student_id=e.student_id,
                activity_id=e.activity_id,
                activity_name=e.activity.name if e.activity else None,
                activity_category=e.activity.category if e.activity else None,
                aspiration_level=e.aspiration_level,
                current_proficiency_level=e.current_proficiency_level,
                weekly_hours_target=e.weekly_hours_target,
                status=e.status,
                started_at=e.started_at,
                updated_at=e.updated_at,
            )
        )
    return res


@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_cocurricular_activity(
    payload: EnrollmentCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    activity = db.query(CoCurricularActivity).filter(
        CoCurricularActivity.id == payload.activity_id,
        CoCurricularActivity.institution_id == current_user.institution_id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    existing = db.query(CoCurricularEnrollment).filter(
        CoCurricularEnrollment.student_id == student_profile.id,
        CoCurricularEnrollment.activity_id == payload.activity_id,
    ).first()
    if existing:
        existing.status = "active"
        existing.aspiration_level = payload.aspiration_level
        existing.weekly_hours_target = payload.weekly_hours_target
        if payload.current_proficiency_level:
            existing.current_proficiency_level = payload.current_proficiency_level
        db.commit()
        db.refresh(existing)
        return EnrollmentResponse(
            id=existing.id,
            institution_id=existing.institution_id,
            student_id=existing.student_id,
            activity_id=existing.activity_id,
            activity_name=activity.name,
            activity_category=activity.category,
            aspiration_level=existing.aspiration_level,
            current_proficiency_level=existing.current_proficiency_level,
            weekly_hours_target=existing.weekly_hours_target,
            status=existing.status,
            started_at=existing.started_at,
            updated_at=existing.updated_at,
        )

    enrollment = CoCurricularEnrollment(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        activity_id=payload.activity_id,
        aspiration_level=payload.aspiration_level,
        current_proficiency_level=payload.current_proficiency_level,
        weekly_hours_target=payload.weekly_hours_target,
        status="active",
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="ENROLL_CO_CURRICULAR",
        resource_type="co_curricular_enrollment",
        resource_id=enrollment.id,
        actor_account_id=current_user.account.id,
        details={"activity": activity.name, "category": activity.category},
    )

    return EnrollmentResponse(
        id=enrollment.id,
        institution_id=enrollment.institution_id,
        student_id=enrollment.student_id,
        activity_id=enrollment.activity_id,
        activity_name=activity.name,
        activity_category=activity.category,
        aspiration_level=enrollment.aspiration_level,
        current_proficiency_level=enrollment.current_proficiency_level,
        weekly_hours_target=enrollment.weekly_hours_target,
        status=enrollment.status,
        started_at=enrollment.started_at,
        updated_at=enrollment.updated_at,
    )


@router.patch("/enrollments/{enrollment_id}", response_model=EnrollmentResponse)
def update_cocurricular_enrollment(
    enrollment_id: str,
    payload: EnrollmentUpdate,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    enr = db.query(CoCurricularEnrollment).filter(
        CoCurricularEnrollment.id == enrollment_id,
        CoCurricularEnrollment.student_id == student_profile.id,
    ).first()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    if payload.aspiration_level is not None:
        enr.aspiration_level = payload.aspiration_level
    if payload.current_proficiency_level is not None:
        enr.current_proficiency_level = payload.current_proficiency_level
    if payload.weekly_hours_target is not None:
        enr.weekly_hours_target = payload.weekly_hours_target
    if payload.status is not None:
        enr.status = payload.status

    db.commit()
    db.refresh(enr)

    return EnrollmentResponse(
        id=enr.id,
        institution_id=enr.institution_id,
        student_id=enr.student_id,
        activity_id=enr.activity_id,
        activity_name=enr.activity.name if enr.activity else None,
        activity_category=enr.activity.category if enr.activity else None,
        aspiration_level=enr.aspiration_level,
        current_proficiency_level=enr.current_proficiency_level,
        weekly_hours_target=enr.weekly_hours_target,
        status=enr.status,
        started_at=enr.started_at,
        updated_at=enr.updated_at,
    )


@router.post("/practice-sessions", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
def record_practice_session(
    payload: PracticeSessionCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    enr = db.query(CoCurricularEnrollment).filter(
        CoCurricularEnrollment.id == payload.enrollment_id,
        CoCurricularEnrollment.student_id == student_profile.id,
    ).first()
    if not enr:
        raise HTTPException(status_code=404, detail="Co-curricular pursuit enrollment not found.")

    s_date = payload.session_date or date.today()
    session = ActivityPracticeSession(
        institution_id=current_user.institution_id,
        enrollment_id=enr.id,
        session_type=payload.session_type,
        duration_minutes=payload.duration_minutes,
        focus_technique=payload.focus_technique,
        notes=payload.notes,
        self_evaluation_score=payload.self_evaluation_score,
        session_date=s_date,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/practice-sessions", response_model=List[PracticeSessionResponse])
def list_practice_sessions(
    enrollment_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    enr = db.query(CoCurricularEnrollment).filter(
        CoCurricularEnrollment.id == enrollment_id,
        CoCurricularEnrollment.student_id == student_profile.id,
    ).first()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    return (
        db.query(ActivityPracticeSession)
        .filter(ActivityPracticeSession.enrollment_id == enrollment_id)
        .order_by(desc(ActivityPracticeSession.session_date))
        .all()
    )


@router.post("/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
def submit_cocurricular_evidence(
    payload: EvidenceCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    activity = db.query(CoCurricularActivity).filter(
        CoCurricularActivity.id == payload.activity_id,
        CoCurricularActivity.institution_id == current_user.institution_id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    item = ActivityEvidenceItem(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        activity_id=payload.activity_id,
        title=payload.title,
        evidence_type=payload.evidence_type,
        storage_uri=payload.storage_uri,
        storage_checksum_sha256=payload.storage_checksum_sha256,
        is_private_to_student=payload.is_private_to_student,
        evaluation_status="pending",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/evidence", response_model=List[EvidenceResponse])
def list_cocurricular_evidence(
    activity_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    query = db.query(ActivityEvidenceItem).filter(
        ActivityEvidenceItem.student_id == student_profile.id
    )
    if activity_id:
        query = query.filter(ActivityEvidenceItem.activity_id == activity_id)
    return query.order_by(desc(ActivityEvidenceItem.created_at)).all()


@router.get("/workload-planner", response_model=WorkloadPlannerResponse)
def get_workload_planner(
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    """
    Constraint-Aware Workload Planner reconciling temporal budgets:
    Total student budget = 168 hours - (sleep + recovery + classes + study + practice).
    Throttles co-curricular recommendations during exam periods.
    """
    TOTAL_WEEK_HOURS = 168.0
    SLEEP_AND_RECOVERY = 56.0 + 14.0  # 8 hrs sleep/day + 2 hrs daily rest = 70 hrs

    # 1. Academic load
    active_enrollments = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_id == student_profile.id,
            Enrollment.enrollment_status == "enrolled",
        )
        .all()
    )
    num_courses = len(active_enrollments)
    academic_classes = float(num_courses * 3.0)  # ~3 hrs class per course
    academic_study = float(num_courses * 4.5)    # ~4.5 hrs prep per course

    # 2. Co-curricular load
    co_enrollments = (
        db.query(CoCurricularEnrollment)
        .filter(
            CoCurricularEnrollment.student_id == student_profile.id,
            CoCurricularEnrollment.status == "active",
        )
        .all()
    )
    co_hours = sum(e.weekly_hours_target for e in co_enrollments)

    # 3. Check for exam period
    active_terms = (
        db.query(AcademicTerm)
        .filter(
            AcademicTerm.institution_id == current_user.institution_id,
            AcademicTerm.status == "active",
        )
        .all()
    )
    is_exam_period = False
    for t in active_terms:
        # Check if today is near finals/midterm weeks
        if t.end_date and (t.end_date - date.today()).days <= 14:
            is_exam_period = True
            break

    # Throttle factor during exam period
    throttle_factor = 0.50 if is_exam_period else 1.0

    committed = SLEEP_AND_RECOVERY + academic_classes + academic_study + (co_hours * throttle_factor)
    available_discretionary = max(0.0, round(TOTAL_WEEK_HOURS - committed, 1))

    # Overcommitment risk
    if committed > 150:
        overcommit = "critical"
    elif committed > 135:
        overcommit = "high"
    elif committed > 115:
        overcommit = "balanced"
    else:
        overcommit = "optimal"

    guidelines = []
    if is_exam_period:
        guidelines.append(
            "Exam Period Active: Co-curricular practice targets scaled down to 50% maintenance drills to prioritize academic study."
        )
    if overcommit in ("high", "critical"):
        guidelines.append(
            "Overcommitment Alert: Total scheduled hours exceed recommended stamina thresholds. Consider pacing exploratory pursuits."
        )
    else:
        guidelines.append("Balanced Schedule: Healthy temporal buffer available for deliberate practice and rest.")

    return WorkloadPlannerResponse(
        student_id=student_profile.id,
        weekly_total_budget_hours=TOTAL_WEEK_HOURS,
        sleep_and_recovery_hours=SLEEP_AND_RECOVERY,
        academic_classes_hours=academic_classes,
        academic_study_hours=academic_study,
        co_curricular_committed_hours=round(co_hours * throttle_factor, 1),
        available_discretionary_hours=available_discretionary,
        is_exam_period_active=is_exam_period,
        recommended_co_curricular_throttle=throttle_factor,
        overcommitment_risk=overcommit,
        plan_guidelines=guidelines,
    )
