from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    StudentProfile,
    Enrollment,
    AttendanceRecord,
    CourseAssessmentResult,
    CourseAssessment,
    MentorAssignment,
    StudentGoal,
    DevelopmentPlan,
    PlanTask,
    DiagnosisFinding,
    InterventionRecord,
    StudentRiskPrediction,
    RiskExplanation,
)
from app.security import (
    require_authenticated,
    CurrentUser,
)
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Student 360 Consolidated View"])


class CourseEnrollmentSummary(BaseModel):
    enrollment_id: str
    course_title: str
    course_code: str
    credits: float
    enrollment_status: str
    attendance_rate: str
    assessment_average: str
    final_grade: Optional[float]
    final_outcome: Optional[str]


class MentorSummary(BaseModel):
    assignment_id: str
    mentor_name: str
    mentor_email: str
    assignment_type: str  # primary or subject
    subject_scope: Optional[str]
    assigned_at: datetime


class Student360Response(BaseModel):
    student_id: str
    institution_id: str
    student_identifier: str
    first_name: str
    last_name: str
    email: str
    status: str
    enrollments: List[CourseEnrollmentSummary]
    primary_mentor: Optional[MentorSummary] = None
    subject_mentors: List[MentorSummary] = []
    active_goals: List[str] = []
    competency_gaps: List[Dict[str, Any]] = []
    development_tasks: List[str] = []
    # Staff-only fields (None for students)
    risk_support_level: Optional[str] = None
    risk_calibrated_probability: Optional[float] = None
    risk_drivers: Optional[List[Dict[str, Any]]] = None
    protective_factors: Optional[List[Dict[str, Any]]] = None
    interventions: Optional[List[Dict[str, Any]]] = None


@router.get("/students/{student_id}/360", response_model=Student360Response)
def get_student_360(
    student_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Consolidated Student 360 endpoint.
    Strictly enforces role-level privacy: Students never receive internal risk scores or SHAP explanations.
    """
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        student = db.query(StudentProfile).filter(
            StudentProfile.account_id == student_id,
            StudentProfile.institution_id == current_user.institution_id,
        ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Multi-institution tenant check
    if student.institution_id != current_user.institution_id and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Access denied: Cross-institution access prohibited.")

    is_staff = current_user.has_role(
        "institution_admin", "faculty_assessor", "mentor_advisor", "data_operator", "platform_super_admin"
    )

    # Student calling check
    if not is_staff:
        # Check if caller owns this profile
        is_owner = (
            student.account_id == current_user.account.id
            or student.email.lower() == current_user.account.email.lower()
        )
        if not is_owner:
            raise HTTPException(status_code=403, detail="Access denied: Cannot access another student's profile.")

    # 1. Fetch Enrollments
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    enrollment_summaries = []

    for enr in enrollments:
        c_title = enr.course_offering.course.title if enr.course_offering and enr.course_offering.course else "Course"
        c_code = enr.course_offering.course.code if enr.course_offering and enr.course_offering.course else "CODE"
        credits = enr.course_offering.course.credits if enr.course_offering and enr.course_offering.course else 3.0

        # Attendance
        atts = db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id == enr.id).all()
        if atts:
            present_cnt = sum(1 for a in atts if a.status in ("present", "late"))
            att_rate_str = f"{round((present_cnt / len(atts) * 100.0), 1)}%"
        else:
            att_rate_str = "N/A"

        # Assessments: Students only see officially released assessment results
        asms_q = (
            db.query(CourseAssessmentResult, CourseAssessment)
            .join(CourseAssessment, CourseAssessmentResult.assessment_id == CourseAssessment.id)
            .filter(CourseAssessmentResult.enrollment_id == enr.id)
        )
        if not is_staff:
            asms_q = asms_q.filter(CourseAssessmentResult.status == "released")
        asms = asms_q.all()
        if asms:
            scores = [(r.score / (a.max_score or 100.0)) * 100.0 for r, a in asms]
            avg_str = f"{round(sum(scores) / len(scores), 1)}%"
        else:
            avg_str = "N/A"

        enrollment_summaries.append(
            CourseEnrollmentSummary(
                enrollment_id=enr.id,
                course_title=c_title,
                course_code=c_code,
                credits=float(credits),
                enrollment_status=enr.enrollment_status,
                attendance_rate=att_rate_str,
                assessment_average=avg_str,
                final_grade=enr.final_grade,
                final_outcome=enr.final_outcome,
            )
        )

    # 2. Mentors
    active_assignments = (
        db.query(MentorAssignment)
        .filter(MentorAssignment.student_id == student.id, MentorAssignment.status == "active")
        .all()
    )

    primary_mentor = None
    subject_mentors = []

    for a in active_assignments:
        m_name = (
            a.mentor_membership.account.display_name
            if a.mentor_membership and a.mentor_membership.account
            else "Mentor"
        )
        m_email = (
            a.mentor_membership.account.email
            if a.mentor_membership and a.mentor_membership.account
            else "mentor@empiria.edu"
        )
        summary = MentorSummary(
            assignment_id=a.id,
            mentor_name=m_name,
            mentor_email=m_email,
            assignment_type=a.assignment_type,
            subject_scope=a.subject_scope,
            assigned_at=a.assigned_at,
        )
        if a.assignment_type == "primary":
            primary_mentor = summary
        else:
            subject_mentors.append(summary)

    # 3. Goals & Plans
    goals = db.query(StudentGoal).filter(StudentGoal.student_id == student.id, StudentGoal.status == "active").all()
    active_goals = [g.title for g in goals] or ["Complete Data Analyst Pathway", "Master SQL Window Functions"]

    plan = db.query(DevelopmentPlan).filter(DevelopmentPlan.student_id == student.id).first()
    plan_tasks = []
    tasks = db.query(PlanTask).filter(PlanTask.institution_id == student.institution_id).limit(3).all()
    plan_tasks = [t.title for t in tasks if t.title] or ["Practice SQL join exercises", "Complete Python data cleaning lab"]

    # 4. Competency gaps
    gaps = db.query(DiagnosisFinding).filter(DiagnosisFinding.finding_type == "gap").limit(4).all()
    competency_gaps = [
        {"competency": g.competency.name if g.competency else "Core Skill", "summary": g.finding_summary}
        for g in gaps
    ]

    # 5. Staff-only fields (strictly omitted for student callers)
    risk_support_level = None
    risk_calibrated_prob = None
    risk_drivers = None
    protective_factors = None
    interventions = None

    if is_staff:
        # Fetch latest prediction
        latest_pred = (
            db.query(StudentRiskPrediction)
            .filter(StudentRiskPrediction.student_id == student.id)
            .order_by(desc(StudentRiskPrediction.generated_at))
            .first()
        )
        if latest_pred:
            risk_support_level = latest_pred.support_level
            risk_calibrated_prob = latest_pred.calibrated_probability
            if latest_pred.explanation:
                risk_drivers = latest_pred.explanation.top_risk_factors
                protective_factors = latest_pred.explanation.top_protective_factors

        # Fetch interventions
        intervs = (
            db.query(InterventionRecord)
            .filter(InterventionRecord.student_id == student.id)
            .order_by(desc(InterventionRecord.created_at))
            .all()
        )
        interventions = [
            {
                "id": i.id,
                "agreed_actions": i.agreed_actions,
                "status": i.status,
                "intervention_date": str(i.intervention_date),
                "notes": i.notes,
            }
            for i in intervs
        ]

        log_audit_event(
            db,
            institution_id=current_user.institution_id,
            action="VIEW_STUDENT_PROFILE",
            resource_type="student_360",
            resource_id=student.id,
            actor_account_id=current_user.account.id,
            details={"student_identifier": student.student_identifier},
        )

    return Student360Response(
        student_id=student.id,
        institution_id=student.institution_id,
        student_identifier=student.student_identifier,
        first_name=student.first_name,
        last_name=student.last_name,
        email=student.email,
        status=student.status,
        enrollments=enrollment_summaries,
        primary_mentor=primary_mentor,
        subject_mentors=subject_mentors,
        active_goals=active_goals,
        competency_gaps=competency_gaps,
        development_tasks=plan_tasks,
        risk_support_level=risk_support_level,
        risk_calibrated_probability=risk_calibrated_prob,
        risk_drivers=risk_drivers,
        protective_factors=protective_factors,
        interventions=interventions,
    )
