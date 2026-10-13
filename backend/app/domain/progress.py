from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import (
    AssessmentResult,
    ResultCompetency,
    AssessmentForm,
    ProgressComparison,
    FrameworkCompetency,
)

COMPARISON_RULE_VERSION = "empiria_comp_v1"


def compute_progress_comparison(
    db: Session,
    institution_id: str,
    student_id: str,
    baseline_result_id: str,
    follow_up_result_id: str,
) -> list[ProgressComparison]:
    """
    Computes qualified baseline vs follow-up comparison for a student.
    Enforces comparability metadata, determines change (improved/unchanged/regressed),
    and attaches mandatory evaluation limitations.
    """
    baseline = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.institution_id == institution_id,
            AssessmentResult.id == baseline_result_id,
            AssessmentResult.student_id == student_id,
        )
        .first()
    )
    follow_up = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.institution_id == institution_id,
            AssessmentResult.id == follow_up_result_id,
            AssessmentResult.student_id == student_id,
        )
        .first()
    )

    if not baseline or not follow_up:
        raise ValueError("Baseline or follow-up result not found for student")

    # Check comparability state between forms
    comparability_state = "declared_equivalent"
    limitation_notes = []

    b_form = None
    f_form = None
    if baseline.attempt_id:
        b_form = baseline.attempt.form if hasattr(baseline, "attempt") and baseline.attempt else None
    if follow_up.attempt_id:
        f_form = follow_up.attempt.form if hasattr(follow_up, "attempt") and follow_up.attempt else None

    if b_form and f_form:
        if b_form.comparability_state == "not_established" or f_form.comparability_state == "not_established":
            comparability_state = "not_established"
            limitation_notes.append(
                "Comparability between baseline and follow-up assessment forms has not been psychometrically established."
            )
        elif b_form.family_id and f_form.family_id and b_form.family_id != f_form.family_id:
            comparability_state = "not_established"
            limitation_notes.append("Baseline and follow-up forms belong to different assessment families.")

    limitation_notes.append(
        "Observed performance deltas represent measured score differences under standardized conditions. "
        "Empiria does not make causal attribution claims regarding intervention efficacy from score deltas alone."
    )
    mandatory_limitations = " ".join(limitation_notes)

    # Fetch result competencies
    b_comps = {
        rc.competency_id: rc
        for rc in db.query(ResultCompetency).filter(ResultCompetency.assessment_result_id == baseline.id).all()
    }
    f_comps = {
        rc.competency_id: rc
        for rc in db.query(ResultCompetency).filter(ResultCompetency.assessment_result_id == follow_up.id).all()
    }

    all_comp_ids = set(b_comps.keys()).union(set(f_comps.keys()))
    comparisons = []

    for comp_id in all_comp_ids:
        b_c = b_comps.get(comp_id)
        f_c = f_comps.get(comp_id)

        b_score = b_c.percentage if b_c else 0.0
        f_score = f_c.percentage if f_c else 0.0
        delta = f_score - b_score

        if not b_c or not f_c:
            outcome = "inconclusive"
        elif comparability_state == "not_established":
            outcome = "inconclusive"
        elif delta >= 5.0:
            outcome = "improved"
        elif delta <= -5.0:
            outcome = "regressed"
        else:
            outcome = "unchanged"

        # Check existing comparison record
        existing = (
            db.query(ProgressComparison)
            .filter(
                ProgressComparison.institution_id == institution_id,
                ProgressComparison.student_id == student_id,
                ProgressComparison.competency_id == comp_id,
                ProgressComparison.baseline_result_id == baseline_result_id,
                ProgressComparison.follow_up_result_id == follow_up_result_id,
            )
            .first()
        )

        if not existing:
            comp_record = ProgressComparison(
                institution_id=institution_id,
                student_id=student_id,
                competency_id=comp_id,
                baseline_result_id=baseline_result_id,
                follow_up_result_id=follow_up_result_id,
                baseline_score=b_score,
                follow_up_score=f_score,
                score_delta=delta,
                comparability_state=comparability_state,
                outcome_status=outcome,
                mandatory_limitations=mandatory_limitations,
                comparison_rule_version=COMPARISON_RULE_VERSION,
            )
            db.add(comp_record)
            comparisons.append(comp_record)
        else:
            comparisons.append(existing)

    db.commit()
    return comparisons
