import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_academic_structure_and_student_360_privacy():
    # 1. Login as Institution Admin
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]
    admin_headers = {"X-CSRF-Token": csrf_token}

    # 2. Create Department
    dept_res = client.post(
        "/internal/v1/departments",
        json={"name": "Computer Science & Analytics", "code": f"CS_{login_res.json()['account']['id'][:4]}"},
        headers=admin_headers,
    )
    assert dept_res.status_code in (201, 400)  # 201 or already exists

    # List departments
    list_dept = client.get("/internal/v1/departments")
    assert list_dept.status_code == 200
    assert len(list_dept.json()) > 0

    # 3. Create Academic Term
    term_res = client.post(
        "/internal/v1/academic-terms",
        json={"name": "Fall 2026", "start_date": "2026-09-01", "end_date": "2026-12-20"},
        headers=admin_headers,
    )
    assert term_res.status_code == 201
    term_id = term_res.json()["id"]

    # 4. Create Course
    course_code = f"DATA_{term_id[:4]}"
    course_res = client.post(
        "/internal/v1/courses",
        json={"code": course_code, "title": "Advanced SQL & Analytics", "credits": 4.0},
        headers=admin_headers,
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    # 5. Create Course Offering
    offering_res = client.post(
        "/internal/v1/course-offerings",
        json={"course_id": course_id, "academic_term_id": term_id, "section_identifier": "01"},
        headers=admin_headers,
    )
    assert offering_res.status_code == 201
    offering_id = offering_res.json()["id"]

    # 6. Fetch a student
    students_res = client.get("/internal/v1/students")
    assert students_res.status_code == 200
    students = students_res.json()
    assert len(students) > 0
    student_id = students[0]["id"]

    # Enroll student
    enr_res = client.post(
        "/internal/v1/enrollments",
        json={"student_id": student_id, "course_offering_id": offering_id},
        headers=admin_headers,
    )
    assert enr_res.status_code in (201, 400)
    enr_id = enr_res.json()["id"] if enr_res.status_code == 201 else client.get("/internal/v1/enrollments").json()[0]["id"]

    # Record attendance
    att_res = client.post(
        "/internal/v1/attendance",
        json={"enrollment_id": enr_id, "session_date": "2026-09-15", "status": "present"},
        headers=admin_headers,
    )
    assert att_res.status_code == 201

    # 7. Staff views Student 360
    staff_360 = client.get(f"/internal/v1/students/{student_id}/360")
    assert staff_360.status_code == 200
    staff_data = staff_360.json()
    assert staff_data["student_id"] == student_id
    assert len(staff_data["enrollments"]) > 0

    # 8. Student Login & Privacy Verification
    student_login = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert student_login.status_code == 200
    student_account_id = student_login.json()["account"]["id"]

    # Find student's own profile ID
    me_res = client.get("/internal/v1/students")
    my_student_id = me_res.json()[0]["id"]

    # Student viewing own 360
    my_360 = client.get(f"/internal/v1/students/{my_student_id}/360")
    assert my_360.status_code == 200
    my_data = my_360.json()
    # CRITICAL SECURITY INVARIANT: Student NEVER sees internal risk score or SHAP explanation!
    assert my_data["risk_support_level"] is None
    assert my_data["risk_calibrated_probability"] is None
    assert my_data["risk_drivers"] is None
    assert my_data["protective_factors"] is None
    assert my_data["interventions"] is None

    # Student attempting to view another student's 360
    if student_id != my_student_id:
        forbidden_360 = client.get(f"/internal/v1/students/{student_id}/360")
        assert forbidden_360.status_code == 403


def test_cross_institution_isolation():
    # Login as Tenant B Admin (Beacon University)
    login_b = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@beacon.edu", "password": "BeaconPass123!"},
    )
    assert login_b.status_code == 200

    # Attempt to view Tenant A's student
    # Login as Tenant A Admin to get Tenant A student ID
    client.post("/internal/v1/auth/login", json={"email": "admin@apex.edu", "password": "AdminPass123!"})
    tenant_a_student_id = client.get("/internal/v1/students").json()[0]["id"]

    # Switch back to Tenant B
    client.post("/internal/v1/auth/login", json={"email": "admin@beacon.edu", "password": "BeaconPass123!"})
    cross_res = client.get(f"/internal/v1/students/{tenant_a_student_id}/360")
    assert cross_res.status_code == 403
