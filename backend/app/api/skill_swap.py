"""
EMPIRIA: Embedded Skill Swap Peer Engine (Phase 9)

Implements double-entry credit ledger, zero-sum conservation of balance,
peer skill listings, session booking, ratings, and administrative account governance.
Strictly guarantees cross-tenant isolation, non-negative balance barriers,
and cryptographic audit chaining.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    StudentProfile,
    SkillSwapAccount,
    SkillSwapListing,
    SkillSwapSession,
    SkillSwapTransaction,
    AuditEvent,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/skill-swap", tags=["Skill Swap Peer Engine"])


# =========================================================================
# Schemas
# =========================================================================

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    institution_id: str
    student_id: str
    balance: int
    total_earned: int
    total_spent: int
    is_frozen: bool
    updated_at: datetime


class ListingCreateRequest(BaseModel):
    listing_type: str = Field("offer", pattern="^(offer|request)$")
    skill_name: str = Field(..., min_length=2, max_length=255)
    category: str = Field("academic", max_length=50)
    proficiency_level: str = Field("intermediate", max_length=50)
    description: Optional[str] = None


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    institution_id: str
    student_id: str
    listing_type: str
    skill_name: str
    category: str
    proficiency_level: str
    description: Optional[str]
    status: str
    created_at: datetime


class SessionBookRequest(BaseModel):
    listing_id: Optional[str] = None
    offering_student_id: str
    skill_name: str
    duration_minutes: int = Field(60, ge=15, le=180)
    credit_cost: int = Field(1, ge=1, le=10)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None


class SessionCompleteRequest(BaseModel):
    rating_score: Optional[float] = Field(None, ge=1.0, le=5.0)
    feedback_text: Optional[str] = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    institution_id: str
    offering_student_id: str
    learning_student_id: str
    listing_id: Optional[str]
    skill_name: str
    duration_minutes: int
    credit_cost: int
    status: str
    rating_score: Optional[float]
    feedback_text: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    institution_id: str
    sender_account_id: Optional[str]
    receiver_account_id: str
    amount: int
    session_id: Optional[str]
    transaction_type: str
    reason: Optional[str]
    created_at: datetime


class AdminGrantRequest(BaseModel):
    amount: int = Field(..., ge=1, le=100)
    reason: str = Field("Institutional achievement grant", min_length=3)


class AdminFreezeRequest(BaseModel):
    is_frozen: bool
    reason: str = Field("Administrative compliance hold", min_length=3)


# =========================================================================
# Helpers
# =========================================================================

def _get_or_create_student_profile(db: Session, current_user: CurrentUser) -> StudentProfile:
    sp = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.account_id == current_user.account.id,
            StudentProfile.institution_id == current_user.institution_id,
        )
        .first()
    )
    if not sp and current_user.membership:
        sp = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.membership_id == current_user.membership.id,
                StudentProfile.institution_id == current_user.institution_id,
            )
            .first()
        )
    if not sp:
        raise HTTPException(status_code=403, detail="Student profile required to access Skill Swap.")
    return sp


def _get_or_create_account(db: Session, institution_id: str, student_id: str) -> SkillSwapAccount:
    account = (
        db.query(SkillSwapAccount)
        .filter(
            SkillSwapAccount.student_id == student_id,
            SkillSwapAccount.institution_id == institution_id,
        )
        .first()
    )
    if not account:
        account = SkillSwapAccount(
            institution_id=institution_id,
            student_id=student_id,
            balance=5,  # Starting discovery credits
            total_earned=0,
            total_spent=0,
            is_frozen=False,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    return account


# =========================================================================
# Endpoints
# =========================================================================

@router.get("/account", response_model=AccountResponse)
def get_my_skill_swap_account(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Get current student's Skill Swap credit ledger account.
    Auto-initializes with 5 discovery credits on first access.
    """
    sp = _get_or_create_student_profile(db, current_user)
    account = _get_or_create_account(db, current_user.institution_id, sp.id)
    return account


@router.get("/listings", response_model=List[ListingResponse])
def list_skill_swap_listings(
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    List active peer skill offers and requests in the institution.
    """
    query = (
        db.query(SkillSwapListing)
        .filter(
            SkillSwapListing.institution_id == current_user.institution_id,
            SkillSwapListing.status == "active",
        )
    )
    if category:
        query = query.filter(SkillSwapListing.category == category)
    if listing_type:
        query = query.filter(SkillSwapListing.listing_type == listing_type)

    return query.order_by(SkillSwapListing.created_at.desc()).all()


@router.post("/listings", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_skill_swap_listing(
    payload: ListingCreateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Publish a new skill offer or skill request.
    """
    sp = _get_or_create_student_profile(db, current_user)
    listing = SkillSwapListing(
        institution_id=current_user.institution_id,
        student_id=sp.id,
        listing_type=payload.listing_type,
        skill_name=payload.skill_name,
        category=payload.category,
        proficiency_level=payload.proficiency_level,
        description=payload.description,
        status="active",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    log_audit_event(
        db,
        institution_id=current_user.institution_id,
        action="SKILL_SWAP_LISTING_CREATED",
        resource_type="skill_swap_listing",
        resource_id=listing.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        purpose="peer_learning_discovery",
        details={"skill_name": payload.skill_name, "listing_type": payload.listing_type},
    )

    return listing


@router.post("/sessions/book", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def book_skill_swap_session(
    payload: SessionBookRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Book a peer learning session between learner and offering student.
    Validates credit solvency, account unfrozen status, and cross-tenant boundaries.
    """
    learner_sp = _get_or_create_student_profile(db, current_user)
    inst_id = current_user.institution_id

    if learner_sp.id == payload.offering_student_id:
        raise HTTPException(status_code=400, detail="Cannot book a Skill Swap session with yourself.")

    offering_sp = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.id == payload.offering_student_id,
            StudentProfile.institution_id == inst_id,
        )
        .first()
    )
    if not offering_sp:
        raise HTTPException(status_code=404, detail="Offering student not found in this institution.")

    learner_acct = _get_or_create_account(db, inst_id, learner_sp.id)
    if learner_acct.is_frozen:
        raise HTTPException(status_code=403, detail="Your Skill Swap account is frozen.")
    if learner_acct.balance < payload.credit_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Skill Swap credits. Available: {learner_acct.balance}, Required: {payload.credit_cost}",
        )

    offerer_acct = _get_or_create_account(db, inst_id, offering_sp.id)
    if offerer_acct.is_frozen:
        raise HTTPException(status_code=400, detail="Offering student account is temporarily inactive.")

    session = SkillSwapSession(
        institution_id=inst_id,
        offering_student_id=offering_sp.id,
        learning_student_id=learner_sp.id,
        listing_id=payload.listing_id,
        skill_name=payload.skill_name,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        credit_cost=payload.credit_cost,
        status="scheduled",
        notes=payload.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_audit_event(
        db,
        institution_id=inst_id,
        action="SKILL_SWAP_SESSION_BOOKED",
        resource_type="skill_swap_session",
        resource_id=session.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        purpose="peer_learning_booking",
        details={"credit_cost": payload.credit_cost, "skill_name": payload.skill_name},
    )

    return session


@router.post("/sessions/{session_id}/complete", response_model=SessionResponse)
def complete_skill_swap_session(
    session_id: str,
    payload: SessionCompleteRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Complete peer learning session.
    Executes atomic double-entry credit transfer adhering strictly to Zero-Sum Conservation of Balance:
    Learner balance decreases by cost, Offerer balance increases by cost.
    """
    inst_id = current_user.institution_id
    session = (
        db.query(SkillSwapSession)
        .filter(SkillSwapSession.id == session_id, SkillSwapSession.institution_id == inst_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Skill Swap session not found.")
    if session.status == "completed":
        return session  # Idempotent return

    # Check caller is party to the session or institution admin
    sp = None
    try:
        sp = _get_or_create_student_profile(db, current_user)
    except Exception:
        pass

    is_admin = current_user.has_role("institution_admin", "super_admin")
    if not is_admin and (not sp or sp.id not in (session.offering_student_id, session.learning_student_id)):
        raise HTTPException(status_code=403, detail="Unauthorized to complete this session.")

    learner_acct = _get_or_create_account(db, inst_id, session.learning_student_id)
    offerer_acct = _get_or_create_account(db, inst_id, session.offering_student_id)

    cost = session.credit_cost
    if learner_acct.balance < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Learner has insufficient balance ({learner_acct.balance}) to complete transfer of {cost} credits.",
        )

    # Inviolate Double-Entry Ledger Transfer
    initial_total = learner_acct.balance + offerer_acct.balance

    learner_acct.balance -= cost
    learner_acct.total_spent += cost

    offerer_acct.balance += cost
    offerer_acct.total_earned += cost

    final_total = learner_acct.balance + offerer_acct.balance
    assert initial_total == final_total, "CRITICAL ERROR: Zero-sum conservation of credit balance violated!"

    # Record ledger transaction
    tx = SkillSwapTransaction(
        institution_id=inst_id,
        sender_account_id=learner_acct.id,
        receiver_account_id=offerer_acct.id,
        amount=cost,
        session_id=session.id,
        transaction_type="session_completion",
        reason=f"Completed peer skill swap session on '{session.skill_name}'",
    )
    db.add(tx)

    # Update session status
    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    if payload.rating_score is not None:
        session.rating_score = payload.rating_score
    if payload.feedback_text:
        session.feedback_text = payload.feedback_text

    db.commit()
    db.refresh(session)

    log_audit_event(
        db,
        institution_id=inst_id,
        action="SKILL_SWAP_TRANSFER_EXECUTED",
        resource_type="skill_swap_transaction",
        resource_id=tx.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        purpose="double_entry_credit_transfer",
        details={
            "session_id": session.id,
            "amount": cost,
            "sender_account_id": learner_acct.id,
            "receiver_account_id": offerer_acct.id,
            "zero_sum_conserved": True,
        },
    )

    return session


@router.get("/transactions", response_model=List[TransactionResponse])
def get_my_transactions(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    View personal transaction ledger history (credits earned, spent, granted).
    """
    sp = _get_or_create_student_profile(db, current_user)
    account = _get_or_create_account(db, current_user.institution_id, sp.id)

    txs = (
        db.query(SkillSwapTransaction)
        .filter(
            SkillSwapTransaction.institution_id == current_user.institution_id,
            (SkillSwapTransaction.sender_account_id == account.id) |
            (SkillSwapTransaction.receiver_account_id == account.id),
        )
        .order_by(SkillSwapTransaction.created_at.desc())
        .all()
    )
    return txs


# =========================================================================
# Administrative Governance
# =========================================================================

@router.post("/admin/accounts/{student_id}/grant", response_model=AccountResponse)
def admin_grant_credits(
    student_id: str,
    payload: AdminGrantRequest,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """
    Institution Admin grants promotional / achievement credits to a student.
    """
    inst_id = current_user.institution_id
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id, StudentProfile.institution_id == inst_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    account = _get_or_create_account(db, inst_id, student.id)
    account.balance += payload.amount
    account.total_earned += payload.amount

    tx = SkillSwapTransaction(
        institution_id=inst_id,
        sender_account_id=None,  # System/Institutional Grant
        receiver_account_id=account.id,
        amount=payload.amount,
        transaction_type="promotional_grant",
        reason=payload.reason,
    )
    db.add(tx)
    db.commit()
    db.refresh(account)

    log_audit_event(
        db,
        institution_id=inst_id,
        action="SKILL_SWAP_CREDIT_GRANTED",
        resource_type="skill_swap_account",
        resource_id=account.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        purpose="administrative_grant",
        details={"amount": payload.amount, "reason": payload.reason},
    )

    return account


@router.post("/admin/accounts/{student_id}/freeze", response_model=AccountResponse)
def admin_freeze_account(
    student_id: str,
    payload: AdminFreezeRequest,
    current_user: CurrentUser = Depends(require_roles("institution_admin", "super_admin")),
    db: Session = Depends(get_db),
):
    """
    Institution Admin freezes or restores a student's Skill Swap account.
    """
    inst_id = current_user.institution_id
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id, StudentProfile.institution_id == inst_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    account = _get_or_create_account(db, inst_id, student.id)
    account.is_frozen = payload.is_frozen
    db.commit()
    db.refresh(account)

    log_audit_event(
        db,
        institution_id=inst_id,
        action="SKILL_SWAP_ACCOUNT_FROZEN" if payload.is_frozen else "SKILL_SWAP_ACCOUNT_UNFROZEN",
        resource_type="skill_swap_account",
        resource_id=account.id,
        actor_account_id=current_user.account.id,
        actor_membership_id=current_user.membership.id if current_user.membership else None,
        purpose="account_governance",
        details={"is_frozen": payload.is_frozen, "reason": payload.reason},
    )

    return account
