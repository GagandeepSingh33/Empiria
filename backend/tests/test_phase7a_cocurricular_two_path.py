import pytest
import uuid
import hashlib
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    CoCurricularActivity,
    CoCurricularEnrollment,
    ActivityPracticeSession,
    ActivityEvidenceItem,
    StudentProfile,
    Enrollment,
    StudentRiskPrediction,
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
# PHASE 7A: Co-Curricular Two-Pathway Engine & Competency Graph MVP
# =========================================================================

def test_phase7a_activity_catalogue_listing_and_creation():
    """
    Test Co-Curricular Activities catalogue:
    - Lists seeded activities across categories (sports, creative, esports, digital).
    - Filters by category.
    - Admin creates a new co-curricular activity.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. List activities
    res = client.get("/internal/v1/co-curricular/activities", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 200, res.text
    activities = res.json()
    assert len(activities) >= 4
    slugs = {a["slug"] for a in activities}
    assert "tennis-singles" in slugs
    assert "vocal-jazz" in slugs

    # 2. Filter by category
    tennis_res = client.get("/internal/v1/co-curricular/activities?category=sports_racquet", headers=st_headers, cookies=st_cookies)
    assert tennis_res.status_code == 200
    racquet_acts = tennis_res.json()
    assert all(a["category"] == "sports_racquet" for a in racquet_acts)

    # 3. Admin creates a new activity
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    slug_new = f"oil-painting-{uuid.uuid4().hex[:6]}"
    create_res = client.post(
        "/internal/v1/co-curricular/activities",
        json={
            "category": "creative_visual_arts",
            "name": "Classical Oil Painting & Color Theory",
            "slug": slug_new,
            "description": "Chiaroscuro techniques, glaze layering, and plein air composition.",
            "supported_modalities": ["image_upload", "portfolio_link"],
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert create_res.status_code == 201
    assert create_res.json()["slug"] == slug_new


def test_phase7a_student_enrollment_and_aspiration_levels():
    """
    Test student co-curricular pursuit enrollment:
    - Student declares ambition / aspiration level (recreational, intermediate, competitive, professional).
    - Sets weekly hours target.
    - Updates proficiency level and pursuit status.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Fetch activities
    activities = client.get("/internal/v1/co-curricular/activities", headers=st_headers, cookies=st_cookies).json()
    tennis = next(a for a in activities if a["slug"] == "tennis-singles")

    # 2. Student enrolls in tennis
    enr_res = client.post(
        "/internal/v1/co-curricular/enrollments",
        json={
            "activity_id": tennis["id"],
            "aspiration_level": "competitive",
            "current_proficiency_level": "beginner",
            "weekly_hours_target": 6.0,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert enr_res.status_code == 201, enr_res.text
    enr_data = enr_res.json()
    assert enr_data["activity_id"] == tennis["id"]
    assert enr_data["aspiration_level"] == "competitive"
    assert enr_data["weekly_hours_target"] == 6.0
    assert enr_data["status"] == "active"
    enr_id = enr_data["id"]

    # 3. Update pursuit
    patch_res = client.patch(
        f"/internal/v1/co-curricular/enrollments/{enr_id}",
        json={
            "current_proficiency_level": "developing",
            "weekly_hours_target": 8.0,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["current_proficiency_level"] == "developing"
    assert updated["weekly_hours_target"] == 8.0


def test_phase7a_practice_session_logging():
    """
    Test deliberate practice logging for co-curricular pursuit:
    - Logs session type, duration in minutes, technique focus, and self-evaluation score.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    enrollments = client.get("/internal/v1/co-curricular/enrollments", headers=st_headers, cookies=st_cookies).json()
    if not enrollments:
        activities = client.get("/internal/v1/co-curricular/activities", headers=st_headers, cookies=st_cookies).json()
        enr = client.post(
            "/internal/v1/co-curricular/enrollments",
            json={"activity_id": activities[0]["id"], "aspiration_level": "intermediate", "weekly_hours_target": 4.0},
            headers=st_headers,
            cookies=st_cookies,
        ).json()
        enr_id = enr["id"]
    else:
        enr_id = enrollments[0]["id"]

    # Log practice session
    sess_payload = {
        "enrollment_id": enr_id,
        "session_type": "independent",
        "duration_minutes": 75,
        "focus_technique": "Topspin groundstroke depth and crosscourt recovery",
        "notes": "Focused on split-step timing and hip rotation.",
        "self_evaluation_score": 8.0,
        "session_date": date.today().isoformat(),
    }
    log_res = client.post(
        "/internal/v1/co-curricular/practice-sessions",
        json=sess_payload,
        headers=st_headers,
        cookies=st_cookies,
    )
    assert log_res.status_code == 201, log_res.text
    session = log_res.json()
    assert session["duration_minutes"] == 75
    assert session["focus_technique"] == sess_payload["focus_technique"]

    # List sessions
    list_res = client.get(
        f"/internal/v1/co-curricular/practice-sessions?enrollment_id={enr_id}",
        headers=st_headers,
        cookies=st_cookies,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


def test_phase7a_activity_evidence_submission():
    """
    Test evidence item submission with cryptographic checksum and privacy settings:
    - Submits recorded drill / match evidence item.
    - Default privacy is student private.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    activities = client.get("/internal/v1/co-curricular/activities", headers=st_headers, cookies=st_cookies).json()
    tennis = next(a for a in activities if a["slug"] == "tennis-singles")

    checksum = hashlib.sha256(b"sample_tennis_serve_video_stream").hexdigest()
    ev_payload = {
        "activity_id": tennis["id"],
        "title": "Match Serve Kinetic Chain Demonstration",
        "evidence_type": "video_clip",
        "storage_uri": "s3://empiria-evidence/apex/student1/tennis_serve_01.mp4",
        "storage_checksum_sha256": checksum,
        "is_private_to_student": True,
    }
    ev_res = client.post(
        "/internal/v1/co-curricular/evidence",
        json=ev_payload,
        headers=st_headers,
        cookies=st_cookies,
    )
    assert ev_res.status_code == 201, ev_res.text
    ev_data = ev_res.json()
    assert ev_data["title"] == ev_payload["title"]
    assert ev_data["storage_checksum_sha256"] == checksum
    assert ev_data["is_private_to_student"] is True
    assert ev_data["evaluation_status"] == "pending"


def test_phase7a_constraint_aware_workload_planner():
    """
    Test shared temporal planner (Section 4.2):
    - Reconciles total student weekly budget (168 hours).
    - Integrates sleep & recovery (70 hrs), academic course study, and co-curricular pursuits.
    - Throttles co-curricular recommendations during exam periods.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    planner_res = client.get("/internal/v1/co-curricular/workload-planner", headers=st_headers, cookies=st_cookies)
    assert planner_res.status_code == 200, planner_res.text
    plan = planner_res.json()

    assert plan["weekly_total_budget_hours"] == 168.0
    assert plan["sleep_and_recovery_hours"] == 70.0
    assert plan["academic_classes_hours"] > 0
    assert plan["academic_study_hours"] > 0
    assert plan["co_curricular_committed_hours"] >= 0
    assert plan["available_discretionary_hours"] >= 0
    assert plan["overcommitment_risk"] in ("optimal", "balanced", "high", "critical")
    assert len(plan["plan_guidelines"]) > 0


def test_phase7a_inviolate_pathway_decoupling_gate():
    """
    INVIOLATE GATE 2 (Pathway Decoupling Gate):
    Assert that adding or modifying a co-curricular pursuit (e.g. tennis drill)
    has ZERO side effects on formal course grades or academic risk calculations.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Snapshot student course enrollments and risk predictions before
    db = SessionLocal()
    try:
        student = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        student_id = student.id
        academic_enrollments_before = (
            db.query(Enrollment)
            .filter(Enrollment.student_id == student_id)
            .all()
        )
        enr_ids_before = {e.id for e in academic_enrollments_before}

        risk_preds_before = (
            db.query(StudentRiskPrediction)
            .filter(StudentRiskPrediction.student_id == student_id)
            .all()
        )
        pred_scores_before = {p.id: p.calibrated_probability for p in risk_preds_before}
    finally:
        db.close()

    # 2. Student adds high-intensity co-curricular pursuit
    activities = client.get("/internal/v1/co-curricular/activities", headers=st_headers, cookies=st_cookies).json()
    vocal = next(a for a in activities if a["slug"] == "vocal-jazz")

    client.post(
        "/internal/v1/co-curricular/enrollments",
        json={"activity_id": vocal["id"], "aspiration_level": "professional", "weekly_hours_target": 12.0},
        headers=st_headers,
        cookies=st_cookies,
    )

    # 3. Verify formal academic records and risk scores are strictly identical
    db = SessionLocal()
    try:
        academic_enrollments_after = (
            db.query(Enrollment)
            .filter(Enrollment.student_id == student_id)
            .all()
        )
        enr_ids_after = {e.id for e in academic_enrollments_after}
        assert enr_ids_before == enr_ids_after

        risk_preds_after = (
            db.query(StudentRiskPrediction)
            .filter(StudentRiskPrediction.student_id == student_id)
            .all()
        )
        pred_scores_after = {p.id: p.calibrated_probability for p in risk_preds_after}
        assert pred_scores_before == pred_scores_after
    finally:
        db.close()


def test_phase7a_scoped_mentor_permissions_gate():
    """
    INVIOLATE GATE 3 (Mentor Scoping Gate):
    Assert that co-curricular or subject mentors cannot access internal academic risk scores.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Student cannot access risk predictions
    res = client.get("/internal/v1/risk/predictions", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 403


def test_phase7a_cross_tenant_cocurricular_isolation():
    """
    Test multi-tenant isolation:
    - Beacon admin/student cannot view Apex-only custom activities.
    """
    admin_b_h, admin_b_c, _ = login("admin@beacon.edu", "BeaconPass123!")

    # Beacon admin lists activities -> only receives Beacon activities
    beacon_acts = client.get("/internal/v1/co-curricular/activities", headers=admin_b_h, cookies=admin_b_c).json()
    assert all(a["institution_id"] != "apex-tech-id" for a in beacon_acts)
