import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Institution,
    InstitutionSettings,
    OrgNode,
    Programme,
    Cohort,
    CohortMembership,
    InstitutionMembership,
    MembershipRole,
    MembershipInvitation,
    StudentProfile,
    AuditEvent,
)
from app.schemas import (
    InstitutionResponse,
    InstitutionUpdate,
    OrgNodeCreate,
    OrgNodeResponse,
    ProgrammeCreate,
    ProgrammeResponse,
    CohortCreate,
    CohortResponse,
    InvitationCreate,
)
from app.security import (
    require_authenticated,
    require_roles,
    CurrentUser,
)

router = APIRouter(tags=["Institution Setup & Organisation"])


@router.get("/institution", response_model=InstitutionResponse)
def get_current_institution(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not current_user.institution_id:
        raise HTTPException(status_code=404, detail="No active institution context")

    inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    settings_dict = {}
    if inst.settings:
        settings_dict = {
            "display_name": inst.settings.display_name,
            "locale": inst.settings.locale,
            "branding": inst.settings.branding,
            "min_cohort_threshold": inst.settings.min_cohort_threshold,
        }

    return InstitutionResponse(
        id=inst.id,
        slug=inst.slug,
        name=inst.name,
        status=inst.status,
        created_at=inst.created_at,
        settings=settings_dict,
    )


@router.patch("/institution", response_model=InstitutionResponse)
def update_institution(
    req: InstitutionUpdate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if req.name:
        inst.name = req.name

    if inst.settings:
        if req.branding is not None:
            inst.settings.branding = req.branding
        if req.min_cohort_threshold is not None:
            inst.settings.min_cohort_threshold = req.min_cohort_threshold

    db.add(
        AuditEvent(
            institution_id=inst.id,
            actor_membership_id=current_user.membership.id,
            action="INSTITUTION_SETTINGS_UPDATED",
            resource_type="institution_settings",
            resource_id=inst.settings.id if inst.settings else inst.id,
        )
    )
    db.commit()
    return get_current_institution(current_user=current_user, db=db)


@router.get("/institution/overview")
def get_institution_overview(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not current_user.institution_id:
        raise HTTPException(status_code=404, detail="No active institution context")

    inst_id = current_user.institution_id
    programmes_count = db.query(Programme).filter(Programme.institution_id == inst_id).count()
    cohorts_count = db.query(Cohort).filter(Cohort.institution_id == inst_id).count()
    students_count = db.query(StudentProfile).filter(StudentProfile.institution_id == inst_id).count()
    members_count = db.query(InstitutionMembership).filter(InstitutionMembership.institution_id == inst_id).count()

    return {
        "institution_id": inst_id,
        "programmes_count": programmes_count,
        "cohorts_count": cohorts_count,
        "students_count": students_count,
        "members_count": members_count,
    }


# Org nodes
@router.get("/org-nodes", response_model=list[OrgNodeResponse])
def list_org_nodes(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(OrgNode)
        .filter(OrgNode.institution_id == current_user.institution_id)
        .order_by(OrgNode.name)
        .all()
    )


@router.post("/org-nodes", response_model=OrgNodeResponse)
def create_org_node(
    req: OrgNodeCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    node = OrgNode(
        institution_id=current_user.institution_id,
        parent_id=req.parent_id,
        node_type=req.node_type,
        name=req.name,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


# Programmes
@router.get("/programmes", response_model=list[ProgrammeResponse])
def list_programmes(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    return (
        db.query(Programme)
        .filter(Programme.institution_id == current_user.institution_id)
        .order_by(Programme.name)
        .all()
    )


@router.post("/programmes", response_model=ProgrammeResponse)
def create_programme(
    req: ProgrammeCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    prog = Programme(
        institution_id=current_user.institution_id,
        name=req.name,
        code=req.code,
        description=req.description,
        org_node_id=req.org_node_id,
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


# Cohorts
@router.get("/cohorts", response_model=list[CohortResponse])
def list_cohorts(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    cohorts = (
        db.query(Cohort)
        .filter(Cohort.institution_id == current_user.institution_id)
        .order_by(Cohort.name)
        .all()
    )
    res = []
    for c in cohorts:
        scount = (
            db.query(CohortMembership)
            .filter(
                CohortMembership.institution_id == current_user.institution_id,
                CohortMembership.cohort_id == c.id,
                CohortMembership.status == "active",
            )
            .count()
        )
        res.append(
            CohortResponse(
                id=c.id,
                name=c.name,
                programme_id=c.programme_id,
                start_date=c.start_date,
                end_date=c.end_date,
                student_count=scount,
                created_at=c.created_at,
            )
        )
    return res


@router.post("/cohorts", response_model=CohortResponse)
def create_cohort(
    req: CohortCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    cohort = Cohort(
        institution_id=current_user.institution_id,
        programme_id=req.programme_id,
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
    )
    db.add(cohort)
    db.commit()
    db.refresh(cohort)
    return CohortResponse(
        id=cohort.id,
        name=cohort.name,
        programme_id=cohort.programme_id,
        start_date=cohort.start_date,
        end_date=cohort.end_date,
        student_count=0,
        created_at=cohort.created_at,
    )


# Memberships & Roles
@router.get("/memberships")
def list_memberships(
    current_user: CurrentUser = Depends(require_roles("institution_admin", "data_operator")),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(InstitutionMembership)
        .filter(InstitutionMembership.institution_id == current_user.institution_id)
        .all()
    )
    res = []
    for m in memberships:
        roles = [r.role for r in m.roles if r.revoked_at is None]
        res.append({
            "id": m.id,
            "account_id": m.account_id,
            "email": m.account.email,
            "display_name": m.account.display_name,
            "status": m.status,
            "roles": roles,
            "created_at": m.created_at,
        })
    return res


@router.post("/membership-invitations")
def create_invitation(
    req: InvitationCreate,
    current_user: CurrentUser = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    token = str(uuid.uuid4())
    token_hash = uuid.uuid5(uuid.NAMESPACE_DNS, token).hex
    inv = MembershipInvitation(
        institution_id=current_user.institution_id,
        email=req.email.lower(),
        role=req.role,
        token_hash=token_hash,
        invited_by_membership_id=current_user.membership.id,
        roster_student_id=req.roster_student_id,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(inv)
    db.add(
        AuditEvent(
            institution_id=current_user.institution_id,
            actor_membership_id=current_user.membership.id,
            action="INVITATION_ISSUED",
            resource_type="membership_invitations",
            purpose=f"Invited {req.email} as {req.role}",
        )
    )
    db.commit()
    return {"message": "Invitation issued", "invitation_id": inv.id, "email": inv.email}
