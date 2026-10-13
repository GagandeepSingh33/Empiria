from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    ActivityCatalogue,
    ActivityCompetency,
    ActivityResource,
    DevelopmentPlan,
    DevelopmentPlanVersion,
    PlanTask,
    TaskStatusEvent,
    TaskSubmission,
    StudentProfile,
    ProgressComparison,
    AssessmentResult,
    AuditEvent,
)
from app.schemas import (
    ActivityResponse,
    ActivityResourceResponse,
    DevelopmentPlanResponse,
    PlanTaskResponse,
    TaskSubmitRequest,
    ProgressComparisonResponse,
    ProgressSummaryResponse,
)
from app.security import (
    require_authenticated,
    get_current_student_profile,
    CurrentUser,
)
from app.domain.progress import compute_progress_comparison

router = APIRouter(tags=["Development Plans, Practice & Progress"])


@router.get("/activities", response_model=list[ActivityResponse])
def list_activities(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    acts = (
        db.query(ActivityCatalogue)
        .filter(
            ActivityCatalogue.institution_id == current_user.institution_id,
            ActivityCatalogue.status == "published",
        )
        .order_by(ActivityCatalogue.title)
        .all()
    )

    res = []
    for a in acts:
        comp_links = (
            db.query(ActivityCompetency)
            .filter(ActivityCompetency.activity_id == a.id)
            .all()
        )
        target_comps = [
            {"competency_id": cl.competency_id, "competency_name": cl.competency.name if cl.competency else "Competency"}
            for cl in comp_links
        ]
        res_list = [
            ActivityResourceResponse(title=r.title, url=r.url, resource_type=r.resource_type)
            for r in a.resources
        ]
        res.append(
            ActivityResponse(
                id=a.id,
                key=a.key,
                title=a.title,
                description=a.description,
                activity_type=a.activity_type,
                completion_criteria=a.completion_criteria,
                evaluation_method=a.evaluation_method,
                estimated_duration_hours=a.estimated_duration_hours,
                target_competencies=target_comps,
                resources=res_list,
            )
        )
    return res


def _format_plan_response(plan: DevelopmentPlan, db: Session) -> DevelopmentPlanResponse:
    latest_ver = (
        db.query(DevelopmentPlanVersion)
        .filter(DevelopmentPlanVersion.plan_id == plan.id)
        .order_by(DevelopmentPlanVersion.version_number.desc())
        .first()
    )

    tasks_res = []
    if latest_ver:
        tasks = (
            db.query(PlanTask)
            .filter(PlanTask.plan_version_id == latest_ver.id)
            .order_by(PlanTask.priority.asc())
            .all()
        )
        if not tasks:
            tasks = (
                db.query(PlanTask)
                .join(DevelopmentPlanVersion, PlanTask.plan_version_id == DevelopmentPlanVersion.id)
                .filter(DevelopmentPlanVersion.plan_id == plan.id)
                .order_by(DevelopmentPlanVersion.version_number.desc(), PlanTask.priority.asc())
                .all()
            )
        for t in tasks:
            act_resp = None
            if t.activity:
                res_list = [
                    ActivityResourceResponse(title=r.title, url=r.url, resource_type=r.resource_type)
                    for r in t.activity.resources
                ]
                act_resp = ActivityResponse(
                    id=t.activity.id,
                    key=t.activity.key,
                    title=t.activity.title,
                    description=t.activity.description,
                    activity_type=t.activity.activity_type,
                    completion_criteria=t.activity.completion_criteria,
                    evaluation_method=t.activity.evaluation_method,
                    estimated_duration_hours=t.activity.estimated_duration_hours,
                    resources=res_list,
                )

            tasks_res.append(
                PlanTaskResponse(
                    id=t.id,
                    competency_id=t.competency_id,
                    competency_name=t.competency.name if t.competency else "Competency",
                    title=t.title,
                    description=t.description,
                    completion_criteria=t.completion_criteria,
                    recommendation_rationale=t.recommendation_rationale,
                    status=t.status,
                    priority=t.priority,
                    due_date=t.due_date,
                    activity=act_resp,
                    started_at=t.started_at,
                    completed_at=t.completed_at,
                )
            )

    return DevelopmentPlanResponse(
        id=plan.id,
        student_id=plan.student_id,
        status=plan.status,
        version_number=latest_ver.version_number if latest_ver else 1,
        rule_version=latest_ver.rule_version if latest_ver else "empiria_plan_v1",
        created_at=plan.created_at,
        tasks=tasks_res,
    )


@router.get("/me/development-plan", response_model=DevelopmentPlanResponse)
def get_my_development_plan(
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(DevelopmentPlan)
        .filter(
            DevelopmentPlan.institution_id == current_user.institution_id,
            DevelopmentPlan.student_id == student_profile.id,
            DevelopmentPlan.status == "active",
        )
        .first()
    )
    if not plan:
        raise HTTPException(
            status_code=404,
            detail="No active development plan found. Complete a baseline assessment to generate a plan.",
        )
    return _format_plan_response(plan, db)


@router.get("/students/{student_id}/development-plan", response_model=DevelopmentPlanResponse)
def get_student_development_plan(
    student_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(DevelopmentPlan)
        .filter(
            DevelopmentPlan.institution_id == current_user.institution_id,
            DevelopmentPlan.student_id == student_id,
            DevelopmentPlan.status == "active",
        )
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="No active development plan found for this student")
    return _format_plan_response(plan, db)


@router.post("/plan-tasks/{task_id}/start")
def start_plan_task(
    task_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PlanTask)
        .filter(
            PlanTask.institution_id == current_user.institution_id,
            PlanTask.id == task_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = "in_progress"
    task.started_at = datetime.now(timezone.utc)

    db.add(
        TaskStatusEvent(
            institution_id=current_user.institution_id,
            task_id=task.id,
            from_status=old_status,
            to_status="in_progress",
            actor_membership_id=current_user.membership.id,
            reason="Student started practice task",
        )
    )
    db.commit()
    return {"message": "Task started", "task_id": task.id, "status": task.status}


@router.post("/plan-tasks/{task_id}/submissions")
def submit_plan_task(
    task_id: str,
    req: TaskSubmitRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PlanTask)
        .filter(
            PlanTask.institution_id == current_user.institution_id,
            PlanTask.id == task_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    submission = TaskSubmission(
        institution_id=current_user.institution_id,
        task_id=task.id,
        student_id=student_profile.id,
        submission_text=req.submission_text,
        stored_object_id=req.stored_object_id,
    )
    db.add(submission)

    old_status = task.status
    task.status = "submitted"
    db.add(
        TaskStatusEvent(
            institution_id=current_user.institution_id,
            task_id=task.id,
            from_status=old_status,
            to_status="submitted",
            actor_membership_id=current_user.membership.id,
            reason="Student submitted task practice artefact",
        )
    )
    db.commit()
    return {"message": "Submission recorded", "task_id": task.id, "status": task.status}


@router.post("/plan-tasks/{task_id}/complete")
def complete_plan_task(
    task_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PlanTask)
        .filter(
            PlanTask.institution_id == current_user.institution_id,
            PlanTask.id == task_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)

    db.add(
        TaskStatusEvent(
            institution_id=current_user.institution_id,
            task_id=task.id,
            from_status=old_status,
            to_status="completed",
            actor_membership_id=current_user.membership.id,
            reason="Practice exercise marked completed (completion does not equal mastery)",
        )
    )
    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id,
            action="TASK_COMPLETED",
            resource_type="plan_tasks",
            resource_id=task.id,
            purpose=f"Completed task '{task.title}'",
        )
    )
    db.commit()
    return {"message": "Task marked completed", "task_id": task.id, "status": task.status}


# Progress and baseline vs follow-up comparison
@router.get("/students/{student_id}/progress", response_model=ProgressSummaryResponse)
def get_student_progress(
    student_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    # Resolve student profile if account_id was passed
    prof = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            (StudentProfile.id == student_id) | (StudentProfile.account_id == student_id),
        )
        .first()
    )
    target_student_id = prof.id if prof else student_id

    results = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.institution_id == current_user.institution_id,
            AssessmentResult.student_id == target_student_id,
            AssessmentResult.status == "finalised",
        )
        .order_by(AssessmentResult.assessed_at.asc())
        .all()
    )

    baseline = results[0] if results else None
    follow_up = results[-1] if len(results) > 1 else None

    # Fetch comparison records
    comps = (
        db.query(ProgressComparison)
        .filter(
            ProgressComparison.institution_id == current_user.institution_id,
            ProgressComparison.student_id == target_student_id,
        )
        .all()
    )

    if baseline and follow_up and (not comps or comps[0].follow_up_result_id != follow_up.id):
        comps = compute_progress_comparison(
            db=db,
            institution_id=current_user.institution_id,
            student_id=target_student_id,
            baseline_result_id=baseline.id,
            follow_up_result_id=follow_up.id,
        )

    comp_resps = []
    for c in comps:
        comp_resps.append(
            ProgressComparisonResponse(
                id=c.id,
                competency_id=c.competency_id,
                competency_name=c.competency.name if c.competency else "Competency",
                baseline_score=c.baseline_score,
                follow_up_score=c.follow_up_score,
                score_delta=c.score_delta,
                comparability_state=c.comparability_state,
                outcome_status=c.outcome_status,
                mandatory_limitations=c.mandatory_limitations,
                created_at=c.created_at,
            )
        )

    narrative = ""
    if not baseline:
        narrative = "No baseline assessment completed yet. Assessment required to establish capability baseline."
    elif not follow_up:
        narrative = "Baseline diagnostic completed. Complete practice activities in your plan, then take a follow-up assessment to verify capability progression."
    else:
        improved_cnt = sum(1 for c in comps if c.outcome_status == "improved")
        narrative = f"Follow-up verification completed. {improved_cnt} of {len(comps)} competencies demonstrated positive score deltas under comparable assessment conditions."

    return ProgressSummaryResponse(
        student_id=student_id,
        baseline_date=baseline.assessed_at if baseline else None,
        follow_up_date=follow_up.assessed_at if follow_up else None,
        comparisons=comp_resps,
        has_follow_up=follow_up is not None,
        overall_status_narrative=narrative,
    )
