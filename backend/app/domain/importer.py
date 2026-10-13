import csv
import io
import re
from datetime import date, datetime, timezone
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import (
    ImportJob,
    ImportStagedRow,
    ImportIssue,
    StudentProfile,
    Cohort,
    CohortMembership,
    Course,
    CourseOffering,
    Enrollment,
    AttendanceRecord,
    CourseAssessment,
    CourseAssessmentResult,
    AuditEvent,
    now_utc,
)

EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")
MAX_IMPORT_ROWS = 10000


def escape_csv_formula(val: Any) -> str:
    """
    Neutralize CSV / formula injection vulnerability by prefixing
    potentially executable formula triggers (=, +, -, @, tab, cr) with a single quote.
    """
    if val is None:
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


def validate_and_stage_csv(
    db: Session,
    institution_id: str,
    job_id: str,
    csv_content: str,
) -> ImportJob:
    """
    Validates CSV content against the schema for job.import_type,
    stages all rows in ImportStagedRow and records row-level errors in ImportIssue.
    Does NOT mutate live student/academic tables (strictly dry-run isolated).
    """
    job = (
        db.query(ImportJob)
        .filter(ImportJob.institution_id == institution_id, ImportJob.id == job_id)
        .first()
    )
    if not job:
        raise ValueError("Import job not found")

    job.status = "validating"
    db.flush()

    # Clear previous staged rows and issues if re-validating
    db.query(ImportIssue).filter(ImportIssue.import_job_id == job.id).delete()
    db.query(ImportStagedRow).filter(ImportStagedRow.import_job_id == job.id).delete()

    # Strip BOM if present
    if csv_content.startswith("\ufeff"):
        csv_content = csv_content[1:]

    reader = csv.DictReader(io.StringIO(csv_content))
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]

    import_type = (job.import_type or "students").lower()
    if import_type in ("students", "roster"):
        return _validate_roster(db, institution_id, job, reader, fieldnames)
    elif import_type == "attendance":
        return _validate_attendance(db, institution_id, job, reader, fieldnames)
    elif import_type in ("assessment_results", "marks", "assessments"):
        return _validate_assessment_results(db, institution_id, job, reader, fieldnames)
    elif import_type == "enrollments":
        return _validate_enrollments(db, institution_id, job, reader, fieldnames)
    else:
        job.status = "validation_failed"
        job.error_rows = 1
        db.add(
            ImportIssue(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=1,
                field_name="import_type",
                severity="error",
                code="UNSUPPORTED_IMPORT_TYPE",
                message=f"Unsupported import type '{import_type}'. Supported: students, attendance, marks, enrollments",
            )
        )
        db.commit()
        return job


def _validate_roster(
    db: Session,
    institution_id: str,
    job: ImportJob,
    reader: csv.DictReader,
    fieldnames: list[str],
) -> ImportJob:
    required_fields = ["student_identifier", "first_name", "last_name", "email"]
    missing_headers = [f for f in required_fields if f not in fieldnames]

    if missing_headers:
        job.status = "validation_failed"
        job.error_rows = 1
        db.add(
            ImportIssue(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=1,
                field_name=None,
                severity="error",
                code="MISSING_HEADERS",
                message=f"Missing required CSV columns: {', '.join(missing_headers)}",
            )
        )
        db.commit()
        return job

    seen_identifiers = set()
    seen_emails = set()
    total_rows = 0
    valid_rows = 0
    error_rows = 0

    existing_idents = set(
        x[0]
        for x in db.query(StudentProfile.student_identifier)
        .filter(StudentProfile.institution_id == institution_id)
        .all()
    )

    for idx, row in enumerate(reader, start=2):
        if total_rows >= MAX_IMPORT_ROWS:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=None,
                    severity="error",
                    code="ROW_LIMIT_EXCEEDED",
                    message=f"File exceeds maximum allowed rows ({MAX_IMPORT_ROWS})",
                )
            )
            error_rows += 1
            break

        total_rows += 1
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        row_issues = []

        ident = clean_row.get("student_identifier", "")
        fname = clean_row.get("first_name", "")
        lname = clean_row.get("last_name", "")
        email = clean_row.get("email", "")

        if not ident:
            row_issues.append(("student_identifier", "MISSING_FIELD", "student_identifier is required"))
        elif ident in seen_identifiers:
            row_issues.append(("student_identifier", "DUPLICATE_IN_FILE", f"Identifier '{ident}' is duplicated in file"))
        elif ident in existing_idents:
            row_issues.append(("student_identifier", "ALREADY_EXISTS", f"Identifier '{ident}' already exists in roster"))
        else:
            seen_identifiers.add(ident)

        if not fname:
            row_issues.append(("first_name", "MISSING_FIELD", "first_name is required"))
        if not lname:
            row_issues.append(("last_name", "MISSING_FIELD", "last_name is required"))

        if not email:
            row_issues.append(("email", "MISSING_FIELD", "email is required"))
        elif not EMAIL_REGEX.match(email):
            row_issues.append(("email", "INVALID_EMAIL", f"'{email}' is not a valid email address"))
        elif email.lower() in seen_emails:
            row_issues.append(("email", "DUPLICATE_IN_FILE", f"Email '{email}' is duplicated in file"))
        else:
            seen_emails.add(email.lower())

        is_row_valid = len(row_issues) == 0
        if is_row_valid:
            valid_rows += 1
        else:
            error_rows += 1

        db.add(
            ImportStagedRow(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=idx,
                raw_data=row,
                parsed_data=clean_row if is_row_valid else None,
                action="create",
                is_valid=is_row_valid,
            )
        )

        for field, code, msg in row_issues:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=field,
                    severity="error",
                    code=code,
                    message=msg,
                )
            )

    job.total_rows = total_rows
    job.valid_rows = valid_rows
    job.error_rows = error_rows
    job.status = "validated" if error_rows == 0 and total_rows > 0 else "validation_failed"

    db.commit()
    return job


def _validate_attendance(
    db: Session,
    institution_id: str,
    job: ImportJob,
    reader: csv.DictReader,
    fieldnames: list[str],
) -> ImportJob:
    # Must identify student (student_identifier or email), course (course_code or course_offering_id), date, status
    has_student = "student_identifier" in fieldnames or "email" in fieldnames
    has_course = "course_code" in fieldnames or "course_offering_id" in fieldnames
    has_date = "session_date" in fieldnames
    has_status = "status" in fieldnames

    missing = []
    if not has_student:
        missing.append("student_identifier or email")
    if not has_course:
        missing.append("course_code or course_offering_id")
    if not has_date:
        missing.append("session_date")
    if not has_status:
        missing.append("status")

    if missing:
        job.status = "validation_failed"
        job.error_rows = 1
        db.add(
            ImportIssue(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=1,
                field_name=None,
                severity="error",
                code="MISSING_HEADERS",
                message=f"Missing required CSV columns for attendance: {', '.join(missing)}",
            )
        )
        db.commit()
        return job

    # Cache students and course offerings for tenant
    students = (
        db.query(StudentProfile)
        .filter(StudentProfile.institution_id == institution_id)
        .all()
    )
    student_by_ident = {s.student_identifier: s for s in students if s.student_identifier}
    student_by_email = {s.email.lower(): s for s in students if s.email}

    courses = db.query(Course).filter(Course.institution_id == institution_id).all()
    course_by_code = {c.code.upper(): c for c in courses if c.code}

    offerings = db.query(CourseOffering).filter(CourseOffering.institution_id == institution_id).all()
    offering_by_id = {o.id: o for o in offerings}
    # Map course_id -> list of offerings
    offerings_by_course: dict[str, list[CourseOffering]] = {}
    for o in offerings:
        offerings_by_course.setdefault(o.course_id, []).append(o)

    seen_keys = set()
    total_rows = 0
    valid_rows = 0
    error_rows = 0

    valid_statuses = {"present", "absent", "late", "excused"}

    for idx, row in enumerate(reader, start=2):
        if total_rows >= MAX_IMPORT_ROWS:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=None,
                    severity="error",
                    code="ROW_LIMIT_EXCEEDED",
                    message=f"File exceeds maximum allowed rows ({MAX_IMPORT_ROWS})",
                )
            )
            error_rows += 1
            break

        total_rows += 1
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        row_issues = []

        ident = clean_row.get("student_identifier", "")
        email = clean_row.get("email", "").lower()
        code = clean_row.get("course_code", "").upper()
        off_id = clean_row.get("course_offering_id", "")
        s_date_str = clean_row.get("session_date", "")
        att_status = clean_row.get("status", "").lower()

        # 1. Resolve student
        student = student_by_ident.get(ident) if ident else None
        if not student and email:
            student = student_by_email.get(email)

        if not student:
            row_issues.append(("student_identifier", "STUDENT_NOT_FOUND", f"Student '{ident or email}' not found in institution roster"))

        # 2. Resolve offering
        offering: Optional[CourseOffering] = None
        if off_id and off_id in offering_by_id:
            offering = offering_by_id[off_id]
        elif code and code in course_by_code:
            c = course_by_code[code]
            c_offs = offerings_by_course.get(c.id, [])
            if c_offs:
                offering = c_offs[0]  # default to primary offering
            else:
                row_issues.append(("course_code", "OFFERING_NOT_FOUND", f"No active course offering found for course '{code}'"))
        else:
            row_issues.append(("course_code", "COURSE_NOT_FOUND", f"Course '{code or off_id}' not found"))

        # 3. Resolve enrollment
        enrollment_id: Optional[str] = None
        if student and offering:
            enr = (
                db.query(Enrollment)
                .filter(
                    Enrollment.institution_id == institution_id,
                    Enrollment.student_id == student.id,
                    Enrollment.course_offering_id == offering.id,
                )
                .first()
            )
            if not enr:
                row_issues.append(("enrollment", "ENROLLMENT_NOT_FOUND", f"Student {student.student_identifier} is not enrolled in course {code or offering.id}"))
            else:
                enrollment_id = enr.id

        # 4. Validate session_date
        parsed_date: Optional[date] = None
        if not s_date_str:
            row_issues.append(("session_date", "MISSING_FIELD", "session_date is required"))
        else:
            try:
                parsed_date = datetime.strptime(s_date_str, "%Y-%m-%d").date()
            except ValueError:
                row_issues.append(("session_date", "INVALID_DATE_FORMAT", f"Date '{s_date_str}' must be in YYYY-MM-DD format"))

        # 5. Validate status
        if not att_status:
            row_issues.append(("status", "MISSING_FIELD", "status is required"))
        elif att_status not in valid_statuses:
            row_issues.append(("status", "INVALID_STATUS", f"Status '{att_status}' invalid. Must be one of: present, absent, late, excused"))

        # 6. Duplicate check in file
        if enrollment_id and parsed_date:
            dup_key = (enrollment_id, parsed_date)
            if dup_key in seen_keys:
                row_issues.append(("session_date", "DUPLICATE_IN_FILE", f"Attendance for student on date '{parsed_date}' already in file"))
            else:
                seen_keys.add(dup_key)

        is_row_valid = len(row_issues) == 0
        if is_row_valid:
            valid_rows += 1
            parsed_data = {
                "enrollment_id": enrollment_id,
                "session_date": parsed_date.isoformat() if parsed_date else None,
                "status": att_status,
                "source": "csv_import",
            }
        else:
            error_rows += 1
            parsed_data = None

        db.add(
            ImportStagedRow(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=idx,
                raw_data=row,
                parsed_data=parsed_data,
                action="upsert",
                is_valid=is_row_valid,
            )
        )

        for field, code_err, msg in row_issues:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=field,
                    severity="error",
                    code=code_err,
                    message=msg,
                )
            )

    job.total_rows = total_rows
    job.valid_rows = valid_rows
    job.error_rows = error_rows
    job.status = "validated" if error_rows == 0 and total_rows > 0 else "validation_failed"

    db.commit()
    return job


def _validate_assessment_results(
    db: Session,
    institution_id: str,
    job: ImportJob,
    reader: csv.DictReader,
    fieldnames: list[str],
) -> ImportJob:
    has_student = "student_identifier" in fieldnames or "email" in fieldnames
    has_assessment = "assessment_name" in fieldnames or "assessment_id" in fieldnames
    has_score = "score" in fieldnames

    missing = []
    if not has_student:
        missing.append("student_identifier or email")
    if not has_assessment:
        missing.append("assessment_name or assessment_id")
    if not has_score:
        missing.append("score")

    if missing:
        job.status = "validation_failed"
        job.error_rows = 1
        db.add(
            ImportIssue(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=1,
                field_name=None,
                severity="error",
                code="MISSING_HEADERS",
                message=f"Missing required CSV columns for marks import: {', '.join(missing)}",
            )
        )
        db.commit()
        return job

    students = (
        db.query(StudentProfile)
        .filter(StudentProfile.institution_id == institution_id)
        .all()
    )
    student_by_ident = {s.student_identifier: s for s in students if s.student_identifier}
    student_by_email = {s.email.lower(): s for s in students if s.email}

    assessments = (
        db.query(CourseAssessment)
        .filter(CourseAssessment.institution_id == institution_id)
        .all()
    )
    assessment_by_id = {a.id: a for a in assessments}
    # Also index by lowercase name
    assessment_by_name = {a.name.strip().lower(): a for a in assessments}

    seen_keys = set()
    total_rows = 0
    valid_rows = 0
    error_rows = 0

    valid_statuses = {"draft", "submitted", "graded", "released"}

    for idx, row in enumerate(reader, start=2):
        if total_rows >= MAX_IMPORT_ROWS:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=None,
                    severity="error",
                    code="ROW_LIMIT_EXCEEDED",
                    message=f"File exceeds maximum allowed rows ({MAX_IMPORT_ROWS})",
                )
            )
            error_rows += 1
            break

        total_rows += 1
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        row_issues = []

        ident = clean_row.get("student_identifier", "")
        email = clean_row.get("email", "").lower()
        asm_id = clean_row.get("assessment_id", "")
        asm_name = clean_row.get("assessment_name", "").strip().lower()
        score_str = clean_row.get("score", "")
        res_status = clean_row.get("status", "draft").lower() or "draft"

        # 1. Resolve student
        student = student_by_ident.get(ident) if ident else None
        if not student and email:
            student = student_by_email.get(email)
        if not student:
            row_issues.append(("student_identifier", "STUDENT_NOT_FOUND", f"Student '{ident or email}' not found in roster"))

        # 2. Resolve assessment
        assessment: Optional[CourseAssessment] = None
        if asm_id and asm_id in assessment_by_id:
            assessment = assessment_by_id[asm_id]
        elif asm_name and asm_name in assessment_by_name:
            assessment = assessment_by_name[asm_name]
        else:
            row_issues.append(("assessment_name", "ASSESSMENT_NOT_FOUND", f"Assessment '{asm_name or asm_id}' not found"))

        # 3. Resolve enrollment
        enrollment_id: Optional[str] = None
        if student and assessment:
            enr = (
                db.query(Enrollment)
                .filter(
                    Enrollment.institution_id == institution_id,
                    Enrollment.student_id == student.id,
                    Enrollment.course_offering_id == assessment.course_offering_id,
                )
                .first()
            )
            if not enr:
                row_issues.append(("enrollment", "ENROLLMENT_NOT_FOUND", f"Student '{student.student_identifier}' is not enrolled in the course offering for this assessment"))
            else:
                enrollment_id = enr.id

        # 4. Validate score
        parsed_score: Optional[float] = None
        if not score_str:
            row_issues.append(("score", "MISSING_FIELD", "score is required"))
        else:
            try:
                parsed_score = float(score_str)
                if parsed_score < 0:
                    row_issues.append(("score", "NEGATIVE_SCORE", "Score cannot be negative"))
                elif assessment and parsed_score > assessment.max_score:
                    row_issues.append(("score", "SCORE_EXCEEDS_MAX", f"Score {parsed_score} exceeds max score {assessment.max_score}"))
            except ValueError:
                row_issues.append(("score", "INVALID_SCORE", f"Score '{score_str}' is not a valid number"))

        # 5. Validate status
        if res_status not in valid_statuses:
            row_issues.append(("status", "INVALID_STATUS", f"Status '{res_status}' invalid. Must be draft, submitted, graded, or released"))

        # 6. Duplicate check in file
        if enrollment_id and assessment:
            dup_key = (assessment.id, enrollment_id)
            if dup_key in seen_keys:
                row_issues.append(("assessment_id", "DUPLICATE_IN_FILE", f"Score for student on this assessment is duplicated in file"))
            else:
                seen_keys.add(dup_key)

        is_row_valid = len(row_issues) == 0
        if is_row_valid:
            valid_rows += 1
            parsed_data = {
                "assessment_id": assessment.id if assessment else None,
                "enrollment_id": enrollment_id,
                "score": parsed_score,
                "max_score": assessment.max_score if assessment else 100.0,
                "status": res_status,
            }
        else:
            error_rows += 1
            parsed_data = None

        db.add(
            ImportStagedRow(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=idx,
                raw_data=row,
                parsed_data=parsed_data,
                action="upsert",
                is_valid=is_row_valid,
            )
        )

        for field, code_err, msg in row_issues:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=field,
                    severity="error",
                    code=code_err,
                    message=msg,
                )
            )

    job.total_rows = total_rows
    job.valid_rows = valid_rows
    job.error_rows = error_rows
    job.status = "validated" if error_rows == 0 and total_rows > 0 else "validation_failed"

    db.commit()
    return job


def _validate_enrollments(
    db: Session,
    institution_id: str,
    job: ImportJob,
    reader: csv.DictReader,
    fieldnames: list[str],
) -> ImportJob:
    has_student = "student_identifier" in fieldnames or "email" in fieldnames
    has_course = "course_code" in fieldnames or "course_offering_id" in fieldnames

    missing = []
    if not has_student:
        missing.append("student_identifier or email")
    if not has_course:
        missing.append("course_code or course_offering_id")

    if missing:
        job.status = "validation_failed"
        job.error_rows = 1
        db.add(
            ImportIssue(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=1,
                field_name=None,
                severity="error",
                code="MISSING_HEADERS",
                message=f"Missing required columns for enrollments: {', '.join(missing)}",
            )
        )
        db.commit()
        return job

    students = db.query(StudentProfile).filter(StudentProfile.institution_id == institution_id).all()
    student_by_ident = {s.student_identifier: s for s in students if s.student_identifier}
    student_by_email = {s.email.lower(): s for s in students if s.email}

    courses = db.query(Course).filter(Course.institution_id == institution_id).all()
    course_by_code = {c.code.upper(): c for c in courses if c.code}

    offerings = db.query(CourseOffering).filter(CourseOffering.institution_id == institution_id).all()
    offering_by_id = {o.id: o for o in offerings}
    offerings_by_course: dict[str, list[CourseOffering]] = {}
    for o in offerings:
        offerings_by_course.setdefault(o.course_id, []).append(o)

    seen_keys = set()
    total_rows = 0
    valid_rows = 0
    error_rows = 0

    for idx, row in enumerate(reader, start=2):
        if total_rows >= MAX_IMPORT_ROWS:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=None,
                    severity="error",
                    code="ROW_LIMIT_EXCEEDED",
                    message=f"File exceeds maximum allowed rows ({MAX_IMPORT_ROWS})",
                )
            )
            error_rows += 1
            break

        total_rows += 1
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        row_issues = []

        ident = clean_row.get("student_identifier", "")
        email = clean_row.get("email", "").lower()
        code = clean_row.get("course_code", "").upper()
        off_id = clean_row.get("course_offering_id", "")
        enr_status = clean_row.get("enrollment_status", "enrolled").lower() or "enrolled"

        student = student_by_ident.get(ident) if ident else None
        if not student and email:
            student = student_by_email.get(email)
        if not student:
            row_issues.append(("student_identifier", "STUDENT_NOT_FOUND", f"Student '{ident or email}' not found in roster"))

        offering: Optional[CourseOffering] = None
        if off_id and off_id in offering_by_id:
            offering = offering_by_id[off_id]
        elif code and code in course_by_code:
            c = course_by_code[code]
            c_offs = offerings_by_course.get(c.id, [])
            if c_offs:
                offering = c_offs[0]
            else:
                row_issues.append(("course_code", "OFFERING_NOT_FOUND", f"No active offering found for course '{code}'"))
        else:
            row_issues.append(("course_code", "COURSE_NOT_FOUND", f"Course '{code or off_id}' not found"))

        if student and offering:
            dup_key = (student.id, offering.id)
            if dup_key in seen_keys:
                row_issues.append(("student_identifier", "DUPLICATE_IN_FILE", "Enrollment for student in course is duplicated in file"))
            else:
                seen_keys.add(dup_key)

        is_row_valid = len(row_issues) == 0
        if is_row_valid:
            valid_rows += 1
            parsed_data = {
                "student_id": student.id if student else None,
                "course_offering_id": offering.id if offering else None,
                "enrollment_status": enr_status,
            }
        else:
            error_rows += 1
            parsed_data = None

        db.add(
            ImportStagedRow(
                institution_id=institution_id,
                import_job_id=job.id,
                row_number=idx,
                raw_data=row,
                parsed_data=parsed_data,
                action="upsert",
                is_valid=is_row_valid,
            )
        )

        for field, code_err, msg in row_issues:
            db.add(
                ImportIssue(
                    institution_id=institution_id,
                    import_job_id=job.id,
                    row_number=idx,
                    field_name=field,
                    severity="error",
                    code=code_err,
                    message=msg,
                )
            )

    job.total_rows = total_rows
    job.valid_rows = valid_rows
    job.error_rows = error_rows
    job.status = "validated" if error_rows == 0 and total_rows > 0 else "validation_failed"

    db.commit()
    return job


def commit_import_job(
    db: Session,
    institution_id: str,
    job_id: str,
    actor_membership_id: str,
    allow_partial: bool = False,
) -> dict[str, Any]:
    """
    Commits valid staged rows to the live database within an atomic transaction.
    Enforces idempotency: re-importing identical records updates rather than duplicates.
    Enforces partial-failure safety: if allow_partial is False, rejects commit when errors exist.
    """
    job = (
        db.query(ImportJob)
        .filter(ImportJob.institution_id == institution_id, ImportJob.id == job_id)
        .first()
    )
    if not job:
        raise ValueError("Import job not found")

    if job.status == "committed":
        return {
            "status": "already_committed",
            "message": "This import job has already been committed.",
            "import_type": job.import_type,
            "committed_rows": job.valid_rows,
        }

    if job.status == "validating":
        raise ValueError("Job is currently validating. Please wait for validation to complete.")

    if job.status != "validated":
        if not (allow_partial and job.valid_rows > 0):
            raise ValueError(
                f"Cannot commit job in '{job.status}' status with {job.error_rows} errors. "
                "Fix errors and re-upload, or set allow_partial=True to commit valid rows only."
            )

    staged_rows = (
        db.query(ImportStagedRow)
        .filter(
            ImportStagedRow.institution_id == institution_id,
            ImportStagedRow.import_job_id == job.id,
            ImportStagedRow.is_valid.is_(True),
        )
        .all()
    )

    if not staged_rows:
        raise ValueError("No valid rows available to commit.")

    import_type = (job.import_type or "students").lower()

    try:
        if import_type in ("students", "roster"):
            result = _commit_roster(db, institution_id, job, staged_rows, actor_membership_id)
        elif import_type == "attendance":
            result = _commit_attendance(db, institution_id, job, staged_rows, actor_membership_id)
        elif import_type in ("assessment_results", "marks", "assessments"):
            result = _commit_assessment_results(db, institution_id, job, staged_rows, actor_membership_id)
        elif import_type == "enrollments":
            result = _commit_enrollments(db, institution_id, job, staged_rows, actor_membership_id)
        else:
            raise ValueError(f"Unknown import_type: {import_type}")

        job.status = "committed"
        db.commit()
        return result

    except Exception as ex:
        db.rollback()
        job.status = "commit_failed"
        db.commit()
        raise ex


def _commit_roster(
    db: Session,
    institution_id: str,
    job: ImportJob,
    staged_rows: list[ImportStagedRow],
    actor_membership_id: str,
) -> dict[str, Any]:
    created_count = 0
    for staged in staged_rows:
        data = staged.parsed_data
        if not data:
            continue

        existing = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == institution_id,
                StudentProfile.student_identifier == data["student_identifier"],
            )
            .first()
        )
        if existing:
            # Idempotent update
            existing.first_name = data["first_name"]
            existing.last_name = data["last_name"]
            existing.email = data["email"]
            profile = existing
        else:
            profile = StudentProfile(
                institution_id=institution_id,
                student_identifier=data["student_identifier"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                status="active",
            )
            db.add(profile)
            db.flush()
            created_count += 1

        cohort_name = data.get("cohort_name")
        if cohort_name:
            cohort = (
                db.query(Cohort)
                .filter(Cohort.institution_id == institution_id, Cohort.name == cohort_name)
                .first()
            )
            if not cohort:
                cohort = Cohort(
                    institution_id=institution_id,
                    name=cohort_name,
                )
                db.add(cohort)
                db.flush()

            existing_membership = (
                db.query(CohortMembership)
                .filter(
                    CohortMembership.institution_id == institution_id,
                    CohortMembership.student_id == profile.id,
                    CohortMembership.cohort_id == cohort.id,
                )
                .first()
            )
            if not existing_membership:
                db.add(
                    CohortMembership(
                        institution_id=institution_id,
                        student_id=profile.id,
                        cohort_id=cohort.id,
                        status="active",
                    )
                )

    db.add(
        AuditEvent(
            institution_id=institution_id,
            actor_membership_id=actor_membership_id,
            action="IMPORT_COMMITTED",
            resource_type="import_jobs",
            resource_id=job.id,
            purpose="Student roster CSV import",
            details={
                "import_type": "students",
                "created_students": created_count,
                "total_staged": len(staged_rows),
                "job_id": job.id,
            },
        )
    )
    return {
        "status": "success",
        "import_type": "students",
        "created_students": created_count,
        "committed_rows": len(staged_rows),
    }


def _commit_attendance(
    db: Session,
    institution_id: str,
    job: ImportJob,
    staged_rows: list[ImportStagedRow],
    actor_membership_id: str,
) -> dict[str, Any]:
    upserted_count = 0
    created_count = 0
    updated_count = 0

    for staged in staged_rows:
        data = staged.parsed_data
        if not data:
            continue

        enr_id = data["enrollment_id"]
        s_date = datetime.strptime(data["session_date"], "%Y-%m-%d").date()
        status_val = data["status"]

        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.institution_id == institution_id,
                AttendanceRecord.enrollment_id == enr_id,
                AttendanceRecord.session_date == s_date,
            )
            .first()
        )

        if existing:
            existing.status = status_val
            existing.source = "imported_update"
            updated_count += 1
        else:
            att = AttendanceRecord(
                institution_id=institution_id,
                enrollment_id=enr_id,
                session_date=s_date,
                status=status_val,
                source="imported",
                created_at=now_utc(),
            )
            db.add(att)
            created_count += 1

        upserted_count += 1

    db.add(
        AuditEvent(
            institution_id=institution_id,
            actor_membership_id=actor_membership_id,
            action="IMPORT_COMMITTED",
            resource_type="import_jobs",
            resource_id=job.id,
            purpose="Attendance bulk CSV import",
            details={
                "import_type": "attendance",
                "created_records": created_count,
                "updated_records": updated_count,
                "total_processed": upserted_count,
                "job_id": job.id,
            },
        )
    )
    return {
        "status": "success",
        "import_type": "attendance",
        "created_records": created_count,
        "updated_records": updated_count,
        "total_processed": upserted_count,
        "committed_rows": len(staged_rows),
    }


def _commit_assessment_results(
    db: Session,
    institution_id: str,
    job: ImportJob,
    staged_rows: list[ImportStagedRow],
    actor_membership_id: str,
) -> dict[str, Any]:
    created_count = 0
    updated_count = 0

    for staged in staged_rows:
        data = staged.parsed_data
        if not data:
            continue

        asm_id = data["assessment_id"]
        enr_id = data["enrollment_id"]
        score_val = data["score"]
        max_score_val = data["max_score"]
        status_val = data["status"]

        existing = (
            db.query(CourseAssessmentResult)
            .filter(
                CourseAssessmentResult.assessment_id == asm_id,
                CourseAssessmentResult.enrollment_id == enr_id,
            )
            .first()
        )

        if existing:
            existing.score = score_val
            existing.status = status_val
            existing.assessor_membership_id = actor_membership_id
            existing.updated_at = now_utc()
            updated_count += 1
        else:
            new_res = CourseAssessmentResult(
                institution_id=institution_id,
                assessment_id=asm_id,
                enrollment_id=enr_id,
                score=score_val,
                max_score=max_score_val,
                status=status_val,
                assessor_membership_id=actor_membership_id,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(new_res)
            created_count += 1

    db.add(
        AuditEvent(
            institution_id=institution_id,
            actor_membership_id=actor_membership_id,
            action="IMPORT_COMMITTED",
            resource_type="import_jobs",
            resource_id=job.id,
            purpose="Assessment marks bulk CSV import",
            details={
                "import_type": "marks",
                "created_results": created_count,
                "updated_results": updated_count,
                "total_processed": created_count + updated_count,
                "job_id": job.id,
            },
        )
    )
    return {
        "status": "success",
        "import_type": "marks",
        "created_results": created_count,
        "updated_results": updated_count,
        "total_processed": created_count + updated_count,
        "committed_rows": len(staged_rows),
    }


def _commit_enrollments(
    db: Session,
    institution_id: str,
    job: ImportJob,
    staged_rows: list[ImportStagedRow],
    actor_membership_id: str,
) -> dict[str, Any]:
    created_count = 0
    updated_count = 0

    for staged in staged_rows:
        data = staged.parsed_data
        if not data:
            continue

        stu_id = data["student_id"]
        off_id = data["course_offering_id"]
        enr_status = data["enrollment_status"]

        existing = (
            db.query(Enrollment)
            .filter(
                Enrollment.institution_id == institution_id,
                Enrollment.student_id == stu_id,
                Enrollment.course_offering_id == off_id,
            )
            .first()
        )

        if existing:
            existing.enrollment_status = enr_status
            existing.updated_at = now_utc()
            updated_count += 1
        else:
            enr = Enrollment(
                institution_id=institution_id,
                student_id=stu_id,
                course_offering_id=off_id,
                enrollment_status=enr_status,
                enrolled_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(enr)
            created_count += 1

    db.add(
        AuditEvent(
            institution_id=institution_id,
            actor_membership_id=actor_membership_id,
            action="IMPORT_COMMITTED",
            resource_type="import_jobs",
            resource_id=job.id,
            purpose="Enrollments bulk CSV import",
            details={
                "import_type": "enrollments",
                "created_enrollments": created_count,
                "updated_enrollments": updated_count,
                "total_processed": created_count + updated_count,
                "job_id": job.id,
            },
        )
    )
    return {
        "status": "success",
        "import_type": "enrollments",
        "created_enrollments": created_count,
        "updated_enrollments": updated_count,
        "total_processed": created_count + updated_count,
        "committed_rows": len(staged_rows),
    }
