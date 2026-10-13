import pytest
from app.database import SessionLocal
from app.models import (
    Institution,
    StudentProfile,
    FrameworkVersion,
)
from app.domain.diagnosis import run_deterministic_diagnosis, compute_input_fingerprint


def test_deterministic_diagnosis_reproducibility():
    db = SessionLocal()
    try:
        inst = db.query(Institution).filter(Institution.slug == "apex-tech").first()
        student = db.query(StudentProfile).filter(StudentProfile.student_identifier == "APEX-CSE-2026-001").first()
        fw_ver = db.query(FrameworkVersion).filter(FrameworkVersion.institution_id == inst.id).first()

        # Run diagnosis first time
        det_run_1, diag_run_1 = run_deterministic_diagnosis(
            db=db,
            institution_id=inst.id,
            student_id=student.id,
            framework_version_id=fw_ver.id,
        )

        # Run diagnosis second time with same inputs
        det_run_2, diag_run_2 = run_deterministic_diagnosis(
            db=db,
            institution_id=inst.id,
            student_id=student.id,
            framework_version_id=fw_ver.id,
        )

        # 1. Fingerprint must be identical
        assert det_run_1.input_fingerprint == det_run_2.input_fingerprint

        # 2. Determinations must match exactly
        dets_1 = {d.competency_id: (d.supported_level_id, d.evidence_sufficiency) for d in det_run_1.determinations}
        dets_2 = {d.competency_id: (d.supported_level_id, d.evidence_sufficiency) for d in det_run_2.determinations}
        assert dets_1 == dets_2

        # 3. Findings must match exactly
        findings_1 = {f.competency_id: (f.finding_type, f.rationale_code) for f in diag_run_1.findings}
        findings_2 = {f.competency_id: (f.finding_type, f.rationale_code) for f in diag_run_2.findings}
        assert findings_1 == findings_2

    finally:
        db.close()


def test_sufficiency_and_gap_classification():
    db = SessionLocal()
    try:
        inst = db.query(Institution).filter(Institution.slug == "apex-tech").first()
        # Student 3 has no assessment attempts yet
        student_3 = db.query(StudentProfile).filter(StudentProfile.student_identifier == "APEX-CSE-2026-003").first()
        fw_ver = db.query(FrameworkVersion).filter(FrameworkVersion.institution_id == inst.id).first()

        det_run, diag_run = run_deterministic_diagnosis(
            db=db,
            institution_id=inst.id,
            student_id=student_3.id,
            framework_version_id=fw_ver.id,
        )

        # Without assessment evidence, all competencies must have sufficiency == 'no_evidence'
        for d in det_run.determinations:
            assert d.evidence_sufficiency == "no_evidence"
            assert d.supported_level_id is None

        # All findings must be 'insufficient_evidence', NEVER false 'gap' or 'target_met'
        for f in diag_run.findings:
            assert f.finding_type == "insufficient_evidence"
            assert "insufficient" in f.finding_summary.lower()
    finally:
        db.close()
