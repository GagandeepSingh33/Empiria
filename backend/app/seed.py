import uuid
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import (
    Institution,
    InstitutionSettings,
    InstitutionLicence,
    Account,
    InstitutionMembership,
    MembershipRole,
    OrgNode,
    Programme,
    Cohort,
    StudentProfile,
    CohortMembership,
    CompetencyFramework,
    FrameworkVersion,
    FrameworkCompetency,
    CompetencyLevel,
    CompetencyThreshold,
    AssessmentFamily,
    AssessmentForm,
    AssessmentItem,
    AssessmentItemOption,
    AssessmentFormItem,
    AssessmentAttempt,
    AssessmentResponse,
    AssessmentResult,
    ResultCompetency,
    EvidenceItem,
    EvidenceCompetency,
    ActivityCatalogue,
    ActivityCompetency,
    ActivityResource,
    SupportQueue,
    SupportRequest,
    InterventionRecord,
    AuditEvent,
    MentorAssignment,
    Conversation,
    ConversationParticipant,
    ConversationMessage,
    Notification,
    CoCurricularActivity,
    CoCurricularEnrollment,
    ActivityPracticeSession,
    ActivityEvidenceItem,
)
from app.security import hash_password
from app.domain.diagnosis import run_deterministic_diagnosis
from app.domain.planning import generate_development_plan
from app.domain.progress import compute_progress_comparison


def seed_mentorship_and_messaging(db: Session, inst_id: str) -> None:
    # Check if mentor assignments already exist for this institution
    if db.query(MentorAssignment).filter(MentorAssignment.institution_id == inst_id).count() > 0:
        return

    prof_1 = db.query(StudentProfile).filter(
        StudentProfile.institution_id == inst_id,
        StudentProfile.email == "student@apex.edu",
    ).first()

    mem_admin = db.query(InstitutionMembership).join(Account).filter(
        InstitutionMembership.institution_id == inst_id,
        Account.email == "admin@apex.edu",
    ).first()

    mem_mentor = db.query(InstitutionMembership).join(Account).filter(
        InstitutionMembership.institution_id == inst_id,
        Account.email == "mentor@apex.edu",
    ).first()

    mem_faculty = db.query(InstitutionMembership).join(Account).filter(
        InstitutionMembership.institution_id == inst_id,
        Account.email == "faculty@apex.edu",
    ).first()

    mem_student_1 = db.query(InstitutionMembership).join(Account).filter(
        InstitutionMembership.institution_id == inst_id,
        Account.email == "student@apex.edu",
    ).first()

    if not (prof_1 and mem_mentor and mem_faculty and mem_admin and mem_student_1):
        return

    now = datetime.now(timezone.utc)

    # 1. Primary Mentor assignment (Rajesh Verma)
    primary_assign = MentorAssignment(
        institution_id=inst_id,
        student_id=prof_1.id,
        mentor_membership_id=mem_mentor.id,
        assignment_type="primary",
        subject_scope="General Capability & Career Direction",
        assigned_by_membership_id=mem_admin.id,
        status="active",
        reason="Assigned as designated Primary Mentor for B.Tech CSE Cohort 2026",
        assigned_at=now - timedelta(days=30),
    )
    db.add(primary_assign)

    # 2. Subject Mentor assignment (Prof. Sunita Rao - SQL)
    sql_assign = MentorAssignment(
        institution_id=inst_id,
        student_id=prof_1.id,
        mentor_membership_id=mem_faculty.id,
        assignment_type="subject",
        subject_scope="SQL",
        assigned_by_membership_id=mem_admin.id,
        status="active",
        reason="Assigned for SQL queries, window functions, and relational schema modeling support",
        assigned_at=now - timedelta(days=20),
    )
    db.add(sql_assign)
    db.flush()

    # 3. Seed a bidirectional conversation on SQL
    conv = Conversation(
        institution_id=inst_id,
        student_profile_id=prof_1.id,
        created_by_membership_id=mem_student_1.id,
        mentor_assignment_id=sql_assign.id,
        conversation_kind="subject_mentoring",
        subject="Query regarding Window Functions and Aggregations in SQL",
        subject_scope="SQL",
        status="open",
        created_at=now - timedelta(hours=3),
        updated_at=now - timedelta(hours=1),
        last_message_at=now - timedelta(hours=1),
    )
    db.add(conv)
    db.flush()

    # Participants
    part_student = ConversationParticipant(
        institution_id=inst_id,
        conversation_id=conv.id,
        membership_id=mem_student_1.id,
        participant_kind="student",
        status="active",
        joined_at=now - timedelta(hours=3),
        last_read_at=now - timedelta(hours=2),
    )
    part_mentor = ConversationParticipant(
        institution_id=inst_id,
        conversation_id=conv.id,
        membership_id=mem_faculty.id,
        participant_kind="subject_mentor",
        status="active",
        joined_at=now - timedelta(hours=3),
        last_read_at=now - timedelta(hours=1),
    )
    db.add_all([part_student, part_mentor])
    db.flush()

    # Message 1 from Student
    msg1 = ConversationMessage(
        institution_id=inst_id,
        conversation_id=conv.id,
        sender_membership_id=mem_student_1.id,
        body="Hello Prof. Rao, during the Stage 1 baseline assessment on SQL window functions, I was unsure about the performance impact of PARTITION BY vs GROUP BY on large datasets. Could you explain the key difference?",
        created_at=now - timedelta(hours=3),
    )
    # Message 2 reply from Subject Mentor
    msg2 = ConversationMessage(
        institution_id=inst_id,
        conversation_id=conv.id,
        sender_membership_id=mem_faculty.id,
        body="Hello Aarav! Great question. GROUP BY collapses multiple rows into a single summary row per group, whereas PARTITION BY computes aggregate values across a window of rows while retaining every individual row in the result set. For ranking and running totals, PARTITION BY is essential.",
        created_at=now - timedelta(hours=1),
    )
    db.add_all([msg1, msg2])
    db.flush()

    # 3b. Seed a bidirectional conversation with Primary Mentor (Dr. Rajesh Verma)
    conv_primary = Conversation(
        institution_id=inst_id,
        student_profile_id=prof_1.id,
        created_by_membership_id=mem_mentor.id,
        mentor_assignment_id=primary_assign.id,
        conversation_kind="primary_mentoring",
        subject="Longitudinal Capability Progression & Semester 4 Milestones",
        subject_scope="General Capability & Career Direction",
        status="open",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(hours=4),
        last_message_at=now - timedelta(hours=4),
    )
    db.add(conv_primary)
    db.flush()

    part_p_mentor = ConversationParticipant(
        institution_id=inst_id,
        conversation_id=conv_primary.id,
        membership_id=mem_mentor.id,
        participant_kind="primary_mentor",
        status="active",
        joined_at=now - timedelta(days=2),
        last_read_at=now - timedelta(hours=4),
    )
    part_p_student = ConversationParticipant(
        institution_id=inst_id,
        conversation_id=conv_primary.id,
        membership_id=mem_student_1.id,
        participant_kind="student",
        status="active",
        joined_at=now - timedelta(days=2),
        last_read_at=now - timedelta(days=1),
    )
    db.add_all([part_p_mentor, part_p_student])
    db.flush()

    p_msg1 = ConversationMessage(
        institution_id=inst_id,
        conversation_id=conv_primary.id,
        sender_membership_id=mem_mentor.id,
        body="Hi Aarav, welcome to Semester 4! I reviewed your diagnostic assessment results. Your baseline is strong at 68%, but we should schedule a quick sync to review your SQL tuning gaps and personal development plan milestones.",
        created_at=now - timedelta(days=2),
    )
    p_msg2 = ConversationMessage(
        institution_id=inst_id,
        conversation_id=conv_primary.id,
        sender_membership_id=mem_student_1.id,
        body="Thank you Dr. Verma! I have drafted my target practice plan and would love to review the milestone timeline with you during office hours this week.",
        created_at=now - timedelta(hours=4),
    )
    db.add_all([p_msg1, p_msg2])
    db.flush()

    # 4. In-App Notification for Student (Unread reply from mentor)
    notif = Notification(
        institution_id=inst_id,
        recipient_membership_id=mem_student_1.id,
        notification_type="message_received",
        conversation_id=conv.id,
        message_id=msg2.id,
        title="New reply from Prof. Sunita Rao in 'Query regarding Window Functions and Aggregations in SQL'",
        event_key=f"seed-msg-{msg2.id}",
        is_read=False,
        created_at=now - timedelta(hours=1),
    )
    db.add(notif)
    db.commit()
    print("Mentorship, conversations, and notifications seeded successfully!")


def seed_licences(db: Session) -> None:
    now = datetime.now(timezone.utc)
    institutions = db.query(Institution).all()
    for inst in institutions:
        existing = db.query(InstitutionLicence).filter(InstitutionLicence.institution_id == inst.id).first()
        if not existing:
            lic = InstitutionLicence(
                institution_id=inst.id,
                plan_tier="enterprise" if inst.slug == "apex-tech" else "standard",
                status="active",
                max_students=1000 if inst.slug == "apex-tech" else 500,
                max_mentors=100 if inst.slug == "apex-tech" else 50,
                permitted_features=[
                    "basic_analytics",
                    "attendance_tracking",
                    "mentor_matching",
                    "academic_interventions",
                    "ai_risk_scoring",
                    "export_api",
                ],
                starts_at=now,
                expires_at=now + timedelta(days=365),
            )
            db.add(lic)
    db.commit()


def seed_cocurricular_pathways(db: Session, inst_id: str) -> None:
    if db.query(CoCurricularActivity).filter(CoCurricularActivity.institution_id == inst_id).count() > 0:
        return

    activities_data = [
        {
            "category": "sports_racquet",
            "name": "Competitive Tennis (Singles & Footwork Drills)",
            "slug": "tennis-singles",
            "description": "Foundational stroke biomechanics, lateral footwork agility, and match strategy.",
            "supported_modalities": ["video_upload", "camera"],
        },
        {
            "category": "creative_music",
            "name": "Vocal Jazz & Contemporary Singing",
            "slug": "vocal-jazz",
            "description": "Interval accuracy, diaphragm breath support, modal resonance, and phrasing repertoire.",
            "supported_modalities": ["audio", "microphone"],
        },
        {
            "category": "esports_gaming",
            "name": "Esports Rocket League Competitive Strategy",
            "slug": "rocket-league",
            "description": "Fast aerial mechanics, rotation positioning, boost conservation, and team communication.",
            "supported_modalities": ["video_upload", "screen_capture"],
        },
        {
            "category": "digital_practical_skills",
            "name": "Modern Web Engineering & UI Craft",
            "slug": "practical-web-dev",
            "description": "TypeScript component architecture, responsive editorial styling, and accessible user flows.",
            "supported_modalities": ["code", "text"],
        },
    ]

    for item in activities_data:
        act = CoCurricularActivity(
            institution_id=inst_id,
            category=item["category"],
            name=item["name"],
            slug=item["slug"],
            description=item["description"],
            supported_modalities=item["supported_modalities"],
            is_active=True,
        )
        db.add(act)
    db.commit()


def seed_database(db: Session | None = None, force: bool = False) -> None:
    close_at_end = False
    if force:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_at_end = True

    try:
        # Check if already seeded
        inst_apex = db.query(Institution).filter(Institution.slug == "apex-tech").first()
        if not force and inst_apex:
            seed_mentorship_and_messaging(db, inst_apex.id)
            seed_licences(db)
            seed_cocurricular_pathways(db, inst_apex.id)
            print("Database already seeded. Mentorship, licences, and co-curricular pathways verified.")
            return

        print("Seeding EMPIRIA with synthetic demonstration data...")

        # ---------------------------------------------------------------------
        # 1. Institutions
        # ---------------------------------------------------------------------
        inst_a = Institution(
            slug="apex-tech",
            name="Apex Institute of Technology",
            status="active",
            approved_at=datetime.now(timezone.utc),
        )
        inst_b = Institution(
            slug="beacon-univ",
            name="Beacon University",
            status="active",
            approved_at=datetime.now(timezone.utc),
        )
        db.add_all([inst_a, inst_b])
        db.flush()

        settings_a = InstitutionSettings(
            institution_id=inst_a.id,
            display_name="Apex Institute of Technology",
            branding={"primary_color": "#0d9488", "theme": "system"},
            min_cohort_threshold=5,
        )
        settings_b = InstitutionSettings(
            institution_id=inst_b.id,
            display_name="Beacon University",
            branding={"primary_color": "#2563eb", "theme": "system"},
            min_cohort_threshold=5,
        )
        db.add_all([settings_a, settings_b])
        db.flush()

        # ---------------------------------------------------------------------
        # 2. Accounts & Memberships
        # ---------------------------------------------------------------------
        # VoidSpire (Platform Super Admin)
        acc_super = Account(
            email="gagandeep1102005@gmail.com",
            password_hash=hash_password("VoidSpire2026!"),
            display_name="VoidSpire (Super Admin)",
            status="active",
            is_super_admin=True,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Admin
        acc_admin_a = Account(
            email="admin@apex.edu",
            password_hash=hash_password("AdminPass123!"),
            display_name="Dr. Alok Verma (Admin)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Faculty / Assessor
        acc_faculty_a = Account(
            email="faculty@apex.edu",
            password_hash=hash_password("FacultyPass123!"),
            display_name="Prof. Sunita Rao (Faculty)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Mentor / Advisor
        acc_mentor_a = Account(
            email="mentor@apex.edu",
            password_hash=hash_password("MentorPass123!"),
            display_name="Vikram Joshi (Mentor)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Data Operator
        acc_operator_a = Account(
            email="operator@apex.edu",
            password_hash=hash_password("OperatorPass123!"),
            display_name="Kavita Iyer (Data Ops)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Student 1 (Aarav Sharma)
        acc_student_1 = Account(
            email="student@apex.edu",
            password_hash=hash_password("StudentPass123!"),
            display_name="Aarav Sharma (Student)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst A Student 2 (Priya Patel)
        acc_student_2 = Account(
            email="student2@apex.edu",
            password_hash=hash_password("StudentPass123!"),
            display_name="Priya Patel (Student)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        # Inst B Admin & Student (For Negative Multi-Tenant Isolation Tests)
        acc_admin_b = Account(
            email="admin@beacon.edu",
            password_hash=hash_password("BeaconPass123!"),
            display_name="Dean Charles (Beacon Admin)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )
        acc_student_b = Account(
            email="student@beacon.edu",
            password_hash=hash_password("BeaconPass123!"),
            display_name="David Miller (Beacon Student)",
            status="active",
            is_super_admin=False,
            email_verified_at=datetime.now(timezone.utc),
        )

        db.add_all([
            acc_super,
            acc_admin_a,
            acc_faculty_a,
            acc_mentor_a,
            acc_operator_a,
            acc_student_1,
            acc_student_2,
            acc_admin_b,
            acc_student_b,
        ])
        db.flush()

        def create_membership(inst_id: str, acc_id: str, role_names: list[str]) -> InstitutionMembership:
            m = InstitutionMembership(institution_id=inst_id, account_id=acc_id, status="active")
            db.add(m)
            db.flush()
            for r in role_names:
                db.add(MembershipRole(institution_id=inst_id, membership_id=m.id, role=r))
            return m

        mem_super = create_membership(inst_a.id, acc_super.id, ["institution_admin", "student"])
        mem_admin_a = create_membership(inst_a.id, acc_admin_a.id, ["institution_admin"])
        mem_faculty_a = create_membership(inst_a.id, acc_faculty_a.id, ["faculty_assessor"])
        mem_mentor_a = create_membership(inst_a.id, acc_mentor_a.id, ["mentor_advisor"])
        mem_operator_a = create_membership(inst_a.id, acc_operator_a.id, ["data_operator"])
        mem_student_1 = create_membership(inst_a.id, acc_student_1.id, ["student"])
        mem_student_2 = create_membership(inst_a.id, acc_student_2.id, ["student"])

        mem_admin_b = create_membership(inst_b.id, acc_admin_b.id, ["institution_admin"])
        mem_student_b = create_membership(inst_b.id, acc_student_b.id, ["student"])

        # ---------------------------------------------------------------------
        # 3. Flexible Hierarchy & Student Profiles
        # ---------------------------------------------------------------------
        dept_cse = OrgNode(institution_id=inst_a.id, node_type="department", name="Computer Science and Engineering")
        db.add(dept_cse)
        db.flush()

        prog_cse = Programme(
            institution_id=inst_a.id,
            org_node_id=dept_cse.id,
            name="B.Tech Computer Science and Engineering",
            code="CSE-BTECH",
            description="4-year Undergraduate Programme in Computer Science",
        )
        db.add(prog_cse)
        db.flush()

        cohort_2026 = Cohort(
            institution_id=inst_a.id,
            programme_id=prog_cse.id,
            name="2026 Batch - Section A",
            start_date=date(2022, 8, 1),
            end_date=date(2026, 6, 30),
        )
        db.add(cohort_2026)
        db.flush()

        # Profiles
        prof_1 = StudentProfile(
            institution_id=inst_a.id,
            account_id=acc_student_1.id,
            membership_id=mem_student_1.id,
            student_identifier="APEX-CSE-2026-001",
            first_name="Aarav",
            last_name="Sharma",
            email="student@apex.edu",
            status="active",
        )
        prof_2 = StudentProfile(
            institution_id=inst_a.id,
            account_id=acc_student_2.id,
            membership_id=mem_student_2.id,
            student_identifier="APEX-CSE-2026-002",
            first_name="Priya",
            last_name="Patel",
            email="student2@apex.edu",
            status="active",
        )
        prof_b = StudentProfile(
            institution_id=inst_b.id,
            account_id=acc_student_b.id,
            membership_id=mem_student_b.id,
            student_identifier="BEACON-CS-101",
            first_name="David",
            last_name="Miller",
            email="student@beacon.edu",
            status="active",
        )
        db.add_all([prof_1, prof_2, prof_b])
        db.flush()

        db.add(CohortMembership(institution_id=inst_a.id, student_id=prof_1.id, cohort_id=cohort_2026.id))
        db.add(CohortMembership(institution_id=inst_a.id, student_id=prof_2.id, cohort_id=cohort_2026.id))

        # Add additional synthetic roster students to meet reporting threshold (>= 5)
        for i in range(3, 8):
            sp = StudentProfile(
                institution_id=inst_a.id,
                student_identifier=f"APEX-CSE-2026-00{i}",
                first_name=f"Student{i}",
                last_name="Kumar",
                email=f"student{i}@apex.edu",
                status="active",
            )
            db.add(sp)
            db.flush()
            db.add(CohortMembership(institution_id=inst_a.id, student_id=sp.id, cohort_id=cohort_2026.id))

        # ---------------------------------------------------------------------
        # 4. Competency Framework (Configurable Data-Driven)
        # ---------------------------------------------------------------------
        fw = CompetencyFramework(
            institution_id=inst_a.id,
            key="data-analyst-core",
            name="Data Analyst Competency Framework",
            description="Institutional framework for University CSE students developing data analysis capabilities.",
        )
        db.add(fw)
        db.flush()

        fw_ver = FrameworkVersion(
            institution_id=inst_a.id,
            framework_id=fw.id,
            version_number=1,
            rule_set_version="empiria_rules_v1",
            status="published",
            published_at=datetime.now(timezone.utc),
            published_by_membership_id=mem_admin_a.id,
        )
        db.add(fw_ver)
        db.flush()

        competencies_data = [
            ("sql", "SQL", "Relational database querying, multi-table joins, subqueries and aggregations", 1),
            ("python-manipulation", "Python and Data Manipulation", "Data structures, pandas operations, vectorized computations and ETL workflows", 2),
            ("statistics", "Statistics", "Descriptive statistics, probability distributions, hypothesis testing and variance analysis", 3),
            ("data-cleaning", "Data Cleaning", "Handling missing values, deduplication, schema normalization, outlier detection and parsing", 4),
            ("data-visualisation", "Data Visualisation", "Chart selection, perceptual encoding, dashboard design and exploratory visual analytics", 5),
            ("analytical-reasoning", "Analytical Reasoning", "Problem decomposition, metric definition, causal hygiene and insight derivation", 6),
            ("communication-findings", "Communication of Findings", "Executive synthesis, technical reporting, structured arguments and actionable proposals", 7),
        ]

        comp_entities = []
        for ckey, cname, cdesc, order in competencies_data:
            fc = FrameworkCompetency(
                institution_id=inst_a.id,
                framework_version_id=fw_ver.id,
                competency_key=ckey,
                name=cname,
                description=cdesc,
                display_order=order,
            )
            db.add(fc)
            db.flush()
            comp_entities.append(fc)

            # Add 4 ordered levels for each competency
            lvl_data = [
                ("L1", 1, "Foundational", f"Understands fundamental syntax and basic concepts of {cname}.", 40.0),
                ("L2", 2, "Developing", f"Solves guided problems with moderate complexity in {cname}.", 60.0),
                ("L3", 3, "Competent", f"Autonomously applies {cname} to solve realistic analytical problems.", 75.0),
                ("L4", 4, "Advanced", f"Optimizes workflows, designs complex solutions and mentors peers in {cname}.", 90.0),
            ]
            for lcode, rank, llabel, ldesc, min_score in lvl_data:
                lvl = CompetencyLevel(
                    institution_id=inst_a.id,
                    competency_id=fc.id,
                    level_code=lcode,
                    rank=rank,
                    label=llabel,
                    descriptor=ldesc,
                )
                db.add(lvl)
                db.flush()

                db.add(
                    CompetencyThreshold(
                        institution_id=inst_a.id,
                        competency_id=fc.id,
                        level_id=lvl.id,
                        required_method="any",
                        min_evidence_count=1,
                        min_score=min_score,
                    )
                )

        # ---------------------------------------------------------------------
        # 5. Assessment Forms (Baseline & Follow-up)
        # ---------------------------------------------------------------------
        fam = AssessmentFamily(
            institution_id=inst_a.id,
            key="da-pathway-family",
            name="Data Analyst Core Assessment Family",
        )
        db.add(fam)
        db.flush()

        form_baseline = AssessmentForm(
            institution_id=inst_a.id,
            family_id=fam.id,
            framework_version_id=fw_ver.id,
            code="DA-BASE-01",
            title="Data Analyst Baseline Diagnostic Assessment",
            description="Comprehensive objective evaluation across 7 core competencies to establish initial baseline.",
            assessment_type="baseline",
            status="published",
            comparability_state="declared_equivalent",
            comparability_note="Standardized 7-item objective diagnostic form covering foundational to competent levels.",
            time_limit_minutes=45,
            max_attempts=2,
            published_at=datetime.now(timezone.utc),
        )
        form_followup = AssessmentForm(
            institution_id=inst_a.id,
            family_id=fam.id,
            framework_version_id=fw_ver.id,
            code="DA-FOL-01",
            title="Data Analyst Follow-up Verification Assessment",
            description="Parallel form targeting competency development verification post-intervention.",
            assessment_type="follow_up",
            status="published",
            comparability_state="declared_equivalent",
            comparability_note="Psychometrically matched parallel form evaluating identical competencies.",
            time_limit_minutes=45,
            max_attempts=2,
            published_at=datetime.now(timezone.utc),
        )
        db.add_all([form_baseline, form_followup])
        db.flush()

        # Questions for baseline form
        baseline_questions = [
            (
                "sql",
                "SQL-B1",
                "Which SQL clause is executed immediately after FROM and JOIN in standard relational query processing?",
                "single_choice",
                10.0,
                {"correct_option": "B"},
                [("A", "SELECT"), ("B", "WHERE"), ("C", "HAVING"), ("D", "ORDER BY")],
            ),
            (
                "python-manipulation",
                "PY-B1",
                "In pandas, what is the most memory-efficient method to filter DataFrame 'df' for rows where column 'age' > 25?",
                "single_choice",
                10.0,
                {"correct_option": "C"},
                [("A", "df.apply(lambda row: row['age'] > 25)"), ("B", "for i in range(len(df)): ..."), ("C", "df[df['age'] > 25]"), ("D", "df.to_dict()")],
            ),
            (
                "statistics",
                "STAT-B1",
                "Under what condition is the sample median preferred over the sample mean as a measure of central tendency?",
                "single_choice",
                10.0,
                {"correct_option": "A"},
                [("A", "When the distribution is heavily skewed or contains extreme outliers"), ("B", "When the data strictly follows a normal distribution"), ("C", "When the sample size N > 10,000"), ("D", "Only for categorical variables")],
            ),
            (
                "data-cleaning",
                "CLN-B1",
                "When handling missing data in a longitudinal dataset, what does MCAR (Missing Completely at Random) imply?",
                "single_choice",
                10.0,
                {"correct_option": "D"},
                [("A", "Missingness depends on unobserved values"), ("B", "Missingness is caused by software crashes"), ("C", "Missingness correlates with student grade"), ("D", "Probability of missingness is unrelated to observed or unobserved data")],
            ),
            (
                "data-visualisation",
                "VIS-B1",
                "Which perceptual visual encoding channel is ranked highest in human visual decoding accuracy according to Cleveland & McGill?",
                "single_choice",
                10.0,
                {"correct_option": "A"},
                [("A", "Position along a common scale"), ("B", "Area"), ("C", "Color saturation"), ("D", "Volume")],
            ),
            (
                "analytical-reasoning",
                "REA-B1",
                "A metric shows that website bounce rate decreased by 40% immediately after removing the analytics tracking pixel. What is the sound analytical conclusion?",
                "single_choice",
                10.0,
                {"correct_option": "B"},
                [("A", "User engagement improved dramatically"), ("B", "The measurement mechanism was broken, leading to instrumentation artifact"), ("C", "Server response time decreased"), ("D", "A/B test proved success")],
            ),
            (
                "communication-findings",
                "COM-B1",
                "When presenting analytical results to executive stakeholders, what structure produces the highest decision clarity?",
                "single_choice",
                10.0,
                {"correct_option": "C"},
                [("A", "Chronological diary of all SQL queries executed"), ("B", "Raw code notebooks with 50 unlabelled charts"), ("C", "Key finding/recommendation first (Minto Pyramid), supported by concise evidence"), ("D", "Technical jargon and mathematical proofs")],
            ),
        ]

        for ckey, code, prompt, itype, pts, akey, opts in baseline_questions:
            comp = next(c for c in comp_entities if c.competency_key == ckey)
            item = AssessmentItem(
                institution_id=inst_a.id,
                framework_version_id=fw_ver.id,
                competency_id=comp.id,
                code=code,
                prompt=prompt,
                item_type=itype,
                points=pts,
                answer_key=akey,
                explanation="Standard objective assessment item.",
            )
            db.add(item)
            db.flush()

            for order, (okey, otext) in enumerate(opts, start=1):
                db.add(
                    AssessmentItemOption(
                        institution_id=inst_a.id,
                        item_id=item.id,
                        option_key=okey,
                        option_text=otext,
                        display_order=order,
                    )
                )

            db.add(
                AssessmentFormItem(
                    institution_id=inst_a.id,
                    form_id=form_baseline.id,
                    item_id=item.id,
                    display_order=comp.display_order,
                    weight=1.0,
                )
            )

        # Questions for follow-up form (Parallel items)
        followup_questions = [
            (
                "sql",
                "SQL-F1",
                "What is the key difference between WHERE and HAVING in a SQL aggregation query?",
                "single_choice",
                10.0,
                {"correct_option": "B"},
                [("A", "They are completely interchangeable"), ("B", "WHERE filters individual rows before grouping; HAVING filters grouped rows after aggregation"), ("C", "WHERE only works on strings"), ("D", "HAVING cannot use comparison operators")],
            ),
            (
                "python-manipulation",
                "PY-F1",
                "In pandas, which operation correctly computes group-wise summary statistics without modifying the original DataFrame?",
                "single_choice",
                10.0,
                {"correct_option": "A"},
                [("A", "df.groupby('category').agg({'sales': 'sum', 'profit': 'mean'})"), ("B", "df.sort_values('category')"), ("C", "df.drop_duplicates()"), ("D", "df.fillna(0)")],
            ),
            (
                "statistics",
                "STAT-F1",
                "In statistical hypothesis testing, what does a p-value less than alpha (0.05) indicate?",
                "single_choice",
                10.0,
                {"correct_option": "C"},
                [("A", "The null hypothesis is 100% true"), ("B", "The research hypothesis is guaranteed to be correct"), ("C", "Evidence is strong enough to reject the null hypothesis at the specified significance level"), ("D", "Data contains zero measurement error")],
            ),
            (
                "data-cleaning",
                "CLN-F1",
                "What is the recommended robust technique for handling extreme multivariate outliers in tabular datasets?",
                "single_choice",
                10.0,
                {"correct_option": "B"},
                [("A", "Delete all rows with any missing value"), ("B", "Inspect distribution, apply IQR capping or robust distance metrics (Mahalanobis) and document rationale"), ("C", "Replace all values with 0"), ("D", "Ignore outliers completely")],
            ),
            (
                "data-visualisation",
                "VIS-F1",
                "When visualizing change over continuous time for multiple distinct series, which chart type is most appropriate?",
                "single_choice",
                10.0,
                {"correct_option": "C"},
                [("A", "3D Pie Chart"), ("B", "Radar Chart"), ("C", "Multi-series Line Chart with distinct perceptual markers"), ("D", "Concentric Donut Chart")],
            ),
            (
                "analytical-reasoning",
                "REA-F1",
                "When examining a correlation of r = 0.85 between ice cream sales and shark attacks, what is the sound analytical explanation?",
                "single_choice",
                10.0,
                {"correct_option": "D"},
                [("A", "Ice cream causes sharks to attack"), ("B", "Sharks attract ice cream vendors"), ("C", "Data is fraudulent"), ("D", "Confounding variable: warmer summer weather increases both beach visits and ice cream consumption")],
            ),
            (
                "communication-findings",
                "COM-F1",
                "What is the primary function of an executive summary in an analytical intelligence deliverable?",
                "single_choice",
                10.0,
                {"correct_option": "A"},
                [("A", "Concisely state the core problem, key evidence-backed finding, and decision options with expected trade-offs"), ("B", "List the software version of Python used"), ("C", "Include 100 pages of raw SQL logs"), ("D", "Hide all uncertainties and limitations")],
            ),
        ]

        for ckey, code, prompt, itype, pts, akey, opts in followup_questions:
            comp = next(c for c in comp_entities if c.competency_key == ckey)
            item = AssessmentItem(
                institution_id=inst_a.id,
                framework_version_id=fw_ver.id,
                competency_id=comp.id,
                code=code,
                prompt=prompt,
                item_type=itype,
                points=pts,
                answer_key=akey,
                explanation="Standard parallel objective assessment item.",
            )
            db.add(item)
            db.flush()

            for order, (okey, otext) in enumerate(opts, start=1):
                db.add(
                    AssessmentItemOption(
                        institution_id=inst_a.id,
                        item_id=item.id,
                        option_key=okey,
                        option_text=otext,
                        display_order=order,
                    )
                )

            db.add(
                AssessmentFormItem(
                    institution_id=inst_a.id,
                    form_id=form_followup.id,
                    item_id=item.id,
                    display_order=comp.display_order,
                    weight=1.0,
                )
            )

        # ---------------------------------------------------------------------
        # 6. Curated Activity Catalogue
        # ---------------------------------------------------------------------
        activities_data = [
            (
                "act-sql-joins",
                "Advanced Relational Joins & Subqueries Lab",
                "Hands-on exercise implementing multi-table inner, left, and full outer joins, window functions, and CTEs.",
                "practice_exercise",
                "Complete the 5 problem statements and verify expected query outputs against test datasets.",
                "self_check",
                3.0,
                "sql",
                [
                    ("PostgreSQL SELECT Documentation", "https://www.postgresql.org/docs/current/sql-select.html", "documentation"),
                    ("SQL Window Functions Tutorial", "https://mode.com/sql-tutorial/sql-window-functions/", "tutorial"),
                ],
            ),
            (
                "act-python-pandas",
                "Pandas Data Wrangling & Vectorized Computations",
                "Structured laboratory notebook covering groupby aggregations, pivot tables, and efficient column transformations.",
                "guided_project",
                "Execute the complete data transformation pipeline and generate the summary dataframe.",
                "self_check",
                4.0,
                "python-manipulation",
                [
                    ("Pandas User Guide", "https://pandas.pydata.org/docs/user_guide/index.html", "documentation"),
                    ("Vectorized String Methods", "https://pandas.pydata.org/docs/user_guide/text.html", "tutorial"),
                ],
            ),
            (
                "act-data-cleaning",
                "Real-World Data Cleaning & Schema Normalization",
                "Diagnose corrupt sensor timestamps, deduplicate customer records, and handle missing values systematically.",
                "case_study",
                "Produce a clean dataset meeting the target schema with a documented cleaning audit trail.",
                "self_check",
                3.5,
                "data-cleaning",
                [
                    ("Data Cleaning Best Practices", "https://towardsdatascience.com/the-ultimate-guide-to-data-cleaning-3969843991d4", "tutorial"),
                ],
            ),
            (
                "act-stats-testing",
                "Statistical Hypothesis Testing & A/B Analysis",
                "Formulate null hypotheses, calculate t-statistics and p-values, and interpret confidence intervals with causal hygiene.",
                "practice_exercise",
                "Complete hypothesis calculations for the provided experiment scenarios and document conclusions.",
                "self_check",
                2.5,
                "statistics",
                [
                    ("OpenIntro Statistics Text", "https://www.openintro.org/book/os/", "documentation"),
                ],
            ),
            (
                "act-data-viz",
                "Perceptual Visual Analytics & Dashboard Composition",
                "Design exploratory visualizations utilizing appropriate visual encodings, color palettes, and interactive filters.",
                "guided_project",
                "Submit visual artifacts adhering to Cleveland-McGill perceptual guidelines.",
                "self_check",
                3.0,
                "data-visualisation",
                [
                    ("Data Visualization Catalogue", "https://datavizcatalogue.com/", "documentation"),
                ],
            ),
        ]

        for akey, atitle, adesc, atype, acrit, aeval, adur, ckey, rlist in activities_data:
            act = ActivityCatalogue(
                institution_id=inst_a.id,
                key=akey,
                title=atitle,
                description=adesc,
                activity_type=atype,
                completion_criteria=acrit,
                evaluation_method=aeval,
                estimated_duration_hours=adur,
                status="published",
            )
            db.add(act)
            db.flush()

            comp = next(c for c in comp_entities if c.competency_key == ckey)
            db.add(
                ActivityCompetency(
                    institution_id=inst_a.id,
                    activity_id=act.id,
                    competency_id=comp.id,
                    target_level_rank=3,
                )
            )

            for rtitle, rurl, rtype in rlist:
                db.add(
                    ActivityResource(
                        institution_id=inst_a.id,
                        activity_id=act.id,
                        title=rtitle,
                        url=rurl,
                        resource_type=rtype,
                    )
                )

        # ---------------------------------------------------------------------
        # 7. Support Queue & Sample Request
        # ---------------------------------------------------------------------
        sq = SupportQueue(
            institution_id=inst_a.id,
            name="Academic Advising & Mentorship Queue",
            description="Default institutional triage queue for students seeking capability development guidance.",
            default_assignee_membership_id=mem_mentor_a.id,
            is_active=True,
        )
        db.add(sq)
        db.flush()

        sreq = SupportRequest(
            institution_id=inst_a.id,
            student_id=prof_1.id,
            queue_id=sq.id,
            assigned_staff_membership_id=mem_mentor_a.id,
            subject="Guidance needed on SQL window functions and multi-table joins",
            message="I completed the baseline diagnostic and identified a gap in SQL. Seeking advice on recommended practice problems.",
            status="resolved",
        )
        db.add(sreq)
        db.flush()

        # Minimal intervention record (Priority 7)
        intervention = InterventionRecord(
            institution_id=inst_a.id,
            student_id=prof_1.id,
            support_request_id=sreq.id,
            responsible_membership_id=mem_mentor_a.id,
            intervention_date=date.today() - timedelta(days=5),
            agreed_actions="Assigned SQL aggregations practice module and scheduled check-in on query execution plans.",
            follow_up_date=date.today() + timedelta(days=7),
            status="active",
            notes="Student motivated; demonstrated good conceptual understanding of basic syntax.",
        )
        db.add(intervention)

        # ---------------------------------------------------------------------
        # 8. Seed Pre-Existing Assessment & Progress Data for Student 1 & 2
        # ---------------------------------------------------------------------
        # Student 1 (Aarav Sharma): Baseline completed with gaps in SQL and Python!
        att_1 = AssessmentAttempt(
            institution_id=inst_a.id,
            student_id=prof_1.id,
            form_id=form_baseline.id,
            attempt_number=1,
            status="finalised",
            started_at=datetime.now(timezone.utc) - timedelta(days=3),
            submitted_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add(att_1)
        db.flush()

        res_1 = AssessmentResult(
            institution_id=inst_a.id,
            student_id=prof_1.id,
            framework_version_id=fw_ver.id,
            source_type="objective_attempt",
            attempt_id=att_1.id,
            total_score=40.0,
            max_possible_score=70.0,
            percentage=57.1,
            assessed_at=datetime.now(timezone.utc) - timedelta(days=3),
            status="finalised",
        )
        db.add(res_1)
        db.flush()

        # Score per competency for student 1 (Gaps in SQL: 40%, Python: 50%, Cleaning: 50%, Stats: 70%, Viz: 80%, Reasoning: 90%, Comm: 90%)
        comp_scores_1 = {
            "sql": 40.0,
            "python-manipulation": 50.0,
            "data-cleaning": 50.0,
            "statistics": 70.0,
            "data-visualisation": 80.0,
            "analytical-reasoning": 90.0,
            "communication-findings": 90.0,
        }

        ev_1 = EvidenceItem(
            institution_id=inst_a.id,
            student_id=prof_1.id,
            framework_version_id=fw_ver.id,
            title="Verified Baseline Assessment (DA-BASE-01)",
            description="Verified score from standardized diagnostic assessment.",
            evidence_status="assessment_verified",
            source_type="assessment_result",
            assessment_result_id=res_1.id,
            verified_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add(ev_1)
        db.flush()

        for c in comp_entities:
            sc = comp_scores_1[c.competency_key]
            db.add(
                ResultCompetency(
                    institution_id=inst_a.id,
                    assessment_result_id=res_1.id,
                    competency_id=c.id,
                    score=sc / 10.0,
                    max_score=10.0,
                    percentage=sc,
                    notes=f"Achieved {sc:.0f}% in {c.name}",
                )
            )
            db.add(
                EvidenceCompetency(
                    institution_id=inst_a.id,
                    evidence_id=ev_1.id,
                    competency_id=c.id,
                    relationship_type="supports",
                )
            )

        db.commit()

        # Run diagnosis & plan for student 1
        det_run_1, diag_run_1 = run_deterministic_diagnosis(
            db=db,
            institution_id=inst_a.id,
            student_id=prof_1.id,
            framework_version_id=fw_ver.id,
        )
        generate_development_plan(
            db=db,
            institution_id=inst_a.id,
            student_id=prof_1.id,
            diagnosis_run_id=diag_run_1.id,
        )

        # ---------------------------------------------------------------------
        # Student 2 (Priya Patel): Both Baseline AND Follow-up completed!
        # Demonstrates verified before-and-after progress!
        # ---------------------------------------------------------------------
        # Baseline for Priya
        att_2_base = AssessmentAttempt(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            form_id=form_baseline.id,
            attempt_number=1,
            status="finalised",
            started_at=datetime.now(timezone.utc) - timedelta(days=14),
            submitted_at=datetime.now(timezone.utc) - timedelta(days=14),
        )
        db.add(att_2_base)
        db.flush()

        res_2_base = AssessmentResult(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            framework_version_id=fw_ver.id,
            source_type="objective_attempt",
            attempt_id=att_2_base.id,
            total_score=35.0,
            max_possible_score=70.0,
            percentage=50.0,
            assessed_at=datetime.now(timezone.utc) - timedelta(days=14),
            status="finalised",
        )
        db.add(res_2_base)
        db.flush()

        ev_2_base = EvidenceItem(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            framework_version_id=fw_ver.id,
            title="Baseline Diagnostic (DA-BASE-01)",
            evidence_status="assessment_verified",
            source_type="assessment_result",
            assessment_result_id=res_2_base.id,
            verified_at=datetime.now(timezone.utc) - timedelta(days=14),
        )
        db.add(ev_2_base)
        db.flush()

        priya_base_scores = {
            "sql": 40.0,
            "python-manipulation": 50.0,
            "data-cleaning": 40.0,
            "statistics": 50.0,
            "data-visualisation": 60.0,
            "analytical-reasoning": 70.0,
            "communication-findings": 60.0,
        }
        for c in comp_entities:
            sc = priya_base_scores[c.competency_key]
            db.add(
                ResultCompetency(
                    institution_id=inst_a.id,
                    assessment_result_id=res_2_base.id,
                    competency_id=c.id,
                    score=sc / 10.0,
                    max_score=10.0,
                    percentage=sc,
                )
            )
            db.add(
                EvidenceCompetency(
                    institution_id=inst_a.id,
                    evidence_id=ev_2_base.id,
                    competency_id=c.id,
                    relationship_type="supports",
                )
            )

        # Follow-up for Priya (Completed post practice activities with improvement!)
        att_2_fol = AssessmentAttempt(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            form_id=form_followup.id,
            attempt_number=1,
            status="finalised",
            started_at=datetime.now(timezone.utc) - timedelta(days=2),
            submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(att_2_fol)
        db.flush()

        res_2_fol = AssessmentResult(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            framework_version_id=fw_ver.id,
            source_type="objective_attempt",
            attempt_id=att_2_fol.id,
            total_score=60.0,
            max_possible_score=70.0,
            percentage=85.7,
            assessed_at=datetime.now(timezone.utc) - timedelta(days=2),
            status="finalised",
        )
        db.add(res_2_fol)
        db.flush()

        ev_2_fol = EvidenceItem(
            institution_id=inst_a.id,
            student_id=prof_2.id,
            framework_version_id=fw_ver.id,
            title="Follow-up Verification (DA-FOL-01)",
            evidence_status="assessment_verified",
            source_type="assessment_result",
            assessment_result_id=res_2_fol.id,
            verified_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(ev_2_fol)
        db.flush()

        priya_fol_scores = {
            "sql": 80.0,  # Improved: +40%
            "python-manipulation": 85.0,  # Improved: +35%
            "data-cleaning": 80.0,  # Improved: +40%
            "statistics": 75.0,  # Improved: +25%
            "data-visualisation": 85.0,  # Improved: +25%
            "analytical-reasoning": 90.0,  # Improved: +20%
            "communication-findings": 85.0,  # Improved: +25%
        }
        for c in comp_entities:
            sc = priya_fol_scores[c.competency_key]
            db.add(
                ResultCompetency(
                    institution_id=inst_a.id,
                    assessment_result_id=res_2_fol.id,
                    competency_id=c.id,
                    score=sc / 10.0,
                    max_score=10.0,
                    percentage=sc,
                )
            )
            db.add(
                EvidenceCompetency(
                    institution_id=inst_a.id,
                    evidence_id=ev_2_fol.id,
                    competency_id=c.id,
                    relationship_type="supports",
                )
            )

        db.commit()

        # Compute progress comparisons for Priya
        compute_progress_comparison(
            db=db,
            institution_id=inst_a.id,
            student_id=prof_2.id,
            baseline_result_id=res_2_base.id,
            follow_up_result_id=res_2_fol.id,
        )

        # Run deterministic diagnosis and generate development plan for Priya (prof_2)
        det_run_2, diag_run_2 = run_deterministic_diagnosis(
            db=db,
            institution_id=inst_a.id,
            student_id=prof_2.id,
            framework_version_id=fw_ver.id,
        )
        generate_development_plan(
            db=db,
            institution_id=inst_a.id,
            student_id=prof_2.id,
            diagnosis_run_id=diag_run_2.id,
        )

        print("EMPIRIA demonstration database seeded successfully!")

    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    import sys
    force_flag = "--force" in sys.argv or "-f" in sys.argv
    seed_database(force=force_flag)
