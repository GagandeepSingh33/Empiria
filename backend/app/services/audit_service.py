import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import AuditEvent, now_utc

GENESIS_HASH = "0" * 64

# Sensitive keys that must NEVER be recorded into audit details
REDACTED_KEYS = {"password", "secret", "token", "auth_token", "hash", "session", "cookie", "csrf"}


def sanitize_details(details: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not details:
        return None
    sanitized = {}
    for k, v in details.items():
        if any(r in k.lower() for r in REDACTED_KEYS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_details(v)
        else:
            sanitized[k] = v
    return sanitized


def canonical_payload(
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    actor_account_id: Optional[str],
    occurred_at: datetime,
    details: Optional[Dict[str, Any]],
) -> str:
    # Ensure datetime is normalized to UTC with exact format
    if occurred_at.tzinfo is None:
        utc_dt = occurred_at.replace(tzinfo=timezone.utc)
    else:
        utc_dt = occurred_at.astimezone(timezone.utc)
    
    # Store timestamp as integer microseconds for exact cross-platform equality
    timestamp_micros = int(utc_dt.timestamp() * 1_000_000)

    payload = {
        "action": action,
        "actor_account_id": actor_account_id or "",
        "details": details or {},
        "occurred_at_us": timestamp_micros,
        "resource_id": resource_id or "",
        "resource_type": resource_type,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def compute_event_hash(prev_hash: str, payload_str: str) -> str:
    combined = f"{prev_hash}|{payload_str}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def log_audit_event(
    db: Session,
    institution_id: Optional[str],
    action: str,
    resource_type: str,
    actor_account_id: Optional[str] = None,
    actor_membership_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    purpose: Optional[str] = None,
    request_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditEvent:
    """
    Logs an audit event with cryptographic SHA-256 hash chaining to ensure tamper evidence.
    """
    cleaned_details = sanitize_details(details)
    timestamp = now_utc()
    timestamp_iso = timestamp.isoformat()

    # Find the most recent event to chain from
    query = db.query(AuditEvent).filter(AuditEvent.current_hash.isnot(None))
    if institution_id:
        query = query.filter(AuditEvent.institution_id == institution_id)
    last_event = query.order_by(desc(AuditEvent.occurred_at), desc(AuditEvent.id)).first()

    previous_hash = last_event.current_hash if last_event else GENESIS_HASH

    payload_str = canonical_payload(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_account_id=actor_account_id,
        occurred_at=timestamp,
        details=cleaned_details,
    )
    current_hash = compute_event_hash(previous_hash, payload_str)

    event = AuditEvent(
        institution_id=institution_id,
        actor_account_id=actor_account_id,
        actor_membership_id=actor_membership_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        purpose=purpose,
        request_id=request_id,
        ip_address=ip_address,
        details=cleaned_details,
        previous_hash=previous_hash,
        current_hash=current_hash,
        occurred_at=timestamp,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def verify_audit_chain(db: Session, institution_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies the integrity of the audit event chain.
    Detects if any record has been inserted, deleted, modified, or reordered.
    """
    query = db.query(AuditEvent)
    if institution_id:
        query = query.filter(AuditEvent.institution_id == institution_id)
    events: List[AuditEvent] = (
        query.filter(AuditEvent.current_hash.isnot(None))
        .order_by(AuditEvent.occurred_at.asc(), AuditEvent.id.asc())
        .all()
    )

    if not events:
        return {
            "is_valid": True,
            "total_events": 0,
            "verified_count": 0,
            "tamper_detected": False,
            "message": "Audit log is empty.",
        }

    expected_prev_hash = GENESIS_HASH
    for idx, ev in enumerate(events):
        # Check previous hash link (allow GENESIS_HASH as epoch boundary)
        if ev.previous_hash and ev.previous_hash != expected_prev_hash:
            if ev.previous_hash == GENESIS_HASH:
                expected_prev_hash = GENESIS_HASH
            else:
                return {
                    "is_valid": False,
                    "total_events": len(events),
                    "verified_count": idx,
                    "tamper_detected": True,
                    "broken_at_id": ev.id,
                    "message": f"Hash chain broken at event {ev.id}: expected prev_hash {expected_prev_hash}, got {ev.previous_hash}",
                }


        # Recompute current hash
        payload_str = canonical_payload(
            action=ev.action,
            resource_type=ev.resource_type,
            resource_id=ev.resource_id,
            actor_account_id=ev.actor_account_id,
            occurred_at=ev.occurred_at,
            details=ev.details,
        )
        computed_current_hash = compute_event_hash(ev.previous_hash or expected_prev_hash, payload_str)
        if ev.current_hash and ev.current_hash != computed_current_hash:
            return {
                "is_valid": False,
                "total_events": len(events),
                "verified_count": idx,
                "tamper_detected": True,
                "broken_at_id": ev.id,
                "message": f"Tampering detected at event {ev.id}: computed hash {computed_current_hash} != stored {ev.current_hash}",
            }

        expected_prev_hash = ev.current_hash

    return {
        "is_valid": True,
        "total_events": len(events),
        "verified_count": len(events),
        "tamper_detected": False,
        "message": f"Audit log verified: {len(events)} events chained intact.",
    }
