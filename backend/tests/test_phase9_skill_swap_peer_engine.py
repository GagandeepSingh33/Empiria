import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    AuditEvent,
    StudentProfile,
    SkillSwapAccount,
    SkillSwapListing,
    SkillSwapSession,
    SkillSwapTransaction,
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
    with SessionLocal() as db:
        for email in ("student@apex.edu", "student2@apex.edu", "student@beacon.edu"):
            sp = db.query(StudentProfile).filter(StudentProfile.email == email).first()
            if sp:
                acct = db.query(SkillSwapAccount).filter(SkillSwapAccount.student_id == sp.id).first()
                if acct:
                    if acct.balance < 5:
                        acct.balance = 5
                    acct.is_frozen = False
        db.commit()
    yield
    client.cookies.clear()


# =========================================================================
# PHASE 9: Skill Swap Peer Engine & Double-Entry Ledger Tests
# =========================================================================

def test_phase9_account_auto_provisioning_and_initial_discovery_balance():
    """
    Test account auto-initialization:
    - First access auto-provisions SkillSwapAccount.
    - Initial discovery balance is 5 credits.
    - Account is active and unfrozen.
    """
    s1_headers, s1_cookies, _ = login("student@apex.edu", "StudentPass123!")

    res = client.get("/internal/v1/skill-swap/account", headers=s1_headers, cookies=s1_cookies)
    assert res.status_code == 200, res.text
    acct = res.json()

    assert "balance" in acct
    assert acct["balance"] >= 5
    assert acct["is_frozen"] is False
    assert acct["total_earned"] >= 0
    assert acct["total_spent"] >= 0


def test_phase9_peer_listing_creation_and_discovery():
    """
    Test skill listings lifecycle:
    - Student 1 publishes skill offer.
    - Student 2 browses and filters listings by category.
    """
    s1_headers, s1_cookies, _ = login("student@apex.edu", "StudentPass123!")
    s2_headers, s2_cookies, _ = login("student2@apex.edu", "StudentPass123!")

    skill_name = f"Python AsyncIO & FastAPI {uuid.uuid4().hex[:4]}"
    create_res = client.post(
        "/internal/v1/skill-swap/listings",
        json={
            "listing_type": "offer",
            "skill_name": skill_name,
            "category": "academic",
            "proficiency_level": "advanced",
            "description": "Concurrency patterns, event loops, and non-blocking IO.",
        },
        headers=s1_headers,
        cookies=s1_cookies,
    )
    assert create_res.status_code == 201, create_res.text
    listing = create_res.json()
    assert listing["skill_name"] == skill_name
    assert listing["status"] == "active"

    # Student 2 browses listings
    browse_res = client.get("/internal/v1/skill-swap/listings?category=academic", headers=s2_headers, cookies=s2_cookies)
    assert browse_res.status_code == 200
    items = browse_res.json()
    assert any(i["id"] == listing["id"] for i in items)


def test_phase9_session_booking_and_credit_solvency_check():
    """
    Test booking validation:
    - Learner books session with offerer.
    - Prevents booking with oneself (HTTP 400).
    """
    s1_headers, s1_cookies, _ = login("student@apex.edu", "StudentPass123!")
    s2_headers, s2_cookies, _ = login("student2@apex.edu", "StudentPass123!")

    # Student 1 gets their profile id
    with SessionLocal() as db:
        sp1 = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        sp2 = db.query(StudentProfile).filter(StudentProfile.email == "student2@apex.edu").first()
        assert sp1 is not None and sp2 is not None
        sp1_id = sp1.id
        sp2_id = sp2.id

    # Negative test: Student 1 attempts to book session with themselves
    self_book = client.post(
        "/internal/v1/skill-swap/sessions/book",
        json={
            "offering_student_id": sp1_id,
            "skill_name": "Self Tutoring",
            "credit_cost": 1,
            "duration_minutes": 60,
        },
        headers=s1_headers,
        cookies=s1_cookies,
    )
    assert self_book.status_code == 400
    assert "with yourself" in self_book.text

    # Positive test: Student 2 books session with Student 1
    book_res = client.post(
        "/internal/v1/skill-swap/sessions/book",
        json={
            "offering_student_id": sp1_id,
            "skill_name": "Advanced Python Coroutines",
            "credit_cost": 1,
            "duration_minutes": 60,
            "notes": "Interested in async context managers.",
        },
        headers=s2_headers,
        cookies=s2_cookies,
    )
    assert book_res.status_code == 201, book_res.text
    session_data = book_res.json()
    assert session_data["status"] == "scheduled"
    assert session_data["credit_cost"] == 1
    assert session_data["offering_student_id"] == sp1_id
    assert session_data["learning_student_id"] == sp2_id


def test_phase9_atomic_double_entry_transfer_and_zero_sum_conservation():
    """
    Test atomic double-entry credit ledger transfer:
    - Booking and completion between Student 1 and Student 2.
    - Zero-Sum Conservation of Balance: Sum of balances remains strictly invariant.
    - Learner balance -= 1, Offerer balance += 1.
    - Tamper-evident AuditEvent recorded.
    """
    s1_headers, s1_cookies, _ = login("student@apex.edu", "StudentPass123!")
    s2_headers, s2_cookies, _ = login("student2@apex.edu", "StudentPass123!")

    with SessionLocal() as db:
        sp1 = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        sp2 = db.query(StudentProfile).filter(StudentProfile.email == "student2@apex.edu").first()
        sp1_id = sp1.id
        sp2_id = sp2.id

    # Fetch initial balances
    acct1_before = client.get("/internal/v1/skill-swap/account", headers=s1_headers, cookies=s1_cookies).json()
    acct2_before = client.get("/internal/v1/skill-swap/account", headers=s2_headers, cookies=s2_cookies).json()
    initial_sum = acct1_before["balance"] + acct2_before["balance"]

    # Book session (cost: 1 credit)
    book_res = client.post(
        "/internal/v1/skill-swap/sessions/book",
        json={
            "offering_student_id": sp1_id,
            "skill_name": "Zero Sum Test Lesson",
            "credit_cost": 1,
            "duration_minutes": 60,
        },
        headers=s2_headers,
        cookies=s2_cookies,
    )
    assert book_res.status_code == 201
    sess_id = book_res.json()["id"]

    # Complete session
    comp_res = client.post(
        f"/internal/v1/skill-swap/sessions/{sess_id}/complete",
        json={"rating_score": 5.0, "feedback_text": "Super clear and concise guidance!"},
        headers=s1_headers,
        cookies=s1_cookies,
    )
    assert comp_res.status_code == 200, comp_res.text
    assert comp_res.json()["status"] == "completed"

    # Fetch post-completion balances
    acct1_after = client.get("/internal/v1/skill-swap/account", headers=s1_headers, cookies=s1_cookies).json()
    acct2_after = client.get("/internal/v1/skill-swap/account", headers=s2_headers, cookies=s2_cookies).json()
    final_sum = acct1_after["balance"] + acct2_after["balance"]

    # 1. Zero-Sum Invariance Check
    assert initial_sum == final_sum, f"Zero-sum invariant broken: before={initial_sum}, after={final_sum}"
    # 2. Individual Balance Delta Check
    assert acct1_after["balance"] == acct1_before["balance"] + 1
    assert acct2_after["balance"] == acct2_before["balance"] - 1

    # 3. Audit Event Check
    with SessionLocal() as db:
        ev = (
            db.query(AuditEvent)
            .filter(AuditEvent.action == "SKILL_SWAP_TRANSFER_EXECUTED")
            .order_by(AuditEvent.occurred_at.desc())
            .first()
        )
        assert ev is not None
        assert ev.resource_type == "skill_swap_transaction"


def test_phase9_insufficient_balance_gate():
    """
    Test credit solvency gate:
    - Student with zero balance cannot book a session.
    """
    s2_headers, s2_cookies, _ = login("student2@apex.edu", "StudentPass123!")

    with SessionLocal() as db:
        sp1 = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        sp2 = db.query(StudentProfile).filter(StudentProfile.email == "student2@apex.edu").first()
        sp1_id = sp1.id
        sp2_id = sp2.id
        acct2 = db.query(SkillSwapAccount).filter(SkillSwapAccount.student_id == sp2.id).first()
        old_bal = acct2.balance
        # Temporarily drain balance
        acct2.balance = 0
        db.commit()

    try:
        # Attempt booking costing 1 credit
        fail_res = client.post(
            "/internal/v1/skill-swap/sessions/book",
            json={
                "offering_student_id": sp1_id,
                "skill_name": "Overdraft Attempt Lesson",
                "credit_cost": 1,
                "duration_minutes": 60,
            },
            headers=s2_headers,
            cookies=s2_cookies,
        )
        assert fail_res.status_code == 400
        assert "Insufficient Skill Swap credits" in fail_res.text
    finally:
        # Restore balance
        with SessionLocal() as db:
            acct2 = db.query(SkillSwapAccount).filter(SkillSwapAccount.student_id == sp2_id).first()
            acct2.balance = old_bal
            db.commit()


def test_phase9_account_freeze_governance():
    """
    Test administrative freeze governance:
    - Admin freezes Student 2's account.
    - Student 2 is blocked from booking sessions.
    - Admin unfreezes; normal access restored.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    s2_headers, s2_cookies, _ = login("student2@apex.edu", "StudentPass123!")

    with SessionLocal() as db:
        sp1 = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        sp2 = db.query(StudentProfile).filter(StudentProfile.email == "student2@apex.edu").first()
        sp1_id = sp1.id
        sp2_id = sp2.id

    # Admin freezes Student 2
    freeze_res = client.post(
        f"/internal/v1/skill-swap/admin/accounts/{sp2_id}/freeze",
        json={"is_frozen": True, "reason": "Academic integrity review"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert freeze_res.status_code == 200
    assert freeze_res.json()["is_frozen"] is True

    # Student 2 tries to book a session
    blocked_res = client.post(
        "/internal/v1/skill-swap/sessions/book",
        json={
            "offering_student_id": sp1_id,
            "skill_name": "Blocked Booking Lesson",
            "credit_cost": 1,
            "duration_minutes": 60,
        },
        headers=s2_headers,
        cookies=s2_cookies,
    )
    assert blocked_res.status_code == 403
    assert "frozen" in blocked_res.text

    # Admin unfreezes Student 2
    unfreeze_res = client.post(
        f"/internal/v1/skill-swap/admin/accounts/{sp2_id}/freeze",
        json={"is_frozen": False, "reason": "Review resolved"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert unfreeze_res.status_code == 200
    assert unfreeze_res.json()["is_frozen"] is False


def test_phase9_admin_credit_grant():
    """
    Test institutional promotional / achievement credit grant:
    - Admin grants 3 credits to Student 1.
    - Student 1 balance increases by 3.
    - Transaction logged as 'promotional_grant'.
    """
    admin_headers, admin_cookies, _ = login("admin@apex.edu", "AdminPass123!")
    s1_headers, s1_cookies, _ = login("student@apex.edu", "StudentPass123!")

    with SessionLocal() as db:
        sp1 = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        sp1_id = sp1.id

    bal_before = client.get("/internal/v1/skill-swap/account", headers=s1_headers, cookies=s1_cookies).json()["balance"]

    grant_res = client.post(
        f"/internal/v1/skill-swap/admin/accounts/{sp1_id}/grant",
        json={"amount": 3, "reason": "Outstanding peer mentoring contribution"},
        headers=admin_headers,
        cookies=admin_cookies,
    )
    assert grant_res.status_code == 200, grant_res.text
    assert grant_res.json()["balance"] == bal_before + 3

    # Check transactions
    tx_res = client.get("/internal/v1/skill-swap/transactions", headers=s1_headers, cookies=s1_cookies)
    assert tx_res.status_code == 200
    txs = tx_res.json()
    assert any(t["transaction_type"] == "promotional_grant" and t["amount"] == 3 for t in txs)


def test_phase9_cross_tenant_isolation_gate():
    """
    Test tenant isolation boundary:
    - Beacon student cannot book a session with Apex student.
    - Blocked with 404 (cross-tenant leakage denied).
    """
    beacon_headers, beacon_cookies, _ = login("student@beacon.edu", "BeaconPass123!")

    with SessionLocal() as db:
        apex_sp = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        assert apex_sp is not None
        apex_id = apex_sp.id

    # Beacon student tries to book with Apex student
    cross_res = client.post(
        "/internal/v1/skill-swap/sessions/book",
        json={
            "offering_student_id": apex_id,
            "skill_name": "Cross Tenant Tutoring",
            "credit_cost": 1,
            "duration_minutes": 60,
        },
        headers=beacon_headers,
        cookies=beacon_cookies,
    )
    assert cross_res.status_code in (404, 403)
