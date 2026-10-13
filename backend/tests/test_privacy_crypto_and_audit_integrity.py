import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.crypto import encrypt_field, decrypt_field, rotate_encrypted_field, get_encryption_key

client = TestClient(app)


def test_aes_gcm_encryption_integrity():
    # 1. Genuine AES-256-GCM encryption with nonce and tag verification
    key = get_encryption_key()
    original_text = "Private counseling session notes regarding career stress."
    ciphertext = encrypt_field(original_text, key=key)
    assert ciphertext.startswith("v1:")
    assert ciphertext != original_text

    # Decrypt
    decrypted = decrypt_field(ciphertext, key=key)
    assert decrypted == original_text

    # 2. Tampering with ciphertext triggers authentication tag verification failure
    tampered_ciphertext = ciphertext[:-4] + "AAAA"
    with pytest.raises(ValueError, match="Decryption failed"):
        decrypt_field(tampered_ciphertext, key=key)

    # 3. Key rotation
    import os
    new_key = os.urandom(32)
    rotated = rotate_encrypted_field(ciphertext, old_key=key, new_key=new_key)
    assert rotated.startswith("v1:")
    assert decrypt_field(rotated, key=new_key) == original_text


def test_tamper_evident_audit_log_and_chain_verification():
    # 1. Staff Login
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200

    # 2. Verify Audit Chain
    verify_res = client.get("/internal/v1/audit-events/verify-chain")
    assert verify_res.status_code == 200
    chain_data = verify_res.json()
    assert chain_data["is_valid"] is True
    assert chain_data["tamper_detected"] is False

    # 3. List Audit Events
    events_res = client.get("/internal/v1/audit-events?limit=10")
    assert events_res.status_code == 200
    events = events_res.json()
    if events:
        ev = events[0]
        assert "current_hash" in ev


def test_privacy_consent_and_data_export_workflow():
    # 1. Student Login
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. Grant Consent
    consent_res = client.post(
        "/internal/v1/privacy/consents",
        json={"consent_purpose": "ai_analytics"},
        headers=headers,
    )
    assert consent_res.status_code == 201
    consent_id = consent_res.json()["id"]

    # 3. Withdraw Consent
    withdraw_res = client.post(
        f"/internal/v1/privacy/consents/{consent_id}/withdraw",
        headers=headers,
    )
    assert withdraw_res.status_code == 200
    assert withdraw_res.json()["status"] == "withdrawn"

    # 4. Request Personal Data Export
    export_req = client.post(
        "/internal/v1/privacy/export-requests",
        headers=headers,
    )
    assert export_req.status_code == 201
    req_id = export_req.json()["id"]

    # 5. Download Export Package
    download_res = client.get(f"/internal/v1/privacy/export/{req_id}/download")
    assert download_res.status_code == 200
    pkg = download_res.json()
    assert "academic_enrollments" in pkg
    assert "user_profile" in pkg
    # Verify internal risk scores are omitted
    assert "risk_scores" not in pkg
    assert "disclaimer" in pkg
