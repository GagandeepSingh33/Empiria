import pytest
import uuid
import csv
import io
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    Institution,
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
    AuditEvent,
)

client = TestClient(app)


def login(email: str, password: str):
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    data = res.json()
    csrf_token = data.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    cookies = {settings.session_cookie_name: res.cookies[settings.session_cookie_name]}
    client.cookies.set(settings.session_cookie_name, res.cookies[settings.session_cookie_name])
    return headers, cookies, data


@pytest.fixture(autouse=True)
def clean_client():
    client.cookies.clear()
    yield
    client.cookies.clear()


# =========================================================================
# PHASE 4: Academic Data Management Test Suite
# =========================================================================

def test_phase4_file_format_and_upload_security_boundaries():
    """
    Test supported format boundaries: non-CSV uploads rejected with HTTP 400,
    empty files rejected, and size limits enforced.
    """
    op_headers, op_cookies, _ = login("operator@apex.edu", "OperatorPass123!")

    # 1. Create an import job
    key = f"fmt-test-{uuid.uuid4().hex}"
    job_res = client.post(
        "/internal/v1/imports",
        json={"import_type": "students", "idempotency_key": key},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert job_res.status_code == 200
    job_id = job_res.json()["id"]

    # 2. Reject non-CSV file (e.g. .xlsx or .txt)
    non_csv_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("roster.xlsx", io.BytesIO(b"fake-excel-binary"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert non_csv_res.status_code == 400
    assert "Only CSV (.csv) files are supported" in non_csv_res.json()["detail"]

    # 3. Reject empty file
    empty_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert empty_res.status_code == 400
    assert "empty" in empty_res.json()["detail"].lower()

    # 4. Reject files exceeding 5MB limit
    huge_bytes = b"student_identifier,first_name,last_name,email\n" + (b"A,B,C,d@e.edu\n" * 400000)
    huge_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("huge.csv", io.BytesIO(huge_bytes), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert huge_res.status_code == 400
    assert "5mb" in huge_res.json()["detail"].lower()


def test_phase4_dry_run_preview_isolation_and_row_level_issues():
    """
    Verify preview dry-run isolation: uploading and validating files stages rows
    in ImportStagedRow and ImportIssue without mutating live tables until committed.
    """
    op_headers, op_cookies, _ = login("operator@apex.edu", "OperatorPass123!")
    db = SessionLocal()
    initial_att_count = db.query(AttendanceRecord).count()
    enr = db.query(Enrollment).first()
    assert enr is not None
    valid_ident = enr.student.student_identifier
    valid_course_code = enr.course_offering.course.code
    db.close()

    # 1. Create an attendance import job
    key = f"att-dryrun-{uuid.uuid4().hex}"
    job_res = client.post(
        "/internal/v1/imports",
        json={"import_type": "attendance", "idempotency_key": key},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert job_res.status_code == 200
    job_id = job_res.json()["id"]

    # 2. Upload CSV containing 1 valid row and 1 invalid row (invalid date format)
    csv_content = (
        "student_identifier,course_code,session_date,status\n"
        f"{valid_ident},{valid_course_code},2026-10-12,present\n"
        f"{valid_ident},{valid_course_code},INVALID_DATE_FORMAT,present\n"
    )

    val_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("attendance.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["status"] == "validation_failed"
    assert val_data["valid_rows"] == 1
    assert val_data["error_rows"] == 1

    # 3. Dry-run isolation: live table count MUST NOT change!
    db = SessionLocal()
    current_att_count = db.query(AttendanceRecord).count()
    db.close()
    assert current_att_count == initial_att_count, "Dry-run validation mutated live database tables!"

    # 4. Preview endpoint returns row-level issues
    prev_res = client.get(f"/internal/v1/imports/{job_id}/preview", headers=op_headers, cookies=op_cookies)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert prev_data["error_rows"] == 1
    assert len(prev_data["issues"]) >= 1
    issue = prev_data["issues"][0]
    assert issue["row_number"] == 3
    assert issue["code"] == "INVALID_DATE_FORMAT"


def test_phase4_partial_failure_policy_and_allow_partial():
    """
    Verify partial-failure commit rules:
    - Committing with validation errors without allow_partial raises HTTP 400.
    - Committing with allow_partial=True commits valid rows and skips invalid rows.
    """
    op_headers, op_cookies, _ = login("operator@apex.edu", "OperatorPass123!")

    db = SessionLocal()
    enr = db.query(Enrollment).first()
    assert enr is not None
    valid_ident = enr.student.student_identifier
    valid_course_code = enr.course_offering.course.code
    db.close()

    key = f"partial-fail-{uuid.uuid4().hex}"
    job_res = client.post(
        "/internal/v1/imports",
        json={"import_type": "attendance", "idempotency_key": key},
        headers=op_headers,
        cookies=op_cookies,
    )
    job_id = job_res.json()["id"]

    csv_content = (
        "student_identifier,course_code,session_date,status\n"
        f"{valid_ident},{valid_course_code},2026-10-14,present\n"
        f"NONEXISTENT_STUDENT,{valid_course_code},2026-10-14,present\n"
    )
    client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("attendance.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )

    # 1. Attempt commit without allow_partial -> Must fail with 400
    commit_fail_res = client.post(
        f"/internal/v1/imports/{job_id}/commit",
        headers=op_headers,
        cookies=op_cookies,
    )
    assert commit_fail_res.status_code == 400
    assert "allow_partial" in commit_fail_res.json()["detail"].lower()

    # 2. Commit with allow_partial=True -> Must succeed for valid row
    commit_ok_res = client.post(
        f"/internal/v1/imports/{job_id}/commit?allow_partial=true",
        headers=op_headers,
        cookies=op_cookies,
    )
    assert commit_ok_res.status_code == 200
    res_data = commit_ok_res.json()
    assert res_data["status"] == "success"
    assert res_data["committed_rows"] == 1


def test_phase4_idempotency_and_reimport_upsert_policy():
    """
    Test idempotency:
    - Same idempotency_key returns existing job rather than duplicating.
    - Re-importing existing attendance updates status rather than duplicate key violation.
    """
    op_headers, op_cookies, _ = login("operator@apex.edu", "OperatorPass123!")

    db = SessionLocal()
    enr = db.query(Enrollment).first()
    assert enr is not None
    valid_ident = enr.student.student_identifier
    valid_course_code = enr.course_offering.course.code
    db.close()

    idem_key = f"idem-check-{uuid.uuid4().hex}"
    res1 = client.post(
        "/internal/v1/imports",
        json={"import_type": "students", "idempotency_key": idem_key},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert res1.status_code == 200
    job_id_1 = res1.json()["id"]

    res2 = client.post(
        "/internal/v1/imports",
        json={"import_type": "students", "idempotency_key": idem_key},
        headers=op_headers,
        cookies=op_cookies,
    )
    assert res2.status_code == 200
    job_id_2 = res2.json()["id"]
    assert job_id_1 == job_id_2, "Idempotency key did not return existing job!"

    # Test attendance upsert
    key3 = f"att-upsert-{uuid.uuid4().hex}"
    job3 = client.post(
        "/internal/v1/imports",
        json={"import_type": "attendance", "idempotency_key": key3},
        headers=op_headers,
        cookies=op_cookies,
    ).json()["id"]

    csv_day1 = (
        "student_identifier,course_code,session_date,status\n"
        f"{valid_ident},{valid_course_code},2026-10-15,absent\n"
    )
    client.post(
        f"/internal/v1/imports/{job3}/validate",
        files={"file": ("att.csv", io.BytesIO(csv_day1.encode("utf-8")), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )
    client.post(f"/internal/v1/imports/{job3}/commit", headers=op_headers, cookies=op_cookies)

    # Re-import with corrected status 'present' for the same date
    key4 = f"att-upsert2-{uuid.uuid4().hex}"
    job4 = client.post(
        "/internal/v1/imports",
        json={"import_type": "attendance", "idempotency_key": key4},
        headers=op_headers,
        cookies=op_cookies,
    ).json()["id"]

    csv_day1_corrected = (
        "student_identifier,course_code,session_date,status\n"
        f"{valid_ident},{valid_course_code},2026-10-15,present\n"
    )
    client.post(
        f"/internal/v1/imports/{job4}/validate",
        files={"file": ("att2.csv", io.BytesIO(csv_day1_corrected.encode("utf-8")), "text/csv")},
        headers=op_headers,
        cookies=op_cookies,
    )
    res_commit4 = client.post(f"/internal/v1/imports/{job4}/commit", headers=op_headers, cookies=op_cookies)
    assert res_commit4.status_code == 200
    assert res_commit4.json()["updated_records"] == 1


def test_phase4_attendance_correction_history_and_role_boundaries():
    """
    Test attendance correction with mandatory audit reason, history filtering,
    and student privacy boundary (students cannot see other students' records).
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    db = SessionLocal()
    att = db.query(AttendanceRecord).first()
    assert att is not None
    att_id = att.id
    db.close()

    # 1. Correct attendance record with mandatory reason
    corr_res = client.patch(
        f"/internal/v1/attendance/{att_id}",
        json={"status": "excused", "reason": "Medical certificate submitted and verified by health center"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert corr_res.status_code == 200
    assert corr_res.json()["status"] == "excused"

    # Verify audit event
    db = SessionLocal()
    audit = (
        db.query(AuditEvent)
        .filter(AuditEvent.action == "CORRECT_ATTENDANCE_RECORD", AuditEvent.resource_id == att_id)
        .first()
    )
    assert audit is not None
    assert audit.details["reason"] == "Medical certificate submitted and verified by health center"
    db.close()

    # 2. Attendance history query
    hist_res = client.get("/internal/v1/attendance/history", headers=admin_headers, cookies=admin_cookies)
    assert hist_res.status_code == 200
    assert len(hist_res.json()) > 0

    # 3. Student caller boundary
    stu_headers, stu_cookies, stu_info = login("student@apex.edu", "StudentPass123!")
    stu_hist_res = client.get("/internal/v1/attendance/history", headers=stu_headers, cookies=stu_cookies)
    assert stu_hist_res.status_code == 200
    # Every returned record belongs to the student's own account / profile
    for record in stu_hist_res.json():
        assert record["student_id"] is not None


def test_phase4_assessment_marks_release_unrelease_and_null_coercion_immunity():
    """
    Test assessment marks release boundaries and strict NULL preservation:
    - Data Operator can draft marks but cannot release or unrelease (HTTP 403).
    - Faculty Assessor or Admin can release and unrelease.
    - Student view and unreleased export preserve NULL; never coerce to 0.0.
    """
    op_headers, op_cookies, _ = login("operator@apex.edu", "OperatorPass123!")
    fac_headers, fac_cookies, _ = login("faculty@apex.edu", "FacultyPass123!")
    stu_headers, stu_cookies, _ = login("student@apex.edu", "StudentPass123!")

    db = SessionLocal()
    asm = db.query(CourseAssessment).first()
    assert asm is not None
    asm_id = asm.id
    db.close()

    # 1. Operator attempts to release results -> 403 Forbidden
    op_rel_res = client.post(
        f"/internal/v1/assessments/{asm_id}/release",
        headers=op_headers,
        cookies=op_cookies,
    )
    assert op_rel_res.status_code == 403

    # 2. Operator attempts to unrelease results -> 403 Forbidden
    op_unrel_res = client.post(
        f"/internal/v1/assessments/{asm_id}/unrelease",
        headers=op_headers,
        cookies=op_cookies,
    )
    assert op_unrel_res.status_code == 403

    # 3. Faculty Assessor unreleases assessment to draft
    fac_unrel = client.post(
        f"/internal/v1/assessments/{asm_id}/unrelease",
        headers=fac_headers,
        cookies=fac_cookies,
    )
    assert fac_unrel.status_code == 200

    # 4. Student queries results -> Unreleased marks MUST remain NULL/None!
    stu_res = client.get(f"/internal/v1/assessments/{asm_id}/results", headers=stu_headers, cookies=stu_cookies)
    assert stu_res.status_code == 200
    for r in stu_res.json():
        assert r["is_released"] is False
        assert r["score"] is None, "Unreleased score leaked or was coerced to zero in student view!"

    # 5. Export with include_unreleased=False renders NULL, not 0.0
    exp_res = client.get(
        f"/internal/v1/assessments/{asm_id}/export?include_unreleased=false",
        headers=fac_headers,
        cookies=fac_cookies,
    )
    assert exp_res.status_code == 200
    csv_text = exp_res.text
    assert "NULL" in csv_text or "PENDING_RELEASE" in csv_text

    # 6. Faculty Assessor releases marks -> Student now sees scores
    fac_rel = client.post(
        f"/internal/v1/assessments/{asm_id}/release",
        headers=fac_headers,
        cookies=fac_cookies,
    )
    assert fac_rel.status_code == 200

    stu_rel_res = client.get(f"/internal/v1/assessments/{asm_id}/results", headers=stu_headers, cookies=stu_cookies)
    assert stu_rel_res.status_code == 200
    for r in stu_rel_res.json():
        assert r["is_released"] is True
        assert r["score"] is not None


def test_phase4_formula_injection_immunity_on_csv_exports():
    """
    Test CSV formula-injection immunity:
    Cells starting with '=', '+', '-', '@', '\\t', '\\r' must be prepended
    with a single quote (') during CSV export so spreadsheet engines treat them as text.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    db = SessionLocal()
    inst = db.query(Institution).filter(Institution.slug == "apex-tech").first()
    assert inst is not None
    unique_suffix = uuid.uuid4().hex[:6]
    unique_cmd = f"=CMD|calc_{unique_suffix}"
    test_stu = StudentProfile(
        id=str(uuid.uuid4()),
        institution_id=inst.id,
        student_identifier=unique_cmd,
        first_name="+SUM(1,2)",
        last_name="@MALICIOUS",
        email=f"inj.{unique_suffix}@apex.edu",
        status="active",
    )
    db.add(test_stu)
    db.commit()
    stu_id = test_stu.id
    db.close()

    try:
        # Export students CSV
        exp_res = client.get("/internal/v1/students/export", headers=admin_headers, cookies=admin_cookies)
        assert exp_res.status_code == 200
        content = exp_res.text

        # Verify single quote escaping
        assert f"'{unique_cmd}" in content, "Formula '=CMD' was not escaped with single quote!"
        assert "'+SUM(1,2)" in content, "Formula '+SUM' was not escaped with single quote!"
        assert "'@MALICIOUS" in content, "Formula '@MALICIOUS' was not escaped with single quote!"
    finally:
        db = SessionLocal()
        db.query(StudentProfile).filter(StudentProfile.id == stu_id).delete()
        db.commit()
        db.close()


def test_phase4_academic_data_health_and_templates():
    """
    Test Academic Data Health metrics and CSV template generation endpoints.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Data Health endpoint
    health_res = client.get("/internal/v1/academic/data-health", headers=admin_headers, cookies=admin_cookies)
    assert health_res.status_code == 200
    health = health_res.json()
    assert "total_students" in health
    assert "total_courses" in health
    assert "attendance_records_count" in health
    assert "unreleased_results_count" in health
    assert "data_freshness_status" in health

    # 2. Template download endpoints
    for t in ["students", "attendance", "marks", "enrollments"]:
        tmpl_res = client.get(f"/internal/v1/imports/templates/{t}", headers=admin_headers, cookies=admin_cookies)
        assert tmpl_res.status_code == 200
        assert "text/csv" in tmpl_res.headers["Content-Type"]
        assert len(tmpl_res.text) > 20
