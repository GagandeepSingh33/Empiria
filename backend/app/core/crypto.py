import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

VERSION_PREFIX = "v1:"


def get_encryption_key() -> bytes:
    """
    Retrieves the 256-bit (32-byte) AES key from the ENCRYPTION_KEY environment
    variable or deterministically derives it from settings.secret_key.
    Never hardcoded in plaintext.
    """
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        # If provided as hex or base64 or raw string
        if len(env_key) == 64:
            try:
                return bytes.fromhex(env_key)
            except ValueError:
                pass
        return hashlib.sha256(env_key.encode("utf-8")).digest()
    
    # Derive a 256-bit key from settings.secret_key
    return hashlib.sha256((settings.secret_key + ":empiria-aes-256-gcm").encode("utf-8")).digest()


def encrypt_field(plaintext: Optional[str], key: Optional[bytes] = None) -> Optional[str]:
    """
    Encrypts a sensitive plaintext string using AES-256-GCM.
    Uses a fresh 12-byte cryptographically secure random nonce for every encryption.
    Stores format: v1:<base64(12-byte nonce + ciphertext + 16-byte tag)>
    """
    if plaintext is None or plaintext == "":
        return plaintext

    if key is None:
        key = get_encryption_key()

    if len(key) != 32:
        raise ValueError("AES-256-GCM requires a 32-byte (256-bit) encryption key.")

    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce recommended for AES-GCM
    data = plaintext.encode("utf-8")
    # AESGCM.encrypt appends 16-byte authentication tag to the end of ciphertext
    ciphertext_with_tag = aesgcm.encrypt(nonce, data, associated_data=None)

    payload = nonce + ciphertext_with_tag
    encoded = base64.b64encode(payload).decode("ascii")
    return f"{VERSION_PREFIX}{encoded}"


def decrypt_field(ciphertext: Optional[str], key: Optional[bytes] = None) -> Optional[str]:
    """
    Decrypts an AES-256-GCM encrypted string, validating the authentication tag.
    Gracefully handles unencrypted legacy plaintext for smooth migration.
    """
    if ciphertext is None or ciphertext == "":
        return ciphertext

    # Check for version prefix
    if not ciphertext.startswith(VERSION_PREFIX):
        # Plaintext fallback for legacy records prior to encryption migration
        return ciphertext

    if key is None:
        key = get_encryption_key()

    if len(key) != 32:
        raise ValueError("AES-256-GCM requires a 32-byte (256-bit) encryption key.")

    b64_part = ciphertext[len(VERSION_PREFIX):]
    try:
        raw_payload = base64.b64decode(b64_part)
        if len(raw_payload) < 28:  # 12-byte nonce + 16-byte tag minimum
            raise ValueError("Invalid payload length")
        
        nonce = raw_payload[:12]
        ciphertext_with_tag = raw_payload[12:]

        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, associated_data=None)
        return decrypted_bytes.decode("utf-8")
    except Exception as exc:
        raise ValueError(f"Decryption failed: corrupted ciphertext or invalid authentication tag ({exc})")


def rotate_encrypted_field(ciphertext: str, old_key: bytes, new_key: bytes) -> str:
    """
    Rotates ciphertext from an old AES key to a new AES key with a fresh nonce.
    """
    decrypted = decrypt_field(ciphertext, key=old_key)
    return encrypt_field(decrypted, key=new_key)
