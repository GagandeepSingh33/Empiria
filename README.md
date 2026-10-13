# EMPIRIA — Student Capability Development & Institutional Intelligence Platform

EMPIRIA is an institutional capability development and learning analytics platform. Its defining workflow connects continuous student learning and institutional intelligence across six persistent stages:

$$\text{MEASURE} \longrightarrow \text{DIAGNOSE} \longrightarrow \text{PLAN} \longrightarrow \text{PRACTISE} \longrightarrow \text{VERIFY} \longrightarrow \text{IMPROVE}$$

The initial configurable capability pathway targets **University CSE Students $\rightarrow$ Data Analyst Competency Development** across seven configurable competencies:
1. **SQL** (Aggregation, multi-table joins, subqueries, window functions)
2. **Python & Data Manipulation** (Pandas, vectorization, array manipulation)
3. **Statistics** (Distributions, hypothesis testing, correlation vs causation)
4. **Data Cleaning** (Handling missing values, outlier detection, schema normalization)
5. **Data Visualisation** (Grammar of graphics, chart selection, visual integrity)
6. **Analytical Reasoning** (Root-cause deduction, metric decomposition)
7. **Communication of Findings** (Executive summaries, evidence-backed recommendations)

---

## 1. What Works

- **End-to-End Capability Loop**:
  - **Stage 1 (Measure)**: Students launch and complete standardized objective assessments. Answers are validated server-side; restricted answer keys are never sent to the browser.
  - **Stage 2 (Diagnose)**: Deterministic, versioned diagnostic engine evaluates evidence against published competency thresholds, producing explicit proficiency levels (0–4), gap determinations, transparent rationale, and mandatory evaluation caveats.
  - **Stage 3 (Plan)**: Individualized personal development plans generated dynamically from diagnostic gap findings, prioritizing tasks and linking curated learning resources.
  - **Stage 4 (Practise)**: Persistent practice task workspace with state transitions (`pending` $\rightarrow$ `in_progress` $\rightarrow$ `submitted` $\rightarrow$ `completed`) and evidence artefact submission.
  - **Stage 5 (Verify)**: Targeted follow-up assessment attempts targeting prior deficits with atomic scoring and result finalization.
  - **Stage 6 (Improve)**: Longitudinal baseline vs follow-up comparison engine computing score deltas, comparability status (`declared_equivalent`), outcome status (`improved`, `unchanged`, `regressed`), and mandatory non-causal evaluation limitation disclosures.
- **Enterprise Multi-Tenant Security & Isolation**:
  - Server-side session authentication (`empiria_session`) with SHA-256 session tokens.
  - Strict CSRF token verification on state-changing requests (`POST`, `PUT`, `DELETE`).
  - Transaction-scoped database tenant context (`set_config('app.tenant_id', ...)`).
  - Negative access controls verified: Cross-tenant isolation, Student IDOR protection (Student B cannot access Student A's records even with direct ID injection), and Student verification restrictions (students cannot self-verify evidence).
- **Institutional Management & Data Operations**:
  - Student roster management.
  - Two-stage CSV Roster Importer: file upload $\rightarrow$ schema/header validation $\rightarrow$ row error detection (missing fields, duplicate emails, invalid formats) $\rightarrow$ staging preview $\rightarrow$ atomic transactional commit.
  - Institutional Support Request queue and P0 Intervention Records tracking (agreed actions, responsible staff, follow-up dates).
  - Configurable Competency Frameworks with versioning and immutable historical publication guarantees.
  - Institutional Intelligence Reporting with student participation metrics, competency progress trajectories, and **small-cohort privacy threshold suppression** to prevent individual student re-identification.
  - Platform Super Admin view with tenant partitioning governance and platform health monitoring.

---

## 2. Technical Stack & Architecture

- **Architecture**: Modular monolith in ONE root project folder and ONE repository.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, PostgreSQL 17 relational database with Psycopg driver, Pydantic V2 schemas. Internal SPA API mounted under `/internal/v1`.
- **Frontend**: React 19, TypeScript, Vite, Vanilla CSS with custom property design tokens, Lucide React icons.
- **Engine**: 100% deterministic, rule-based, versioned scoring and diagnosis. No external generative AI or arbitrary code execution dependencies.

---

## 3. How to Run Locally

### Prerequisites
- Python 3.12+ (Virtual environment in `.venv`)
- PostgreSQL 17 (Dedicated cluster on port `5433` or standard on port `5432`)
- Node.js 18+ & npm

### Step 1: Start PostgreSQL Database
```powershell
# Using the local cluster configured for EMPIRIA:
& "C:\Program Files\PostgreSQL\17\bin\postgres.exe" -D "C:\Users\tyagi\empiria_pgdata" -p 5433
```

### Step 2: Seed the Database (Development Synthetic Data)
```powershell
.venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); from app.seed import seed_database; seed_database()"
```

### Step 3: Run the Application (Single-Command Full-Stack Mode)
The FastAPI server serves both the internal API (`/internal/v1`) and the compiled production React SPA (`/`):
```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000 --host 127.0.0.1
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

### Step 4 (Optional): Run Frontend in Live Development Mode (Vite Dev Server)
If you wish to edit frontend components with hot-module reloading:
```powershell
cd frontend
npm.cmd run dev
```
Open **[http://localhost:5173](http://localhost:5173)** (API requests are automatically proxied to port 8000).

---

## 4. Development Demo Accounts & Credentials

The local seed operation creates realistic synthetic identities across all supported project roles:

| Role | Name | Email | Password | Primary Purpose / Scenario |
|---|---|---|---|---|
| **Student** | Aarav Sharma | `student@apex.edu` | `StudentPass123!` | Baseline completed with diagnosed gap in SQL (40%). Ready for Plan & Practice. |
| **Student** | Priya Patel | `student2@apex.edu` | `StudentPass123!` | Both Baseline (50%) and Follow-up (85%) completed. Demonstrates verified progress. |
| **Institution Admin** | Dr. Vikram Malhotra | `admin@apex.edu` | `AdminPass123!` | Manages institution settings, roster, and institutional reports. |
| **Faculty / Assessor** | Prof. Ananya Roy | `faculty@apex.edu` | `FacultyPass123!` | Reviews assessment items, rubrics, and student determinations. |
| **Mentor / Advisor** | Rajesh Verma | `mentor@apex.edu` | `MentorPass123!` | Reviews student support queue and records P0 intervention actions. |
| **Data Operator** | Sunita Rao | `operator@apex.edu` | `OperatorPass123!` | Manages bulk roster imports and CSV validation staging. |
| **Tenant B Admin** | Dean Arthur Pendelton | `admin@beacon.edu` | `BeaconPass123!` | Beacon University tenant admin. Used to verify multi-tenant isolation. |
| **Super Admin** | Platform Admin | `superadmin@empiria.internal` | `SuperAdmin123!` | Multi-tenant platform operations, health, and onboarding. |

> **Fast Switcher**: The UI includes a persistent top banner in development mode with 1-click buttons to instantly switch between any of the above accounts.

---

## 5. Automated Test Suite Results

The automated test suite in `backend/tests` tests authentication, CSRF, tenancy, deterministic diagnosis reproducibility, CSV importer staging, progress comparison, IDOR protection, and the complete end-to-end student development pathway.

To run the complete test suite:
```powershell
.venv\Scripts\python.exe -m pytest -o pythonpath=backend backend/tests -v -W ignore
```

### Execution Results:
```
============================= test session starts =============================
platform win32 -- Python 3.12.6, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\tyagi\OneDrive\Desktop\EMPIRIA
plugins: anyio-4.15.1
collected 16 items

backend/tests/test_auth_and_security.py::test_health_endpoints PASSED    [  6%]
backend/tests/test_auth_and_security.py::test_login_success_and_session PASSED [ 12%]
backend/tests/test_auth_and_security.py::test_login_invalid_password PASSED [ 18%]
backend/tests/test_auth_and_security.py::test_unauthenticated_access_denied PASSED [ 25%]
backend/tests/test_auth_and_security.py::test_csrf_protection_on_state_changing_requests PASSED [ 31%]
backend/tests/test_auth_and_security.py::test_role_enforcement PASSED    [ 37%]
backend/tests/test_auth_and_security.py::test_logout_revokes_session PASSED [ 43%]
backend/tests/test_csv_importer.py::test_csv_import_workflow PASSED      [ 50%]
backend/tests/test_csv_importer.py::test_csv_import_validation_failures PASSED [ 56%]
backend/tests/test_deterministic_diagnosis.py::test_deterministic_diagnosis_reproducibility PASSED [ 62%]
backend/tests/test_deterministic_diagnosis.py::test_sufficiency_and_gap_classification PASSED [ 68%]
backend/tests/test_end_to_end_journey.py::test_complete_end_to_end_student_development_pathway PASSED [ 75%]
backend/tests/test_progress_comparison.py::test_progress_comparison_and_limitations PASSED [ 81%]
backend/tests/test_tenancy_and_negative_access.py::test_cross_tenant_isolation PASSED [ 87%]
backend/tests/test_tenancy_and_negative_access.py::test_student_idor_protection PASSED [ 93%]
backend/tests/test_tenancy_and_negative_access.py::test_student_cannot_self_verify_evidence PASSED [100%]

============================= 16 passed in 9.99s ==============================
```

---

## 6. Security Verification

- **Multi-Tenant Isolation**: Tenant B (`Beacon University`) direct API requests attempting to query Tenant A (`Apex Institute of Technology`) records are strictly denied.
- **BOLA / IDOR Protection**: Student B attempting to access Student A's diagnosis records via direct URL manipulation receives an immediate non-disclosing 403 denial.
- **Privilege Separation**: Student accounts cannot modify evidence verification statuses or access restricted staff endpoints.
- **Safe Assessments**: Assessment delivery endpoints strip internal scoring criteria and correct answer keys; students only receive item prompt text and selectable options.
- **CSRF Token Validation**: State-changing requests (`POST`, `PUT`, `DELETE`) require a valid `X-CSRF-Token` header matching the authenticated session.
- **Privacy Threshold Enforcement**: Institutional aggregate endpoints automatically suppress disaggregated cohort numbers when measured cohort sizes fall below the institutional anonymity threshold.

---

## 7. Frontend Verification & Viewports

- **Build Output**: Clean production build via Vite (`dist/index.html`, `dist/assets/index.js`, `dist/assets/index.css`) with zero TypeScript errors.
- **Design System**: Authoritative institutional typography (`Inter`), slate-navy base (`#0f172a`), deep teal accent (`#0f766e`), clear semantic indicators for gaps (`#e11d48`) and targets met (`#059669`).
- **Responsive Layout**: Validated across desktop (1440px, 1280px) and tablet/mobile viewports (768px, 375px) with responsive card grids and horizontal-scrolling workflow steppers.

---

## 8. Release Status & Roadmap Boundaries

- **Local Status**: Fully functioning, integrated, tested, runnable P0 application.
- **P0 Scope Enforced**:
  - No external integration API (`/api/v1`) — internal SPA API (`/internal/v1`) only.
  - No opaque ML or unvalidated generative AI in diagnosis or planning.
  - No arbitrary in-browser code execution.
- **Future Institutional Enhancements (P1+)**:
  - External LMS integration via LTI 1.3 / OneRoster.
  - Automated rubric grader integrations for complex multi-file capstone projects.
  - Advanced institutional workload scheduling for faculty mentors.

Link:- https://empiria-seven.vercel.app/
