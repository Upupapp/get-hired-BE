# GETHIRED SWEEP — RECENT DEPLOYMENT: Application Snapshots System
**Generated:** 2026-06-24
**BE HEAD:** bb70351 | **FE HEAD:** 4eefb33
**Scope:** Application Snapshots System (application_snapshots, application_completeness_snapshots, match_snapshots)

---

## Executive Summary

**What was deployed:** A three-table snapshot system that captures a point-in-time record of every job application at the moment of submission. Three coordinated snapshot types are created: an immutable profile/document record, a completeness score, and a match guidance signal. Two new API endpoints expose this data — one to the applicant (own completeness) and one to the employer (summary view with match level). The FE adds a snapshot summary card to the employer applicant detail panel.

**Architecture quality:** High. The fire-and-forget best-effort pattern is correctly applied and isolated. Ownership checks are present in both new controllers. Protected attributes are explicitly listed and excluded. The idempotency design is solid. The FE integration is purely additive. The main gaps are minor: a weak match score formula, no explicit FK constraints in the DDL, missing subscription for `loadSnapshotSummary` in an error-path edge case, and an `applicationId` field that the DEPLOYMENT NOTE states was added to `mappedBasicApplicantDetails()` but is not visible in the read file.

**Top 5 risks:**
1. [HIGH] The match score formula in `persistMatchSnapshot()` is disconnected from `fitSignals.applicationCompleteness`: it actually computes `(matchedRequiredSkills / totalSkills) * 60 + (hasCv ? 40 : 0)`, meaning an applicant with a CV but no skill match scores 40 while one with all required skills but no CV scores 60 — these weights are arbitrary and undocumented.
2. [MEDIUM] No explicit FK constraints exist in the DDL for `application_id`, `job_id`, or `company_id`. If an application is deleted or a job is hard-deleted, orphaned snapshot rows accumulate silently.
3. [MEDIUM] `getApplicationSnapshot()`, `getCompletenessSnapshot()`, and `getMatchSnapshot()` all use `SELECT *`, meaning any future column added to these tables will be automatically exposed to callers without review.
4. [MEDIUM] The `getApplicationSnapshotSummaryForEmployer()` service helper does NO ownership check itself — it relies entirely on the controller having already validated company ownership. This is fine today but is a latent risk if the helper is ever called from another path.
5. [MEDIUM] `jobDetails()` is called twice per application submit — once in `jobApply()` for the email, and again inside `createApplicationSnapshots()`. Each call fires approximately 8 sequential queries (N+1 job details fan-out), doubling the DB load per submission.

**Top 5 strengths:**
1. Fire-and-forget is correctly implemented: `createApplicationSnapshots()` never throws to the caller, and `.catch()` is applied on the returned promise in `application.service.js`.
2. Ownership checks are present in both controllers: applicant endpoint checks `candidate_id === uid`; employer endpoint verifies `callerCompany.companyId === job.company_id` via a two-step DB lookup.
3. `EXCLUDED_FIELDS` is comprehensive (14 fields including gender, race, disability, emotion analysis, personality analysis) and is persisted in the snapshot itself so employers can verify what was omitted.
4. Idempotency is correctly anchored via partial unique indexes (`WHERE source='application_submit'`) and `ON CONFLICT DO NOTHING` throughout, so retries are safe.
5. The FE integration is purely additive: the snapshot card only renders if `snapshotSummaryLoading || snapshotSummary`, and `loadSnapshotSummary()` uses `catchError(() => of(null))`, so a failing snapshot endpoint never affects the existing applicant detail view.

---

## §1 System Map

### What the system does

The Application Snapshots System captures three coordinated immutable records when a job application is submitted:

1. **`application_snapshots`** — A structural snapshot of the applicant's profile (name, title, skills, work history, education, certs, document references) and the job (title, company, skills, requirements, description) at submission time. This ensures the employer always sees what was true when the applicant applied, not the applicant's current edited profile.

2. **`application_completeness_snapshots`** — A deterministic completeness score (0–100) computed from a fixed rubric (required: basic profile/work experience/skills = 70 points; recommended: education/CV/video answers/certs = 30 points). Assigned a level: `incomplete / basic / strong / excellent`.

3. **`match_snapshots`** — A persisted snapshot of the employer-fit signals computed at submission time, including matched/missing required skills, CV presence, an overall match score, and a match level (`strong / possible / low`).

### User flows affected

- **Applicant submitting an application:** The main submission path is unchanged. After the application row is inserted and emails are sent, `createApplicationSnapshots()` is called fire-and-forget. The applicant receives no indication that snapshots were created — this is intentional (background operation).
- **Applicant viewing their own application:** Via `GET /applicant/application/snapshot?applicationId=<id>`, the applicant can see their completeness score, what sections were missing, and a privacy note. The match snapshot is NOT exposed to the applicant (by design — only completeness and structural snapshot).
- **Employer reviewing an applicant:** When the employer opens the applicant detail panel, `loadSnapshotSummary()` is called with the `applicationId`. The employer sees a "Application Snapshot" card showing completeness score/level and match level at submission time, plus the DISCLAIMER text.

### Data flow

```
Applicant submits application
  → application.service.js: jobApply()
      → INSERT INTO job_applicants (returns jobApplicantionId)
      → fire-and-forget: createApplicationSnapshots({ applicationId, ... })
          → parallel fetch: appplicantProfile(applicantId) + jobDetails(jobId)
          → buildApplicantProfileSnapshot(profile)    → applicant_profile_snapshot JSONB
          → buildJobSnapshot(job)                     → job_snapshot JSONB
          → buildSubmittedDocumentsSnapshot(...)      → submitted_documents_snapshot JSONB
          → buildSubmittedAnswersSnapshot(...)        → submitted_answers_snapshot JSONB
          → buildSubmittedVideoAnswersSnapshot(...)   → submitted_video_answers_snapshot JSONB (nullable)
          → persistApplicationSnapshot() → INSERT ... ON CONFLICT DO NOTHING → application_snapshots
          → scoreApplicationCompleteness() → persistCompletenessSnapshot() → application_completeness_snapshots
          → getApplicantFitSignals() → persistMatchSnapshot() → match_snapshots
      → return application row to caller (snapshot result is discarded)

Employer opens applicant detail
  → FE: loadSnapshotSummary(applicationId)
  → GET /job/applicant/snapshot-summary?applicationId=<id>
      → verify: job_applicants WHERE job_application_id = applicationId
      → verify: jobs WHERE job_id = appRows[0].job_id → get company_id
      → verify: getUserCompany(uid) → callerCompany.companyId === job.company_id
      → getApplicationSnapshotSummaryForEmployer(applicationId)
          → parallel: getApplicationSnapshot + getCompletenessSnapshot + getMatchSnapshot
          → return: { hasSnapshot, completenessScore, completenessLevel, matchScore, matchLevel, matchDisclaimer }
  → FE: snapshot summary card rendered in applicant detail panel
```

---

## §2 BE API Map

### Endpoint 1: `GET /applicant/application/snapshot`

| Property | Value |
|---|---|
| Route | `GET /applicant/application/snapshot?applicationId=<id>` |
| File | `routes/applicationRoute.js` line 39 |
| Controller | `getApplicantApplicationSnapshot` in `controllers/applicationController.js` |
| Auth | `verifyAuth` middleware (Firebase JWT required) |
| Ownership check | Queries `job_applicants WHERE job_application_id = $1`, then asserts `appRows[0].candidate_id === uid`. Returns 403 if mismatch. |
| Request | Query param: `applicationId` (string, required) |
| Response (success) | `{ applicationId, hasSnapshot, snapshotCreatedAt, completenessScore, completenessLevel, completedSections, missingRequired, missingRecommended, disclaimerNote, privacyNote }` |
| Response (not found) | 404 `{ status: "error", error: "Application not found." }` |
| Response (forbidden) | 403 `{ status: "error", error: "Forbidden." }` |
| Data exposed | Completeness score/level, missing sections, disclaimer — NO match snapshot, NO raw applicant profile snapshot, NO company data |

**Risks:**
- The `status` import from `../helpers/status` does not define a named `notfound` key in all known versions — if `status.notfound` is `undefined`, the 404 returns 200 instead. Low-severity but misleading.
- `SELECT *` on the completeness snapshot means any future schema addition is automatically included in the response.

---

### Endpoint 2: `GET /job/applicant/snapshot-summary`

| Property | Value |
|---|---|
| Route | `GET /job/applicant/snapshot-summary?applicationId=<id>` |
| File | `routes/applicationRoute.js` line 41 |
| Controller | `getEmployerApplicantSnapshotSummary` in `controllers/applicationController.js` |
| Auth | `verifyAuth` middleware (Firebase JWT required) |
| Ownership check | Two-step: (1) resolve `job_id` from `job_applicants`; (2) resolve `company_id` from `jobs`; (3) call `getUserCompany(uid)` and compare `companyId`. Returns 403 on any mismatch. |
| Request | Query param: `applicationId` (string, required) |
| Response (success) | `{ hasSnapshot, snapshotSource, snapshotCreatedAt, completenessScore, completenessLevel, matchScore, matchLevel, hasMatchSnapshot, matchDisclaimer }` |
| Response (not found) | 404 if no application row found |
| Response (forbidden) | 403 if company does not own the job |
| Data exposed | Aggregated summary scores only — no raw profile data, no documents, no answer content |

**Risks:**
- Three sequential DB round-trips before any snapshot data is read (job_applicants → jobs → getUserCompany). On high-traffic employer dashboards, this may be slow. No caching.
- `getUserCompany()` is imported from `companiesController` — any bug or slowness in that shared helper affects this endpoint.
- If `getUserCompany(uid)` returns null (employer not associated with any company), the 403 is returned correctly, but the error message says "Forbidden." with no hint that the account lacks a company record — could confuse employer support.

---

## §3 DB Schema Map

### Table: `application_snapshots`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | varchar | NOT NULL | uuid_generate_v4() | PK |
| application_id | varchar | NOT NULL | — | No FK constraint |
| applicant_id | varchar | NOT NULL | — | Firebase UID |
| job_id | varchar | NOT NULL | — | No FK constraint |
| company_id | varchar | NOT NULL | — | No FK constraint |
| snapshot_version | varchar | NOT NULL | 'application_snapshot_v1' | Version pin |
| source | varchar | NOT NULL | 'application_submit' | Drives idempotency index |
| provenance_json | jsonb | NULL | — | Audit metadata |
| snapshot_hash | varchar | NULL | — | Unused (no hash computed in service) |
| applicant_profile_snapshot | jsonb | NOT NULL | — | Sanitized profile |
| job_snapshot | jsonb | NOT NULL | — | Job at submission time |
| submitted_documents_snapshot | jsonb | NOT NULL | — | File metadata only, no binaries |
| submitted_answers_snapshot | jsonb | NOT NULL | — | Question refs only |
| submitted_video_answers_snapshot | jsonb | NULL | — | Video question IDs only |
| excluded_fields | jsonb | NULL | — | EXCLUDED_FIELDS list |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | No trigger to auto-update |

**Indexes:** applicant_id, job_id, company_id, source, created_at
**Unique index:** `(application_id) WHERE source = 'application_submit'` — idempotency anchor

**Issues:**
- `snapshot_hash` column exists in schema but no hash is ever computed or persisted in the service. Column is dead weight / misleading.
- `updated_at` is never auto-updated (no trigger). It will always equal `created_at`.
- No FK to `job_applicants.job_application_id`, `jobs.job_id`, or `companies.company_id`.

---

### Table: `application_completeness_snapshots`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | varchar | NOT NULL | uuid_generate_v4() | PK |
| application_id | varchar | NOT NULL | — | No FK |
| applicant_id | varchar | NOT NULL | — | |
| job_id | varchar | NOT NULL | — | |
| company_id | varchar | NOT NULL | — | |
| completeness_score | integer | NOT NULL | 0 | 0–100 |
| completeness_level | varchar | NOT NULL | 'incomplete' | incomplete/basic/strong/excellent |
| required_completed_count | integer | NOT NULL | 0 | |
| required_total_count | integer | NOT NULL | 0 | |
| recommended_completed_count | integer | NOT NULL | 0 | |
| recommended_total_count | integer | NOT NULL | 0 | |
| missing_required | jsonb | NOT NULL | '[]' | Array of {field, label, reason} |
| missing_recommended | jsonb | NOT NULL | '[]' | |
| completed_sections | jsonb | NOT NULL | '[]' | |
| evidence | jsonb | NULL | — | Raw rubric detail |
| scoring_rubric_version | varchar | NOT NULL | 'application_completeness_v1' | |
| source | varchar | NOT NULL | 'application_submit' | |
| calculated_at | timestamp | NOT NULL | now() | |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | No auto-update |

**Indexes:** company_id, job_id, applicant_id, completeness_score, completeness_level, source, calculated_at
**Unique index:** `(application_id) WHERE source = 'application_submit'`

**Issues:**
- No FK constraints.
- `updated_at` never auto-updated.
- `evidence` JSONB contains `requiredItems`, `completedRequired`, etc. — this is internal rubric bookkeeping, not employer-facing, but it is stored and could be queried directly from the DB.

---

### Table: `match_snapshots`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | varchar | NOT NULL | uuid_generate_v4() | PK |
| application_id | varchar | NOT NULL | — | No FK |
| applicant_id | varchar | NOT NULL | — | |
| job_id | varchar | NOT NULL | — | |
| company_id | varchar | NOT NULL | — | |
| match_score | integer | NULL | — | Nullable (no signal = null) |
| match_level | varchar | NULL | — | strong/possible/low/null |
| matched_evidence | jsonb | NOT NULL | '[]' | |
| missing_evidence | jsonb | NOT NULL | '[]' | |
| neutral_evidence | jsonb | NOT NULL | '[]' | |
| factor_scores | jsonb | NOT NULL | '{}' | |
| excluded_factors | jsonb | NULL | — | Protected attr list |
| match_algorithm_version | varchar | NOT NULL | 'employer_signals_v5' | |
| source | varchar | NOT NULL | 'application_submit' | |
| calculated_at | timestamp | NOT NULL | now() | |
| created_at | timestamp | NOT NULL | now() | |
| updated_at | timestamp | NOT NULL | now() | No auto-update |

**Indexes:** company_id, job_id, applicant_id, match_score, match_level, source, calculated_at
**Unique index:** `(application_id) WHERE source = 'application_submit'`

**Idempotency design:** All three tables use the same pattern: partial unique index on `application_id WHERE source = 'application_submit'` ensures that even if `createApplicationSnapshots()` is called twice for the same application (e.g. due to a retry), the second call inserts nothing and returns null (not an error).

---

## §4 FE-to-BE Contract Map

### Method: `ApplicationService.getApplicationSnapshot(applicationId)`
- **File:** `src/app/application/application.service.ts`
- **URL constructed:** `` `${environment.api_url}/applicant/application/snapshot?applicationId=${encodeURIComponent(applicationId)}` ``
- **BE endpoint:** `GET /applicant/application/snapshot` — MATCH (path correct, query param correct)
- **Auth:** Delegated to `BaseService` — assumes Bearer token is injected automatically (standard for this project)
- **Response shape assumed:** Any `res.data` object (typed as `any`) — no interface defined
- **Usage in templates:** Not yet wired to any template in the deployed files (this method exists but no component calls it in the deployed FE files)

---

### Method: `JobService.getApplicantSnapshotSummary(applicationId)`
- **File:** `src/app/job/job.service.ts`
- **URL constructed:** `` `${environment.api_url}/job/applicant/snapshot-summary?applicationId=${encodeURIComponent(applicationId)}` ``
- **BE endpoint:** `GET /job/applicant/snapshot-summary` — MATCH (path correct, query param correct)
- **Auth:** Delegated to `BaseService`
- **Response shape assumed:** `res?.data` mapped to `snapshotSummary: any`. Fields accessed in template: `hasSnapshot`, `completenessScore`, `completenessLevel`, `matchLevel`, `matchDisclaimer`.
- **BE response fields:** `{ hasSnapshot, snapshotSource, snapshotCreatedAt, completenessScore, completenessLevel, matchScore, matchLevel, hasMatchSnapshot, matchDisclaimer }` — all accessed FE fields are present in BE response. `matchScore` is available in BE response but NOT used in the template (only `matchLevel` is displayed).

**URL correctness:** Both URLs are correct. `encodeURIComponent()` is applied to `applicationId` in both cases, which is correct for query param encoding.

**Gap:** `getApplicationSnapshot()` (applicant-side) has no current FE consumer in the deployed components. It exists in the service but is not called from any component in the deployment batch.

---

## §5 Service Architecture: `applicationSnapshotService.js`

### Best-effort pattern correctness

The fire-and-forget pattern is correctly implemented. The main orchestrator `createApplicationSnapshots()`:
- Is declared `async` and returns a result object
- Never `throw`s to its caller under any circumstance
- Each of the three snapshot phases is individually wrapped in `try/catch`; failures are pushed to `result.errors[]` and execution continues
- The fetch phase (profile + job data) is the only place where a failure causes early return — this is correct because all three snapshots need this data

The call site in `application.service.js`:
```js
createApplicationSnapshots({ ... }).catch((err) => {
  console.error("[applicationSnapshot] snapshot creation failed:", err);
});
```
This is correct: the `.catch()` means even if `createApplicationSnapshots` somehow throws synchronously (which it can't given the try/catch), it won't propagate. The application response is returned before the snapshots complete.

### Error isolation

Each snapshot phase is independently isolated. If the match signal service (`getApplicantFitSignals`) throws, only `result.errors` gets a `match_snapshot` entry — the application snapshot and completeness snapshot are still created. This is good design.

### Idempotency

`ON CONFLICT DO NOTHING` is used in all three `INSERT` statements, anchored by the partial unique indexes. A retry of the entire `createApplicationSnapshots()` call produces no duplicate rows and no errors.

### Excluded fields

`EXCLUDED_FIELDS` is defined at module level and applied in two places:
1. In `persistApplicationSnapshot()`: persisted as `JSON.stringify({ excludedFields: EXCLUDED_FIELDS })` in the `excluded_fields` column — transparency record for auditors.
2. In `persistMatchSnapshot()`: used to populate `excludedFactors.protectedAttributes`.

The profile snapshot builder (`buildApplicantProfileSnapshot`) never includes any field from `EXCLUDED_FIELDS` — the field list is an explicit allowlist of what to include, not a blocklist.

### Issues found

**Issue 1 (MEDIUM):** The `snapshot_hash` column in the schema has no corresponding hash computation in the service. The `provenance_json` is used instead for audit context, but the hash column is permanently null. This is either incomplete feature or dead schema column.

**Issue 2 (LOW):** The completeness scorer passes `answersSnapshot.answers` (already-mapped objects) as both the `submittedAnswers` argument and the `interviewAnswers` for the video filter:
```js
const completenessResult = scoreApplicationCompleteness(
  profile, docsSnapshot, answersSnapshot.answers,
  answersSnapshot.answers.filter(a => a.hasAnswerFile)   // <-- these are mapped objects
);
```
The `scoreApplicationCompleteness` function checks `submittedVideoAnswers.length > 0` — this works correctly because the mapped objects still have `.hasAnswerFile`. No bug, but slightly confusing.

**Issue 3 (LOW):** `appplicantProfile` (note: triple-p typo in the import) is imported from `applicant.service` — this typo pre-exists in the codebase and is consistent, so it works, but it's a latent readability issue.

---

## §6 Security Review

### Applicant endpoint ownership check

`getApplicantApplicationSnapshot`:
1. Queries `job_applicants WHERE job_application_id = $1` with parameterized query — no SQL injection risk.
2. Compares `appRows[0].candidate_id !== uid` where `uid` comes from `req.user` (Firebase-verified JWT, set by `verifyAuth` middleware).
3. Returns 403 on mismatch before any snapshot data is fetched.

**Assessment: Correct.** An applicant cannot read another applicant's snapshot.

### Employer endpoint ownership check

`getEmployerApplicantSnapshotSummary`:
1. Resolves `job_id` from `job_applicants` (parameterized).
2. Resolves `company_id` from `jobs` (parameterized).
3. Calls `getUserCompany(uid)` — looks up the company associated with the calling user from the DB, not from the request body.
4. Compares `callerCompany.companyId !== jobRows[0].company_id`.
5. Returns 403 on mismatch.

**Assessment: Correct.** Company A cannot read a snapshot for an applicant at Company B's job.

### BOLA risks

- **No BOLA risk in new endpoints.** Both ownership checks are server-side derived, not body-supplied.
- **Pre-existing BOLA fix acknowledged:** `jobApply()` now derives `candidateId` from `userId` (the verified auth token), not from `req.body.applicantId`. This was a prior fix and is confirmed present.

### Data isolation between companies

- The employer summary endpoint returns only `{ hasSnapshot, completenessScore, completenessLevel, matchScore, matchLevel, matchDisclaimer }` — no raw profile data, no documents, no applicant PII beyond what is already visible in the existing applicant detail view.
- The `getApplicationSnapshotSummaryForEmployer()` helper itself does no ownership check — it trusts the controller to have already verified. This is a design assumption that must remain documented and must not be violated if the helper is ever called from a new context.

### Protected attribute exclusions

- `EXCLUDED_FIELDS` contains 22 fields: gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, raw_video_content, raw_audio_content, face_traits, voice_traits, accent_analysis, personality_analysis, emotion_analysis, private_preparation_notes, raw_file_binaries.
- None of these fields appear in `buildApplicantProfileSnapshot()`.
- The `excludedFactors` in `persistMatchSnapshot()` correctly lists the demographic subset and explicitly notes that personality analysis is excluded by design.

**Gap (LOW):** `age` is not in the EXCLUDED_FIELDS list by name, but `date_of_birth` is. An age value could theoretically be derived from birth year if that were ever stored. The current profile snapshot does not include birth year — this is safe today but should be noted for future profile field additions.

---

## §7 Performance Review

### Fire-and-forget impact on submit latency

The snapshot creation is entirely outside the critical path for `jobApply()`. The function call is:
```js
createApplicationSnapshots({ ... }).catch(...);
```
No `await`. The application response is returned immediately after email send. The snapshot work runs asynchronously. **Zero added latency to the application submit response.**

**Caveat:** The `send()` (email) call before the snapshot call is also not awaited — both fire-and-forget. If the Node.js process is under memory pressure, the unresolved promises from batch submissions could accumulate. No queue or job worker is used.

### N+1 risks in snapshot service

Inside `createApplicationSnapshots()`, the orchestrator does:
```js
[profile, job] = await Promise.all([
  appplicantProfile(applicantId),
  jobDetails(jobId),
]);
```
`jobDetails()` in `job.service.js` internally fires 7+ sequential `getJobArrayDetails()` calls (tags, requirements, skills, goodToHave, educationalBackground, certificationRequirements) plus `getJobBadges()`, `getJobInterviewQuestions()`, and `getInterviewTemplateId()`. This is a pre-existing N+1 for the full job fetch — it is NOT new to this deployment (jobDetails was already called in `jobApply()` for the email), but calling it a second time inside `createApplicationSnapshots()` means it runs twice per application submit (once for the email, once for the snapshot).

**Risk (MEDIUM):** Double invocation of `jobDetails()` per application submit. Each call fires approximately 8 sequential queries.

### Index coverage on new tables

All three tables have indexes on the expected access patterns:
- `application_id` lookup: covered by the unique partial index on each table
- `applicant_id` lookup: explicit index on all three tables
- `job_id` and `company_id` lookup: explicit indexes on all three tables
- `completeness_score` and `match_score` range queries: explicit indexes on respective tables

**Gap (LOW):** No composite index on `(company_id, job_id)` which would be the natural employer query pattern for "all applicants for this job at my company." Single-column indexes exist separately, but a composite would be more efficient for this common access pattern.

### Retrieval performance

`getApplicationSnapshotSummaryForEmployer()` fires three independent SELECT queries but wraps them in `Promise.all()` — they run in parallel. This is correct. Each SELECT is a single row lookup by `application_id` which is covered by the unique partial index.

---

## §8 Privacy / Fair-Hiring Review

### EXCLUDED_FIELDS completeness

The EXCLUDED_FIELDS list covers all standard protected attributes under Philippine law (RA 10911 / Anti-Age Discrimination in Employment Act) and EEOC categories:

| Category | Covered |
|---|---|
| Gender | YES (`gender`) |
| Civil/Marital status | YES (`civil_status`, `family_status`) |
| Age / Date of birth | YES (`date_of_birth`) |
| Religion | YES (`religion`) |
| Race / Ethnicity | YES (`race`, `ethnicity`) |
| Disability | YES (`disability_status`) |
| Nationality | YES (`nationality`) |
| Political views | YES (`political_views`) |
| Union membership | YES (`union_membership`) |
| Health conditions | YES (`health_conditions`) |
| AI-derived traits | YES (`face_traits`, `voice_traits`, `accent_analysis`, `personality_analysis`, `emotion_analysis`) |

**Gap:** `age` is not a named field, but is effectively excluded by excluding `date_of_birth`. Any derived age value would need to be added to the profile model before it became a risk.

### Match disclaimer presence

The `DISCLAIMER` constant is imported from `employerApplicantSignalsService.js`:
> "Match Signals are decision-support indicators based on the job post and submitted applicant information. Review the full application before making hiring decisions. Match Signals should not be used as the sole basis for hiring decisions."

It is:
- Persisted in the match snapshot summary response (`matchDisclaimer` field)
- Displayed in the FE employer applicant detail template directly from `snapshotSummary.matchDisclaimer`
- The completeness endpoint also includes a `disclaimerNote` and `privacyNote` in the applicant-facing response

**Assessment: Correct.** Disclaimer is present wherever match data is surfaced.

### No auto-rank / auto-reject / auto-hide

The match snapshot data:
- Is labeled as "guidance" and "decision-support" throughout
- Has `matchDisclaimer` embedded in every response
- Is displayed as informational badges in the FE — no buttons, no "reject this applicant" action, no sort-by-match-score UI
- The completeness score includes: `"This is not a hiring score."` in the disclaimer note

**Assessment: Correct.** No automated decision-making is wired to the snapshot scores.

### Snapshot transparency to applicant

The applicant-facing endpoint returns their own completeness score and the list of missing sections. This is net-positive: applicants can see what was captured at submission time. The match snapshot is deliberately NOT exposed to applicants (no employer-internal signals visible to candidates).

---

## §9 Risk Register

| ID | Area | Severity | Description | Fix Required |
|---|---|---|---|---|
| R-01 | Match score formula | HIGH | The `matchScore` computed in `persistMatchSnapshot()` is `(matchedSkills/totalSkills)*60 + (hasCv ? 40 : 0)`. The CV-presence component is worth 40 points regardless of skill match quality. An applicant with a CV but no skill matches scores 40; one with perfect skill match but no CV scores 60. These weights are arbitrary and not documented as a design decision. This diverges from the live `fitSignals.applicationCompleteness` score. | Document the scoring rationale or refactor to use `fitSignals.applicationCompleteness` for consistency. |
| R-02 | Schema integrity | MEDIUM | No FK constraints declared for `application_id`, `job_id`, `company_id` on any of the three new tables. Hard-deletes of applications or jobs leave orphaned snapshot rows. | Add FK constraints in a follow-up migration, or document that hard-deletes are not performed and soft-delete is used throughout. |
| R-03 | SELECT * exposure | MEDIUM | `getApplicationSnapshot()`, `getCompletenessSnapshot()`, and `getMatchSnapshot()` all use `SELECT *`. Any new column added to these tables will be automatically exposed to callers without review. | Replace with explicit column lists in all three retrieval queries. |
| R-04 | Service-level ownership gap | MEDIUM | `getApplicationSnapshotSummaryForEmployer()` performs no ownership check — it relies entirely on the controller having verified company ownership first. Any future call to this helper from a new context without that check would be a BOLA. | Add an ownership-aware overload or a guard parameter, or document the contract explicitly in the function JSDoc. |
| R-05 | Double jobDetails() call | MEDIUM | `createApplicationSnapshots()` calls `jobDetails(jobId)` internally, but `jobApply()` in `application.service.js` already calls `jobDetails(jobId)` for the email. This fires the full N+1 job details query twice per application submit. | Pass the already-fetched job object into `createApplicationSnapshots()` rather than re-fetching it. |
| R-06 | No composite index | LOW | No composite index on `(company_id, job_id)` on any of the three new tables. Employer-scoped queries over a specific job (e.g. "all applicants with strong match for job X at company Y") will require two index scans. | Add `(company_id, job_id)` composite index to each table in a follow-up migration. |
| R-07 | snapshot_hash dead column | LOW | `application_snapshots.snapshot_hash` column exists in DDL but the service never computes or persists a hash. The column is permanently null. | Either implement hash computation or drop the column to avoid confusion. |
| R-08 | updated_at not auto-maintained | LOW | All three tables have `updated_at` columns with default `now()` but no trigger to update them on row change. Since rows are never updated (idempotent insert-only), this is currently harmless but creates a misleading schema contract. | Add a comment in the DDL clarifying these are insert-only tables and `updated_at` = `created_at`. |
| R-09 | getUserCompany null behavior | LOW | If `getUserCompany(uid)` returns null (employer with no company association), the employer endpoint returns 403 with message "Forbidden." which gives no hint that the account configuration is the issue. | Return a more descriptive error message: "Your account is not associated with a company." |
| R-10 | getApplicationSnapshot() has no FE consumer | LOW | `ApplicationService.getApplicationSnapshot()` exists and targets the correct endpoint, but no deployed FE component calls it. The applicant-facing endpoint is wired but unused. | Wire it to the applicant dashboard or application history view, or document it as a future-use method. |

---

## §10 Opportunity Register

| ID | Area | Description |
|---|---|---|
| O-01 | Snapshot hash | Implement the `snapshot_hash` column: hash the `applicant_profile_snapshot + job_snapshot` JSONB to create an immutable content fingerprint. Enables tamper detection and diff detection if the snapshot is ever compared against re-computed current data. |
| O-02 | Backfill endpoint | The service supports `source = 'backfill_current_data'` in `provenance_json` and the idempotency index only covers `source = 'application_submit'`. This means a backfill migration can be run without triggering unique conflicts. A backfill script for existing applications (pre-snapshot era) could be valuable. |
| O-03 | Applicant-facing completeness card | Wire `ApplicationService.getApplicationSnapshot()` to the applicant's "My Applications" view so applicants can see their completeness score per application. The endpoint is deployed and correctly ownership-checked. |
| O-04 | Employer sort/filter by score | The completeness and match scores are indexed. A future employer applicant list endpoint could accept `sort_by=completeness_score` or `filter=match_level:strong` leveraging these indexes. This would be additive to the existing list endpoint. |
| O-05 | Match score formula improvement | Replace the two-factor `(skills * 60 + cv * 40)` formula with the full `fitSignals.applicationCompleteness` score from `employerApplicantSignalsService`, which incorporates more signal types. The score and level could diverge from what the live signals endpoint returns — unifying them removes that inconsistency. |
| O-06 | Composite indexes | Add `(company_id, job_id)` composite indexes to support employer-scoped aggregate queries without multi-column index fan-outs. |
| O-07 | Snapshot version migration path | The version constants (`application_snapshot_v1`, `application_completeness_v1`, `employer_signals_v5`) are correct. Add a documented upgrade path: when rubric or algorithm changes, new snapshots get the new version string; old ones retain their original version. This enables version-aware display ("scored under rubric v1") in the FE. |
| O-08 | Error surfacing for missing snapshots | Currently if the fire-and-forget fails silently, the employer sees "No snapshot available for this application" with no indication whether the snapshot was never created vs. still in progress. A `snapshot_status` enum column (pending/created/failed) on `application_snapshots` would allow accurate status reporting. |
| O-09 | jobDetails() pass-through refactor | Pass the already-fetched `job` object from `jobApply()` into `createApplicationSnapshots()` to eliminate the redundant `jobDetails()` call. This also removes the risk of the snapshot seeing a different job state than the one used for the email (unlikely but theoretically possible in a race). |
| O-10 | Log snapshot errors to monitoring | Currently errors from snapshot creation go to `console.error`. Routing these to a structured logger or error monitoring service (e.g. Sentry) would make silent failures visible in production dashboards. |

---

## Appendix: Files Reviewed

| File | Type | Lines |
|---|---|---|
| `db/application_snapshots_ddl.sql` | BE DDL | 151 |
| `services/applicationSnapshotService.js` | BE Service | 633 |
| `services/application.service.js` | BE Service | 379 |
| `controllers/applicationController.js` | BE Controller | 153 |
| `routes/applicationRoute.js` | BE Routes | 63 |
| `services/job.service.js` | BE Service | 757 |
| `src/app/job/job.service.ts` | FE Service | 109 |
| `src/app/application/application.service.ts` | FE Service | 35 |
| `src/app/job/job-applicants/job-applicants.component.ts` | FE Component | 292 |
| `src/app/job/job-applicants/job-applicants.component.html` | FE Template | 119 |

---

*Report generated by SWEEP (recent deployment scope). Not a full system sweep.*
