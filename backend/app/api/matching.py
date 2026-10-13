from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    MatchingRun,
    MatchingProposal,
    MentorAssignment,
    now_utc,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.matching_service import (
    execute_mentor_matching_run,
    approve_matching_proposal,
    reject_matching_proposal,
)
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Capacity-Aware Mentor Matching"])


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class MatchingRunCreate(BaseModel):
    assignment_type: str = "primary"  # primary, subject
    subject_scope: Optional[str] = None
    capacity_multiplier: float = 1.0
    scope: str = "all_students"  # all_students, unassigned_only

class ProposalResponse(BaseModel):
    id: str
    matching_run_id: str
    student_id: str
    student_name: Optional[str] = None
    student_identifier: Optional[str] = None
    proposed_mentor_membership_id: str
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None
    assignment_type: str
    subject_scope: Optional[str]
    compatibility_score: float
    contributing_factors: Optional[Dict[str, Any]]
    approval_status: str
    decision_reason: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True


class MatchingRunResponse(BaseModel):
    id: str
    institution_id: str
    scope: str
    assignment_type: str
    subject_scope: Optional[str]
    capacity_multiplier: float
    algorithm_name: str
    status: str
    created_at: datetime
    proposals_count: int = 0
    proposals: List[ProposalResponse] = []
    class Config:
        from_attributes = True


class ProposalReviewRequest(BaseModel):
    decision_reason: str = Field(..., min_length=3)


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.post("/mentor-matching/runs", response_model=MatchingRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_matching_run(
    payload: MatchingRunCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    """
    Executes capacity-aware Hungarian optimization mentor matching run.
    Generates proposed matches requiring human approval.
    """
    run = execute_mentor_matching_run(
        db,
        institution_id=current_user.institution_id,
        assignment_type=payload.assignment_type,
        subject_scope=payload.subject_scope,
        capacity_multiplier=payload.capacity_multiplier,
        scope=payload.scope,
        requester_membership_id=current_user.membership.id if current_user.membership else None,
    )

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="RUN_MENTOR_MATCHING",
        resource_type="matching_run",
        resource_id=run.id,
        actor_account_id=current_user.account.id,
        details={
            "assignment_type": run.assignment_type,
            "capacity_multiplier": run.capacity_multiplier,
            "proposals_generated": len(run.proposals),
        },
    )

    return get_run_details(run.id, current_user, db)


@router.get("/mentor-matching/runs", response_model=List[MatchingRunResponse])
def list_matching_runs(
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor", "mentor_advisor")),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(MatchingRun)
        .filter(MatchingRun.institution_id == current_user.institution_id)
        .order_by(desc(MatchingRun.created_at))
        .all()
    )
    res = []
    for r in runs:
        res.append(
            MatchingRunResponse(
                id=r.id,
                institution_id=r.institution_id,
                scope=r.scope,
                assignment_type=r.assignment_type,
                subject_scope=r.subject_scope,
                capacity_multiplier=r.capacity_multiplier,
                algorithm_name=r.algorithm_name,
                status=r.status,
                created_at=r.created_at,
                proposals_count=len(r.proposals),
                proposals=[],
            )
        )
    return res


@router.get("/mentor-matching/runs/{run_id}", response_model=MatchingRunResponse)
def get_run_details(
    run_id: str,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator", "faculty_assessor", "mentor_advisor")),
    db: Session = Depends(get_db),
):
    run = (
        db.query(MatchingRun)
        .filter(MatchingRun.id == run_id, MatchingRun.institution_id == current_user.institution_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Matching run not found.")

    proposals_res = []
    for p in run.proposals:
        proposals_res.append(
            ProposalResponse(
                id=p.id,
                matching_run_id=p.matching_run_id,
                student_id=p.student_id,
                student_name=f"{p.student.first_name} {p.student.last_name}" if p.student else None,
                student_identifier=p.student.student_identifier if p.student else None,
                proposed_mentor_membership_id=p.proposed_mentor_membership_id,
                mentor_name=p.proposed_mentor.account.display_name if p.proposed_mentor and p.proposed_mentor.account else None,
                mentor_email=p.proposed_mentor.account.email if p.proposed_mentor and p.proposed_mentor.account else None,
                assignment_type=p.assignment_type,
                subject_scope=p.subject_scope,
                compatibility_score=p.compatibility_score,
                contributing_factors=p.contributing_factors,
                approval_status=p.approval_status,
                decision_reason=p.decision_reason,
                reviewed_at=p.reviewed_at,
                created_at=p.created_at,
            )
        )

    return MatchingRunResponse(
        id=run.id,
        institution_id=run.institution_id,
        scope=run.scope,
        assignment_type=run.assignment_type,
        subject_scope=run.subject_scope,
        capacity_multiplier=run.capacity_multiplier,
        algorithm_name=run.algorithm_name,
        status=run.status,
        created_at=run.created_at,
        proposals_count=len(run.proposals),
        proposals=proposals_res,
    )


@router.post("/mentor-matching/proposals/{proposal_id}/approve")
def approve_proposal_endpoint(
    proposal_id: str,
    payload: Optional[ProposalReviewRequest] = None,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """
    Approves a proposed match and persists the active MentorAssignment.
    """
    reason = payload.decision_reason if payload else "Approved by institution administrator"
    try:
        asgn = approve_matching_proposal(
            db,
            proposal_id=proposal_id,
            reviewer_membership_id=current_user.membership.id if current_user.membership else "",
            decision_reason=reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="APPROVE_MATCHING_RUN",
        resource_type="matching_proposal",
        resource_id=proposal_id,
        actor_account_id=current_user.account.id,
        details={"assignment_id": asgn.id, "student_id": asgn.student_id, "reason": reason},
    )

    return {"status": "approved", "assignment_id": asgn.id, "message": "Proposal approved successfully."}


@router.post("/mentor-matching/proposals/{proposal_id}/reject")
def reject_proposal_endpoint(
    proposal_id: str,
    payload: ProposalReviewRequest,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """
    Rejects a proposal with recorded human justification.
    """
    try:
        prop = reject_matching_proposal(
            db,
            proposal_id=proposal_id,
            reviewer_membership_id=current_user.membership.id if current_user.membership else "",
            decision_reason=payload.decision_reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="REJECT_MATCHING_PROPOSAL",
        resource_type="matching_proposal",
        resource_id=proposal_id,
        actor_account_id=current_user.account.id,
        details={"reason": payload.decision_reason},
    )

    return {"status": "rejected", "proposal_id": prop.id, "message": "Proposal rejected."}
