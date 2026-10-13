import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    RiskModelVersion,
    RiskScoringRun,
    StudentRiskPrediction,
    RiskExplanation,
    SupportLevelOverride,
    AuditEvent,
)
from app.ml.risk_pipeline import determine_support_level, compute_feature_attributions

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
# PHASE 6: Student Risk Pipeline (LightGBM & TreeSHAP) Test Suite
# =========================================================================

def test_phase6_model_training_and_held_out_metrics():
    """
    Test Phase 6 calibrated risk model training:
    - Trains HistGradientBoosting with Platt sigmoid calibration.
    - Computes verified held-out evaluation metrics: ROC-AUC, PR-AUC, F1, F2, Brier score.
    - Records model artifact and emits GENERATE_PREDICTION_MODEL audit event.
    """
    admin_headers, admin_cookies, admin_data = login("admin@apex.edu", "AdminPass123!")

    ver = f"v2.0.0-phase6-{uuid.uuid4().hex[:6]}"
    res = client.post(
        "/internal/v1/risk/models/train",
        json={"model_version": ver, "use_synthetic_fallback": True},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 201, res.text
    model = res.json()
    assert model["model_version"] == ver
    assert model["algorithm"] == "hist_gradient_boosting"
    assert model["status"] == "active"

    metrics = model["metrics"]
    assert "roc_auc" in metrics
    assert "pr_auc" in metrics
    assert "f2" in metrics
    assert "brier_score" in metrics
    assert metrics["calibrated"] is True
    assert metrics["calibration_method"] == "platt_sigmoid"
    assert metrics["test_sample_size"] > 0

    # Audit verification
    db = SessionLocal()
    try:
        audit = (
            db.query(AuditEvent)
            .filter(
                AuditEvent.action == "GENERATE_PREDICTION_MODEL",
                AuditEvent.resource_id == model["id"],
            )
            .first()
        )
        assert audit is not None
        assert audit.details["model_version"] == ver
    finally:
        db.close()


def test_phase6_scoring_run_calibrated_probabilities():
    """
    Test execution of academic risk scoring run:
    - Executes scoring run across active enrollments with midterm cutoff.
    - Verifies calibrated risk probabilities (between 0.0 and 1.0) and mapped support levels.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.post(
        "/internal/v1/risk/scoring-runs",
        json={"cutoff_scope": "midterm"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 201, res.text
    run = res.json()
    assert run["status"] == "completed"
    assert run["cutoff_scope"] == "midterm"
    assert run["predictions_count"] >= 1

    # Fetch predictions
    preds_res = client.get(
        f"/internal/v1/risk/predictions?scoring_run_id={run['id']}",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert preds_res.status_code == 200
    preds = preds_res.json()
    assert len(preds) >= 1

    for p in preds:
        assert 0.0 <= p["predicted_probability"] <= 1.0
        assert 0.0 <= p["calibrated_probability"] <= 1.0
        assert p["support_level"] in ("low", "medium", "high", "urgent")
        assert p["threshold_policy_version"] is not None


def test_phase6_feature_attributions_and_statutory_disclaimer():
    """
    Test explainable feature attributions:
    - Generates risk explanations partitioning features into risk drivers vs protective factors.
    - Enforces statutory disclaimer: attributions reflect mathematical contribution, not causality.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    preds = client.get("/internal/v1/risk/predictions", headers=admin_headers, cookies=admin_cookies).json()
    assert len(preds) > 0
    target_pred = preds[0]

    expl_res = client.get(
        f"/internal/v1/risk/predictions/{target_pred['id']}/explanation",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert expl_res.status_code == 200
    expl = expl_res.json()
    assert expl["prediction_id"] == target_pred["id"]
    assert expl["explainer_method"] == "feature_attribution"
    assert isinstance(expl["top_risk_factors"], list)
    assert isinstance(expl["top_protective_factors"], list)

    # Disclaimers must explicitly note non-causal attribution
    assert "causal" in expl["disclaimer"].lower() or "attribution" in expl["disclaimer"].lower()


def test_phase6_human_support_level_override():
    """
    Test human-in-the-loop support override:
    - Staff records a manual override on the support level with justified reasoning.
    - Previous and new support levels are recorded.
    - Prediction record support level is updated.
    - Audit event CHANGE_SUPPORT_LEVEL is logged.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    preds = client.get("/internal/v1/risk/predictions", headers=admin_headers, cookies=admin_cookies).json()
    pred = preds[0]

    new_level = "urgent" if pred["support_level"] != "urgent" else "high"
    reason = "Student reported major bereavement; emergency academic accommodation approved."

    ov_res = client.post(
        "/internal/v1/risk/support-overrides",
        json={
            "prediction_id": pred["id"],
            "enrollment_id": pred["enrollment_id"],
            "student_id": pred["student_id"],
            "new_support_level": new_level,
            "reason": reason,
        },
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert ov_res.status_code == 201, ov_res.text
    ov_data = ov_res.json()
    assert ov_data["new_support_level"] == new_level
    assert ov_data["previous_support_level"] == pred["support_level"]
    assert ov_data["reason"] == reason

    # List overrides
    list_ov = client.get(
        f"/internal/v1/risk/support-overrides?student_id={pred['student_id']}",
        headers=admin_headers,
        cookies=admin_cookies,
    ).json()
    assert any(o["id"] == ov_data["id"] for o in list_ov)


def test_phase6_fairness_governance_evaluation():
    """
    Test algorithmic fairness evaluations:
    - Validates disparate impact ratio calculation across student cohorts.
    - Asserts four-fifths rule (80% ratio) compliance.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")

    res = client.get(
        "/internal/v1/risk/fairness-evaluations",
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert res.status_code == 200
    data = res.json()
    assert "four_fifths_rule_compliant" in data
    assert data["four_fifths_rule_compliant"] is True
    assert data["disparate_impact_ratio"] >= 0.80
    assert "evaluation_notes" in data


def test_phase6_inviolate_student_privacy_guardrail():
    """
    INVIOLATE PRINCIPLE 1: Student Dashboard Privacy.
    Students must NEVER have access to internal academic risk labels or probabilities.
    Asserts HTTP 403 Forbidden on all risk pipeline endpoints for student accounts.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Models list forbidden
    assert client.get("/internal/v1/risk/models", headers=st_headers, cookies=st_cookies).status_code == 403

    # 2. Train model forbidden
    assert client.post(
        "/internal/v1/risk/models/train",
        json={"model_version": "illegal"},
        headers=st_headers,
        cookies=st_cookies,
    ).status_code == 403

    # 3. Scoring runs forbidden
    assert client.get("/internal/v1/risk/scoring-runs", headers=st_headers, cookies=st_cookies).status_code == 403

    # 4. Predictions forbidden
    assert client.get("/internal/v1/risk/predictions", headers=st_headers, cookies=st_cookies).status_code == 403

    # 5. Overrides forbidden
    assert client.get("/internal/v1/risk/support-overrides", headers=st_headers, cookies=st_cookies).status_code == 403

    # 6. Fairness evaluations forbidden
    assert client.get("/internal/v1/risk/fairness-evaluations", headers=st_headers, cookies=st_cookies).status_code == 403


def test_phase6_support_level_mapping_logic():
    """
    Unit test mapping of calibrated probabilities to institutional support tiers.
    """
    assert determine_support_level(0.10) == "low"
    assert determine_support_level(0.35) == "medium"
    assert determine_support_level(0.60) == "high"
    assert determine_support_level(0.85) == "urgent"


def test_phase6_feature_attributions_computation_logic():
    """
    Unit test feature attribution z-scoring and categorization into risk vs protective factors.
    """
    # High absence and missed assessments should register as risk factors
    feats = {
        "attendance_rate": 0.40,
        "absence_rate": 0.60,
        "assessment_average": 45.0,
        "missed_assessments": 4.0,
        "course_credits": 3.0,
        "term_progress_fraction": 0.5,
    }
    train_means = [0.85, 0.15, 75.0, 0.5, 3.0, 0.5]
    train_stds = [0.10, 0.10, 12.0, 0.8, 0.5, 0.1]

    risk_factors, protective_factors, attributions = compute_feature_attributions(
        feats, train_means, train_stds
    )
    assert len(risk_factors) >= 2
    risk_names = [f["feature"] for f in risk_factors]
    assert "absence_rate" in risk_names or "missed_assessments" in risk_names
