import csv
import io
import math
from typing import Optional, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.database import get_db
from app.models import (
    StudentProfile,
    StudentProfileRevision,
    Cohort,
    CohortMembership,
    ImportJob,
    ImportStagedRow,
    ImportIssue,
    AuditEvent,
)
from app.schemas import (
    StudentProfileResponse,
    StudentProfileCreate,
    StudentProfileUpdate,
    ImportJobResponse,
    ImportJobCreate,
    ImportPreviewResponse,
    ImportIssueResponse,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.domain.importer import validate_and_stage_csv, commit_import_job

router = APIRouter(tags=["Student Records & Imports"])


@router.get("/students")
def list_students(
    cohort_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = "name",
    sort_order: Optional[str] = "asc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    # Student can only see their own profile if they don't have staff roles
    is_staff = current_user.has_role(
        "institution_admin", "faculty_assessor", "mentor_advisor", "data_operator", "platform_super_admin"
    )

    query = db.query(StudentProfile).filter(StudentProfile.institution_id == current_user.institution_id)

    if not is_staff:
        # Restricted to own profile
        query = query.filter(
            (StudentProfile.account_id == current_user.account.id)
            | (StudentProfile.email == current_user.account.email)
        )

    if status:
        query = query.filter(StudentProfile.status == status)

    if search:
        s_pat = f"%{search}%"
        query = query.filter(
            StudentProfile.first_name.ilike(s_pat)
            | StudentProfile.last_name.ilike(s_pat)
            | StudentProfile.student_identifier.ilike(s_pat)
            | StudentProfile.email.ilike(s_pat)
        )

    if cohort_id:
        student_ids = [
            cm.student_id
            for cm in db.query(CohortMembership)
            .filter(
                CohortMembership.institution_id == current_user.institution_id,
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.status == "active",
            )
            .all()
        ]
        query = query.filter(StudentProfile.id.in_(student_ids))

    # Sorting
    is_desc = (sort_order and sort_order.lower() == "desc")
    if sort_by == "identifier":
        query = query.order_by(desc(StudentProfile.student_identifier) if is_desc else asc(StudentProfile.student_identifier))
    elif sort_by == "created_at":
        query = query.order_by(desc(StudentProfile.created_at) if is_desc else asc(StudentProfile.created_at))
    elif sort_by == "status":
        query = query.order_by(desc(StudentProfile.status) if is_desc else asc(StudentProfile.status))
    else:  # default "name"
        if is_desc:
            query = query.order_by(desc(StudentProfile.last_name), desc(StudentProfile.first_name))
        else:
            query = query.order_by(asc(StudentProfile.last_name), asc(StudentProfile.first_name))

    total = query.count()

    if page is not None and page_size is not None and page_size > 0:
        students = query.offset((page - 1) * page_size).limit(page_size).all()
    else:
        students = query.all()

    res = []
    for s in students:
        cohort_mem = (
            db.query(CohortMembership)
            .filter(
                CohortMembership.institution_id == current_user.institution_id,
                CohortMembership.student_id == s.id,
                CohortMembership.status == "active",
            )
            .first()
        )
        cname = cohort_mem.cohort.name if cohort_mem and hasattr(cohort_mem, "cohort") and cohort_mem.cohort else None
        res.append(
            StudentProfileResponse(
                id=s.id,
                student_identifier=s.student_identifier,
                first_name=s.first_name,
                last_name=s.last_name,
                email=s.email,
                status=s.status,
                cohort_name=cname,
                created_at=s.created_at,
            )
        )

    if page is not None and page_size is not None and page_size > 0:
        return {
            "items": res,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 1,
        }
    return res


@router.get("/students/export")
def export_students(
    cohort_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    query = db.query(StudentProfile).filter(StudentProfile.institution_id == current_user.institution_id)
    if status:
        query = query.filter(StudentProfile.status == status)
    if cohort_id:
        student_ids = [
            cm.student_id
            for cm in db.query(CohortMembership)
            .filter(
                CohortMembership.institution_id == current_user.institution_id,
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.status == "active",
            )
            .all()
        ]
        query = query.filter(StudentProfile.id.in_(student_ids))

    students = query.order_by(StudentProfile.last_name, StudentProfile.first_name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "First Name", "Last Name", "Email", "Status", "Cohort", "Enrolled Date"])

    def sanitize(val: Any) -> str:
        s = str(val or "")
        if s.startswith(("=", "+", "-", "@")):
            return f"'{s}"
        return s

    for s in students:
        cohort_mem = (
            db.query(CohortMembership)
            .filter(
                CohortMembership.institution_id == current_user.institution_id,
                CohortMembership.student_id == s.id,
                CohortMembership.status == "active",
            )
            .first()
        )
        cname = cohort_mem.cohort.name if cohort_mem and hasattr(cohort_mem, "cohort") and cohort_mem.cohort else "Unassigned"
        writer.writerow([
            sanitize(s.student_identifier),
            sanitize(s.first_name),
            sanitize(s.last_name),
            sanitize(s.email),
            sanitize(s.status),
            sanitize(cname),
            s.created_at.strftime("%Y-%m-%d") if s.created_at else "",
        ])

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id if current_user.membership else None,
            action="STUDENT_DIRECTORY_EXPORTED",
            resource_type="student_profiles",
            purpose=f"Exported {len(students)} student records to CSV",
        )
    )
    db.commit()

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=students_export_{int(datetime.now(timezone.utc).timestamp())}.csv"},
    )



@router.post("/students", response_model=StudentProfileResponse)
def create_student(
    req: StudentProfileCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    # Check duplicate identifier
    exists = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            StudentProfile.student_identifier == req.student_identifier,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Student identifier already exists")

    # Enforce licence student seat limit
    from app.services.licence_service import check_seat_limit
    check_seat_limit(db, current_user.institution_id, "student")

    profile = StudentProfile(
        institution_id=current_user.institution_id,
        student_identifier=req.student_identifier,
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email.lower(),
        status="active",
    )
    db.add(profile)
    db.flush()

    cohort_name = None
    if req.cohort_id:
        cohort = (
            db.query(Cohort)
            .filter(
                Cohort.institution_id == current_user.institution_id,
                Cohort.id == req.cohort_id,
            )
            .first()
        )
        if cohort:
            db.add(
                CohortMembership(
                    institution_id=current_user.institution_id,
                    student_id=profile.id,
                    cohort_id=cohort.id,
                    status="active",
                )
            )
            cohort_name = cohort.name

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id,
            action="STUDENT_CREATED",
            resource_type="student_profiles",
            resource_id=profile.id,
            purpose=f"Created student {profile.student_identifier}",
        )
    )
    db.commit()

    return StudentProfileResponse(
        id=profile.id,
        student_identifier=profile.student_identifier,
        first_name=profile.first_name,
        last_name=profile.last_name,
        email=profile.email,
        status=profile.status,
        cohort_name=cohort_name,
        created_at=profile.created_at,
    )


@router.get("/students/{student_id}", response_model=StudentProfileResponse)
def get_student(
    student_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            StudentProfile.id == student_id,
        )
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    is_staff = current_user.has_role(
        "institution_admin", "faculty_assessor", "mentor_advisor", "data_operator", "platform_super_admin"
    )
    if not is_staff:
        # Must be own profile
        if profile.account_id != current_user.account.id and profile.email != current_user.account.email:
            raise HTTPException(status_code=404, detail="Student not found")

    cohort_mem = (
        db.query(CohortMembership)
        .filter(
            CohortMembership.institution_id == current_user.institution_id,
            CohortMembership.student_id == profile.id,
            CohortMembership.status == "active",
        )
        .first()
    )
    cname = cohort_mem.cohort.name if cohort_mem and hasattr(cohort_mem, "cohort") and cohort_mem.cohort else None

    return StudentProfileResponse(
        id=profile.id,
        student_identifier=profile.student_identifier,
        first_name=profile.first_name,
        last_name=profile.last_name,
        email=profile.email,
        status=profile.status,
        cohort_name=cname,
        created_at=profile.created_at,
    )


@router.patch("/students/{student_id}", response_model=StudentProfileResponse)
def update_student(
    student_id: str,
    req: StudentProfileUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            StudentProfile.id == student_id,
        )
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    prior = {
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "email": profile.email,
        "status": profile.status,
    }

    if req.first_name:
        profile.first_name = req.first_name
    if req.last_name:
        profile.last_name = req.last_name
    if req.email:
        profile.email = req.email.lower()
    if req.status:
        profile.status = req.status

    new_snap = {
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "email": profile.email,
        "status": profile.status,
    }

    rev_count = (
        db.query(StudentProfileRevision)
        .filter(
            StudentProfileRevision.institution_id == current_user.institution_id,
            StudentProfileRevision.student_id == profile.id,
        )
        .count()
    )

    db.add(
        StudentProfileRevision(
            institution_id=current_user.institution_id,
            student_id=profile.id,
            revision_number=rev_count + 1,
            actor_membership_id=current_user.membership.id,
            prior_snapshot=prior,
            new_snapshot=new_snap,
            reason=req.reason,
        )
    )
    db.commit()
    return get_student(student_id=student_id, current_user=current_user, db=db)


# CSV Import endpoints
@router.post("/imports", response_model=ImportJobResponse)
def create_import_job(
    req: ImportJobCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    # Idempotency deduplication check
    if req.idempotency_key:
        existing = (
            db.query(ImportJob)
            .filter(
                ImportJob.institution_id == current_user.institution_id,
                ImportJob.idempotency_key == req.idempotency_key,
            )
            .first()
        )
        if existing:
            return existing

    job = ImportJob(
        institution_id=current_user.institution_id,
        initiator_membership_id=current_user.membership.id,
        import_type=req.import_type,
        template_version=req.template_version,
        idempotency_key=req.idempotency_key,
        status="awaiting_upload",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/imports", response_model=list[ImportJobResponse])
def list_import_jobs(
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    return (
        db.query(ImportJob)
        .filter(ImportJob.institution_id == current_user.institution_id)
        .order_by(ImportJob.created_at.desc())
        .all()
    )


@router.get("/imports/{import_id}", response_model=ImportJobResponse)
def get_import_job(
    import_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    job = (
        db.query(ImportJob)
        .filter(
            ImportJob.institution_id == current_user.institution_id,
            ImportJob.id == import_id,
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


@router.post("/imports/{import_id}/validate", response_model=ImportJobResponse)
async def validate_import_file(
    import_id: str,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    # 1. Format check: Only CSV is supported
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Only CSV (.csv) files are supported in this release.",
        )

    # 2. File size & empty check
    content_bytes = await file.read()
    if len(content_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
    if len(content_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 5MB maximum limit.",
        )

    # 3. Decode UTF-8 with BOM support
    content = content_bytes.decode("utf-8-sig", errors="replace")

    try:
        job = validate_and_stage_csv(
            db=db,
            institution_id=current_user.institution_id,
            job_id=import_id,
            csv_content=content,
        )
        return job
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@router.get("/imports/{import_id}/preview", response_model=ImportPreviewResponse)
def get_import_preview(
    import_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    job = (
        db.query(ImportJob)
        .filter(
            ImportJob.institution_id == current_user.institution_id,
            ImportJob.id == import_id,
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")

    staged = (
        db.query(ImportStagedRow)
        .filter(
            ImportStagedRow.institution_id == current_user.institution_id,
            ImportStagedRow.import_job_id == job.id,
        )
        .limit(10)
        .all()
    )

    issues = (
        db.query(ImportIssue)
        .filter(
            ImportIssue.institution_id == current_user.institution_id,
            ImportIssue.import_job_id == job.id,
        )
        .limit(50)
        .all()
    )

    sample_rows = [s.raw_data for s in staged]
    issue_dicts = [
        {
            "row_number": i.row_number,
            "field_name": i.field_name,
            "severity": i.severity,
            "code": i.code,
            "message": i.message,
        }
        for i in issues
    ]

    return ImportPreviewResponse(
        job_id=job.id,
        status=job.status,
        total_rows=job.total_rows,
        valid_rows=job.valid_rows,
        error_rows=job.error_rows,
        sample_rows=sample_rows,
        issues=issue_dicts,
    )


@router.post("/imports/{import_id}/commit")
def commit_import(
    import_id: str,
    allow_partial: bool = Query(False, description="Commit valid rows even if errors exist"),
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    try:
        res = commit_import_job(
            db=db,
            institution_id=current_user.institution_id,
            job_id=import_id,
            actor_membership_id=current_user.membership.id,
            allow_partial=allow_partial,
        )
        return res
    except ValueError as val_ex:
        raise HTTPException(status_code=400, detail=str(val_ex))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@router.get("/imports/templates/{import_type}")
def get_import_template(
    import_type: str,
    current_user: CurrentUser = Depends(require_authenticated),
):
    t = import_type.lower()
    if t in ("students", "roster"):
        csv_data = "student_identifier,first_name,last_name,email,cohort_name\nAPEX-CSE-101,John,Doe,john.doe@apex.edu,2026 Batch - Section A\n"
        filename = "students_roster_template.csv"
    elif t == "attendance":
        csv_data = "student_identifier,course_code,session_date,status\nAPEX-CSE-101,CS101,2026-10-12,present\n"
        filename = "attendance_template.csv"
    elif t in ("marks", "assessment_results", "assessments"):
        csv_data = "student_identifier,course_code,assessment_name,score,status\nAPEX-CSE-101,CS101,Midterm Exam,85.5,draft\n"
        filename = "assessment_marks_template.csv"
    elif t == "enrollments":
        csv_data = "student_identifier,course_code,section_identifier,enrollment_status\nAPEX-CSE-101,CS101,01,enrolled\n"
        filename = "enrollments_template.csv"
    else:
        raise HTTPException(status_code=400, detail=f"No template available for import type '{import_type}'. Supported: students, attendance, marks, enrollments")

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

