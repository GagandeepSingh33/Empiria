import pytest
from app.database import SessionLocal
from app.models import (
    Institution,
    StudentProfile,
    ProgressComparison,
)
from app.domain.progress import compute_progress_comparison


def test_progress_comparison_and_limitations():
    db = SessionLocal()
    try:
        inst = db.query(Institution).filter(Institution.slug == "apex-tech").first()
        # Student 2 (Priya Patel) has both baseline and follow-up
        student_2 = db.query(StudentProfile).filter(StudentProfile.student_identifier == "APEX-CSE-2026-002").first()

        comparisons = (
            db.query(ProgressComparison)
            .filter(
                ProgressComparison.institution_id == inst.id,
                ProgressComparison.student_id == student_2.id,
            )
            .all()
        )
        assert len(comparisons) > 0

        for c in comparisons:
            # Score delta must be follow_up - baseline
            assert round(c.score_delta, 1) == round(c.follow_up_score - c.baseline_score, 1)

            # Mandatory limitations MUST be populated (never causal efficacy claim)
            assert c.mandatory_limitations is not None
            assert "causal" in c.mandatory_limitations.lower()
            assert "standardized conditions" in c.mandatory_limitations.lower()

            # For Priya, follow-up scores improved by >= 20%
            assert c.outcome_status == "improved"

    finally:
        db.close()
