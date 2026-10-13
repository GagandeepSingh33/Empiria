import pytest
import uuid
import csv
import io
from fastapi.testclient import TestClient
from app.main import app
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
    return headers, res.cookies, data


@pytest.fixture(autouse=True)
def clean_client():
    client.cookies.clear()
    yield
    client.cookies.clear()


# =========================================================================
# PHASE 3: Academic Foundation & Core Institution Workspaces
# =========================================================================

def test_phase3_academic_structure_lifecycle_and_calendar():
    """
    Test creation and lifecycle of Academic Terms, Departments, Courses,
    Offerings, and Sections.
    """
    admin_headers, _, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Academic Overview
    overview_res = client.get("/internal/v1/academic/overview")
    assert overview_res.status_code == 200
    ov_data = overview_res.json()
    assert "total_terms" in ov_data
    assert "total_courses" in ov_data
    assert "total_offerings" in ov_data

    # 2. Academic Term & Calendar
    suffix = str(uuid.uuid4())[:6]
    term_res = client.post(
        "/internal/v1/academic-terms",
        json={"name": f"Spring {suffix}", "start_date": "2027-01-10", "end_date": "2027-05-20"},
        headers=admin_headers,
    )
    assert term_res.status_code == 201
    term = term_res.json()
    assert term["name"] == f"Spring {suffix}"
    term_id = term["id"]

    # Term status update (active -> completed)
    upd_term = client.patch(
        f"/internal/v1/academic-terms/{term_id}",
        json={"status": "completed"},
        headers=admin_headers,
    )
    assert upd_term.status_code == 200
    assert upd_term.json()["status"] == "completed"

    # 3. Department Creation
    dept_code = f"DP_{suffix[:4].upper()}"
    dept_res = client.post(
        "/internal/v1/departments",
        json={"name": f"Department of Intelligence {suffix}", "code": dept_code},
        headers=admin_headers,
    )
    assert dept_res.status_code == 201
    dept_id = dept_res.json()["id"]

    # 4. Course Creation and Update
    course_code = f"AI_{suffix[:4].upper()}"
    course_res = client.post(
        "/internal/v1/courses",
        json={
            "code": course_code,
            "title": f"Foundation of Applied AI {suffix}",
            "description": "Core curricular foundation",
            "credits": 4.0,
            "department_id": dept_id,
        },
        headers=admin_headers,
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    upd_course = client.patch(
        f"/internal/v1/courses/{course_id}",
        json={"credits": 4.5, "title": f"Foundation of Applied AI (Honors) {suffix}"},
        headers=admin_headers,
    )
    assert upd_course.status_code == 200
    assert upd_course.json()["credits"] == 4.5

    # 5. Course Offering & Section Creation
    offering_res = client.post(
        "/internal/v1/course-offerings",
        json={
            "course_id": course_id,
            "academic_term_id": term_id,
            "section_identifier": "02",
        },
        headers=admin_headers,
    )
    assert offering_res.status_code == 201
    offering = offering_res.json()
    assert offering["section_identifier"] == "02"
    assert offering["course_title"] is not None


def test_phase3_assessment_scheme_components_and_result_release_lifecycle():
    """
    Test assessment scheme components (internal/external), weights,
    mark entry, and strict result release states where students only see
    released marks.
    """
    admin_headers, _, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Fetch existing offering and enrolled student
    offerings = client.get("/internal/v1/course-offerings").json()
    assert len(offerings) > 0
    offering_id = offerings[0]["id"]

    students = client.get("/internal/v1/students").json()
    assert len(students) > 0
    student_obj = next((s for s in students if s.get("email") == "student@apex.edu"), students[0])
    student_id = student_obj["id"]

    # Ensure enrollment
    enr_res = client.post(
        "/internal/v1/enrollments",
        json={"student_id": student_id, "course_offering_id": offering_id},
        headers=admin_headers,
    )
    if enr_res.status_code == 201:
        enr_id = enr_res.json()["id"]
    else:
        enr_list = client.get(f"/internal/v1/enrollments?student_id={student_id}&course_offering_id={offering_id}").json()
        enr_id = enr_list[0]["id"]

    # 2. Create Internal Assessment Component
    internal_asm = client.post(
        f"/internal/v1/course-offerings/{offering_id}/assessments",
        json={
            "name": "Continuous Assessment Midterm",
            "assessment_type": "internal",
            "max_score": 100.0,
            "weight": 0.4,
        },
        headers=admin_headers,
    )
    assert internal_asm.status_code == 201
    internal_asm_id = internal_asm.json()["id"]

    # 3. Create External Assessment Component
    external_asm = client.post(
        f"/internal/v1/course-offerings/{offering_id}/assessments",
        json={
            "name": "End-Semester External Exam",
            "assessment_type": "external",
            "max_score": 100.0,
            "weight": 0.6,
        },
        headers=admin_headers,
    )
    assert external_asm.status_code == 201
    external_asm_id = external_asm.json()["id"]

    # 4. Enter Draft Mark for Student in Internal Assessment
    enter_res = client.post(
        f"/internal/v1/assessments/{internal_asm_id}/results",
        json={
            "results": [
                {
                    "enrollment_id": enr_id,
                    "score": 88.5,
                    "status": "draft",
                    "grading_metadata": {"evaluator": "Faculty Assessor Prof Smith"},
                }
            ]
        },
        headers=admin_headers,
    )
    assert enter_res.status_code == 200
    assert enter_res.json()["count"] == 1

    # Staff sees the recorded result
    staff_results = client.get(f"/internal/v1/assessments/{internal_asm_id}/results").json()
    assert len(staff_results) > 0
    assert staff_results[0]["score"] == 88.5
    assert staff_results[0]["status"] == "draft"
    assert staff_results[0]["is_released"] is False

    # 5. STUDENT PRIVACY VERIFICATION:
    # Student logs in: must NOT see draft/unreleased score!
    student_headers, _, _ = login("student@apex.edu", "StudentPass123!")

    student_results = client.get(
        f"/internal/v1/assessments/{internal_asm_id}/results",
        headers=student_headers,
    ).json()
    # If student's enrollment matches, score must be masked to None!
    for sr in student_results:
        if sr["enrollment_id"] == enr_id:
            assert sr["score"] is None, "CRITICAL ERROR: Unreleased draft score leaked to student!"
            assert sr["is_released"] is False

    # Check Student Academic History: unreleased marks remain NULL
    student_history = client.get(
        "/internal/v1/academic/my-history",
        headers=student_headers,
    ).json()
    for c in student_history["courses"]:
        if c["enrollment_id"] == enr_id:
            for a in c["assessments"]:
                if a["assessment_id"] == internal_asm_id:
                    assert a["score"] is None, "CRITICAL ERROR: Unreleased score leaked in student history!"
                    assert a["is_released"] is False

    # 6. Admin officially releases results
    admin_headers, _, _ = login("admin@apex.edu", "AdminPass123!")
    release_res = client.post(
        f"/internal/v1/assessments/{internal_asm_id}/release",
        headers=admin_headers,
    )
    assert release_res.status_code == 200
    assert release_res.json()["released_count"] >= 1

    # 7. Student checks again: Released mark is now visible and calculated
    student_headers, _, _ = login("student@apex.edu", "StudentPass123!")
    post_release_results = client.get(
        f"/internal/v1/assessments/{internal_asm_id}/results",
        headers=student_headers,
    ).json()
    matching_result = next((r for r in post_release_results if r["enrollment_id"] == enr_id), None)
    assert matching_result is not None
    assert matching_result["score"] == 88.5
    assert matching_result["is_released"] is True

    # Student academic history shows released average
    post_history = client.get(
        "/internal/v1/academic/my-history",
        headers=student_headers,
    ).json()
    matching_course = next((c for c in post_history["courses"] if c["enrollment_id"] == enr_id), None)
    assert matching_course is not None
    assert matching_course["released_average"] is not None


def test_phase3_student_directory_search_filter_pagination_and_csv_export():
    """
    Test student directory search, status filtering, pagination,
    lifecycle updates, and sanitized CSV export.
    """
    admin_headers, _, _ = login("admin@apex.edu", "AdminPass123!")

    # 1. Register a student with a unique identifier
    unique_roll = f"STU_{uuid.uuid4().hex[:6].upper()}"
    reg_res = client.post(
        "/internal/v1/students",
        json={
            "student_identifier": unique_roll,
            "first_name": "Eleanor",
            "last_name": "Vance",
            "email": f"eleanor.{unique_roll.lower()}@apex.edu",
        },
        headers=admin_headers,
    )
    assert reg_res.status_code == 200
    student_id = reg_res.json()["id"]

    # 2. Search by identifier
    search_res = client.get(f"/internal/v1/students?search={unique_roll}&page=1&page_size=10")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] >= 1
    assert any(s["student_identifier"] == unique_roll for s in search_data["items"])

    # 3. Status Lifecycle Update: active -> suspended -> graduated
    susp_res = client.patch(
        f"/internal/v1/students/{student_id}",
        json={"status": "suspended", "reason": "Administrative leave approved"},
        headers=admin_headers,
    )
    assert susp_res.status_code == 200
    assert susp_res.json()["status"] == "suspended"

    # Search with status filter
    susp_filter = client.get(f"/internal/v1/students?status=suspended&page=1&page_size=10")
    assert susp_filter.status_code == 200
    assert any(s["id"] == student_id for s in susp_filter.json()["items"])

    # 4. CSV Export with Formula Injection Protection
    # Register student with potential formula injection prefix to test sanitization
    inj_roll = f"=SUM(1+1)_{uuid.uuid4().hex[:4]}"
    client.post(
        "/internal/v1/students",
        json={
            "student_identifier": inj_roll,
            "first_name": "=1+2",
            "last_name": "-CMD",
            "email": f"inj.{uuid.uuid4().hex[:4]}@apex.edu",
        },
        headers=admin_headers,
    )

    export_res = client.get("/internal/v1/students/export")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"].startswith("text/csv")
    csv_text = export_res.text

    # Parse CSV to verify escaping
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) > 1  # Header + data
    headers = rows[0]
    assert "Student ID" in headers
    assert "First Name" in headers

    # Verify formula injection sanitization: cells starting with =, -, + are prepended with '
    for row in rows[1:]:
        for cell in row:
            if cell.startswith("=") or cell.startswith("-CMD"):
                pytest.fail(f"Formula injection unescaped in export: {cell}")


def test_phase3_student_workspace_isolation_and_cross_tenant_boundaries():
    """
    Exit Gate: A student sees only their own authorized/released records.
    Cross-institution student access is strictly prohibited.
    """
    # 1. Student queries own academic history
    student_headers, _, _ = login("student@apex.edu", "StudentPass123!")
    my_history = client.get("/internal/v1/academic/my-history", headers=student_headers)
    assert my_history.status_code == 200
    data = my_history.json()
    assert data["student_identifier"] is not None

    # Student attempts to specify another student's ID (should be ignored or restricted to own)
    bogus_id = str(uuid.uuid4())
    student_tamper = client.get(f"/internal/v1/academic/my-history?student_id={bogus_id}", headers=student_headers)
    # Since caller is a student (not staff), server ignores student_id and returns caller's own profile!
    assert student_tamper.status_code == 200
    assert student_tamper.json()["student_id"] == data["student_id"]

    # Student attempts staff grading operation
    forbidden_grade = client.post(
        f"/internal/v1/assessments/{str(uuid.uuid4())}/results",
        json={"results": []},
        headers=student_headers,
    )
    assert forbidden_grade.status_code in (401, 403)

    # 2. Cross-Institution Boundary: Tenant B staff cannot access Tenant A student history
    beacon_headers, _, _ = login("admin@beacon.edu", "BeaconPass123!")
    tenant_a_student_id = data["student_id"]
    cross_res = client.get(f"/internal/v1/academic/my-history?student_id={tenant_a_student_id}", headers=beacon_headers)
    assert cross_res.status_code in (403, 404)
