from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    CompetencyFramework,
    FrameworkVersion,
    FrameworkCompetency,
    CompetencyLevel,
    CompetencyThreshold,
)
from app.schemas import (
    CompetencyFrameworkResponse,
    FrameworkVersionResponse,
    FrameworkCompetencyResponse,
    CompetencyLevelResponse,
)
from app.security import (
    require_authenticated,
    CurrentUser,
)

router = APIRouter(tags=["Competency Frameworks"])


@router.get("/competency-frameworks", response_model=list[CompetencyFrameworkResponse])
def list_competency_frameworks(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    frameworks = (
        db.query(CompetencyFramework)
        .filter(CompetencyFramework.institution_id == current_user.institution_id)
        .all()
    )

    res = []
    for fw in frameworks:
        # Find published version
        pub_ver = (
            db.query(FrameworkVersion)
            .filter(
                FrameworkVersion.framework_id == fw.id,
                FrameworkVersion.status == "published",
            )
            .order_by(FrameworkVersion.version_number.desc())
            .first()
        )

        current_ver_resp = None
        if pub_ver:
            comps = (
                db.query(FrameworkCompetency)
                .filter(FrameworkCompetency.framework_version_id == pub_ver.id)
                .order_by(FrameworkCompetency.display_order)
                .all()
            )
            comp_resps = []
            for c in comps:
                levels = (
                    db.query(CompetencyLevel)
                    .filter(CompetencyLevel.competency_id == c.id)
                    .order_by(CompetencyLevel.rank)
                    .all()
                )
                comp_resps.append(
                    FrameworkCompetencyResponse(
                        id=c.id,
                        competency_key=c.competency_key,
                        name=c.name,
                        description=c.description,
                        guidance=c.guidance,
                        display_order=c.display_order,
                        levels=[CompetencyLevelResponse.from_orm(l) for l in levels],
                    )
                )

            current_ver_resp = FrameworkVersionResponse(
                id=pub_ver.id,
                framework_id=pub_ver.framework_id,
                version_number=pub_ver.version_number,
                rule_set_version=pub_ver.rule_set_version,
                status=pub_ver.status,
                published_at=pub_ver.published_at,
                competencies=comp_resps,
            )

        res.append(
            CompetencyFrameworkResponse(
                id=fw.id,
                key=fw.key,
                name=fw.name,
                description=fw.description,
                current_version=current_ver_resp,
            )
        )
    return res


@router.get("/framework-versions/{version_id}", response_model=FrameworkVersionResponse)
def get_framework_version(
    version_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    ver = (
        db.query(FrameworkVersion)
        .filter(
            FrameworkVersion.institution_id == current_user.institution_id,
            FrameworkVersion.id == version_id,
        )
        .first()
    )
    if not ver:
        raise HTTPException(status_code=404, detail="Framework version not found")

    comps = (
        db.query(FrameworkCompetency)
        .filter(FrameworkCompetency.framework_version_id == ver.id)
        .order_by(FrameworkCompetency.display_order)
        .all()
    )
    comp_resps = []
    for c in comps:
        levels = (
            db.query(CompetencyLevel)
            .filter(CompetencyLevel.competency_id == c.id)
            .order_by(CompetencyLevel.rank)
            .all()
        )
        comp_resps.append(
            FrameworkCompetencyResponse(
                id=c.id,
                competency_key=c.competency_key,
                name=c.name,
                description=c.description,
                guidance=c.guidance,
                display_order=c.display_order,
                levels=[CompetencyLevelResponse.from_orm(l) for l in levels],
            )
        )

    return FrameworkVersionResponse(
        id=ver.id,
        framework_id=ver.framework_id,
        version_number=ver.version_number,
        rule_set_version=ver.rule_set_version,
        status=ver.status,
        published_at=ver.published_at,
        competencies=comp_resps,
    )
