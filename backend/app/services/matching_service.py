import logging
from typing import Dict, Any, List, Optional
import numpy as np
from scipy.optimize import linear_sum_assignment
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    StudentProfile,
    InstitutionMembership,
    MembershipRole,
    MentorProfile,
    MentorExpertise,
    MentorAssignment,
    MatchingRun,
    MatchingProposal,
    StudentGoal,
    DiagnosisFinding,
    now_utc,
    generate_uuid,
)

logger = logging.getLogger("empiria.matching")


class Tuple_Compatibility:
    def __init__(self, score: float, factors: Dict[str, Any]):
        self.score = score
        self.factors = factors


def evaluate_pair_compatibility(
    student_needs: List[str],
    mentor_skills: Dict[str, int],
    current_workload: int,
    effective_capacity: int,
) -> Tuple_Compatibility:
    """
    Computes a deterministic compatibility score between a student and a prospective mentor.
    Factors:
    - Subject/skill overlap (0.0 to 0.6)
    - Mentor proficiency level (0.0 to 0.2)
    - Available workload capacity buffer (0.0 to 0.2)
    """
    # 1. Subject Overlap
    matched_skills = []
    if student_needs:
        for need in student_needs:
            for skill_name, prof in mentor_skills.items():
                if need.lower() in skill_name.lower() or skill_name.lower() in need.lower():
                    matched_skills.append((skill_name, prof))
                    break
        overlap_ratio = len(matched_skills) / len(student_needs)
    else:
        # General mentoring
        overlap_ratio = 0.5
        matched_skills = list(mentor_skills.items())[:2]

    overlap_score = min(0.60, overlap_ratio * 0.60)

    # 2. Proficiency Bonus
    avg_prof = np.mean([p for _, p in matched_skills]) if matched_skills else 3.0
    prof_score = min(0.20, (avg_prof / 5.0) * 0.20)

    # 3. Capacity / Workload Headroom
    remaining_capacity = max(0, effective_capacity - current_workload)
    capacity_ratio = min(1.0, remaining_capacity / max(1, effective_capacity))
    capacity_score = round(capacity_ratio * 0.20, 3)

    total_score = round(float(overlap_score + prof_score + capacity_score), 3)

    factors = {
        "matched_competencies": [s for s, _ in matched_skills],
        "overlap_score": round(overlap_score, 3),
        "proficiency_bonus": round(prof_score, 3),
        "capacity_buffer_score": round(capacity_score, 3),
        "current_workload": current_workload,
        "effective_capacity": effective_capacity,
    }

    return Tuple_Compatibility(score=total_score, factors=factors)


def execute_mentor_matching_run(
    db: Session,
    institution_id: str,
    assignment_type: str = "primary",  # primary or subject
    subject_scope: Optional[str] = None,
    capacity_multiplier: float = 1.0,
    scope: str = "all_students",
    requester_membership_id: Optional[str] = None,
) -> MatchingRun:
    """
    Solves optimal mentor-student matching using the Hungarian algorithm (Linear Sum Assignment).
    Accounts for student gaps, mentor expertise, workload constraints, and capacity multipliers.
    Generates MatchingProposal records requiring authorized human approval.
    """
    # 1. Fetch eligible students
    student_query = db.query(StudentProfile).filter(
        StudentProfile.institution_id == institution_id,
        StudentProfile.status == "active",
    )

    if scope == "unassigned_only":
        if assignment_type == "primary":
            assigned_student_ids = (
                db.query(MentorAssignment.student_id)
                .filter(
                    MentorAssignment.institution_id == institution_id,
                    MentorAssignment.assignment_type == "primary",
                    MentorAssignment.status == "active",
                )
                .all()
            )
            assigned_ids = {a[0] for a in assigned_student_ids}
            students = [s for s in student_query.all() if s.id not in assigned_ids]
        else:
            students = student_query.all()
    else:
        students = student_query.all()

    # 2. Fetch eligible mentors
    mentor_memberships = (
        db.query(InstitutionMembership)
        .join(MembershipRole, InstitutionMembership.id == MembershipRole.membership_id)
        .filter(
            InstitutionMembership.institution_id == institution_id,
            MembershipRole.role.in_(["mentor_advisor", "faculty_assessor", "institution_admin"]),
            MembershipRole.revoked_at.is_(None),
            InstitutionMembership.status == "active",
        )
        .distinct()
        .all()
    )
    mentors = mentor_memberships

    if not students or not mentors:
        run_rec = MatchingRun(
            institution_id=institution_id,
            scope=scope,
            assignment_type=assignment_type,
            subject_scope=subject_scope,
            capacity_multiplier=capacity_multiplier,
            status="completed",
            configuration={"students_count": len(students), "mentors_count": len(mentors)},
            created_by_membership_id=requester_membership_id,
        )
        db.add(run_rec)
        db.commit()
        db.refresh(run_rec)
        return run_rec

    # 3. Build mentor capacity and expertise maps
    mentor_profiles = {
        mp.membership_id: mp
        for mp in db.query(MentorProfile).filter(MentorProfile.institution_id == institution_id).all()
    }

    # Current active workloads
    workload_counts = dict(
        db.query(MentorAssignment.mentor_membership_id, func.count(MentorAssignment.id))
        .filter(
            MentorAssignment.institution_id == institution_id,
            MentorAssignment.status == "active",
        )
        .group_by(MentorAssignment.mentor_membership_id)
        .all()
    )

    # Mentor expertise
    expertise_map = {}
    for m in mentors:
        prof = mentor_profiles.get(m.id)
        skills = {}
        if prof and prof.expertise:
            for exp in prof.expertise:
                skills[exp.subject_name] = exp.proficiency_level
        else:
            # Default fallback skills
            skills = {"Data Analysis": 4, "General Career": 4, "Python": 3, "SQL": 3}
        expertise_map[m.id] = skills

    # 4. Extract student needs (from goals, diagnosis gaps, or subject_scope)
    student_needs_map = {}
    for s in students:
        needs = []
        if subject_scope:
            needs.append(subject_scope)

        # Goals
        goals = db.query(StudentGoal).filter(StudentGoal.student_id == s.id, StudentGoal.status == "active").all()
        for g in goals:
            needs.append(g.title)

        # Competency diagnosis findings
        findings = (
            db.query(DiagnosisFinding)
            .filter(DiagnosisFinding.finding_type == "gap")
            .limit(5)
            .all()
        )
        for f in findings:
            if f.competency:
                needs.append(f.competency.name)

        if not needs:
            needs = ["Data Analysis", "SQL", "Career Planning"]
        student_needs_map[s.id] = needs

    # 5. Build Cost Matrix for Hungarian Optimization
    # We duplicate mentor slots up to their effective capacity
    # to allow multi-student assignment per mentor.
    expanded_mentor_slots = []
    slot_to_mentor_id = []

    for m in mentors:
        prof = mentor_profiles.get(m.id)
        base_cap = prof.max_capacity if prof else 5
        effective_cap = max(1, int(base_cap * capacity_multiplier))
        current_load = workload_counts.get(m.id, 0)

        slots_available = max(1, effective_cap - current_load)
        for slot_idx in range(slots_available):
            expanded_mentor_slots.append((m, current_load, effective_cap))
            slot_to_mentor_id.append(m.id)

    num_students = len(students)
    num_slots = len(expanded_mentor_slots)

    # Cost matrix where lower cost = higher compatibility
    cost_matrix = np.zeros((num_students, num_slots))
    eval_cache = {}

    for i, s in enumerate(students):
        s_needs = student_needs_map[s.id]
        for j, (m, cur_load, eff_cap) in enumerate(expanded_mentor_slots):
            pair_key = (s.id, m.id)
            if pair_key not in eval_cache:
                eval_cache[pair_key] = evaluate_pair_compatibility(
                    student_needs=s_needs,
                    mentor_skills=expertise_map[m.id],
                    current_workload=cur_load,
                    effective_capacity=eff_cap,
                )
            compat = eval_cache[pair_key]
            # Convert compatibility (0.0 to 1.0) into cost (lower is better)
            cost_matrix[i, j] = 1.0 - compat.score

    # Solve linear sum assignment
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    # 6. Create MatchingRun and MatchingProposal records
    matching_run = MatchingRun(
        institution_id=institution_id,
        scope=scope,
        assignment_type=assignment_type,
        subject_scope=subject_scope,
        capacity_multiplier=capacity_multiplier,
        algorithm_name="hungarian_optimization",
        configuration={
            "students_count": num_students,
            "mentors_count": len(mentors),
            "slots_count": num_slots,
        },
        status="completed",
        created_by_membership_id=requester_membership_id,
        created_at=now_utc(),
    )
    db.add(matching_run)
    db.flush()

    for s_idx, slot_idx in zip(row_ind, col_ind):
        student = students[s_idx]
        mentor, cur_load, eff_cap = expanded_mentor_slots[slot_idx]
        compat = eval_cache[(student.id, mentor.id)]

        proposal = MatchingProposal(
            matching_run_id=matching_run.id,
            student_id=student.id,
            proposed_mentor_membership_id=mentor.id,
            assignment_type=assignment_type,
            subject_scope=subject_scope,
            compatibility_score=compat.score,
            contributing_factors=compat.factors,
            approval_status="pending",
            created_at=now_utc(),
        )
        db.add(proposal)

    db.commit()
    db.refresh(matching_run)
    return matching_run


def approve_matching_proposal(
    db: Session,
    proposal_id: str,
    reviewer_membership_id: str,
    decision_reason: Optional[str] = "Approved by institutional staff",
) -> MentorAssignment:
    """
    Approves a matching proposal and creates the official MentorAssignment record.
    Server-side enforcement:
    - If PRIMARY: deactivates any existing active Primary Mentor assignment for the student.
    - If SUBJECT: permits multiple Subject Mentors with distinct subject scopes.
    """
    proposal = db.query(MatchingProposal).filter(MatchingProposal.id == proposal_id).first()
    if not proposal:
        raise ValueError(f"Matching proposal {proposal_id} not found.")

    if proposal.approval_status != "pending":
        raise ValueError(f"Matching proposal has already been {proposal.approval_status}.")

    institution_id = proposal.matching_run.institution_id

    # If primary assignment, deactivate existing primary mentor
    if proposal.assignment_type == "primary":
        existing_primary = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.institution_id == institution_id,
                MentorAssignment.student_id == proposal.student_id,
                MentorAssignment.assignment_type == "primary",
                MentorAssignment.status == "active",
            )
            .all()
        )
        for ep in existing_primary:
            ep.status = "replaced"
            ep.ended_at = now_utc()

    # Create official assignment
    new_assignment = MentorAssignment(
        institution_id=institution_id,
        student_id=proposal.student_id,
        mentor_membership_id=proposal.proposed_mentor_membership_id,
        assignment_type=proposal.assignment_type,
        subject_scope=proposal.subject_scope,
        assigned_by_membership_id=reviewer_membership_id,
        status="active",
        reason=f"Approved matching proposal {proposal.id}: {decision_reason}",
        assigned_at=now_utc(),
    )
    db.add(new_assignment)

    proposal.approval_status = "approved"
    proposal.reviewed_by_membership_id = reviewer_membership_id
    proposal.reviewed_at = now_utc()
    proposal.decision_reason = decision_reason

    db.commit()
    db.refresh(new_assignment)
    return new_assignment


def reject_matching_proposal(
    db: Session,
    proposal_id: str,
    reviewer_membership_id: str,
    decision_reason: str,
) -> MatchingProposal:
    proposal = db.query(MatchingProposal).filter(MatchingProposal.id == proposal_id).first()
    if not proposal:
        raise ValueError(f"Matching proposal {proposal_id} not found.")

    proposal.approval_status = "rejected"
    proposal.reviewed_by_membership_id = reviewer_membership_id
    proposal.reviewed_at = now_utc()
    proposal.decision_reason = decision_reason

    db.commit()
    db.refresh(proposal)
    return proposal
