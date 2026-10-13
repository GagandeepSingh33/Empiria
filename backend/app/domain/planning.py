from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import (
    DevelopmentPlan,
    DevelopmentPlanVersion,
    PlanTask,
    TaskStatusEvent,
    DiagnosisRun,
    DiagnosisFinding,
    DeterminationRun,
    ActivityCatalogue,
    ActivityCompetency,
)

PLAN_RULE_VERSION = "empiria_plan_v1"


def generate_development_plan(
    db: Session,
    institution_id: str,
    student_id: str,
    diagnosis_run_id: str,
) -> DevelopmentPlan:
    """
    Generates an individualized personal development plan based on actual diagnosis findings.
    Only recommends activities targeting supported gaps or unverified competencies.
    """
    diag_run = (
        db.query(DiagnosisRun)
        .filter(
            DiagnosisRun.institution_id == institution_id,
            DiagnosisRun.id == diagnosis_run_id,
        )
        .first()
    )
    if not diag_run:
        raise ValueError("Diagnosis run not found")

    findings = (
        db.query(DiagnosisFinding)
        .filter(
            DiagnosisFinding.institution_id == institution_id,
            DiagnosisFinding.diagnosis_run_id == diagnosis_run_id,
        )
        .all()
    )

    # 1. Fetch or create stable DevelopmentPlan
    plan = (
        db.query(DevelopmentPlan)
        .filter(
            DevelopmentPlan.institution_id == institution_id,
            DevelopmentPlan.student_id == student_id,
            DevelopmentPlan.status == "active",
        )
        .first()
    )

    det_run = (
        db.query(DeterminationRun)
        .filter(DeterminationRun.id == diag_run.determination_run_id)
        .first()
    )
    fw_ver_id = det_run.framework_version_id if det_run else None

    if not plan:
        plan = DevelopmentPlan(
            institution_id=institution_id,
            student_id=student_id,
            framework_version_id=fw_ver_id,
            status="active",
        )
        db.add(plan)
        db.flush()

    # Determine next version number
    version_count = (
        db.query(DevelopmentPlanVersion)
        .filter(
            DevelopmentPlanVersion.institution_id == institution_id,
            DevelopmentPlanVersion.plan_id == plan.id,
        )
        .count()
    )

    plan_ver = DevelopmentPlanVersion(
        institution_id=institution_id,
        plan_id=plan.id,
        version_number=version_count + 1,
        diagnosis_run_id=diagnosis_run_id,
        rule_version=PLAN_RULE_VERSION,
    )
    db.add(plan_ver)
    db.flush()

    # 2. For each gap finding, select relevant activities from catalogue
    priority_counter = 1
    today = date.today()

    for finding in findings:
        if finding.finding_type not in ("gap", "insufficient_evidence"):
            continue

        # Look for curated catalogue activities mapped to this competency
        activity_links = (
            db.query(ActivityCompetency)
            .filter(
                ActivityCompetency.institution_id == institution_id,
                ActivityCompetency.competency_id == finding.competency_id,
            )
            .all()
        )

        matched_activities = []
        for link in activity_links:
            act = (
                db.query(ActivityCatalogue)
                .filter(
                    ActivityCatalogue.institution_id == institution_id,
                    ActivityCatalogue.id == link.activity_id,
                    ActivityCatalogue.status == "published",
                )
                .first()
            )
            if act:
                matched_activities.append(act)

        if matched_activities:
            for act in matched_activities:
                task = PlanTask(
                    institution_id=institution_id,
                    plan_version_id=plan_ver.id,
                    finding_id=finding.id,
                    activity_id=act.id,
                    competency_id=finding.competency_id,
                    title=f"Practise: {act.title}",
                    description=act.description,
                    completion_criteria=act.completion_criteria,
                    recommendation_rationale=(
                        f"Recommended because diagnosis identified: {finding.finding_summary}"
                    ),
                    status="pending",
                    priority=priority_counter,
                    due_date=today + timedelta(days=7 * priority_counter),
                )
                db.add(task)
                db.flush()

                # Add initial status event
                db.add(
                    TaskStatusEvent(
                        institution_id=institution_id,
                        task_id=task.id,
                        from_status="none",
                        to_status="pending",
                        actor_membership_id=student_id,
                        reason="Task generated from diagnosis findings",
                    )
                )
                priority_counter += 1
        else:
            # Fallback custom guided task for this competency gap
            comp_name = finding.competency.name
            task = PlanTask(
                institution_id=institution_id,
                plan_version_id=plan_ver.id,
                finding_id=finding.id,
                activity_id=None,
                competency_id=finding.competency_id,
                title=f"Core Development in {comp_name}",
                description=f"Focused development exercise targeting identified deficiencies in {comp_name}.",
                completion_criteria=f"Submit completed practice artefact demonstrating applied techniques in {comp_name}.",
                recommendation_rationale=(
                    f"Generated because student is below target in {comp_name}. {finding.finding_summary}"
                ),
                status="pending",
                priority=priority_counter,
                due_date=today + timedelta(days=7 * priority_counter),
            )
            db.add(task)
            db.flush()

            db.add(
                TaskStatusEvent(
                    institution_id=institution_id,
                    task_id=task.id,
                    from_status="none",
                    to_status="pending",
                    actor_membership_id=student_id,
                    reason="Targeted task created for competency gap",
                )
            )
            priority_counter += 1

    db.commit()
    return plan
