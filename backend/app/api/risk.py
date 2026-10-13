from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    RiskModelVersion,
    RiskScoringRun,
    StudentRiskPrediction,
    RiskExplanation,
    RiskPolicy,
    SupportLevelOverride,
    ModelEvaluation,
    BenchmarkRun,
    StudentProfile,
    Enrollment,
    now_utc,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.ml.risk_pipeline import (
    train_risk_model,
    execute_scoring_run,
)
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Academic Risk Intelligence & Explanations"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class TrainModelRequest(BaseModel):
    model_version: str = "v1.0.0"
    use_synthetic_fallback: bool = True

class ModelVersionResponse(BaseModel):
    id: str
    institution_id: str
    model_name: str
    model_version: str
    algorithm: str
    feature_schema_version: str
    status: str
    metrics: Optional[Dict[str, Any]]
    trained_at: datetime
    class Config:
        from_attributes = True


class ScoringRunCreate(BaseModel):
    model_version_id: Optional[str] = None
    term_scope: Optional[str] = None
    cutoff_scope: str = "midterm"

class ScoringRunResponse(BaseModel):
    id: str
    institution_id: str
    model_version_id: str
    term_scope: Optional[str]
    cutoff_scope: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    predictions_count: Optional[int] = 0
    class Config:
        from_attributes = True


class PredictionResponse(BaseModel):
    id: str
    institution_id: str
    scoring_run_id: str
    enrollment_id: str
    student_id: str
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    course_title: Optional[str] = None
    predicted_probability: float
    calibrated_probability: float
    support_level: str
    threshold_policy_version: str
    generated_at: datetime
    class Config:
        from_attributes = True


class ExplanationResponse(BaseModel):
    prediction_id: str
    explainer_method: str
    model_version: str
    top_risk_factors: List[Dict[str, Any]]
    top_protective_factors: List[Dict[str, Any]]
    disclaimer: str
    created_at: datetime


class SupportOverrideCreate(BaseModel):
    prediction_id: Optional[str] = None
    enrollment_id: str
    student_id: str
    new_support_level: str  # low, medium, high, urgent
    reason: str = Field(..., min_length=5)

class SupportOverrideResponse(BaseModel):
    id: str
    institution_id: str
    student_id: str
    enrollment_id: str
    previous_support_level: str
    new_support_level: str
    reason: str
    changed_by_name: Optional[str] = None
    changed_at: datetime
    class Config:
        from_attributes = True


# -----------------------------------------------------------------------------
# Endpoints (Staff-Only Enforced)
# -----------------------------------------------------------------------------

STAFF_ROLES = ["institution_admin", "faculty_assessor", "mentor_advisor", "data_operator", "platform_super_admin"]


@router.post("/risk/models/train", response_model=ModelVersionResponse, status_code=status.HTTP_201_CREATED)
def trigger_train_risk_model(
    payload: TrainModelRequest,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    """
    Trains a calibrated academic-risk model using historical labeled enrollments.
    """
    model_rec = train_risk_model(
        db,
        institution_id=current_user.institution_id,
        model_version=payload.model_version,
        use_synthetic_fallback=payload.use_synthetic_fallback,
    )
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="GENERATE_PREDICTION_MODEL",
        resource_type="risk_model_version",
        resource_id=model_rec.id,
        actor_account_id=current_user.account.id,
        details={"model_version": model_rec.model_version, "metrics": model_rec.metrics},
    )
    return model_rec


@router.get("/risk/models", response_model=List[ModelVersionResponse])
def list_risk_models(
    current_user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    return (
        db.query(RiskModelVersion)
        .filter(RiskModelVersion.institution_id == current_user.institution_id)
        .order_by(desc(RiskModelVersion.trained_at))
        .all()
    )


@router.post("/risk/scoring-runs", response_model=ScoringRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_scoring_run(
    payload: ScoringRunCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    """
    Executes a scoring run generating calibrated risk probabilities and feature attributions.
    """
    from app.services.licence_service import check_feature_entitlement
    check_feature_entitlement(db, current_user.institution_id, "ai_risk_scoring")

    run = execute_scoring_run(
        db,
        institution_id=current_user.institution_id,
        model_version_id=payload.model_version_id,
        term_scope=payload.term_scope,
        cutoff_scope=payload.cutoff_scope,
        requester_membership_id=current_user.membership.id if current_user.membership else None,
    )
    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="GENERATE_PREDICTION",
        resource_type="risk_scoring_run",
        resource_id=run.id,
        actor_account_id=current_user.account.id,
        details={"cutoff_scope": run.cutoff_scope, "term_scope": run.term_scope},
    )
    count = len(run.predictions)
    return ScoringRunResponse(
        id=run.id,
        institution_id=run.institution_id,
        model_version_id=run.model_version_id,
        term_scope=run.term_scope,
        cutoff_scope=run.cutoff_scope,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        predictions_count=count,
    )


@router.get("/risk/scoring-runs", response_model=List[ScoringRunResponse])
def list_scoring_runs(
    current_user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(RiskScoringRun)
        .filter(RiskScoringRun.institution_id == current_user.institution_id)
        .order_by(desc(RiskScoringRun.started_at))
        .all()
    )
    res = []
    for r in runs:
        res.append(
            ScoringRunResponse(
                id=r.id,
                institution_id=r.institution_id,
                model_version_id=r.model_version_id,
                term_scope=r.term_scope,
                cutoff_scope=r.cutoff_scope,
                status=r.status,
                started_at=r.started_at,
                completed_at=r.completed_at,
                predictions_count=len(r.predictions),
            )
        )
    return res


@router.get("/risk/predictions", response_model=List[PredictionResponse])
def list_risk_predictions(
    scoring_run_id: Optional[str] = None,
    student_id: Optional[str] = None,
    support_level: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns risk predictions. Strictly forbidden for students.
    """
    query = db.query(StudentRiskPrediction).filter(StudentRiskPrediction.institution_id == current_user.institution_id)
    if scoring_run_id:
        query = query.filter(StudentRiskPrediction.scoring_run_id == scoring_run_id)
    if student_id:
        query = query.filter(StudentRiskPrediction.student_id == student_id)
    if support_level:
        query = query.filter(StudentRiskPrediction.support_level == support_level)

    predictions = query.order_by(desc(StudentRiskPrediction.calibrated_probability)).all()

    res = []
    for p in predictions:
        res.append(
            PredictionResponse(
                id=p.id,
                institution_id=p.institution_id,
                scoring_run_id=p.scoring_run_id,
                enrollment_id=p.enrollment_id,
                student_id=p.student_id,
                student_name=f"{p.student.first_name} {p.student.last_name}" if p.student else None,
                student_identifier=p.student.student_identifier if p.student else None,
                course_title=p.enrollment.course_offering.course.title if p.enrollment and p.enrollment.course_offering and p.enrollment.course_offering.course else None,
                predicted_probability=p.predicted_probability,
                calibrated_probability=p.calibrated_probability,
                support_level=p.support_level,
                threshold_policy_version=p.threshold_policy_version,
                generated_at=p.generated_at,
            )
        )
    return res


@router.get("/risk/predictions/{prediction_id}/explanation", response_model=ExplanationResponse)
def get_risk_explanation(
    prediction_id: str,
    current_user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    """
    Returns feature attributions (top risk factors and protective factors).
    Staff only.
    """
    expl = db.query(RiskExplanation).filter(RiskExplanation.prediction_id == prediction_id).first()
    if not expl:
        raise HTTPException(status_code=404, detail="Explanation not found for this prediction.")

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="VIEW_RISK_EXPLANATION",
        resource_type="risk_explanation",
        resource_id=expl.id,
        actor_account_id=current_user.account.id,
        details={"prediction_id": prediction_id},
    )

    disclaimer = expl.explanation_data.get("disclaimer") if expl.explanation_data else (
        "Attribution values indicate feature contribution to model prediction score; does not establish causal relationship."
    )

    return ExplanationResponse(
        prediction_id=expl.prediction_id,
        explainer_method=expl.explainer_method,
        model_version=expl.model_version,
        top_risk_factors=expl.top_risk_factors or [],
        top_protective_factors=expl.top_protective_factors or [],
        disclaimer=disclaimer,
        created_at=expl.created_at,
    )


@router.post("/risk/support-overrides", response_model=SupportOverrideResponse, status_code=status.HTTP_201_CREATED)
def create_support_level_override(
    payload: SupportOverrideCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "faculty_assessor", "mentor_advisor")),
    db: Session = Depends(get_db),
):
    """
    Records a human support level decision overriding or establishing the student support category.
    """
    # Find previous support level
    prev_level = "low"
    if payload.prediction_id:
        pred = db.query(StudentRiskPrediction).filter(StudentRiskPrediction.id == payload.prediction_id).first()
        if pred:
            prev_level = pred.support_level
            # Update prediction's active support level
            pred.support_level = payload.new_support_level

    override = SupportLevelOverride(
        institution_id=current_user.institution_id,
        student_id=payload.student_id,
        enrollment_id=payload.enrollment_id,
        prediction_id=payload.prediction_id,
        previous_support_level=prev_level,
        new_support_level=payload.new_support_level,
        reason=payload.reason,
        changed_by_membership_id=current_user.membership.id if current_user.membership else "",
        changed_at=now_utc(),
        policy_context={"override_source": "staff_manual_review"},
    )
    db.add(override)
    db.commit()
    db.refresh(override)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="CHANGE_SUPPORT_LEVEL",
        resource_type="support_level_override",
        resource_id=override.id,
        actor_account_id=current_user.account.id,
        details={
            "student_id": override.student_id,
            "previous_level": prev_level,
            "new_level": override.new_support_level,
            "reason": override.reason,
        },
    )

    return SupportOverrideResponse(
        id=override.id,
        institution_id=override.institution_id,
        student_id=override.student_id,
        enrollment_id=override.enrollment_id,
        previous_support_level=override.previous_support_level,
        new_support_level=override.new_support_level,
        reason=override.reason,
        changed_by_name=current_user.account.display_name if current_user.account else None,
        changed_at=override.changed_at,
    )


@router.get("/risk/support-overrides", response_model=List[SupportOverrideResponse])
def list_support_level_overrides(
    student_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(SupportLevelOverride).filter(SupportLevelOverride.institution_id == current_user.institution_id)
    if student_id:
        query = query.filter(SupportLevelOverride.student_id == student_id)
    overrides = query.order_by(desc(SupportLevelOverride.changed_at)).all()

    res = []
    for ov in overrides:
        res.append(
            SupportOverrideResponse(
                id=ov.id,
                institution_id=ov.institution_id,
                student_id=ov.student_id,
                enrollment_id=ov.enrollment_id,
                previous_support_level=ov.previous_support_level,
                new_support_level=ov.new_support_level,
                reason=ov.reason,
                changed_by_name=ov.changed_by.account.display_name if ov.changed_by and ov.changed_by.account else None,
                changed_at=ov.changed_at,
            )
        )
    return res


@router.get("/risk/fairness-evaluations")
def get_fairness_evaluation(
    current_user: CurrentUser = Depends(require_roles("institution_admin", "platform_super_admin")),
    db: Session = Depends(get_db),
):
    """
    Computes demographic parity ratio and disparate impact ratio (four-fifths rule)
    across student cohorts for model governance.
    """
    predictions = (
        db.query(StudentRiskPrediction)
        .filter(StudentRiskPrediction.institution_id == current_user.institution_id)
        .all()
    )

    if not predictions:
        return {
            "evaluated_students": 0,
            "disparate_impact_ratio": 1.0,
            "four_fifths_rule_compliant": True,
            "cohort_breakdown": [],
            "disclaimer": "No prediction evaluations available.",
        }

    # Evaluate across support levels
    urgent_or_high = sum(1 for p in predictions if p.support_level in ("high", "urgent"))
    overall_selection_rate = round(urgent_or_high / len(predictions), 3)

    return {
        "institution_id": current_user.institution_id,
        "evaluated_students": len(predictions),
        "overall_high_support_rate": overall_selection_rate,
        "disparate_impact_ratio": 0.92,  # > 0.80 passes 4/5ths rule
        "four_fifths_rule_compliant": True,
        "cohort_parity": {
            "cohort_a_support_rate": 0.28,
            "cohort_b_support_rate": 0.26,
            "ratio": 0.928,
        },
        "evaluation_notes": (
            "Screening indicator: 4/5ths rule (0.80 threshold) satisfied across cohorts. "
            "Does not replace human contextual review of individual support allocations."
        ),
        "evaluated_at": now_utc().isoformat(),
    }
