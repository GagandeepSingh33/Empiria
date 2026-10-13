import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    AuditEvent,
    Institution,
    Account,
    InstitutionMembership,
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
# PHASE 8: Institutional Analytics & Longitudinal Intelligence Tests
# =========================================================================

def test_phase8_cohort_retention_analytics_and_privacy_suppression():
    """
    Test cohort retention analysis:
    - Admin retrieves longitudinal cohort retention metrics.
    - Overall retention rate calculated.
    - Small-cohort privacy suppression flag respected.
    - Tamper-evident audit log recorded.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/cohort-retention", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_cohorts" in data
    assert "overall_retention_rate" in data
    assert isinstance(data["overall_retention_rate"], float)
    assert "cohorts" in data
    assert len(data["cohorts"]) >= 1
    assert "statutory_disclaimer" in data

    # Check first cohort
    first_cohort = data["cohorts"][0]
    assert "cohort_name" in first_cohort
    assert "is_suppressed" in first_cohort
    if not first_cohort["is_suppressed"]:
        assert "retention_rate" in first_cohort
        assert "active_count" in first_cohort

    # Verify audit event
    with SessionLocal() as db:
        event = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "COHORT_RETENTION_ACCESSED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert event is not None
        assert event.resource_type == "analytics_cohort_retention"


def test_phase8_department_health_longitudinal_trajectory():
    """
    Test department-level academic trajectory & health analysis:
    - Total courses, enrolled students, average grades, pass rates.
    - Attendance distribution bands (high, moderate, critical).
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/department-health", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_departments" in data
    assert "departments" in data
    assert len(data["departments"]) >= 1
    assert "statutory_disclaimer" in data

    for dept in data["departments"]:
        assert "department_name" in dept
        assert "department_code" in dept
        assert "total_courses" in dept
        assert "enrolled_students_count" in dept
        if not dept["is_suppressed"]:
            assert dept["pass_rate"] is not None
            assert dept["attendance_bands"] is not None
            assert "high_attendance_pct" in dept["attendance_bands"]


def test_phase8_risk_and_interventions_effectiveness():
    """
    Test risk pipeline & support interventions efficacy:
    - Risk category distribution (low, moderate, high, critical).
    - High-risk intervention coverage rate.
    - Intervention completion/resolution rate.
    - Human support override statistics.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/risk-and-interventions", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "risk_distribution" in data
    assert "low" in data["risk_distribution"]
    assert "high" in data["risk_distribution"]
    assert "high_risk_coverage_rate" in data
    assert 0.0 <= data["high_risk_coverage_rate"] <= 100.0
    assert "intervention_completion_rate" in data
    assert "human_overrides_count" in data
    assert "override_types" in data
    assert "upgrades" in data["override_types"]
    assert "downgrades" in data["override_types"]


def test_phase8_algorithmic_fairness_and_four_fifths_parity_audit():
    """
    Test algorithmic fairness & demographic parity audit:
    - Calculates Demographic Parity Ratio across student subgroups.
    - Evaluates adherence to EEOC Four-Fifths (80%) Rule.
    - Generates statutory compliance certification.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/fairness-equity-audit", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "demographic_parity_ratio" in data
    assert isinstance(data["demographic_parity_ratio"], float)
    assert "passes_four_fifths_rule" in data
    assert isinstance(data["passes_four_fifths_rule"], bool)
    assert "adverse_impact_detected" in data
    assert "compliance_certification" in data
    assert "subgroup_metrics" in data

    # Verify audit event
    with SessionLocal() as db:
        event = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "FAIRNESS_AUDIT_CONDUCTED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert event is not None
        assert event.resource_type == "analytics_fairness_audit"


def test_phase8_pathway_engagement_and_decoupling_verification():
    """
    Test Co-Curricular Two-Pathway engagement analytics:
    - Co-curricular participation rate.
    - Practice hours logged.
    - Academic balance comparison.
    - Verifies pathway decoupling (no academic penalty).
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/pathway-engagement", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_students" in data
    assert "cocurricular_students_count" in data
    assert "cocurricular_participation_rate" in data
    assert "category_distribution" in data
    assert "total_practice_hours_logged" in data
    assert "academic_balance_comparison" in data
    assert data["pathway_decoupling_verified"] is True


def test_phase8_executive_report_and_cryptographic_checksum():
    """
    Test consolidated executive report:
    - Aggregates institutional KPIs (retention, pass rate, risk mitigation).
    - Computes 64-character SHA-256 integrity checksum.
    - Records tamper-evident audit event.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/executive-report", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "institution_name" in data
    assert "kpis" in data
    assert "total_enrolled_students" in data["kpis"]
    assert "overall_retention_rate" in data["kpis"]
    assert "academic_pass_rate" in data["kpis"]
    assert "integrity_checksum_sha256" in data
    assert len(data["integrity_checksum_sha256"]) == 64  # SHA-256 hex string

    # Verify audit event
    with SessionLocal() as db:
        event = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "EXECUTIVE_REPORT_GENERATED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert event is not None
        assert event.resource_type == "analytics_executive_report"


def test_phase8_rbac_student_access_forbidden():
    """
    Test strict role-based access control:
    - Students are denied access to institutional analytics dashboards.
    - Every analytics endpoint returns 403 Forbidden for students.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    endpoints = [
        "/internal/v1/analytics/cohort-retention",
        "/internal/v1/analytics/department-health",
        "/internal/v1/analytics/risk-and-interventions",
        "/internal/v1/analytics/fairness-equity-audit",
        "/internal/v1/analytics/pathway-engagement",
        "/internal/v1/analytics/executive-report",
    ]

    for ep in endpoints:
        res = client.get(ep, headers=st_headers, cookies=st_cookies)
        assert res.status_code == 403, f"Expected 403 for {ep}, got {res.status_code}: {res.text}"


def test_phase8_tenant_isolation_boundary():
    """
    Test multi-tenant boundary:
    - Analytics query strictly binds to current_user.institution_id.
    - Returns metrics only for the calling administrator's tenant.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get("/internal/v1/analytics/cohort-retention", headers=admin_headers, cookies=admin_cookies)
    assert res.status_code == 200
    apex_inst_id = res.json()["institution_id"]

    # Verify institution matches Apex
    with SessionLocal() as db:
        apex = db.query(Institution).filter(Institution.id == apex_inst_id).first()
        assert apex is not None
        assert "Apex" in apex.name
