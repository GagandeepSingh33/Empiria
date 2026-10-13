import csv
import io
from datetime import date, datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    Department,
    AcademicTerm,
    Course,
    CourseOffering,
    Enrollment,
    AttendanceRecord,
    CourseAssessment,
    CourseAssessmentResult,
    StudentProfile,
    ImportJob,
    now_utc,
    generate_uuid,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.audit_service import log_audit_event
from app.domain.importer import escape_csv_formula

router = APIRouter(tags=["Academic Records & Structure"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)

class DepartmentResponse(BaseModel):
    id: str
    institution_id: str
    name: str
    code: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class AcademicTermCreate(BaseModel):
    name: str
    start_date: date
    end_date: date

class AcademicTermResponse(BaseModel):
    id: str
    institution_id: str
    name: str
    start_date: date
    end_date: date
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    credits: float = 3.0
    department_id: Optional[str] = None

class CourseResponse(BaseModel):
    id: str
    institution_id: str
    department_id: Optional[str]
    code: str
    title: str
    description: Optional[str]
    credits: float
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class CourseOfferingCreate(BaseModel):
    course_id: str
    academic_term_id: str
    section_identifier: str = "01"
    instructor_membership_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CourseOfferingResponse(BaseModel):
    id: str
    institution_id: str
    course_id: str
    academic_term_id: str
    section_identifier: str
    instructor_membership_id: Optional[str]
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    term_name: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: str
    course_offering_id: str

class EnrollmentResponse(BaseModel):
    id: str
    institution_id: str
    student_id: str
    course_offering_id: str
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    enrollment_status: str
    final_outcome: Optional[str]
    final_grade: Optional[float]
    enrolled_at: datetime
    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    enrollment_id: str
    session_date: date
    status: str = "present"  # present, absent, late, excused

class AttendanceResponse(BaseModel):
    id: str
    institution_id: str
    enrollment_id: str
    session_date: date
    status: str
    source: str
    created_at: datetime
    class Config:
        from_attributes = True


class AttendanceCorrectionUpdate(BaseModel):
    status: str = Field(..., description="present, absent, late, or excused")
    reason: str = Field(..., min_length=3, description="Mandatory reason for attendance correction")


class AttendanceBulkItem(BaseModel):
    enrollment_id: str
    status: str = "present"


class AttendanceBulkCreate(BaseModel):
    course_offering_id: str
    session_date: date
    records: List[AttendanceBulkItem]


class AttendanceHistoryItem(BaseModel):
    id: str
    enrollment_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    session_date: date
    status: str
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class AcademicDataHealthResponse(BaseModel):
    total_students: int
    total_courses: int
    total_offerings: int
    total_enrollments: int
    unreleased_results_count: int
    missing_scores_count: int
    attendance_records_count: int
    data_freshness_status: str
    recent_imports: List[Dict[str, Any]]


class AcademicTermUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[float] = None
    department_id: Optional[str] = None
    status: Optional[str] = None


class CourseAssessmentCreate(BaseModel):
    course_offering_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=255)
    assessment_type: str = "internal"  # internal, external, assignment, quiz, midterm, final, lab
    max_score: float = 100.0
    weight: float = 1.0
    assessment_date: Optional[date] = None


class CourseAssessmentResponse(BaseModel):
    id: str
    institution_id: str
    course_offering_id: str
    name: str
    assessment_type: str
    max_score: float
    weight: float
    assessment_date: Optional[date] = None
    created_at: datetime
    total_submissions: int = 0
    released_submissions: int = 0

    class Config:
        from_attributes = True


class AssessmentResultItem(BaseModel):
    enrollment_id: str
    score: float
    status: str = "draft"  # draft, submitted, verified, released
    grading_metadata: Optional[Dict[str, Any]] = None


class BulkAssessmentResultsCreate(BaseModel):
    results: List[AssessmentResultItem]


class AssessmentResultResponse(BaseModel):
    id: str
    institution_id: str
    assessment_id: str
    enrollment_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    score: Optional[float] = None  # None for unreleased student view
    max_score: float
    status: str
    is_released: bool
    grading_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnrollmentStatusUpdate(BaseModel):
    enrollment_status: Optional[str] = None  # enrolled, completed, dropped, withdrawn
    final_grade: Optional[float] = None
    final_outcome: Optional[str] = None  # passed, failed, honors, incomplete


class AcademicHistoryAssessment(BaseModel):
    assessment_id: str
    assessment_name: str
    assessment_type: str
    max_score: float
    weight: float
    score: Optional[float] = None  # None if unreleased
    status: str  # draft, submitted, verified, released
    is_released: bool


class AcademicHistoryCourse(BaseModel):
    enrollment_id: str
    course_code: str
    course_title: str
    credits: float
    term_name: str
    section_identifier: str
    enrollment_status: str
    final_grade: Optional[float] = None
    final_outcome: Optional[str] = None
    attendance_sessions: int = 0
    attendance_present: int = 0
    attendance_rate: Optional[str] = None
    assessments: List[AcademicHistoryAssessment] = []
    released_average: Optional[float] = None


class StudentAcademicHistoryResponse(BaseModel):
    student_id: str
    student_name: str
    student_identifier: str
    total_enrolled_courses: int
    completed_courses: int
    cumulative_credits: float
    released_gpa: Optional[float] = None
    courses: List[AcademicHistoryCourse]


class AcademicOverviewResponse(BaseModel):
    total_terms: int
    total_departments: int
    total_courses: int
    total_offerings: int
    total_enrollments: int
    active_enrollments: int
    total_assessments: int



# -----------------------------------------------------------------------------
# Departments Endpoints
# -----------------------------------------------------------------------------

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(Department)
        .filter(Department.institution_id == current_user.institution_id)
        .order_by(Department.name.asc())
        .all()
    )


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Department)
        .filter(Department.institution_id == current_user.institution_id, Department.code == payload.code.upper())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Department code {payload.code} already exists.")

    dept = Department(
        institution_id=current_user.institution_id,
        name=payload.name,
        code=payload.code.upper(),
        status="active",
        created_at=now_utc(),
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CREATE_DEPARTMENT",
        resource_type="department",
        resource_id=dept.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={"name": dept.name, "code": dept.code},
    )
    return dept


# -----------------------------------------------------------------------------
# Academic Terms Endpoints
# -----------------------------------------------------------------------------

@router.get("/academic-terms", response_model=List[AcademicTermResponse])
def list_academic_terms(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(AcademicTerm)
        .filter(AcademicTerm.institution_id == current_user.institution_id)
        .order_by(desc(AcademicTerm.start_date))
        .all()
    )


@router.post("/academic-terms", response_model=AcademicTermResponse, status_code=status.HTTP_201_CREATED)
def create_academic_term(
    payload: AcademicTermCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    term = AcademicTerm(
        institution_id=current_user.institution_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="active",
        created_at=now_utc(),
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    return term


# -----------------------------------------------------------------------------
# Courses Endpoints
# -----------------------------------------------------------------------------

@router.get("/courses", response_model=List[CourseResponse])
def list_courses(
    department_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(Course).filter(Course.institution_id == current_user.institution_id)
    if department_id:
        query = query.filter(Course.department_id == department_id)
    return query.order_by(Course.code.asc()).all()


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Course)
        .filter(Course.institution_id == current_user.institution_id, Course.code == payload.code.upper())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Course code {payload.code} already exists.")

    course = Course(
        institution_id=current_user.institution_id,
        department_id=payload.department_id,
        code=payload.code.upper(),
        title=payload.title,
        description=payload.description,
        credits=payload.credits,
        status="active",
        created_at=now_utc(),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# -----------------------------------------------------------------------------
# Course Offerings Endpoints
# -----------------------------------------------------------------------------

@router.get("/course-offerings", response_model=List[CourseOfferingResponse])
def list_course_offerings(
    academic_term_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(CourseOffering).filter(CourseOffering.institution_id == current_user.institution_id)
    if academic_term_id:
        query = query.filter(CourseOffering.academic_term_id == academic_term_id)
    offerings = query.order_by(desc(CourseOffering.created_at)).all()

    res = []
    for off in offerings:
        res.append(
            CourseOfferingResponse(
                id=off.id,
                institution_id=off.institution_id,
                course_id=off.course_id,
                academic_term_id=off.academic_term_id,
                section_identifier=off.section_identifier,
                instructor_membership_id=off.instructor_membership_id,
                course_title=off.course.title if off.course else None,
                course_code=off.course.code if off.course else None,
                term_name=off.term.name if off.term else None,
                status=off.status,
                created_at=off.created_at,
            )
        )
    return res


@router.post("/course-offerings", response_model=CourseOfferingResponse, status_code=status.HTTP_201_CREATED)
def create_course_offering(
    payload: CourseOfferingCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    offering = CourseOffering(
        institution_id=current_user.institution_id,
        course_id=payload.course_id,
        academic_term_id=payload.academic_term_id,
        section_identifier=payload.section_identifier,
        instructor_membership_id=payload.instructor_membership_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="active",
        created_at=now_utc(),
    )
    db.add(offering)
    db.commit()
    db.refresh(offering)
    return CourseOfferingResponse(
        id=offering.id,
        institution_id=offering.institution_id,
        course_id=offering.course_id,
        academic_term_id=offering.academic_term_id,
        section_identifier=offering.section_identifier,
        instructor_membership_id=offering.instructor_membership_id,
        course_title=offering.course.title if offering.course else None,
        course_code=offering.course.code if offering.course else None,
        term_name=offering.term.name if offering.term else None,
        status=offering.status,
        created_at=offering.created_at,
    )


# -----------------------------------------------------------------------------
# Enrollments Endpoints
# -----------------------------------------------------------------------------

@router.get("/enrollments", response_model=List[EnrollmentResponse])
def list_enrollments(
    student_id: Optional[str] = None,
    course_offering_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(Enrollment).filter(Enrollment.institution_id == current_user.institution_id)

    # If student role without staff privileges, restricted to own student profile
    is_staff = current_user.has_role("institution_admin", "data_operator", "faculty_assessor", "mentor_advisor")
    if not is_staff:
        student_prof = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )
        if not student_prof:
            return []
        query = query.filter(Enrollment.student_id == student_prof.id)
    elif student_id:
        query = query.filter(Enrollment.student_id == student_id)

    if course_offering_id:
        query = query.filter(Enrollment.course_offering_id == course_offering_id)

    enrollments = query.order_by(desc(Enrollment.enrolled_at)).all()

    res = []
    for enr in enrollments:
        res.append(
            EnrollmentResponse(
                id=enr.id,
                institution_id=enr.institution_id,
                student_id=enr.student_id,
                course_offering_id=enr.course_offering_id,
                student_name=f"{enr.student.first_name} {enr.student.last_name}" if enr.student else None,
                student_identifier=enr.student.student_identifier if enr.student else None,
                course_title=enr.course_offering.course.title if enr.course_offering and enr.course_offering.course else None,
                course_code=enr.course_offering.course.code if enr.course_offering and enr.course_offering.course else None,
                enrollment_status=enr.enrollment_status,
                final_outcome=enr.final_outcome,
                final_grade=enr.final_grade,
                enrolled_at=enr.enrolled_at,
            )
        )
    return res


@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Enrollment)
        .filter(
            Enrollment.institution_id == current_user.institution_id,
            Enrollment.student_id == payload.student_id,
            Enrollment.course_offering_id == payload.course_offering_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Student is already enrolled in this course offering.")

    enr = Enrollment(
        institution_id=current_user.institution_id,
        student_id=payload.student_id,
        course_offering_id=payload.course_offering_id,
        enrollment_status="enrolled",
        enrolled_at=now_utc(),
    )
    db.add(enr)
    db.commit()
    db.refresh(enr)
    return EnrollmentResponse(
        id=enr.id,
        institution_id=enr.institution_id,
        student_id=enr.student_id,
        course_offering_id=enr.course_offering_id,
        student_name=f"{enr.student.first_name} {enr.student.last_name}" if enr.student else None,
        student_identifier=enr.student.student_identifier if enr.student else None,
        course_title=enr.course_offering.course.title if enr.course_offering and enr.course_offering.course else None,
        course_code=enr.course_offering.course.code if enr.course_offering and enr.course_offering.course else None,
        enrollment_status=enr.enrollment_status,
        final_outcome=enr.final_outcome,
        final_grade=enr.final_grade,
        enrolled_at=enr.enrolled_at,
    )


# -----------------------------------------------------------------------------
# Attendance Endpoints
# -----------------------------------------------------------------------------

@router.get("/attendance", response_model=List[AttendanceResponse])
def list_attendance(
    enrollment_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.institution_id == current_user.institution_id,
            AttendanceRecord.enrollment_id == enrollment_id,
        )
        .order_by(desc(AttendanceRecord.session_date))
        .all()
    )


@router.post("/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def record_attendance(
    payload: AttendanceCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    att = AttendanceRecord(
        institution_id=current_user.institution_id,
        enrollment_id=payload.enrollment_id,
        session_date=payload.session_date,
        status=payload.status,
        source="staff_entry",
        created_at=now_utc(),
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.patch("/attendance/{record_id}", response_model=AttendanceResponse)
def correct_attendance_record(
    record_id: str,
    payload: AttendanceCorrectionUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    att = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.institution_id == current_user.institution_id, AttendanceRecord.id == record_id)
        .first()
    )
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_status = att.status
    att.status = payload.status
    db.commit()
    db.refresh(att)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CORRECT_ATTENDANCE_RECORD",
        resource_type="attendance_records",
        resource_id=att.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={
            "record_id": att.id,
            "previous_status": old_status,
            "new_status": payload.status,
            "reason": payload.reason,
        },
    )
    return att


@router.get("/attendance/history", response_model=List[AttendanceHistoryItem])
def get_attendance_history(
    enrollment_id: Optional[str] = None,
    course_offering_id: Optional[str] = None,
    student_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    query = db.query(AttendanceRecord).filter(AttendanceRecord.institution_id == current_user.institution_id)

    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "data_operator", "mentor_advisor")
    if not is_staff:
        # Student callers only see their own attendance
        student_prof = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )
        if not student_prof:
            return []
        stu_enrs = db.query(Enrollment.id).filter(Enrollment.student_id == student_prof.id).all()
        enr_ids = [e[0] for e in stu_enrs]
        query = query.filter(AttendanceRecord.enrollment_id.in_(enr_ids))
    else:
        if student_id:
            stu_enrs = db.query(Enrollment.id).filter(Enrollment.student_id == student_id).all()
            enr_ids = [e[0] for e in stu_enrs]
            query = query.filter(AttendanceRecord.enrollment_id.in_(enr_ids))

    if enrollment_id:
        query = query.filter(AttendanceRecord.enrollment_id == enrollment_id)
    if course_offering_id:
        off_enrs = db.query(Enrollment.id).filter(Enrollment.course_offering_id == course_offering_id).all()
        enr_ids = [e[0] for e in off_enrs]
        query = query.filter(AttendanceRecord.enrollment_id.in_(enr_ids))
    if start_date:
        query = query.filter(AttendanceRecord.session_date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.session_date <= end_date)

    records = query.order_by(desc(AttendanceRecord.session_date)).limit(500).all()

    res = []
    for r in records:
        enr = r.enrollment
        stu = enr.student if enr else None
        off = enr.course_offering if enr else None
        c = off.course if off else None
        res.append(
            AttendanceHistoryItem(
                id=r.id,
                enrollment_id=r.enrollment_id,
                student_id=stu.id if stu else None,
                student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
                student_identifier=stu.student_identifier if stu else None,
                course_code=c.code if c else None,
                course_title=c.title if c else None,
                session_date=r.session_date,
                status=r.status,
                source=r.source,
                created_at=r.created_at,
            )
        )
    return res


@router.post("/attendance/bulk", status_code=status.HTTP_200_OK)
def bulk_record_attendance(
    payload: AttendanceBulkCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    saved_count = 0
    for item in payload.records:
        enr = (
            db.query(Enrollment)
            .filter(
                Enrollment.institution_id == current_user.institution_id,
                Enrollment.id == item.enrollment_id,
                Enrollment.course_offering_id == payload.course_offering_id,
            )
            .first()
        )
        if not enr:
            continue

        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.institution_id == current_user.institution_id,
                AttendanceRecord.enrollment_id == item.enrollment_id,
                AttendanceRecord.session_date == payload.session_date,
            )
            .first()
        )
        if existing:
            existing.status = item.status
            existing.source = "bulk_entry_update"
        else:
            att = AttendanceRecord(
                institution_id=current_user.institution_id,
                enrollment_id=item.enrollment_id,
                session_date=payload.session_date,
                status=item.status,
                source="bulk_entry",
                created_at=now_utc(),
            )
            db.add(att)
        saved_count += 1

    db.commit()
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="BULK_RECORD_ATTENDANCE",
        resource_type="course_offerings",
        resource_id=payload.course_offering_id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={
            "course_offering_id": payload.course_offering_id,
            "session_date": payload.session_date.isoformat(),
            "count": saved_count,
        },
    )
    return {"message": f"Successfully recorded attendance for {saved_count} students.", "count": saved_count}


@router.get("/attendance/export")
def export_attendance_csv(
    course_offering_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    query = db.query(AttendanceRecord).filter(AttendanceRecord.institution_id == current_user.institution_id)
    if course_offering_id:
        off_enrs = db.query(Enrollment.id).filter(Enrollment.course_offering_id == course_offering_id).all()
        query = query.filter(AttendanceRecord.enrollment_id.in_([e[0] for e in off_enrs]))
    if start_date:
        query = query.filter(AttendanceRecord.session_date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.session_date <= end_date)

    records = query.order_by(desc(AttendanceRecord.session_date)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Student Name", "Course Code", "Course Title", "Session Date", "Status", "Source"])

    for r in records:
        enr = r.enrollment
        stu = enr.student if enr else None
        off = enr.course_offering if enr else None
        c = off.course if off else None
        writer.writerow([
            escape_csv_formula(stu.student_identifier if stu else ""),
            escape_csv_formula(f"{stu.first_name} {stu.last_name}" if stu else ""),
            escape_csv_formula(c.code if c else ""),
            escape_csv_formula(c.title if c else ""),
            r.session_date.strftime("%Y-%m-%d"),
            escape_csv_formula(r.status),
            escape_csv_formula(r.source),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"},
    )


# -----------------------------------------------------------------------------
# Academic Overview
# -----------------------------------------------------------------------------

@router.get("/academic/overview", response_model=AcademicOverviewResponse)
def get_academic_overview(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    inst_id = current_user.institution_id
    total_terms = db.query(AcademicTerm).filter(AcademicTerm.institution_id == inst_id).count()
    total_depts = db.query(Department).filter(Department.institution_id == inst_id).count()
    total_courses = db.query(Course).filter(Course.institution_id == inst_id).count()
    total_offerings = db.query(CourseOffering).filter(CourseOffering.institution_id == inst_id).count()
    total_enrollments = db.query(Enrollment).filter(Enrollment.institution_id == inst_id).count()
    active_enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.institution_id == inst_id, Enrollment.enrollment_status == "enrolled")
        .count()
    )
    total_assessments = db.query(CourseAssessment).filter(CourseAssessment.institution_id == inst_id).count()

    return AcademicOverviewResponse(
        total_terms=total_terms,
        total_departments=total_depts,
        total_courses=total_courses,
        total_offerings=total_offerings,
        total_enrollments=total_enrollments,
        active_enrollments=active_enrollments,
        total_assessments=total_assessments,
    )


# -----------------------------------------------------------------------------
# Academic Term Updates
# -----------------------------------------------------------------------------

@router.patch("/academic-terms/{term_id}", response_model=AcademicTermResponse)
def update_academic_term(
    term_id: str,
    payload: AcademicTermUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    term = (
        db.query(AcademicTerm)
        .filter(AcademicTerm.institution_id == current_user.institution_id, AcademicTerm.id == term_id)
        .first()
    )
    if not term:
        raise HTTPException(status_code=404, detail="Academic term not found")

    if payload.name is not None:
        term.name = payload.name
    if payload.start_date is not None:
        term.start_date = payload.start_date
    if payload.end_date is not None:
        term.end_date = payload.end_date
    if payload.status is not None:
        term.status = payload.status

    db.commit()
    db.refresh(term)
    return term


# -----------------------------------------------------------------------------
# Course Updates
# -----------------------------------------------------------------------------

@router.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    payload: CourseUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    course = (
        db.query(Course)
        .filter(Course.institution_id == current_user.institution_id, Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if payload.title is not None:
        course.title = payload.title
    if payload.description is not None:
        course.description = payload.description
    if payload.credits is not None:
        course.credits = payload.credits
    if payload.department_id is not None:
        course.department_id = payload.department_id
    if payload.status is not None:
        course.status = payload.status

    db.commit()
    db.refresh(course)
    return course


# -----------------------------------------------------------------------------
# Assessment Schemes & Components Endpoints
# -----------------------------------------------------------------------------

@router.get("/course-offerings/{course_offering_id}/assessments", response_model=List[CourseAssessmentResponse])
def list_offering_assessments(
    course_offering_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    offering = (
        db.query(CourseOffering)
        .filter(CourseOffering.institution_id == current_user.institution_id, CourseOffering.id == course_offering_id)
        .first()
    )
    if not offering:
        raise HTTPException(status_code=404, detail="Course offering not found")

    assessments = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.course_offering_id == course_offering_id)
        .order_by(CourseAssessment.created_at.asc())
        .all()
    )

    res = []
    for a in assessments:
        total_sub = db.query(CourseAssessmentResult).filter(CourseAssessmentResult.assessment_id == a.id).count()
        rel_sub = (
            db.query(CourseAssessmentResult)
            .filter(CourseAssessmentResult.assessment_id == a.id, CourseAssessmentResult.status == "released")
            .count()
        )
        res.append(
            CourseAssessmentResponse(
                id=a.id,
                institution_id=a.institution_id,
                course_offering_id=a.course_offering_id,
                name=a.name,
                assessment_type=a.assessment_type,
                max_score=a.max_score,
                weight=a.weight,
                assessment_date=a.assessment_date,
                created_at=a.created_at,
                total_submissions=total_sub,
                released_submissions=rel_sub,
            )
        )
    return res


@router.post("/course-offerings/{course_offering_id}/assessments", response_model=CourseAssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_course_assessment(
    course_offering_id: str,
    payload: CourseAssessmentCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    offering = (
        db.query(CourseOffering)
        .filter(CourseOffering.institution_id == current_user.institution_id, CourseOffering.id == course_offering_id)
        .first()
    )
    if not offering:
        raise HTTPException(status_code=404, detail="Course offering not found")

    assessment = CourseAssessment(
        institution_id=current_user.institution_id,
        course_offering_id=course_offering_id,
        name=payload.name,
        assessment_type=payload.assessment_type,
        max_score=payload.max_score,
        weight=payload.weight,
        assessment_date=payload.assessment_date,
        created_at=now_utc(),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CREATE_ASSESSMENT_SCHEME_COMPONENT",
        resource_type="course_assessment",
        resource_id=assessment.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={"name": assessment.name, "type": assessment.assessment_type, "offering_id": course_offering_id},
    )

    return CourseAssessmentResponse(
        id=assessment.id,
        institution_id=assessment.institution_id,
        course_offering_id=assessment.course_offering_id,
        name=assessment.name,
        assessment_type=assessment.assessment_type,
        max_score=assessment.max_score,
        weight=assessment.weight,
        assessment_date=assessment.assessment_date,
        created_at=assessment.created_at,
        total_submissions=0,
        released_submissions=0,
    )


@router.get("/assessments/{assessment_id}", response_model=CourseAssessmentResponse)
def get_assessment(
    assessment_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    a = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    total_sub = db.query(CourseAssessmentResult).filter(CourseAssessmentResult.assessment_id == a.id).count()
    rel_sub = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.assessment_id == a.id, CourseAssessmentResult.status == "released")
        .count()
    )
    return CourseAssessmentResponse(
        id=a.id,
        institution_id=a.institution_id,
        course_offering_id=a.course_offering_id,
        name=a.name,
        assessment_type=a.assessment_type,
        max_score=a.max_score,
        weight=a.weight,
        assessment_date=a.assessment_date,
        created_at=a.created_at,
        total_submissions=total_sub,
        released_submissions=rel_sub,
    )


# -----------------------------------------------------------------------------
# Assessment Results & Release States
# -----------------------------------------------------------------------------

@router.get("/assessments/{assessment_id}/results", response_model=List[AssessmentResultResponse])
def list_assessment_results(
    assessment_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "data_operator", "mentor_advisor")

    results_query = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.assessment_id == assessment_id)
    )

    if not is_staff:
        # Student caller: verify profile and find student enrollment
        student_prof = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )
        if not student_prof:
            return []

        student_enrs = (
            db.query(Enrollment.id)
            .filter(Enrollment.student_id == student_prof.id)
            .all()
        )
        enr_ids = [e[0] for e in student_enrs]
        results_query = results_query.filter(CourseAssessmentResult.enrollment_id.in_(enr_ids))

    results = results_query.all()
    res = []
    for r in results:
        enr = r.enrollment
        stu = enr.student if enr else None
        is_rel = (r.status == "released")

        # For student callers, unreleased results MUST remain NULL/hidden
        display_score = r.score if (is_staff or is_rel) else None

        res.append(
            AssessmentResultResponse(
                id=r.id,
                institution_id=r.institution_id,
                assessment_id=r.assessment_id,
                enrollment_id=r.enrollment_id,
                student_id=stu.id if stu else None,
                student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
                student_identifier=stu.student_identifier if stu else None,
                score=display_score,
                max_score=r.max_score,
                status=r.status,
                is_released=is_rel,
                grading_metadata=r.grading_metadata if is_staff else None,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return res


@router.post("/assessments/{assessment_id}/results", status_code=status.HTTP_200_OK)
def enter_assessment_results(
    assessment_id: str,
    payload: BulkAssessmentResultsCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "faculty_assessor", "data_operator")),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    saved_count = 0
    for item in payload.results:
        enr = (
            db.query(Enrollment)
            .filter(Enrollment.institution_id == current_user.institution_id, Enrollment.id == item.enrollment_id)
            .first()
        )
        if not enr:
            continue

        existing = (
            db.query(CourseAssessmentResult)
            .filter(CourseAssessmentResult.assessment_id == assessment_id, CourseAssessmentResult.enrollment_id == item.enrollment_id)
            .first()
        )
        if existing:
            existing.score = item.score
            existing.status = item.status
            existing.grading_metadata = item.grading_metadata
            existing.assessor_membership_id = current_user.membership.id if current_user.membership else None
            existing.updated_at = now_utc()
        else:
            new_res = CourseAssessmentResult(
                institution_id=current_user.institution_id,
                assessment_id=assessment_id,
                enrollment_id=item.enrollment_id,
                score=item.score,
                max_score=assessment.max_score,
                status=item.status,
                grading_metadata=item.grading_metadata,
                assessor_membership_id=current_user.membership.id if current_user.membership else None,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(new_res)
        saved_count += 1

    db.commit()
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="ENTER_ASSESSMENT_RESULTS",
        resource_type="course_assessment",
        resource_id=assessment_id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={"assessment_id": assessment_id, "count": saved_count},
    )
    return {"message": f"Successfully recorded {saved_count} assessment results.", "count": saved_count}


@router.post("/assessments/{assessment_id}/release", status_code=status.HTTP_200_OK)
def release_assessment_results(
    assessment_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    results = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.assessment_id == assessment_id)
        .all()
    )
    for r in results:
        r.status = "released"
        r.updated_at = now_utc()

    db.commit()
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="ASSESSMENT_RESULTS_RELEASED",
        resource_type="course_assessment",
        resource_id=assessment_id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={"assessment_id": assessment_id, "released_count": len(results)},
    )
    return {"message": f"Successfully released results for {len(results)} students.", "released_count": len(results)}


@router.post("/assessments/{assessment_id}/unrelease", status_code=status.HTTP_200_OK)
def unrelease_assessment_results(
    assessment_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "faculty_assessor")),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    results = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.assessment_id == assessment_id)
        .all()
    )
    for r in results:
        r.status = "draft"
        r.updated_at = now_utc()

    db.commit()
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="ASSESSMENT_RESULTS_UNRELEASED",
        resource_type="course_assessment",
        resource_id=assessment_id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        details={"assessment_id": assessment_id, "unreleased_count": len(results)},
    )
    return {"message": f"Successfully withdrew release for {len(results)} students.", "unreleased_count": len(results)}


@router.get("/assessments/{assessment_id}/export")
def export_assessment_results_csv(
    assessment_id: str,
    include_unreleased: bool = Query(True, description="Include unreleased draft marks in export"),
    current_user: CurrentUser = Depends(require_roles("institution_admin", "faculty_assessor", "data_operator")),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == current_user.institution_id, CourseAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    results = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.assessment_id == assessment_id)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID",
        "Student Name",
        "Assessment Name",
        "Score",
        "Max Score",
        "Percentage",
        "Status",
        "Is Released",
    ])

    for r in results:
        enr = r.enrollment
        stu = enr.student if enr else None
        is_rel = (r.status == "released")

        # Explicit safety constraint: unreleased marks remain NULL if include_unreleased is False
        if is_rel or include_unreleased:
            score_str = str(r.score)
            pct_str = f"{round((r.score / (r.max_score or 100.0)) * 100.0, 1)}%"
        else:
            score_str = "NULL"
            pct_str = "PENDING_RELEASE"

        writer.writerow([
            escape_csv_formula(stu.student_identifier if stu else ""),
            escape_csv_formula(f"{stu.first_name} {stu.last_name}" if stu else ""),
            escape_csv_formula(assessment.name),
            score_str,
            str(r.max_score),
            pct_str,
            escape_csv_formula(r.status),
            str(is_rel),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=assessment_{assessment_id}_marks.csv"},
    )


@router.get("/academic/data-health", response_model=AcademicDataHealthResponse)
def get_academic_data_health(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    inst_id = current_user.institution_id
    total_students = db.query(StudentProfile).filter(StudentProfile.institution_id == inst_id).count()
    total_courses = db.query(Course).filter(Course.institution_id == inst_id).count()
    total_offerings = db.query(CourseOffering).filter(CourseOffering.institution_id == inst_id).count()
    total_enrollments = db.query(Enrollment).filter(Enrollment.institution_id == inst_id).count()

    unreleased_cnt = (
        db.query(CourseAssessmentResult)
        .filter(CourseAssessmentResult.institution_id == inst_id, CourseAssessmentResult.status != "released")
        .count()
    )

    # Missing scores: active enrollments with course assessments that have no result
    active_enrs = db.query(Enrollment).filter(Enrollment.institution_id == inst_id, Enrollment.enrollment_status == "enrolled").all()
    missing_scores = 0
    for e in active_enrs:
        asms = db.query(CourseAssessment).filter(CourseAssessment.course_offering_id == e.course_offering_id).all()
        for a in asms:
            res_exists = db.query(CourseAssessmentResult.id).filter(CourseAssessmentResult.assessment_id == a.id, CourseAssessmentResult.enrollment_id == e.id).first()
            if not res_exists:
                missing_scores += 1

    att_cnt = db.query(AttendanceRecord).filter(AttendanceRecord.institution_id == inst_id).count()

    recent_jobs = (
        db.query(ImportJob)
        .filter(ImportJob.institution_id == inst_id)
        .order_by(desc(ImportJob.created_at))
        .limit(5)
        .all()
    )
    recent_jobs_summary = [
        {
            "id": j.id,
            "import_type": j.import_type,
            "status": j.status,
            "total_rows": j.total_rows,
            "valid_rows": j.valid_rows,
            "error_rows": j.error_rows,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in recent_jobs
    ]

    freshness_status = "Optimal" if missing_scores == 0 and unreleased_cnt == 0 else "Pending Updates"

    return AcademicDataHealthResponse(
        total_students=total_students,
        total_courses=total_courses,
        total_offerings=total_offerings,
        total_enrollments=total_enrollments,
        unreleased_results_count=unreleased_cnt,
        missing_scores_count=missing_scores,
        attendance_records_count=att_cnt,
        data_freshness_status=freshness_status,
        recent_imports=recent_jobs_summary,
    )


# -----------------------------------------------------------------------------
# Enrollment Lifecycle Updates
# -----------------------------------------------------------------------------

@router.patch("/enrollments/{enrollment_id}", response_model=EnrollmentResponse)
def update_enrollment(
    enrollment_id: str,
    payload: EnrollmentStatusUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    enr = (
        db.query(Enrollment)
        .filter(Enrollment.institution_id == current_user.institution_id, Enrollment.id == enrollment_id)
        .first()
    )
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    if payload.enrollment_status is not None:
        enr.enrollment_status = payload.enrollment_status
    if payload.final_grade is not None:
        enr.final_grade = payload.final_grade
    if payload.final_outcome is not None:
        enr.final_outcome = payload.final_outcome

    db.commit()
    db.refresh(enr)
    return EnrollmentResponse(
        id=enr.id,
        institution_id=enr.institution_id,
        student_id=enr.student_id,
        course_offering_id=enr.course_offering_id,
        student_name=f"{enr.student.first_name} {enr.student.last_name}" if enr.student else None,
        student_identifier=enr.student.student_identifier if enr.student else None,
        course_title=enr.course_offering.course.title if enr.course_offering and enr.course_offering.course else None,
        course_code=enr.course_offering.course.code if enr.course_offering and enr.course_offering.course else None,
        enrollment_status=enr.enrollment_status,
        final_outcome=enr.final_outcome,
        final_grade=enr.final_grade,
        enrolled_at=enr.enrolled_at,
    )


# -----------------------------------------------------------------------------
# Student Academic History & Released-Result Visibility
# -----------------------------------------------------------------------------

@router.get("/academic/my-history", response_model=StudentAcademicHistoryResponse)
def get_my_academic_history(
    student_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "data_operator", "mentor_advisor")

    if is_staff and student_id:
        target_student = (
            db.query(StudentProfile)
            .filter(StudentProfile.institution_id == current_user.institution_id, StudentProfile.id == student_id)
            .first()
        )
    else:
        target_student = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id) | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )

    if not target_student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == target_student.id)
        .order_by(desc(Enrollment.enrolled_at))
        .all()
    )

    courses_list = []
    total_credits = 0.0
    completed_courses = 0
    all_released_scores = []

    for enr in enrollments:
        off = enr.course_offering
        c = off.course if off else None
        term = off.term if off else None

        credits = float(c.credits) if c and c.credits else 3.0
        total_credits += credits

        if enr.enrollment_status in ("completed", "passed"):
            completed_courses += 1

        # Attendance calculation
        atts = db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id == enr.id).all()
        att_cnt = len(atts)
        present_cnt = sum(1 for a in atts if a.status in ("present", "late"))
        att_rate = f"{round((present_cnt / att_cnt) * 100.0, 1)}%" if att_cnt > 0 else "N/A"

        # Assessment components
        results = (
            db.query(CourseAssessmentResult, CourseAssessment)
            .join(CourseAssessment, CourseAssessmentResult.assessment_id == CourseAssessment.id)
            .filter(CourseAssessmentResult.enrollment_id == enr.id)
            .all()
        )

        asms_list = []
        course_released_scores = []
        for r, a in results:
            is_rel = (r.status == "released")
            # Unreleased marks remain NULL and MUST NOT leak to students
            display_score = r.score if (is_staff or is_rel) else None

            if is_rel:
                pct = (r.score / (a.max_score or 100.0)) * 100.0
                course_released_scores.append(pct)
                all_released_scores.append(pct)

            asms_list.append(
                AcademicHistoryAssessment(
                    assessment_id=a.id,
                    assessment_name=a.name,
                    assessment_type=a.assessment_type,
                    max_score=a.max_score,
                    weight=a.weight,
                    score=display_score,
                    status=r.status,
                    is_released=is_rel,
                )
            )

        released_avg = (
            round(sum(course_released_scores) / len(course_released_scores), 1)
            if course_released_scores
            else None
        )

        courses_list.append(
            AcademicHistoryCourse(
                enrollment_id=enr.id,
                course_code=c.code if c else "CODE",
                course_title=c.title if c else "Course Title",
                credits=credits,
                term_name=term.name if term else "Term",
                section_identifier=off.section_identifier if off else "01",
                enrollment_status=enr.enrollment_status,
                final_grade=enr.final_grade,
                final_outcome=enr.final_outcome,
                attendance_sessions=att_cnt,
                attendance_present=present_cnt,
                attendance_rate=att_rate,
                assessments=asms_list,
                released_average=released_avg,
            )
        )

    released_gpa = (
        round((sum(all_released_scores) / len(all_released_scores)) / 25.0, 2)
        if all_released_scores
        else None
    )

    return StudentAcademicHistoryResponse(
        student_id=target_student.id,
        student_name=f"{target_student.first_name} {target_student.last_name}",
        student_identifier=target_student.student_identifier,
        total_enrolled_courses=len(enrollments),
        completed_courses=completed_courses,
        cumulative_credits=total_credits,
        released_gpa=released_gpa,
        courses=courses_list,
    )

