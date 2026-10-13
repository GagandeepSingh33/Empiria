from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    AssessmentForm,
    AssessmentFormItem,
    AssessmentItem,
    AssessmentItemOption,
    AssessmentAttempt,
    AssessmentResponse,
    AssessmentResult,
    ResultCompetency,
    EvidenceItem,
    EvidenceCompetency,
    FrameworkCompetency,
    AuditEvent,
)
from app.schemas import (
    AssessmentFormStudentResponse,
    AssessmentFormAuthoringResponse,
    AssessmentItemStudentResponse,
    AssessmentItemOptionResponse,
    AssessmentAttemptResponse,
    AssessmentSubmitRequest,
    AssessmentResultResponse,
    ResultCompetencyResponse,
)
from app.security import (
    require_authenticated,
    require_roles,
    get_current_student_profile,
    CurrentUser,
)
from app.domain.diagnosis import run_deterministic_diagnosis
from app.domain.planning import generate_development_plan

router = APIRouter(tags=["Assessment Delivery & Scoring"])


@router.get("/assessment-forms")
def list_assessment_forms(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "data_operator")
    query = db.query(AssessmentForm).filter(AssessmentForm.institution_id == current_user.institution_id)
    if not is_staff:
        query = query.filter(AssessmentForm.status == "published")

    forms = query.all()
    res = []
    for f in forms:
        item_count = db.query(AssessmentFormItem).filter(AssessmentFormItem.form_id == f.id).count()
        res.append({
            "id": f.id,
            "code": f.code,
            "title": f.title,
            "description": f.description,
            "assessment_type": f.assessment_type,
            "status": f.status,
            "comparability_state": f.comparability_state,
            "time_limit_minutes": f.time_limit_minutes,
            "max_attempts": f.max_attempts,
            "item_count": item_count,
            "published_at": f.published_at,
        })
    return res


@router.get("/assessment-forms/{form_id}", response_model=AssessmentFormStudentResponse)
def get_assessment_form_student_view(
    form_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    form = (
        db.query(AssessmentForm)
        .filter(
            AssessmentForm.institution_id == current_user.institution_id,
            AssessmentForm.id == form_id,
        )
        .first()
    )
    if not form:
        raise HTTPException(status_code=404, detail="Assessment form not found")

    form_items = (
        db.query(AssessmentFormItem)
        .filter(AssessmentFormItem.form_id == form.id)
        .order_by(AssessmentFormItem.display_order)
        .all()
    )

    items_res = []
    for fi in form_items:
        it = fi.item
        opts = (
            db.query(AssessmentItemOption)
            .filter(AssessmentItemOption.item_id == it.id)
            .order_by(AssessmentItemOption.display_order)
            .all()
        )
        items_res.append(
            AssessmentItemStudentResponse(
                id=it.id,
                competency_id=it.competency_id,
                code=it.code,
                prompt=it.prompt,
                item_type=it.item_type,
                points=it.points,
                options=[
                    AssessmentItemOptionResponse(
                        option_key=o.option_key,
                        option_text=o.option_text,
                        display_order=o.display_order,
                    )
                    for o in opts
                ],
            )
        )

    return AssessmentFormStudentResponse(
        id=form.id,
        code=form.code,
        title=form.title,
        description=form.description,
        assessment_type=form.assessment_type,
        time_limit_minutes=form.time_limit_minutes,
        items=items_res,
    )


@router.get("/assessment-forms/{form_id}/authoring")
def get_assessment_form_authoring(
    form_id: str,
    current_user: CurrentUser = Depends(require_roles("faculty_assessor", "institution_admin")),
    db: Session = Depends(get_db),
):
    form = (
        db.query(AssessmentForm)
        .filter(
            AssessmentForm.institution_id == current_user.institution_id,
            AssessmentForm.id == form_id,
        )
        .first()
    )
    if not form:
        raise HTTPException(status_code=404, detail="Assessment form not found")

    form_items = (
        db.query(AssessmentFormItem)
        .filter(AssessmentFormItem.form_id == form.id)
        .order_by(AssessmentFormItem.display_order)
        .all()
    )

    items_list = []
    for fi in form_items:
        it = fi.item
        opts = (
            db.query(AssessmentItemOption)
            .filter(AssessmentItemOption.item_id == it.id)
            .order_by(AssessmentItemOption.display_order)
            .all()
        )
        items_list.append({
            "id": it.id,
            "competency_id": it.competency_id,
            "code": it.code,
            "prompt": it.prompt,
            "item_type": it.item_type,
            "points": it.points,
            "answer_key": it.answer_key,
            "explanation": it.explanation,
            "options": [{"option_key": o.option_key, "option_text": o.option_text} for o in opts],
        })

    return {
        "id": form.id,
        "code": form.code,
        "title": form.title,
        "description": form.description,
        "assessment_type": form.assessment_type,
        "status": form.status,
        "comparability_state": form.comparability_state,
        "comparability_note": form.comparability_note,
        "items": items_list,
    }


@router.post("/assessment-forms/{form_id}/attempts", response_model=AssessmentAttemptResponse)
def start_assessment_attempt(
    form_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    form = (
        db.query(AssessmentForm)
        .filter(
            AssessmentForm.institution_id == current_user.institution_id,
            AssessmentForm.id == form_id,
            AssessmentForm.status == "published",
        )
        .first()
    )
    if not form:
        raise HTTPException(status_code=404, detail="Assessment form not available")

    # Check attempt limit
    prior_attempts = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.institution_id == current_user.institution_id,
            AssessmentAttempt.student_id == student_profile.id,
            AssessmentAttempt.form_id == form.id,
        )
        .count()
    )
    if prior_attempts >= form.max_attempts:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum allowed attempts ({form.max_attempts}) reached for this assessment.",
        )

    attempt = AssessmentAttempt(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        form_id=form.id,
        attempt_number=prior_attempts + 1,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return AssessmentAttemptResponse(
        id=attempt.id,
        student_id=attempt.student_id,
        form_id=attempt.form_id,
        form_title=form.title,
        attempt_number=attempt.attempt_number,
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
    )


@router.get("/assessment-attempts/{attempt_id}", response_model=AssessmentAttemptResponse)
def get_assessment_attempt(
    attempt_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.institution_id == current_user.institution_id,
            AssessmentAttempt.id == attempt_id,
            AssessmentAttempt.student_id == student_profile.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    return AssessmentAttemptResponse(
        id=attempt.id,
        student_id=attempt.student_id,
        form_id=attempt.form_id,
        form_title=attempt.form.title,
        attempt_number=attempt.attempt_number,
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
    )


@router.post("/assessment-attempts/{attempt_id}/submit", response_model=AssessmentResultResponse)
def submit_assessment_attempt(
    attempt_id: str,
    req: AssessmentSubmitRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    student_profile=Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.institution_id == current_user.institution_id,
            AssessmentAttempt.id == attempt_id,
            AssessmentAttempt.student_id == student_profile.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt is already submitted or finalised")

    form = attempt.form
    form_items = (
        db.query(AssessmentFormItem)
        .filter(AssessmentFormItem.form_id == form.id)
        .all()
    )

    # Server-side scoring of objective items
    total_earned = 0.0
    total_possible = 0.0
    comp_earned: dict[str, float] = {}
    comp_possible: dict[str, float] = {}

    for fi in form_items:
        it = fi.item
        comp_id = it.competency_id
        pts = it.points * fi.weight
        total_possible += pts
        comp_possible[comp_id] = comp_possible.get(comp_id, 0.0) + pts

        sub_ans = req.responses.get(it.id)
        correct_ans = it.answer_key.get("correct_option") if isinstance(it.answer_key, dict) else it.answer_key

        is_correct = False
        awarded = 0.0

        if sub_ans is not None:
            if str(sub_ans).strip().lower() == str(correct_ans).strip().lower():
                is_correct = True
                awarded = pts

        total_earned += awarded
        comp_earned[comp_id] = comp_earned.get(comp_id, 0.0) + awarded

        # Record response
        db.add(
            AssessmentResponse(
                institution_id=current_user.institution_id,
                attempt_id=attempt.id,
                item_id=it.id,
                response_data={"submitted": sub_ans},
                score_awarded=awarded,
                is_correct=is_correct,
            )
        )

    attempt.status = "finalised"
    attempt.submitted_at = datetime.now(timezone.utc)

    # 1. Create canonical AssessmentResult
    overall_pct = (total_earned / total_possible * 100.0) if total_possible > 0 else 0.0
    result = AssessmentResult(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        framework_version_id=form.framework_version_id,
        source_type="objective_attempt",
        attempt_id=attempt.id,
        total_score=total_earned,
        max_possible_score=total_possible,
        percentage=overall_pct,
        assessed_at=datetime.now(timezone.utc),
        status="finalised",
    )
    db.add(result)
    db.flush()

    # 2. Add ResultCompetency rows
    res_comp_items = []
    for comp_id, max_pts in comp_possible.items():
        earned = comp_earned.get(comp_id, 0.0)
        pct = (earned / max_pts * 100.0) if max_pts > 0 else 0.0
        comp_obj = db.query(FrameworkCompetency).filter(FrameworkCompetency.id == comp_id).first()
        cname = comp_obj.name if comp_obj else "Competency"

        rc = ResultCompetency(
            institution_id=current_user.institution_id,
            assessment_result_id=result.id,
            competency_id=comp_id,
            score=earned,
            max_score=max_pts,
            percentage=pct,
            notes=f"Achieved {earned:.1f}/{max_pts:.1f} on {form.title}",
        )
        db.add(rc)
        res_comp_items.append(
            ResultCompetencyResponse(
                competency_id=comp_id,
                competency_name=cname,
                score=earned,
                max_score=max_pts,
                percentage=pct,
                notes=rc.notes,
            )
        )

    # 3. Create EvidenceItem for this assessment result
    ev = EvidenceItem(
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        framework_version_id=form.framework_version_id,
        title=f"Verified Score on {form.title}",
        description=f"Standardized objective evaluation completed on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}.",
        evidence_status="assessment_verified",
        source_type="assessment_result",
        assessment_result_id=result.id,
        verified_at=datetime.now(timezone.utc),
    )
    db.add(ev)
    db.flush()

    for comp_id in comp_possible.keys():
        db.add(
            EvidenceCompetency(
                institution_id=current_user.institution_id,
                evidence_id=ev.id,
                competency_id=comp_id,
                relationship_type="supports",
            )
        )

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id,
            action="ASSESSMENT_COMPLETED",
            resource_type="assessment_results",
            resource_id=result.id,
            purpose=f"Completed {form.title} with score {overall_pct:.1f}%",
        )
    )
    db.commit()

    # 4. Trigger deterministic determination & diagnosis engine!
    det_run, diag_run = run_deterministic_diagnosis(
        db=db,
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        framework_version_id=form.framework_version_id,
    )

    # 5. Generate individualized development plan!
    generate_development_plan(
        db=db,
        institution_id=current_user.institution_id,
        student_id=student_profile.id,
        diagnosis_run_id=diag_run.id,
    )

    return AssessmentResultResponse(
        id=result.id,
        student_id=result.student_id,
        framework_version_id=result.framework_version_id,
        source_type=result.source_type,
        total_score=result.total_score,
        max_possible_score=result.max_possible_score,
        percentage=result.percentage,
        assessed_at=result.assessed_at,
        status=result.status,
        competencies=res_comp_items,
    )


@router.get("/assessment-results/{result_id}", response_model=AssessmentResultResponse)
def get_assessment_result(
    result_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    result = (
        db.query(AssessmentResult)
        .filter(
            AssessmentResult.institution_id == current_user.institution_id,
            AssessmentResult.id == result_id,
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Assessment result not found")

    is_staff = current_user.has_role("institution_admin", "faculty_assessor", "mentor_advisor")
    if not is_staff and result.student.account_id != current_user.account.id:
        raise HTTPException(status_code=404, detail="Assessment result not found")

    rcs = (
        db.query(ResultCompetency)
        .filter(ResultCompetency.assessment_result_id == result.id)
        .all()
    )
    res_comps = []
    for rc in rcs:
        cname = rc.competency.name if hasattr(rc, "competency") and rc.competency else "Competency"
        res_comps.append(
            ResultCompetencyResponse(
                competency_id=rc.competency_id,
                competency_name=cname,
                score=rc.score,
                max_score=rc.max_score,
                percentage=rc.percentage,
                notes=rc.notes,
            )
        )

    return AssessmentResultResponse(
        id=result.id,
        student_id=result.student_id,
        framework_version_id=result.framework_version_id,
        source_type=result.source_type,
        total_score=result.total_score,
        max_possible_score=result.max_possible_score,
        percentage=result.percentage,
        assessed_at=result.assessed_at,
        status=result.status,
        competencies=res_comps,
    )
