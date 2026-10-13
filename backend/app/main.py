import uuid
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_database

# Routers
from app.api.auth import router as auth_router
from app.api.platform import router as platform_router
from app.api.licences import router as licences_router
from app.api.institutions import router as institutions_router
from app.api.students import router as students_router
from app.api.frameworks import router as frameworks_router
from app.api.assessments import router as assessments_router
from app.api.evidence import router as evidence_router
from app.api.plans import router as plans_router
from app.api.support import router as support_router
from app.api.reports import router as reports_router
from app.api.mentorship import router as mentorship_router
from app.api.conversations import router as conversations_router
from app.api.notifications import router as notifications_router
from app.api.academic import router as academic_router
from app.api.risk import router as risk_router
from app.api.matching import router as matching_router
from app.api.briefings import router as briefings_router
from app.api.privacy import router as privacy_router
from app.api.student_360 import router as student_360_router
from app.api.co_curricular import router as co_curricular_router
from app.api.analytics import router as analytics_router
from app.api.skill_swap import router as skill_swap_router
from app.api.career import router as career_router
from app.api.multimodal import router as multimodal_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("empiria")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing EMPIRIA database tables and seed data...")
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as ex:
        logger.error(f"Error during database seed: {ex}")
    yield
    logger.info("EMPIRIA shutting down...")


app = FastAPI(
    title="EMPIRIA Platform API",
    description="Student Capability Development and Institutional Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Correlation ID and Request Logging Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = req_id

    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    response.headers["X-Request-ID"] = req_id
    logger.info(
        f"req_id={req_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} duration={duration_ms:.2f}ms"
    )
    return response


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled error [req_id={req_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please contact institutional support.",
            "request_id": req_id,
        },
    )


# Health & Readiness endpoints
@app.get("/health/live", tags=["Health"])
def health_live():
    return {"status": "live", "timestamp": time.time()}


@app.get("/health/ready", tags=["Health"])
def health_ready():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as ex:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected", "error": str(ex)},
        )


# Internal SPA API routes under /internal/v1
api_v1 = FastAPI()
api_v1.include_router(auth_router)
api_v1.include_router(platform_router)
api_v1.include_router(licences_router)
api_v1.include_router(institutions_router)
api_v1.include_router(students_router)
api_v1.include_router(frameworks_router)
api_v1.include_router(assessments_router)
api_v1.include_router(evidence_router)
api_v1.include_router(plans_router)
api_v1.include_router(support_router)
api_v1.include_router(reports_router)
api_v1.include_router(mentorship_router)
api_v1.include_router(conversations_router)
api_v1.include_router(notifications_router)
api_v1.include_router(academic_router)
api_v1.include_router(risk_router)
api_v1.include_router(matching_router)
api_v1.include_router(briefings_router)
api_v1.include_router(privacy_router)
api_v1.include_router(student_360_router)
api_v1.include_router(co_curricular_router)
api_v1.include_router(analytics_router)
api_v1.include_router(skill_swap_router)
api_v1.include_router(career_router)
api_v1.include_router(multimodal_router)

app.mount("/internal/v1", api_v1)
app.mount("/api/v1", api_v1)

# Mount static frontend build if present
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

