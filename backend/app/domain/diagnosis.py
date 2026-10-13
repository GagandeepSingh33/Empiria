import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import (
    StudentProfile,
    FrameworkVersion,
    FrameworkCompetency,
    CompetencyLevel,
    CompetencyThreshold,
    AssessmentResult,
    ResultCompetency,
    EvidenceItem,
    EvidenceCompetency,
    DeterminationRun,
    CompetencyDetermination,
    DeterminationEvidenceItem,
    DeterminationResultInput,
    DiagnosisRun,
    DiagnosisFinding,
    FindingEvidenceItem,
)


RULE_SET_VERSION = "empiria_rules_v1"
DIAGNOSIS_RULE_VERSION = "empiria_diag_v1"
TEMPLATE_VERSION = "empiria_tmpl_v1"


def compute_input_fingerprint(
    student_id: str,
    framework_version_id: str,
    evidence_ids: list[str],
    result_ids: list[str],
) -> str:
    payload = {
        "student_id": student_id,
        "framework_version_id": framework_version_id,
        "evidence_ids": sorted(evidence_ids),
        "result_ids": sorted(result_ids),
    }
    dumped = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()


def run_deterministic_diagnosis(
    db: Session,
    institution_id: str,
    student_id: str,
    framework_version_id: str,
) -> tuple[DeterminationRun, DiagnosisRun]:
    """
    Executes the deterministic competency determination and diagnosis engine.
    Derives supported competency levels and independent evidence sufficiency,
    then generates diagnosis findings with rationale and recommendations.
    """
    # 1. Fetch framework competencies, levels, and thresholds
    competencies = (
        db.query(FrameworkCompetency)
        .filter(
            FrameworkCompetency.institution_id == institution_id,
            FrameworkCompetency.framework_version_id == framework_version_id,
        )
        .order_by(FrameworkCompetency.display_order)
        .all()
    )

    # 2. Fetch latest active assessment results & evidence for student
    results = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.institution_id == institution_id,
            AssessmentResult.student_id == student_id,
            AssessmentResult.framework_version_id == framework_version_id,
            AssessmentResult.status == "finalised",
        )
        .order_by(AssessmentResult.assessed_at.desc())
        .all()
    )

    evidence_items = (
        db.query(EvidenceItem)
        .filter(
            EvidenceItem.institution_id == institution_id,
            EvidenceItem.student_id == student_id,
            EvidenceItem.framework_version_id == framework_version_id,
        )
        .all()
    )

    evidence_ids = [e.id for e in evidence_items]
    result_ids = [r.id for r in results]
    fingerprint = compute_input_fingerprint(student_id, framework_version_id, evidence_ids, result_ids)

    # 3. Create DeterminationRun
    det_run = DeterminationRun(
        institution_id=institution_id,
        student_id=student_id,
        framework_version_id=framework_version_id,
        rule_set_version=RULE_SET_VERSION,
        input_fingerprint=fingerprint,
        status="completed",
    )
    db.add(det_run)
    db.flush()

    # 4. Create DiagnosisRun
    diag_run = DiagnosisRun(
        institution_id=institution_id,
        determination_run_id=det_run.id,
        rule_version=DIAGNOSIS_RULE_VERSION,
        template_version=TEMPLATE_VERSION,
        status="completed",
    )
    db.add(diag_run)
    db.flush()

    # Map results by competency
    comp_results: dict[str, list[ResultCompetency]] = {}
    for r in results:
        rcs = (
            db.query(ResultCompetency)
            .filter(
                ResultCompetency.institution_id == institution_id,
                ResultCompetency.assessment_result_id == r.id,
            )
            .all()
        )
        for rc in rcs:
            comp_results.setdefault(rc.competency_id, []).append(rc)

    # Map evidence by competency
    comp_evidence: dict[str, list[EvidenceItem]] = {}
    for e in evidence_items:
        ecs = (
            db.query(EvidenceCompetency)
            .filter(
                EvidenceCompetency.institution_id == institution_id,
                EvidenceCompetency.evidence_id == e.id,
            )
            .all()
        )
        for ec in ecs:
            comp_evidence.setdefault(ec.competency_id, []).append(e)

    # Evaluate each competency
    for comp in competencies:
        levels = (
            db.query(CompetencyLevel)
            .filter(
                CompetencyLevel.institution_id == institution_id,
                CompetencyLevel.competency_id == comp.id,
            )
            .order_by(CompetencyLevel.rank.asc())
            .all()
        )

        thresholds = (
            db.query(CompetencyThreshold)
            .filter(
                CompetencyThreshold.institution_id == institution_id,
                CompetencyThreshold.competency_id == comp.id,
            )
            .all()
        )
        thresh_by_level = {t.level_id: t for t in thresholds}

        ev_list = comp_evidence.get(comp.id, [])
        res_list = comp_results.get(comp.id, [])

        # Calculate performance metrics from verified assessment results
        latest_res = res_list[0] if res_list else None
        score_pct = latest_res.percentage if latest_res else None

        # Determine evidence sufficiency
        verified_ev = [
            e for e in ev_list if e.evidence_status in ("assessment_verified", "project_verified")
        ]

        if not ev_list and not res_list:
            sufficiency = "no_evidence"
            supported_level = None
            reasons = ["NO_EVALUATION_RECORDED"]
            explanation = f"No assessment attempts or verified evidence recorded for {comp.name}."
        elif not verified_ev and not latest_res:
            sufficiency = "insufficient"
            supported_level = None
            reasons = ["INSUFFICIENT_INDEPENDENT_EVIDENCE"]
            explanation = f"Evidence submitted for {comp.name} is unverified self-reporting and cannot establish proficiency."
        else:
            sufficiency = "sufficient"
            reasons = []

            # Determine highest achieved level satisfying threshold
            supported_level = None
            target_level = None

            # Standard target level is rank 3 (Competent)
            for lvl in levels:
                if lvl.rank == 3:
                    target_level = lvl

                thresh = thresh_by_level.get(lvl.id)
                min_score = thresh.min_score if thresh and thresh.min_score is not None else (lvl.rank * 25.0)

                # Check if student meets this level criteria
                if score_pct is not None and score_pct >= min_score:
                    supported_level = lvl
                    reasons.append(f"MET_LEVEL_{lvl.level_code}_THRESHOLD")

            if supported_level is None and levels:
                # Scored below foundational
                reasons.append("BELOW_FOUNDATIONAL_THRESHOLD")
                explanation = (
                    f"Measured score of {score_pct:.1f}% is below foundational threshold for {comp.name}."
                )
            else:
                level_label = supported_level.label if supported_level else "Unranked"
                explanation = (
                    f"Demonstrated {level_label} proficiency ({score_pct:.1f}%) based on verified assessment."
                )

        # Create CompetencyDetermination
        det = CompetencyDetermination(
            institution_id=institution_id,
            determination_run_id=det_run.id,
            competency_id=comp.id,
            supported_level_id=supported_level.id if supported_level else None,
            evidence_sufficiency=sufficiency,
            reason_codes=reasons,
            explanation_text=explanation,
        )
        db.add(det)
        db.flush()

        # Link evidence items to determination
        for ev in ev_list:
            db.add(
                DeterminationEvidenceItem(
                    institution_id=institution_id,
                    determination_id=det.id,
                    evidence_id=ev.id,
                    role="supporting" if ev.evidence_status != "self_reported" else "excluded",
                )
            )

        # Link result inputs
        if latest_res:
            db.add(
                DeterminationResultInput(
                    institution_id=institution_id,
                    determination_id=det.id,
                    result_id=latest_res.assessment_result_id,
                )
            )

        # 5. Formulate Diagnosis Findings
        # Target is level rank 3 (Competent)
        target_lvl = next((l for l in levels if l.rank == 3), levels[-1] if levels else None)

        if sufficiency in ("no_evidence", "insufficient"):
            finding_type = "insufficient_evidence"
            rationale_code = "EVIDENCE_DEFICIT"
            finding_summary = f"Insufficient evidence to verify {comp.name} proficiency."
            detailed = (
                f"Empiria requires verified assessment or project evidence to determine competency. "
                f"Currently, no validated measurements exist for {comp.name}. Self-reports cannot establish mastery."
            )
            action = f"Complete the baseline diagnostic assessment module targeting {comp.name}."
        elif supported_level is None or (target_lvl and supported_level.rank < target_lvl.rank):
            finding_type = "gap"
            current_rank = supported_level.rank if supported_level else 0
            current_label = supported_level.label if supported_level else "Below Foundational"
            rationale_code = "BELOW_TARGET_LEVEL"
            finding_summary = (
                f"Competency gap identified in {comp.name}: current {current_label} vs target {target_lvl.label}."
            )
            detailed = (
                f"Student demonstrated {current_label} (Level {current_rank}) with score {score_pct:.1f}%. "
                f"Target level for Data Analyst readiness requires {target_lvl.label} (Level {target_lvl.rank}, "
                f"threshold >= 75%). Evidence indicates specific gaps in applied techniques."
            )
            action = f"Undertake targeted practice tasks in {comp.name} to advance to {target_lvl.label}."
        else:
            finding_type = "target_met"
            rationale_code = "TARGET_LEVEL_ACHIEVED"
            finding_summary = f"Target proficiency satisfied for {comp.name} ({supported_level.label})."
            detailed = (
                f"Student demonstrated {supported_level.label} (Level {supported_level.rank}) with score {score_pct:.1f}%, "
                f"satisfying or exceeding the institutional benchmark of {target_lvl.label}."
            )
            action = "Maintain competency through applied projects and periodic verification."

        finding = DiagnosisFinding(
            institution_id=institution_id,
            diagnosis_run_id=diag_run.id,
            competency_id=comp.id,
            finding_type=finding_type,
            current_level_id=supported_level.id if supported_level else None,
            target_level_id=target_lvl.id if target_lvl else None,
            rationale_code=rationale_code,
            finding_summary=finding_summary,
            detailed_explanation=detailed,
            recommended_action=action,
        )
        db.add(finding)
        db.flush()

        for ev in ev_list:
            db.add(
                FindingEvidenceItem(
                    institution_id=institution_id,
                    finding_id=finding.id,
                    evidence_id=ev.id,
                    role="supporting",
                )
            )

    db.commit()
    return det_run, diag_run
