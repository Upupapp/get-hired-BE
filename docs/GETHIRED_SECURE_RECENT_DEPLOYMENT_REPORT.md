# GETHIRED SECURE — Recent Deployment Security Report
**Scope:** Application Snapshots System  
**Date:** 2026-06-24  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Repos:** get-hired-BE, get-hired-FE (FE read for context; no new FE endpoints in scope)

---

## 1. Deployment Surface

### New Files Audited
| File | Purpose |
|---|---|
| `controllers/applicationController.js` | 2 new snapshot controllers (`getApplicantApplicationSnapshot`, `getEmployerApplicantSnapshotSummary`) |
| `routes/applicationRoute.js` | 2 new GET routes wired with `verifyAuth` |
| `services/applicationSnapshotService.js` | Snapshot builder + persist functions for 3 snapshot types |
| `services/application.service.js` | Fire-and-forget `createApplicationSnapshots()` call in `jobApply()` |
| `services/job.service.js` | `applicationId` field added to `mappedBasicApplicantDetails()` |
| `db/application_snapshots_ddl.sql` | 3 new tables: `application_snapshots`, `application_completeness_snapshots`, `match_snapshots` |

### New Endpoints
| Route | Auth | Actor |
|---|---|---|
| `GET /applicant/application/snapshot?applicationId=<id>` | `verifyAuth` | Applicant |
| `GET /job/applicant/snapshot-summary?applicationId=<id>` | `verifyAuth` | Employer/Recruiter |

---

## 2. Threat Model

### Assets
- Applicant profile snapshots (name, job title, skills, work history, education, certifications, salary expectations)
- Completeness scores and gap analysis
- Match signals (skill overlap vs job requirements)
- Sensitive exclusions: gender, age, religion, race, nationality, disability status — these must NEVER appear in snapshots

### Threat Actors
- Authenticated applicant attempting to read another applicant's snapshot (BOLA)
- Authenticated recruiter from Company A attempting to read Company B's applicant snapshots (cross-company BOLA)
- Unauthenticated caller attempting to bypass `verifyAuth`
- Authenticated attacker probing for valid applicationIds via timing/status-code differences

### Trust Boundaries
- Firebase auth token → `req.user.uid` (trusted)
- `applicationId` from query param → untrusted, must be validated against ownership before any data is returned
- `companyId` derived from authenticated user's company record (not from request)

---

## 3. Findings

### FINDING-SD-01 — Application ID Enumeration Oracle (Employer Endpoint)
**Severity:** P1  
**Status:** FIXED in this audit  
**File:** `controllers/applicationController.js`, `getEmployerApplicantSnapshotSummary`

**Description:** The employer snapshot endpoint originally returned HTTP 404 when an `applicationId` did not exist in the database, and HTTP 403 when the application existed but belonged to another company's job. A recruiter from Company B could probe this endpoint with arbitrary `applicationId` values and determine which IDs are valid (404 → invalid; 403 → valid but wrong company). This is an enumeration oracle enabling targeted cross-company BOLA reconnaissance.

**Fix applied:** Changed the "application not found" branch from `status.notfound` (404) to a 403 "Forbidden" response, collapsing both failure modes into a single indistinguishable response. The applicant endpoint retains its 404 (acceptable since applicants know their own IDs).

---

### FINDING-SD-02 — BOLA: Applicant Snapshot Ownership Check (PASS — no fix needed)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `controllers/applicationController.js`, `getApplicantApplicationSnapshot`

**Description:** Controller queries `job_applicants WHERE job_application_id = $1` and then asserts `appRows[0].candidate_id !== uid`. If the IDs do not match, returns 403. This correctly prevents Applicant A from reading Applicant B's snapshot by supplying B's `applicationId`.

---

### FINDING-SD-03 — BOLA: Employer Company Ownership Check (PASS — no fix needed)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `controllers/applicationController.js`, `getEmployerApplicantSnapshotSummary`

**Description:** Controller (1) resolves `job_id` from the application, (2) resolves `company_id` from the job, (3) calls `getUserCompany(uid)` to get the authenticated caller's company, (4) asserts equality. A recruiter from Company A cannot read Company B's applicant data. Note: `getUserCompany` returns `[]` (empty array) when the user has no company; `[]` is truthy but `[].companyId` is `undefined`, so the inequality check correctly fires a 403. Behavior is correct though brittle; annotated below in Risk Register.

---

### FINDING-SD-04 — SQL Injection Review: All New Queries Parameterized (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**Files:** `applicationSnapshotService.js`, `applicationController.js`

All six new DB queries use `$1`, `$2` ... `$N` parameterization with no user-input string interpolation:
- `application_snapshots` INSERT: 13 parameterized values
- `application_completeness_snapshots` INSERT: 16 parameterized values
- `match_snapshots` INSERT: 13 parameterized values
- `SELECT FROM application_snapshots WHERE application_id = $1`
- `SELECT FROM application_completeness_snapshots WHERE application_id = $1`
- `SELECT FROM match_snapshots WHERE application_id = $1`
- Ownership check queries in both controllers: `$1` parameterized

**Pre-existing SQL injection** in `job.service.js:getPublishedJobs` (line 42, `companyId` string interpolation) and `getAllVideoResponsesByJobIds` (line 560, array join interpolation) are pre-existing, not part of this deployment, and outside scope.

---

### FINDING-SD-05 — Protected Attribute Exclusion (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `applicationSnapshotService.js`

`EXCLUDED_FIELDS` contains 20 fields covering gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, and biometric/AI analysis fields. `buildApplicantProfileSnapshot()` is a whitelist builder — it explicitly names each field it copies, so excluded fields are never accidentally included. The `EXCLUDED_FIELDS` list is persisted in `excluded_fields` JSONB for auditability. Match scoring also explicitly excludes all protected attributes.

---

### FINDING-SD-06 — Error Message Information Disclosure (PASS — already safe)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `controllers/applicationController.js`

All three catch blocks use safe, opaque messages:
- `submitApplication`: `"Something went wrong. Please try again later."` (after duplicate-application handling)
- `getApplicantApplicationSnapshot`: `"Unable to retrieve your application snapshot. Please try again later."`
- `getEmployerApplicantSnapshotSummary`: `"Unable to retrieve application summary. Please try again later."`

No raw `Error` objects, no `"ERROR: " + error` pattern, no stack traces, no DB schema names in error responses.

---

### FINDING-SD-07 — Fire-and-Forget Safety (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `services/application.service.js`, lines 146-158

`createApplicationSnapshots()` is called without `await`. A `.catch()` is appended to absorb any Promise rejection. Node.js 15+ promotes unhandled rejections to process crashes; the `.catch()` prevents this. The function itself has try/catch around each of the three snapshot phases and never re-throws, so the Promise returned by `createApplicationSnapshots()` resolves (not rejects) even when individual phases fail. The `.catch()` is therefore a belt-and-suspenders guard that correctly handles the case where the orchestrator itself has an unexpected uncaught throw.

**Minor data quality note:** `companyId: job.companyId || null` — if `jobDetails()` returns a job with no `companyId`, the snapshot INSERT will fail the NOT NULL constraint. This failure is correctly absorbed by the `.catch()` and logged. Not a security issue; the application submission has already succeeded.

---

### FINDING-SD-08 — Cross-Company Data Isolation in match_snapshots (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `db/application_snapshots_ddl.sql`, `applicationSnapshotService.js`

`match_snapshots` stores `company_id` on every row. There is no endpoint that queries match_snapshots by `company_id` alone without going through the employer authorization check. The retrieval function `getMatchSnapshot(applicationId)` only queries by `application_id`, and the employer controller verifies company ownership before calling it. No cross-company query path exists.

---

### FINDING-SD-09 — Route Auth Coverage (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `routes/applicationRoute.js`

Both new routes have `verifyAuth` middleware:
- Line 39: `router.get("/applicant/application/snapshot", verifyAuth, getApplicantApplicationSnapshot)`
- Line 41: `router.get("/job/applicant/snapshot-summary", verifyAuth, getEmployerApplicantSnapshotSummary)`

---

### FINDING-SD-10 — privacyNote Field: No EXCLUDED_FIELDS Array Leak (PASS)
**Severity:** Reviewed  
**Status:** PASS  
**File:** `controllers/applicationController.js`, line 96

The `privacyNote` field returned to the applicant is a hardcoded, opaque string: `"Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."` The `EXCLUDED_FIELDS` array is not serialized into the response (previous draft of this code used `EXCLUDED_FIELDS.slice(0,6).join(", ")` — that is not in the deployed version).

---

## 4. Pre-existing Issues (Out of Scope — Not Part of This Deployment)

| Issue | Location | Severity |
|---|---|---|
| PayMongo webhook has no signature verification | subscriptionController.js | P0 |
| CORS is wide open | app.js | P1 |
| Leaked secrets in git history | git log | P0 |
| `getPublishedJobs` has SQL injection via `companyId` string interpolation | job.service.js:42 | P1 |
| `getAllVideoResponsesByJobIds` has SQL injection via array join | job.service.js:560 | P1 |
| No rate limiting anywhere in the API | express app | P1 |

---

## 5. Summary

| Gate | Result |
|---|---|
| A — BOLA Prevention | PASS (with 1 fix applied) |
| B — SQL Safety | PASS |
| C — Information Disclosure | PASS |
| D — Fire-and-Forget Safety | PASS |
| E — Auth Coverage | PASS |

**P0 findings (new):** 0  
**P1 findings (new):** 1 (FINDING-SD-01, fixed)  
**Fixes applied:** 1  
**Overall verdict:** GO WITH CAUTION — snapshot system is secure; pre-existing P0s (webhook, secrets) remain unresolved at platform level
