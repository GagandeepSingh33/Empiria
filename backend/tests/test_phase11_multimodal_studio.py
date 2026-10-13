import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    AuditEvent,
    Account,
    ConsentRecord,
    StudentProfile,
    MultimodalStudioSession,
    MultimodalAssessmentStep,
)

client = TestClient(app)


def login(email: str, password: str):
    res = client.post(
        "/internal/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    data = res.json()
    csrf_token = data.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    cookies = {settings.session_cookie_name: res.cookies[settings.session_cookie_name]}
    client.cookies.set(settings.session_cookie_name, res.cookies[settings.session_cookie_name])
    return headers, cookies, data


@pytest.fixture(autouse=True)
def clean_client():
    client.cookies.clear()
    yield
    client.cookies.clear()


def ensure_media_consent(headers, cookies, purpose="multimodal_sensory"):
    res = client.post(
        "/internal/v1/privacy/consents",
        json={"consent_purpose": purpose},
        headers=headers,
        cookies=cookies,
    )
    assert res.status_code in (200, 201), f"Consent grant failed: {res.text}"
    return res


# =========================================================================
# PHASE 11: Multimodal AI Learning Studio Tests
# =========================================================================

def test_phase11_media_consent_gate_denial():
    """
    Test Acceptance Gate 4 (Media Consent Gate):
    - Without an active, unrevoked consent record, starting an audio or video session returns 403 Forbidden.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Ensure no active media consent exists for student@apex.edu
    with SessionLocal() as db:
        acc = db.query(Account).filter(Account.email == "student@apex.edu").first()
        assert acc is not None
        db.query(ConsentRecord).filter(
            ConsentRecord.account_id == acc.id,
            ConsentRecord.consent_purpose.in_(["media_recording", "multimodal_sensory", "camera_pose", "audio_vocal", "video_motion"]),
        ).delete()
        db.commit()

    # Attempt to start audio studio session without consent
    res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "audio_vocal",
            "goal_description": "Vocal pitch intonation drill",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert res.status_code == 403, res.text
    assert "Active cryptographic media consent required" in res.text


def test_phase11_media_consent_granted_session_init():
    """
    Test session initiation with granted media consent:
    - Student grants media consent.
    - Successfully starts multimodal studio session.
    - Transient processing flag defaults to False (raw stream never stored).
    - Step 2 demonstration curriculum provided.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Grant media consent
    consent_res = ensure_media_consent(st_headers, st_cookies, "multimodal_sensory")
    assert consent_res.status_code in (200, 201)

    # Start audio session
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "audio_vocal",
            "goal_description": "Vocal pitch scale and resonance precision",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert sess_res.status_code == 201, sess_res.text
    session = sess_res.json()
    assert session["modality"] == "audio_vocal"
    assert session["current_step"] == 1
    assert session["status"] == "active"
    assert session["raw_stream_persisted"] is False
    assert session["teaching_demonstration"] is not None
    assert session["teaching_demonstration"]["step"] == 2


def test_phase11_audio_vocal_pitch_and_noise_fallback():
    """
    Test Audio Studio sensory evaluation & acoustic fallback:
    - Calculates pitch cents error: 1200 * log2(detected / target).
    - Fallback: High background noise (> 40%) triggers uncertainty flag and referral to human coach.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    ensure_media_consent(st_headers, st_cookies, "multimodal_sensory")

    # 1. Start audio session
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "audio_vocal",
            "goal_description": "Concert A4 calibration",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    sess_id = sess_res.json()["id"]

    # 2. Submit high-quality attempt (440 Hz target, detected 441.2 Hz, 10% noise)
    step_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={
            "target_frequency_hz": 440.0,
            "detected_frequencies_hz": [440.5, 441.0, 441.2],
            "background_noise_ratio": 0.10,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert step_res.status_code == 200, step_res.text
    step_data = step_res.json()
    assert step_data["confidence_metric"] >= 0.90
    assert step_data["uncertainty_flag"] is None
    assert "pitch_accuracy" in step_data["rubric_scores"]
    assert "pitch_deviation_cents" in step_data["extracted_features"]
    assert step_data["current_step"] == 2

    # 3. Test Uncertainty Fallback: High background noise (55% noise)
    noisy_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={
            "target_frequency_hz": 440.0,
            "detected_frequencies_hz": [420.0, 460.0],
            "background_noise_ratio": 0.55,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert noisy_res.status_code == 200
    noisy_data = noisy_res.json()
    assert noisy_data["uncertainty_flag"] == "high_background_noise"
    assert noisy_data["confidence_metric"] < 0.60
    assert noisy_data["is_referred_to_human"] is True


def test_phase11_video_motion_kinematics_and_occlusion_fallback():
    """
    Test Movement / Athletics Studio joint angle evaluation & occlusion fallback:
    - Analyzes joint angles (elbow flexion, knee angle).
    - Fallback: Partial camera occlusion (< 60% visibility) flags occlusion and prompts repositioning.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # Grant media consent
    ensure_media_consent(st_headers, st_cookies, "camera_pose")

    # 1. Start video session
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "video_motion",
            "goal_description": "Tennis Topspin Forehand Kinetic Chain",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    sess_id = sess_res.json()["id"]

    # 2. Submit clean movement kinematics
    step_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={
            "exercise_type": "tennis_forehand",
            "joint_angles": {"elbow_flexion": 115.0, "knee_angle": 92.0, "shoulder_abduction": 85.0},
            "camera_visibility_score": 0.95,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert step_res.status_code == 200, step_res.text
    step_data = step_res.json()
    assert step_data["uncertainty_flag"] is None
    assert "movement_symmetry" in step_data["rubric_scores"]
    assert "joint_angles_degrees" in step_data["extracted_features"]

    # 3. Test Occlusion Fallback (< 60% camera visibility)
    occ_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={
            "exercise_type": "tennis_forehand",
            "camera_visibility_score": 0.35,
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert occ_res.status_code == 200
    occ_data = occ_res.json()
    assert occ_data["uncertainty_flag"] == "partial_camera_occlusion"
    assert occ_data["is_referred_to_human"] is True
    assert "reposition" in occ_data["feedback_instruction"].lower() or "silhouette" in occ_data["feedback_instruction"].lower()


def test_phase11_code_ast_studio_deterministic_parsing():
    """
    Test Programming Studio deterministic AST parsing:
    - Parses Python syntax tree without camera/microphone prerequisites.
    - Detects node count, recursive structures, and time complexity.
    - Handles syntax errors gracefully with line number feedback.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")

    # 1. Start code studio session
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "code_ast",
            "goal_description": "Binary Search Tree DFS In-Order Traversal",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert sess_res.status_code == 201, sess_res.text
    sess_id = sess_res.json()["id"]

    # 2. Submit valid recursive Python solution
    code_snippet = """
def inorder_traversal(root):
    if not root:
        return []
    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right)
"""
    step_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={"source_code": code_snippet},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert step_res.status_code == 200, step_res.text
    step_data = step_res.json()
    assert step_data["confidence_metric"] == 1.0
    assert step_data["extracted_features"]["has_recursive_structure"] is True
    assert step_data["extracted_features"]["ast_node_count"] > 10
    assert step_data["rubric_scores"]["algorithmic_correctness"] >= 90.0

    # 3. Submit invalid syntax code
    bad_code = "def broken(x: return x +"
    bad_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={"source_code": bad_code},
        headers=st_headers,
        cookies=st_cookies,
    )
    assert bad_res.status_code == 200
    bad_data = bad_res.json()
    assert bad_data["extracted_features"]["syntax_valid"] is False
    assert "syntax error" in bad_data["feedback_instruction"].lower()


def test_phase11_inviolate_prohibition_of_emotion_affect_profiling():
    """
    Test Inviolate Safety Guardrail:
    - Attempting to submit or analyze emotion, affect, or personality traits is strictly rejected with 400 Bad Request.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    ensure_media_consent(st_headers, st_cookies, "multimodal_sensory")

    # Start audio session
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "audio_vocal",
            "goal_description": "Pitch calibration",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    sess_id = sess_res.json()["id"]

    # Submit with prohibited emotion profiling payload
    prohibited_res = client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={
            "target_frequency_hz": 440.0,
            "detected_frequencies_hz": [440.0],
            "emotion_profiling_data": {"facial_affect": "happy", "sentiment_score": 0.85},
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    assert prohibited_res.status_code == 400
    assert "emotion" in prohibited_res.text.lower()
    assert "prohibited" in prohibited_res.text.lower()


def test_phase11_transient_media_purging_and_right_to_erasure():
    """
    Test Right to Erasure:
    - Calling purge endpoint immediately erases all sensory telemetry references.
    - Tamper-evident AuditEvent recorded.
    """
    st_headers, st_cookies, _ = login("student@apex.edu", "StudentPass123!")
    ensure_media_consent(st_headers, st_cookies, "multimodal_sensory")

    # Start and submit step
    sess_res = client.post(
        "/internal/v1/multimodal/sessions",
        json={
            "modality": "audio_vocal",
            "goal_description": "Vocal resonance check",
            "starting_level": "intermediate",
        },
        headers=st_headers,
        cookies=st_cookies,
    )
    sess_id = sess_res.json()["id"]

    client.post(
        f"/internal/v1/multimodal/sessions/{sess_id}/step",
        json={"target_frequency_hz": 440.0, "detected_frequencies_hz": [440.0]},
        headers=st_headers,
        cookies=st_cookies,
    )

    # Purge media telemetry
    purge_res = client.delete(f"/internal/v1/multimodal/sessions/{sess_id}/purge-media", headers=st_headers, cookies=st_cookies)
    assert purge_res.status_code == 200, purge_res.text
    assert purge_res.json()["status"] == "purged"

    # Verify audit event
    with SessionLocal() as db:
        ev = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "MEDIA_TELEMETRY_PURGED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert ev is not None
        assert ev.resource_type == "multimodal_studio_session"
