from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    EvidenceItem,
    EvidenceCompetency,
    DeterminationRun,
    CompetencyDetermination,
    DiagnosisRun,
    DiagnosisFinding,
    StudentProfile,
)
from app.schemas import (
    CompetencyDeterminationResponse,
    DiagnosisResponse,
    DiagnosisFindingResponse,
)
from app.security import (
    require_authenticated,
    CurrentUser,
)

router = APIRouter(tags=["Evidence & Deterministic Diagnosis"])


class EvidenceCreateRequest(BaseModel):
    title: str
    description: str | None = None
    competency_id: str


@router.get("/evidence-items")
def list_evidence(
    student_id: str | None = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    target_student_id = student_id
    if not target_student_id:
        profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                StudentProfile.account_id == current_user.account.id,
            )
            .first()
        )
        if profile:
            target_student_id = profile.id

    if not target_student_id:
        return []

    items = (
        db.query(EvidenceItem)
        .filter(
            EvidenceItem.institution_id == current_user.institution_id,
            EvidenceItem.student_id == target_student_id,
        )
        .order_by(EvidenceItem.created_at.desc())
        .all()
    )

    res = []
    for it in items:
        comps = [ec.competency.name for ec in it.competencies if ec.competency]
        res.append({
            "id": it.id,
            "title": it.title,
            "description": it.description,
            "evidence_status": it.evidence_status,
            "source_type": it.source_type,
            "competencies": comps,
            "verified_at": it.verified_at,
            "created_at": it.created_at,
        })
    return res


@router.post("/evidence-items")
def create_self_reported_evidence(
    req: EvidenceCreateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.institution_id == current_user.institution_id,
            StudentProfile.account_id == current_user.account.id,
        )
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Fetch framework version from competency
    from app.models import FrameworkCompetency
    comp = db.query(FrameworkCompetency).filter(FrameworkCompetency.id == req.competency_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found")

    # Self-reported evidence only! A student cannot mark their own work as assessment-verified!
    ev = EvidenceItem(
        institution_id=current_user.institution_id,
        student_id=profile.id,
        framework_version_id=comp.framework_version_id,
        title=req.title,
        description=req.description,
        evidence_status="self_reported",
        source_type="self_declaration",
    )
    db.add(ev)
    db.flush()

    db.add(
        EvidenceCompetency(
            institution_id=current_user.institution_id,
            evidence_id=ev.id,
            competency_id=comp.id,
            relationship_type="supports",
        )
    )
    db.commit()

    return {"message": "Evidence recorded as self-reported", "evidence_id": ev.id}


@router.get("/students/{student_id}/competency-determinations", response_model=list[CompetencyDeterminationResponse])
def get_student_competency_determinations(
    student_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    # Fetch latest determination run
    run = (
        db.query(DeterminationRun)
        .filter(
            DeterminationRun.institution_id == current_user.institution_id,
            DeterminationRun.student_id == student_id,
        )
        .order_by(DeterminationRun.created_at.desc())
        .first()
    )
    if not run:
        return []

    dets = (
        db.query(CompetencyDetermination)
        .filter(
            CompetencyDetermination.institution_id == current_user.institution_id,
            CompetencyDetermination.determination_run_id == run.id,
        )
        .all()
    )

    res = []
    for d in dets:
        c = d.competency
        lvl = d.supported_level
        res.append(
            CompetencyDeterminationResponse(
                competency_id=d.competency_id,
                competency_name=c.name if c else "Competency",
                competency_key=c.competency_key if c else "",
                supported_level_rank=lvl.rank if lvl else None,
                supported_level_code=lvl.level_code if lvl else None,
                supported_level_label=lvl.label if lvl else None,
                evidence_sufficiency=d.evidence_sufficiency,
                reason_codes=d.reason_codes,
                explanation_text=d.explanation_text,
            )
        )
    return res


@router.get("/students/{student_id}/diagnosis", response_model=DiagnosisResponse)
def get_student_diagnosis(
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

    # Find latest diagnosis run
    diag = (
        db.query(DiagnosisRun)
        .join(DeterminationRun, DiagnosisRun.determination_run_id == DeterminationRun.id)
        .filter(
            DiagnosisRun.institution_id == current_user.institution_id,
            DeterminationRun.student_id == target_student_id,
        )
        .order_by(DiagnosisRun.created_at.desc())
        .first()
    )
    if not diag:
        raise HTTPException(status_code=404, detail="No diagnosis run found for this student")

    # Fetch determinations
    dets = (
        db.query(CompetencyDetermination)
        .filter(
            CompetencyDetermination.institution_id == current_user.institution_id,
            CompetencyDetermination.determination_run_id == diag.determination_run_id,
        )
        .all()
    )
    det_resps = []
    for d in dets:
        c = d.competency
        lvl = d.supported_level
        det_resps.append(
            CompetencyDeterminationResponse(
                competency_id=d.competency_id,
                competency_name=c.name if c else "Competency",
                competency_key=c.competency_key if c else "",
                supported_level_rank=lvl.rank if lvl else None,
                supported_level_code=lvl.level_code if lvl else None,
                supported_level_label=lvl.label if lvl else None,
                evidence_sufficiency=d.evidence_sufficiency,
                reason_codes=d.reason_codes,
                explanation_text=d.explanation_text,
            )
        )

    # Fetch findings
    findings = (
        db.query(DiagnosisFinding)
        .filter(
            DiagnosisFinding.institution_id == current_user.institution_id,
            DiagnosisFinding.diagnosis_run_id == diag.id,
        )
        .all()
    )
    finding_resps = []
    for f in findings:
        c = f.competency
        cur_l = f.current_level
        tgt_l = f.target_level
        finding_resps.append(
            DiagnosisFindingResponse(
                id=f.id,
                competency_id=f.competency_id,
                competency_name=c.name if c else "Competency",
                competency_key=c.competency_key if c else "",
                finding_type=f.finding_type,
                current_level_rank=cur_l.rank if cur_l else None,
                current_level_code=cur_l.level_code if cur_l else None,
                current_level_label=cur_l.label if cur_l else None,
                target_level_rank=tgt_l.rank if tgt_l else None,
                target_level_code=tgt_l.level_code if tgt_l else None,
                target_level_label=tgt_l.label if tgt_l else None,
                rationale_code=f.rationale_code,
                finding_summary=f.finding_summary,
                detailed_explanation=f.detailed_explanation,
                recommended_action=f.recommended_action,
            )
        )

    return DiagnosisResponse(
        id=diag.id,
        student_id=student_id,
        determination_run_id=diag.determination_run_id,
        rule_version=diag.rule_version,
        template_version=diag.template_version,
        created_at=diag.created_at,
        determinations=det_resps,
        findings=finding_resps,
    )
