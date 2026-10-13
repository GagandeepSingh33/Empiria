import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models import (
    StudentProfile,
    AssessmentForm,
    AssessmentAttempt,
    AssessmentResponse,
    AssessmentResult,
    ResultCompetency,
    EvidenceItem,
    EvidenceCompetency,
    ProgressComparison,
    FrameworkVersion,
    DevelopmentPlan,
    DevelopmentPlanVersion,
    PlanTask,
    TaskStatusEvent,
    TaskSubmission,
)
from app.domain.diagnosis import run_deterministic_diagnosis
from app.domain.planning import generate_development_plan

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_student_one_to_baseline():
    client.cookies.clear()
    db = SessionLocal()
    try:
        prof = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
        if prof:
            fol_form = db.query(AssessmentForm).filter(AssessmentForm.code == "DA-FOL-01").first()
            if fol_form:
                attempts = db.query(AssessmentAttempt).filter(
                    AssessmentAttempt.student_id == prof.id,
                    AssessmentAttempt.form_id == fol_form.id,
                ).all()
                for att in attempts:
                    results = db.query(AssessmentResult).filter(AssessmentResult.attempt_id == att.id).all()
                    for r in results:
                        ev_items = db.query(EvidenceItem).filter(EvidenceItem.assessment_result_id == r.id).all()
                        for ev in ev_items:
                            db.query(EvidenceCompetency).filter(EvidenceCompetency.evidence_id == ev.id).delete()
                            db.delete(ev)
                        db.query(ResultCompetency).filter(ResultCompetency.assessment_result_id == r.id).delete()
                        db.query(ProgressComparison).filter(ProgressComparison.follow_up_result_id == r.id).delete()
                        db.delete(r)
                    db.query(AssessmentResponse).filter(AssessmentResponse.attempt_id == att.id).delete()
                    db.delete(att)

            # Clean up old plans and tasks so baseline plan is generated fresh
            plans = db.query(DevelopmentPlan).filter(DevelopmentPlan.student_id == prof.id).all()
            for p in plans:
                versions = db.query(DevelopmentPlanVersion).filter(DevelopmentPlanVersion.plan_id == p.id).all()
                for v in versions:
                    tasks = db.query(PlanTask).filter(PlanTask.plan_version_id == v.id).all()
                    for t in tasks:
                        db.query(TaskStatusEvent).filter(TaskStatusEvent.task_id == t.id).delete()
                        db.query(TaskSubmission).filter(TaskSubmission.task_id == t.id).delete()
                        db.delete(t)
                    db.delete(v)
                db.delete(p)

            fw_ver = db.query(FrameworkVersion).first()
            if fw_ver:
                det_run, diag_run = run_deterministic_diagnosis(db, prof.institution_id, prof.id, fw_ver.id)
                generate_development_plan(db, prof.institution_id, prof.id, diag_run.id)
            db.commit()
    finally:
        db.close()
    yield
    client.cookies.clear()


def test_complete_end_to_end_student_development_pathway():
    # -------------------------------------------------------------------------
    # 1. Sign in as Student (Aarav Sharma)
    # -------------------------------------------------------------------------
    login_res = client.post(
        "/internal/v1/auth/login",
        json={"email": "student@apex.edu", "password": "StudentPass123!"},
    )
    assert login_res.status_code == 200
    cookies = {settings.session_cookie_name: login_res.cookies[settings.session_cookie_name]}
    csrf_token = login_res.json()["csrf_token"]
    student_acc = login_res.json()["account"]

    # -------------------------------------------------------------------------
    # 2. Verify Competency Framework & Baseline Assessment Availability
    # -------------------------------------------------------------------------
    fw_res = client.get("/internal/v1/competency-frameworks", cookies=cookies)
    assert fw_res.status_code == 200
    frameworks = fw_res.json()
    assert len(frameworks) > 0
    fw = frameworks[0]
    assert fw["key"] == "data-analyst-core"
    competencies = fw["current_version"]["competencies"]
    assert len(competencies) == 7

    forms_res = client.get("/internal/v1/assessment-forms", cookies=cookies)
    assert forms_res.status_code == 200
    forms = forms_res.json()
    base_form = next(f for f in forms if f["code"] == "DA-BASE-01")
    fol_form = next(f for f in forms if f["code"] == "DA-FOL-01")

    # -------------------------------------------------------------------------
    # 3. Fetch Assessment Details (Safe Student View - No Answer Keys!)
    # -------------------------------------------------------------------------
    form_detail = client.get(f"/internal/v1/assessment-forms/{base_form['id']}", cookies=cookies).json()
    assert len(form_detail["items"]) == 7
    for it in form_detail["items"]:
        # CRITICAL SECURITY CHECK: Student must never receive server answer keys
        assert "answer_key" not in it
        assert "correct_option" not in it

    # -------------------------------------------------------------------------
    # 4. View Diagnosis & Development Plan
    # -------------------------------------------------------------------------
    # Aarav has seeded baseline result
    db = SessionLocal()
    student_profile = db.query(StudentProfile).filter(StudentProfile.email == "student@apex.edu").first()
    student_id = student_profile.id
    db.close()

    diag_res = client.get(f"/internal/v1/students/{student_id}/diagnosis", cookies=cookies)
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert len(diag_data["determinations"]) == 7
    assert len(diag_data["findings"]) == 7

    # Verify gap finding in SQL (Aarav scored 40%, below target 75%)
    sql_finding = next(f for f in diag_data["findings"] if f["competency_key"] == "sql")
    assert sql_finding["finding_type"] == "gap"
    assert "target" in sql_finding["detailed_explanation"].lower()
    assert sql_finding["recommended_action"] != ""

    # Fetch Development Plan
    plan_res = client.get("/internal/v1/me/development-plan", cookies=cookies)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert len(plan["tasks"]) > 0

    # -------------------------------------------------------------------------
    # 5. Practice: Start Task, Submit Work, Mark Completed
    # -------------------------------------------------------------------------
    target_task = plan["tasks"][0]
    task_id = target_task["id"]

    start_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/start",
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_progress"

    sub_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/submissions",
        json={"submission_text": "Completed SQL window functions problem set with verified execution plans."},
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "submitted"

    comp_res = client.post(
        f"/internal/v1/plan-tasks/{task_id}/complete",
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    # -------------------------------------------------------------------------
    # 6. Verify: Complete Follow-up Assessment
    # -------------------------------------------------------------------------
    att_res = client.post(
        f"/internal/v1/assessment-forms/{fol_form['id']}/attempts",
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert att_res.status_code == 200
    attempt_id = att_res.json()["id"]

    fol_detail = client.get(f"/internal/v1/assessment-forms/{fol_form['id']}", cookies=cookies).json()

    # Submit correct answers for follow-up form items
    # (SQL-F1 -> B, PY-F1 -> A, STAT-F1 -> C, CLN-F1 -> B, VIS-F1 -> C, REA-F1 -> D, COM-F1 -> A)
    answers = {}
    for item in fol_detail["items"]:
        if item["code"] == "SQL-F1":
            answers[item["id"]] = "B"
        elif item["code"] == "PY-F1":
            answers[item["id"]] = "A"
        elif item["code"] == "STAT-F1":
            answers[item["id"]] = "C"
        elif item["code"] == "CLN-F1":
            answers[item["id"]] = "B"
        elif item["code"] == "VIS-F1":
            answers[item["id"]] = "C"
        elif item["code"] == "REA-F1":
            answers[item["id"]] = "D"
        elif item["code"] == "COM-F1":
            answers[item["id"]] = "A"

    submit_res = client.post(
        f"/internal/v1/assessment-attempts/{attempt_id}/submit",
        json={"responses": answers},
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert submit_res.status_code == 200
    result_data = submit_res.json()
    assert result_data["percentage"] == 100.0

    # -------------------------------------------------------------------------
    # 7. Progress: Verify Qualified Progress Comparison with Limitations
    # -------------------------------------------------------------------------
    progress_res = client.get(f"/internal/v1/students/{student_id}/progress", cookies=cookies)
    assert progress_res.status_code == 200
    pdata = progress_res.json()
    assert pdata["has_follow_up"] is True
    assert len(pdata["comparisons"]) == 7

    # Verify SQL progress comparison: baseline 40% -> follow-up 100% (+60%)
    sql_comp = next(c for c in pdata["comparisons"] if "sql" in c["competency_name"].lower())
    assert sql_comp["baseline_score"] == 40.0
    assert sql_comp["follow_up_score"] == 100.0
    assert sql_comp["score_delta"] == 60.0
    assert sql_comp["outcome_status"] == "improved"
    assert "causal" in sql_comp["mandatory_limitations"].lower()

    # -------------------------------------------------------------------------
    # 8. Support Request & Intervention Record
    # -------------------------------------------------------------------------
    sreq_res = client.post(
        "/internal/v1/support-requests",
        json={
            "subject": "Follow-up verification completed - request advisor review",
            "message": "Completed practice exercises and follow-up assessment with verified improvement.",
        },
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert sreq_res.status_code == 200
    req_id = sreq_res.json()["id"]

    # Advisor logs in to record intervention
    login_advisor = client.post(
        "/internal/v1/auth/login",
        json={"email": "mentor@apex.edu", "password": "MentorPass123!"},
    )
    cookies_adv = {settings.session_cookie_name: login_advisor.cookies[settings.session_cookie_name]}
    csrf_adv = login_advisor.json()["csrf_token"]

    interv_res = client.post(
        f"/internal/v1/support-requests/{req_id}/interventions",
        json={
            "intervention_date": "2026-10-10",
            "agreed_actions": "Reviewed verified progress; recommended portfolio project development.",
            "follow_up_date": "2026-10-24",
            "notes": "Student showed significant mastery advancement across all competencies.",
        },
        headers={"X-CSRF-Token": csrf_adv},
        cookies=cookies_adv,
    )
    assert interv_res.status_code == 200
    assert interv_res.json()["status"] == "active"

    # -------------------------------------------------------------------------
    # 9. Institutional Reporting & Small-Cohort Privacy Protection
    # -------------------------------------------------------------------------
    # Login as Institution Admin
    login_adm = client.post(
        "/internal/v1/auth/login",
        json={"email": "admin@apex.edu", "password": "AdminPass123!"},
    )
    cookies_adm = {settings.session_cookie_name: login_adm.cookies[settings.session_cookie_name]}

    op_res = client.get("/internal/v1/reports/operational-overview", cookies=cookies_adm)
    assert op_res.status_code == 200
    op_data = op_res.json()
    assert op_data["total_students"] >= 5
    assert op_data["baseline_attempts_completed"] >= 1

    outcomes_res = client.get("/internal/v1/reports/outcomes", cookies=cookies_adm)
    assert outcomes_res.status_code == 200
    outcomes_data = outcomes_res.json()
    assert outcomes_data["evaluation_limitations"] != ""
