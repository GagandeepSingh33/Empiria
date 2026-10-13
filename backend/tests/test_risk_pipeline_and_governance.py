import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_academic_risk_pipeline_and_governance():
    # 1. Staff Login
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. Train Risk Model
    train_res = client.post(
        "/internal/v1/risk/models/train",
        json={"model_version": "v2.0.0-test", "use_synthetic_fallback": True},
        headers=headers,
    )
    assert train_res.status_code == 201
    model_data = train_res.json()
    assert model_data["algorithm"] == "hist_gradient_boosting"
    assert "roc_auc" in model_data["metrics"]
    assert "pr_auc" in model_data["metrics"]
    assert "f2" in model_data["metrics"]
    assert model_data["metrics"]["calibrated"] is True

    # 3. List Risk Models
    list_models = client.get("/internal/v1/risk/models")
    assert list_models.status_code == 200
    assert len(list_models.json()) >= 1

    # 4. Trigger Scoring Run
    score_res = client.post(
        "/internal/v1/risk/scoring-runs",
        json={"cutoff_scope": "midterm"},
        headers=headers,
    )
    assert score_res.status_code == 201
    run_data = score_res.json()
    assert run_data["status"] == "completed"

    # 5. List Predictions
    preds_res = client.get("/internal/v1/risk/predictions")
    assert preds_res.status_code == 200
    preds = preds_res.json()
    if preds:
        pred = preds[0]
        assert "predicted_probability" in pred
        assert "calibrated_probability" in pred
        assert pred["support_level"] in ("low", "medium", "high", "urgent")

        # 6. Fetch Risk Explanation
        expl_res = client.get(f"/internal/v1/risk/predictions/{pred['id']}/explanation")
        assert expl_res.status_code == 200
        expl_data = expl_res.json()
        assert "top_risk_factors" in expl_data
        assert "top_protective_factors" in expl_data
        assert "causal" in expl_data["disclaimer"].lower() or "attribution" in expl_data["disclaimer"].lower()

        # 7. Record Human Support Override
        override_res = client.post(
            "/internal/v1/risk/support-overrides",
            json={
                "prediction_id": pred["id"],
                "enrollment_id": pred["enrollment_id"],
                "student_id": pred["student_id"],
                "new_support_level": "high",
                "reason": "Advisor noted personal hardship impacting term attendance; proactive tutoring assigned.",
            },
            headers=headers,
        )
        assert override_res.status_code == 201
        ov_data = override_res.json()
        assert ov_data["new_support_level"] == "high"

    # 8. Fairness Governance Review
    fairness_res = client.get("/internal/v1/risk/fairness-evaluations")
    assert fairness_res.status_code == 200
    fairness_data = fairness_res.json()
    assert "four_fifths_rule_compliant" in fairness_data
    assert "disparate_impact_ratio" in fairness_data

    # 9. STUDENT PRIVACY ENFORCEMENT
    # Students must be rejected with 403 Forbidden on all risk endpoints
    student_login = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert student_login.status_code == 200

    forbidden_models = client.get("/internal/v1/risk/models")
    assert forbidden_models.status_code == 403

    forbidden_preds = client.get("/internal/v1/risk/predictions")
    assert forbidden_preds.status_code == 403
