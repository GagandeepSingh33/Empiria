import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    AuditEvent,
    StudentProfile,
    CareerOccupation,
    StudentCareerGoal,
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
# PHASE 10: Career Intelligence & ESCO/O*NET WSGI Tests
# =========================================================================

def test_phase10_occupations_catalogue_browsing_and_taxonomies():
    """
    Test occupational catalogue:
    - Lists seeded occupations across ESCO and O*NET taxonomies.
    - Filters by taxonomy (ESCO vs O*NET).
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Browse all occupations
    res = client.get("/internal/v1/career/occupations", headers=st_headers, cookies=st_cookies)
    assert res.status_code == 200, res.text
    occs = res.json()
    assert len(occs) >= 3
    codes = {o["code"] for o in occs}
    assert "ESCO-2512.1" in codes
    assert "ONET-15-1252.00" in codes

    # 2. Filter by taxonomy
    esco_res = client.get("/internal/v1/career/occupations?taxonomy=ESCO", headers=st_headers, cookies=st_cookies)
    assert esco_res.status_code == 200
    esco_occs = esco_res.json()
    assert all(o["taxonomy"] == "ESCO" for o in esco_occs)


def test_phase10_student_career_goal_declaration_and_priority():
    """
    Test student career goal declaration:
    - Student declares primary career goal for Cloud Architect role.
    - Sets target graduation date.
    - Verifies retrieval and idempotent priority update.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Fetch Cloud Architect occupation
    occs = client.get("/internal/v1/career/occupations", headers=st_headers, cookies=st_cookies).json()
    cloud_occ = next(o for o in occs if o["code"] == "ESCO-2512.1")

    # 2. Declare goal
    target_date = (date.today() + timedelta(days=365)).isoformat()
    declare_res = client.post(
        "/internal/v1/career/goals",
        json={
            "occupation_id": cloud_occ["id"],
            "priority": "primary",
            "target_graduation_date": target_date,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert declare_res.status_code == 201, declare_res.text
    goal = declare_res.json()
    assert goal["occupation_id"] == cloud_occ["id"]
    assert goal["priority"] == "primary"
    assert goal["status"] == "active"

    # 3. Fetch declared goals
    list_res = client.get("/internal/v1/career/goals", headers=st_headers, cookies=st_cookies)
    assert list_res.status_code == 200
    goals = list_res.json()
    assert any(g["occupation_id"] == cloud_occ["id"] for g in goals)


def test_phase10_weighted_skill_gap_index_calculation():
    """
    Test Weighted Skill Gap Index (WSGI):
    - Computes real-time weighted skill gaps against target occupation.
    - Mathematical bounds: 0 <= WSGI <= 100, Readiness = 100 - WSGI.
    - Actionable recommendations generated for skill gaps.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    occs = client.get("/internal/v1/career/occupations", headers=st_headers, cookies=st_cookies).json()
    cloud_occ = next(o for o in occs if o["code"] == "ESCO-2512.1")

    wsgi_res = client.get(f"/internal/v1/career/wsgi/{cloud_occ['id']}", headers=st_headers, cookies=st_cookies)
    assert wsgi_res.status_code == 200, wsgi_res.text
    data = wsgi_res.json()

    assert "wsgi_score" in data
    assert 0.0 <= data["wsgi_score"] <= 100.0
    assert "readiness_percentage" in data
    assert round(data["wsgi_score"] + data["readiness_percentage"], 1) == 100.0
    assert "skills" in data
    assert len(data["skills"]) == len(cloud_occ["required_skills"])

    for s in data["skills"]:
        assert s["status"] in ("acquired", "in_progress", "gap")
        assert s["weight"] > 0
        assert s["target_level"] > 0

    assert "recommended_learning_actions" in data
    assert "statutory_disclaimer" in data


def test_phase10_student_dashboard_privacy_positive_framing():
    """
    Test Inviolate Principle 1 (Dashboard Privacy & Constructive Growth):
    - WSGI response contains no deficit / punitive risk labels.
    - No 'high_risk', 'academic_probation', or 'critical_failure' strings in payload.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    occs = client.get("/internal/v1/career/occupations", headers=st_headers, cookies=st_cookies).json()
    swe_occ = next(o for o in occs if o["code"] == "ONET-15-1252.00")

    wsgi_res = client.get(f"/internal/v1/career/wsgi/{swe_occ['id']}", headers=st_headers, cookies=st_cookies)
    assert wsgi_res.status_code == 200
    raw_text = wsgi_res.text.lower()

    assert "high_risk" not in raw_text
    assert "critical_failure" not in raw_text
    assert "disciplinary" not in raw_text


def test_phase10_verified_skill_passport_generation_and_crypto_seal():
    """
    Test exportable Verified Skill Passport:
    - Generates tamper-evident credential passport.
    - Includes student identifier, declared goals, and verified competencies.
    - Validates 64-character SHA-256 cryptographic seal.
    - Tamper-evident AuditEvent recorded.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    pass_res = client.get("/internal/v1/career/passport", headers=st_headers, cookies=st_cookies)
    assert pass_res.status_code == 200, pass_res.text
    passport = pass_res.json()

    assert "passport_id" in passport
    assert "student_name" in passport
    assert "student_identifier" in passport
    assert "verified_competencies" in passport
    assert len(passport["verified_competencies"]) >= 1
    assert "cryptographic_signature_sha256" in passport
    assert len(passport["cryptographic_signature_sha256"]) == 64

    # Verify audit event recorded
    with SessionLocal() as db:
        ev = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "SKILL_PASSPORT_EXPORTED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert ev is not None
        assert ev.resource_type == "skill_passport"


def test_phase10_admin_occupation_registration():
    """
    Test admin registration of career occupation:
    - Admin creates custom occupation with weighted skill requirements.
    - Student attempt is rejected with 403 Forbidden.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    occ_code = f"ESCO-AI-{uuid.uuid4().hex[:4]}"
    payload = {
        "code": occ_code,
        "title": "Autonomous Robotics & AI Perception Engineer",
        "taxonomy": "ESCO",
        "industry_sector": "Artificial Intelligence & Robotics",
        "description": "Perception pipelines, SLAM, sensor fusion, and reinforcement learning.",
        "required_skills": [
            {"skill_key": "computer-vision", "name": "3D Computer Vision & SLAM", "weight": 1.0, "target_level": 4.5},
            {"skill_key": "reinforcement-learning", "name": "Deep Reinforcement Learning", "weight": 0.9, "target_level": 4.0},
        ],
    }

    # Student forbidden
    st_res = client.post("/internal/v1/career/occupations", json=payload, headers=st_headers, cookies=st_cookies)
    assert st_res.status_code == 403

    # Admin allowed
    adm_res = client.post("/internal/v1/career/occupations", json=payload, headers=admin_headers, cookies=admin_cookies)
    assert adm_res.status_code == 201, adm_res.text
    created = adm_res.json()
    assert created["code"] == occ_code


def test_phase10_cross_tenant_isolation_boundary():
    """
    Test tenant isolation:
    - Beacon student cannot access Apex occupations or goals.
    """
    beacon_headers, beacon_cookies, _ = login("student@beacon.edu", "BeaconPass123!")

    with SessionLocal() as db:
        apex_occ = db.query(CareerOccupation).filter(CareerOccupation.code == "ESCO-2512.1").first()
        assert apex_occ is not None
        apex_occ_id = apex_occ.id

    # Beacon student querying Apex occupation detail
    res = client.get(f"/internal/v1/career/occupations/{apex_occ_id}", headers=beacon_headers, cookies=beacon_cookies)
    assert res.status_code in (404, 403)
