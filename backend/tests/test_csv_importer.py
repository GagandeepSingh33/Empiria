import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
import uuid
from app.models import StudentProfile, CohortMembership, ImportJob, ImportStagedRow, ImportIssue

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_test_importer_data():
    client.cookies.clear()
    db = SessionLocal()
    try:
        students = db.query(StudentProfile).filter(StudentProfile.student_identifier.in_(["APEX-CSE-NEW-101", "APEX-CSE-NEW-102"])).all()
        for s in students:
            db.query(CohortMembership).filter(CohortMembership.student_id == s.id).delete()
            db.delete(s)
        db.commit()
    finally:
        db.close()
    yield
    client.cookies.clear()


def test_csv_import_workflow():
    # 1. Login as Data Operator
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "operator@apex.edu", "password": "OperatorPass123!"},
    )
    assert login_res.status_code == 200
    cookies = {settings.session_cookie_name: login_res.cookies[settings.session_cookie_name]}
    csrf_token = login_res.json()["csrf_token"]

    # 2. Create import job
    job_res = client.post(
        "/internal/v1/imports",
        json={
            "import_type": "students",
            "template_version": "1.0",
            "idempotency_key": f"test-import-key-{uuid.uuid4().hex}",
        },
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert job_res.status_code == 200
    job_id = job_res.json()["id"]

    # 3. Upload & Validate valid CSV
    valid_csv = (
        "student_identifier,first_name,last_name,email,cohort_name\n"
        "APEX-CSE-NEW-101,Rohan,Gupta,rohan.gupta@apex.edu,2026 Batch - Section A\n"
        "APEX-CSE-NEW-102,Ananya,Singh,ananya.singh@apex.edu,2026 Batch - Section A\n"
    )
    val_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("students.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")},
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert val_res.status_code == 200
    job_data = val_res.json()
    assert job_data["status"] == "validated"
    assert job_data["valid_rows"] == 2
    assert job_data["error_rows"] == 0

    # 4. Preview import
    prev_res = client.get(f"/internal/v1/imports/{job_id}/preview", cookies=cookies)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert len(prev_data["sample_rows"]) == 2
    assert len(prev_data["issues"]) == 0

    # 5. Commit import atomically
    commit_res = client.post(
        f"/internal/v1/imports/{job_id}/commit",
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert commit_res.status_code == 200
    assert commit_res.json()["created_students"] == 2

    # 6. Verify in database
    db = SessionLocal()
    try:
        s101 = db.query(StudentProfile).filter(StudentProfile.student_identifier == "APEX-CSE-NEW-101").first()
        assert s101 is not None
        assert s101.first_name == "Rohan"
        assert s101.email == "rohan.gupta@apex.edu"
    finally:
        db.close()


def test_csv_import_validation_failures():
    # Login as Data Operator
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "operator@apex.edu", "password": "OperatorPass123!"},
    )
    cookies = {settings.session_cookie_name: login_res.cookies[settings.session_cookie_name]}
    csrf_token = login_res.json()["csrf_token"]

    job_res = client.post(
        "/internal/v1/imports",
        json={
            "import_type": "students",
            "template_version": "1.0",
            "idempotency_key": f"test-import-key-{uuid.uuid4().hex}",
        },
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    job_id = job_res.json()["id"]

    # CSV with missing email & duplicate identifier
    bad_csv = (
        "student_identifier,first_name,last_name,email\n"
        "APEX-CSE-BAD-01,Bad,User,not-an-email\n"
        "APEX-CSE-BAD-01,Duplicate,User,valid@apex.edu\n"
    )
    val_res = client.post(
        f"/internal/v1/imports/{job_id}/validate",
        files={"file": ("bad.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")},
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert val_res.status_code == 200
    job_data = val_res.json()
    assert job_data["status"] == "validation_failed"
    assert job_data["error_rows"] > 0

    # Commit must fail when job is not validated
    commit_res = client.post(
        f"/internal/v1/imports/{job_id}/commit",
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert commit_res.status_code == 400
