from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Conversation,
    ConversationParticipant,
    ConversationMessage,
    Notification,
    MentorAssignment,
    StudentProfile,
    InstitutionMembership,
    MembershipRole,
    AssessmentAttempt,
    AuditEvent,
)
from app.security import (
    require_authenticated,
    CurrentUser,
)

router = APIRouter(tags=["Conversations & Bidirectional Messaging"])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class ConversationCreate(BaseModel):
    recipient_membership_id: str
    conversation_kind: str  # primary_mentoring, subject_mentoring, assessment_query, general
    subject: str
    message_body: str
    subject_scope: Optional[str] = None  # e.g., 'SQL', 'Python', 'General Career'
    student_profile_id: Optional[str] = None  # required if staff member initiates
    assessment_attempt_id: Optional[str] = None


class MessageCreate(BaseModel):
    body: str
    client_request_key: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_membership_id: str
    sender_name: str
    sender_role: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class ParticipantResponse(BaseModel):
    id: str
    membership_id: str
    name: str
    email: str
    participant_kind: str
    status: str
    joined_at: datetime
    last_read_at: Optional[datetime]

    class Config:
        from_attributes = True


class ConversationSummaryResponse(BaseModel):
    id: str
    institution_id: str
    student_profile_id: str
    student_name: str
    conversation_kind: str
    subject: str
    subject_scope: Optional[str]
    status: str
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime
    unread_messages: int
    latest_message: Optional[str]
    other_party_name: str

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: str
    institution_id: str
    student_profile_id: str
    student_name: str
    student_email: str
    conversation_kind: str
    subject: str
    subject_scope: Optional[str]
    status: str
    last_message_at: datetime
    created_at: datetime
    resolved_at: Optional[datetime]
    participants: list[ParticipantResponse]
    messages: list[MessageResponse]

    class Config:
        from_attributes = True


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/conversations", response_model=list[ConversationSummaryResponse])
def list_conversations(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    mem_id = current_user.active_membership.id

    # Strictly find conversations where current user's membership is a participant
    participant_entries = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.institution_id == current_user.institution_id,
            ConversationParticipant.membership_id == mem_id,
            ConversationParticipant.status == "active",
        )
        .all()
    )

    conv_ids = [p.conversation_id for p in participant_entries]
    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.institution_id == current_user.institution_id,
            Conversation.id.in_(conv_ids),
        )
        .order_by(Conversation.last_message_at.desc())
        .all()
    )

    participant_map = {p.conversation_id: p for p in participant_entries}

    res = []
    for c in conversations:
        my_part = participant_map.get(c.id)
        last_read = my_part.last_read_at if my_part else None

        # count messages after last_read
        msg_query = db.query(ConversationMessage).filter(ConversationMessage.conversation_id == c.id)
        if last_read:
            unread_count = msg_query.filter(
                ConversationMessage.created_at > last_read,
                ConversationMessage.sender_membership_id != mem_id,
            ).count()
        else:
            unread_count = msg_query.filter(ConversationMessage.sender_membership_id != mem_id).count()

        latest_msg = (
            db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == c.id)
            .order_by(ConversationMessage.created_at.desc())
            .first()
        )

        other_p = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == c.id,
                ConversationParticipant.membership_id != mem_id,
            )
            .first()
        )
        other_name = (
            other_p.membership.account.display_name
            if other_p and other_p.membership and other_p.membership.account
            else "Participant"
        )

        st = c.student_profile
        st_name = f"{st.first_name} {st.last_name}" if st else "Student"

        res.append(
            ConversationSummaryResponse(
                id=c.id,
                institution_id=c.institution_id,
                student_profile_id=c.student_profile_id,
                student_name=st_name,
                conversation_kind=c.conversation_kind,
                subject=c.subject,
                subject_scope=c.subject_scope,
                status=c.status,
                last_message_at=c.last_message_at,
                created_at=c.created_at,
                updated_at=c.updated_at,
                unread_messages=unread_count,
                latest_message=latest_msg.body if latest_msg else None,
                other_party_name=other_name,
            )
        )
    return res


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_detail(
    conversation_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.institution_id == current_user.institution_id,
            Conversation.id == conversation_id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    mem_id = current_user.active_membership.id

    # Verify that current user is an active participant in this conversation
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.membership_id == mem_id,
            ConversationParticipant.status == "active",
        )
        .first()
    )
    if not participant:
        # Check if caller is Admin or Super Admin attempting routine access (C-011, C-012)
        if current_user.has_role("institution_admin", "super_admin"):
            raise HTTPException(
                status_code=403,
                detail="Administrators cannot access private conversations without an explicit exceptional access grant",
            )
        raise HTTPException(status_code=403, detail="Access denied: You are not a participant in this conversation")

    # Mark notifications for this conversation as read
    now = datetime.now(timezone.utc)
    unread_notifs = (
        db.query(Notification)
        .filter(
            Notification.conversation_id == conv.id,
            Notification.recipient_membership_id == mem_id,
            Notification.is_read.is_(False),
        )
        .all()
    )
    for un in unread_notifs:
        un.is_read = True
        un.read_at = now

    participant.last_read_at = now
    db.commit()

    # Build response
    parts_res = []
    for p in conv.participants:
        acc = p.membership.account if p.membership else None
        parts_res.append(
            ParticipantResponse(
                id=p.id,
                membership_id=p.membership_id,
                name=acc.display_name if acc else "User",
                email=acc.email if acc else "",
                participant_kind=p.participant_kind,
                status=p.status,
                joined_at=p.joined_at,
                last_read_at=p.last_read_at,
            )
        )

    msgs_res = []
    for m in conv.messages:
        acc = m.sender_membership.account if m.sender_membership else None
        role_label = "Participant"
        for p in conv.participants:
            if p.membership_id == m.sender_membership_id:
                role_label = p.participant_kind.replace("_", " ").title()
        msgs_res.append(
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_membership_id=m.sender_membership_id,
                sender_name=acc.display_name if acc else "User",
                sender_role=role_label,
                body=m.body,
                created_at=m.created_at,
            )
        )

    st = conv.student_profile
    return ConversationDetailResponse(
        id=conv.id,
        institution_id=conv.institution_id,
        student_profile_id=conv.student_profile_id,
        student_name=f"{st.first_name} {st.last_name}" if st else "Student",
        student_email=st.email if st else "",
        conversation_kind=conv.conversation_kind,
        subject=conv.subject,
        subject_scope=conv.subject_scope,
        status=conv.status,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        resolved_at=conv.resolved_at,
        participants=parts_res,
        messages=msgs_res,
    )


@router.post("/conversations", response_model=ConversationDetailResponse)
def create_conversation(
    req: ConversationCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not req.subject.strip() or not req.message_body.strip():
        raise HTTPException(status_code=400, detail="Subject and message body cannot be empty")

    # Verify recipient membership belongs to same institution (support both membership_id and student_profile_id)
    recipient_mem = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.institution_id == current_user.institution_id,
            InstitutionMembership.id == req.recipient_membership_id,
            InstitutionMembership.status == "active",
        )
        .first()
    )

    if not recipient_mem:
        # Check if recipient_membership_id was passed as a StudentProfile.id
        fallback_prof = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                StudentProfile.id == req.recipient_membership_id,
            )
            .first()
        )
        if fallback_prof:
            recipient_mem = (
                db.query(InstitutionMembership)
                .filter(
                    InstitutionMembership.institution_id == current_user.institution_id,
                    (InstitutionMembership.account_id == fallback_prof.account_id)
                    | (InstitutionMembership.account.has(Account.email == fallback_prof.email)),
                    InstitutionMembership.status == "active",
                )
                .first()
            )
            if not req.student_profile_id:
                req.student_profile_id = fallback_prof.id

    if not recipient_mem:
        raise HTTPException(
            status_code=400,
            detail="Recipient does not exist in your institution (cross-tenant communication forbidden)",
        )

    now = datetime.now(timezone.utc)
    is_student = current_user.has_role("student")
    creator_mem = current_user.active_membership

    # Identify student profile
    student_profile = None
    if is_student:
        student_profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.account_id == current_user.account.id)
                | (StudentProfile.email == current_user.account.email),
            )
            .first()
        )
        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
    else:
        target_student_id = req.student_profile_id or req.recipient_membership_id
        student_profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.institution_id == current_user.institution_id,
                (StudentProfile.id == target_student_id)
                | (StudentProfile.account_id == recipient_mem.account_id)
                | (StudentProfile.email == recipient_mem.account.email),
            )
            .first()
        )
        if not student_profile:
            raise HTTPException(status_code=404, detail="Target student profile not found in institution")

    mentor_assignment = None

    # Relationship verification
    if is_student:
        # FLOW A: Student contacting mentor or assessor
        if req.conversation_kind == "primary_mentoring":
            mentor_assignment = (
                db.query(MentorAssignment)
                .filter(
                    MentorAssignment.institution_id == current_user.institution_id,
                    MentorAssignment.student_id == student_profile.id,
                    MentorAssignment.mentor_membership_id == recipient_mem.id,
                    MentorAssignment.assignment_type == "primary",
                    MentorAssignment.status == "active",
                )
                .first()
            )
            if not mentor_assignment:
                raise HTTPException(status_code=403, detail="Recipient is not your active Primary Mentor")

        elif req.conversation_kind == "subject_mentoring":
            mentor_assignment_query = db.query(MentorAssignment).filter(
                MentorAssignment.institution_id == current_user.institution_id,
                MentorAssignment.student_id == student_profile.id,
                MentorAssignment.mentor_membership_id == recipient_mem.id,
                MentorAssignment.assignment_type == "subject",
                MentorAssignment.status == "active",
            )
            if req.subject_scope:
                mentor_assignment_query = mentor_assignment_query.filter(
                    MentorAssignment.subject_scope.ilike(req.subject_scope.strip())
                )
            mentor_assignment = mentor_assignment_query.first()
            if not mentor_assignment:
                raise HTTPException(
                    status_code=403,
                    detail=f"Recipient is not an active Subject Mentor for the requested subject ({req.subject_scope})",
                )

        elif req.conversation_kind == "assessment_query":
            # Must verify recipient is faculty assessor and attempt belongs to student
            recipient_roles = [r.role for r in recipient_mem.roles if not r.revoked_at]
            if "faculty_assessor" not in recipient_roles and "institution_admin" not in recipient_roles:
                raise HTTPException(status_code=403, detail="Recipient is not an authorised assessor")
            if req.assessment_attempt_id:
                att = (
                    db.query(AssessmentAttempt)
                    .filter(
                        AssessmentAttempt.institution_id == current_user.institution_id,
                        AssessmentAttempt.id == req.assessment_attempt_id,
                        AssessmentAttempt.student_id == student_profile.id,
                    )
                    .first()
                )
                if not att:
                    raise HTTPException(status_code=400, detail="Specified assessment attempt does not belong to you")
    else:
        # Staff creating conversation with student
        # FLOW D: Primary Mentor contacting mentee
        if current_user.has_role("mentor_advisor"):
            if req.conversation_kind == "primary_mentoring":
                mentor_assignment = (
                    db.query(MentorAssignment)
                    .filter(
                        MentorAssignment.institution_id == current_user.institution_id,
                        MentorAssignment.student_id == student_profile.id,
                        MentorAssignment.mentor_membership_id == creator_mem.id,
                        MentorAssignment.assignment_type == "primary",
                        MentorAssignment.status == "active",
                    )
                    .first()
                )
                if not mentor_assignment:
                    raise HTTPException(status_code=403, detail="You are not assigned as this student's Primary Mentor")
            elif req.conversation_kind == "subject_mentoring":
                mentor_assignment = (
                    db.query(MentorAssignment)
                    .filter(
                        MentorAssignment.institution_id == current_user.institution_id,
                        MentorAssignment.student_id == student_profile.id,
                        MentorAssignment.mentor_membership_id == creator_mem.id,
                        MentorAssignment.assignment_type == "subject",
                        MentorAssignment.status == "active",
                    )
                    .first()
                )
                if not mentor_assignment:
                    raise HTTPException(status_code=403, detail="You are not assigned as this student's Subject Mentor")

        elif current_user.has_role("faculty_assessor"):
            if req.conversation_kind == "assessment_query" and req.assessment_attempt_id:
                att = (
                    db.query(AssessmentAttempt)
                    .filter(
                        AssessmentAttempt.institution_id == current_user.institution_id,
                        AssessmentAttempt.id == req.assessment_attempt_id,
                        AssessmentAttempt.student_id == student_profile.id,
                    )
                    .first()
                )
                if not att:
                    raise HTTPException(status_code=400, detail="Assessment attempt does not belong to the selected student")

    # Create Conversation
    conv = Conversation(
        institution_id=current_user.institution_id,
        student_profile_id=student_profile.id,
        created_by_membership_id=creator_mem.id,
        mentor_assignment_id=mentor_assignment.id if mentor_assignment else None,
        conversation_kind=req.conversation_kind,
        subject=req.subject,
        status="open",
        subject_scope=req.subject_scope or (mentor_assignment.subject_scope if mentor_assignment else None),
        assessment_attempt_id=req.assessment_attempt_id,
        last_message_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    db.flush()

    # Add participants
    creator_kind = "student" if is_student else (
        "primary_mentor" if req.conversation_kind == "primary_mentoring" else (
            "subject_mentor" if req.conversation_kind == "subject_mentoring" else "assessor"
        )
    )
    recipient_kind = "primary_mentor" if req.conversation_kind == "primary_mentoring" and is_student else (
        "subject_mentor" if req.conversation_kind == "subject_mentoring" and is_student else (
            "assessor" if req.conversation_kind == "assessment_query" and is_student else "student"
        )
    )

    part_creator = ConversationParticipant(
        institution_id=current_user.institution_id,
        conversation_id=conv.id,
        membership_id=creator_mem.id,
        participant_kind=creator_kind,
        status="active",
        joined_at=now,
        last_read_at=now,
    )
    part_recipient = ConversationParticipant(
        institution_id=current_user.institution_id,
        conversation_id=conv.id,
        membership_id=recipient_mem.id,
        participant_kind=recipient_kind,
        status="active",
        joined_at=now,
    )
    db.add_all([part_creator, part_recipient])
    db.flush()

    # Add first message
    first_msg = ConversationMessage(
        institution_id=current_user.institution_id,
        conversation_id=conv.id,
        sender_membership_id=creator_mem.id,
        body=req.message_body,
        created_at=now,
    )
    db.add(first_msg)
    db.flush()

    # Persistent notification for recipient
    sender_name = current_user.account.display_name
    db.add(
        Notification(
            institution_id=current_user.institution_id,
            recipient_membership_id=recipient_mem.id,
            notification_type="query_created",
            conversation_id=conv.id,
            message_id=first_msg.id,
            title=f"New query from {sender_name}: {req.subject}",
            event_key=f"conv-{conv.id}-msg-{first_msg.id}",
            is_read=False,
            created_at=now,
        )
    )

    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_account_id=current_user.account.id,
            actor_membership_id=creator_mem.id,
            action="create_conversation",
            resource_type="conversation",
            resource_id=conv.id,
            purpose=f"Started conversation: {req.subject}",
        )
    )

    db.commit()
    db.refresh(conv)

    return get_conversation_detail(conv.id, current_user, db)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_conversation_message(
    conversation_id: str,
    req: MessageCreate,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    conv = (
        db.query(Conversation)
        .filter(
            Conversation.institution_id == current_user.institution_id,
            Conversation.id == conversation_id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    mem_id = current_user.active_membership.id

    # Check that sender is an active participant
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.membership_id == mem_id,
            ConversationParticipant.status == "active",
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied: You are not a participant in this conversation")

    # Idempotency / duplicate check (C-013)
    if req.client_request_key:
        existing = (
            db.query(ConversationMessage)
            .filter(
                ConversationMessage.conversation_id == conv.id,
                ConversationMessage.sender_membership_id == mem_id,
                ConversationMessage.client_request_key == req.client_request_key,
            )
            .first()
        )
        if existing:
            acc = existing.sender_membership.account if existing.sender_membership else None
            return MessageResponse(
                id=existing.id,
                conversation_id=existing.conversation_id,
                sender_membership_id=existing.sender_membership_id,
                sender_name=acc.display_name if acc else "User",
                sender_role=participant.participant_kind.replace("_", " ").title(),
                body=existing.body,
                created_at=existing.created_at,
            )

    now = datetime.now(timezone.utc)

    msg = ConversationMessage(
        institution_id=current_user.institution_id,
        conversation_id=conv.id,
        sender_membership_id=mem_id,
        body=req.body,
        client_request_key=req.client_request_key,
        created_at=now,
    )
    db.add(msg)

    conv.last_message_at = now
    conv.updated_at = now
    if conv.status == "resolved":
        conv.status = "reopened"
    else:
        conv.status = "open"

    participant.last_read_at = now
    db.flush()

    # Notify all other active participants
    other_participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.membership_id != mem_id,
            ConversationParticipant.status == "active",
        )
        .all()
    )

    sender_name = current_user.account.display_name
    for op in other_participants:
        db.add(
            Notification(
                institution_id=current_user.institution_id,
                recipient_membership_id=op.membership_id,
                notification_type="message_received",
                conversation_id=conv.id,
                message_id=msg.id,
                title=f"New reply from {sender_name} in '{conv.subject}'",
                event_key=f"msg-{msg.id}-recip-{op.membership_id}",
                is_read=False,
                created_at=now,
            )
        )

    db.commit()
    db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_membership_id=msg.sender_membership_id,
        sender_name=sender_name,
        sender_role=participant.participant_kind.replace("_", " ").title(),
        body=msg.body,
        created_at=msg.created_at,
    )


@router.patch("/conversations/{conversation_id}/status", response_model=ConversationDetailResponse)
def update_conversation_status(
    conversation_id: str,
    status_update: dict,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    new_status = status_update.get("status")
    if new_status not in ("open", "resolved", "reopened"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'open', 'resolved', or 'reopened'")

    conv = (
        db.query(Conversation)
        .filter(
            Conversation.institution_id == current_user.institution_id,
            Conversation.id == conversation_id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    mem_id = current_user.active_membership.id
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.membership_id == mem_id,
            ConversationParticipant.status == "active",
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied: You are not a participant in this conversation")

    now = datetime.now(timezone.utc)
    conv.status = new_status
    conv.updated_at = now
    if new_status == "resolved":
        conv.resolved_at = now
    else:
        conv.resolved_at = None

    db.commit()
    db.refresh(conv)

    return get_conversation_detail(conv.id, current_user, db)
