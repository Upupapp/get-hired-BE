# GETHIRED — Application Snapshots Deployment Launch Checklist
**Generated:** 2026-06-24
**Deployment:** Application Snapshots System (3 new tables + service + 2 endpoints + FE employer card)

---

## Instructions

Work through each item in order. Do not mark an item complete without direct verification. Anything marked BLOCKED must be resolved before the deployment is considered production-ready.

---

## 1. DB Migration Applied to Production

> Verifies that `application_snapshots_ddl.sql` was applied to the production Postgres instance.

- [ ] **1.1** Connect to the production database with read access.
- [ ] **1.2** Run: `SELECT to_regclass('gethired.application_snapshots');` — result must NOT be null.
- [ ] **1.3** Run: `SELECT to_regclass('gethired.application_completeness_snapshots');` — result must NOT be null.
- [ ] **1.4** Run: `SELECT to_regclass('gethired.match_snapshots');` — result must NOT be null.
- [ ] **1.5** Run: `SELECT COUNT(*) FROM gethired.application_snapshots;` — must return without error (count may be 0 if no applications submitted since deployment).
- [ ] **1.6** Verify the partial unique index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'application_snapshots' AND indexname = 'application_snapshots_application_id_source_unique';` — must return one row.
- [ ] **1.7** Record the timestamp the migration was applied and the person who applied it.

**Status:** [ ] PASS / [ ] BLOCKED (apply `db/application_snapshots_ddl.sql` to production before proceeding)

---

## 2. Both Repos Deployed in Sync

> Verifies that the BE and FE changes are both live and compatible. A mismatch means the employer snapshot card calls an endpoint that does not exist yet (or vice versa).

- [ ] **2.1** Confirm the BE deployment includes: `services/applicationSnapshotService.js`, updated `controllers/applicationController.js` (with `getApplicantApplicationSnapshot` and `getEmployerApplicantSnapshotSummary`), updated `routes/applicationRoute.js` (with the two new GET routes).
- [ ] **2.2** Confirm the FE deployment includes: `application.service.ts` with `getApplicationSnapshot()`, `job.service.ts` with `getApplicantSnapshotSummary()`, updated `job-applicants.component.ts` and `job-applicants.component.html` with `snapshotSummary` / `snapshotSummaryLoading` logic.
- [ ] **2.3** Check git HEAD of both repos on the production server or deployment platform — confirm both are at the expected commit SHA.
- [ ] **2.4** Confirm no pending migrations or BE restarts are needed after the DDL was applied.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 3. Employer Snapshot Card Tested with a Real Application

> Verifies the employer-side snapshot card renders correctly end-to-end in production (or staging with production-like data).

- [ ] **3.1** Log in as an employer account that has at least one active job with at least one applicant.
- [ ] **3.2** Navigate to the job's applicant list.
- [ ] **3.3** Click the action menu for an applicant and select "View Profile" (or equivalent action that sets `result.profile = true` in `viewMenu()`).
- [ ] **3.4** Verify the "Application Snapshot" card appears in the detail panel.
- [ ] **3.5** If `snapshotSummary.hasSnapshot` is true: confirm the completeness score (e.g., "70%") and completeness level badge are displayed.
- [ ] **3.6** If `snapshotSummary.matchLevel` is non-null: confirm the match level badge is displayed.
- [ ] **3.7** Confirm the `matchDisclaimer` text is rendered below the snapshot card.
- [ ] **3.8** Verify that viewing another employer's applicant (different company) returns a 403 — the snapshot card shows "No snapshot available" or a graceful empty state.
- [ ] **3.9** Test with an application that has NO snapshot yet (pre-deployment application): confirm the card shows "No snapshot available for this application." and does not break the profile view.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 4. Snapshot Creation Verified in Application Submit Flow

> Verifies that submitting a new application triggers snapshot creation and the rows land in the database.

- [ ] **4.1** Log in as an applicant with a complete profile (has job title, work experience, and skills).
- [ ] **4.2** Submit an application to an active job posting.
- [ ] **4.3** Confirm the submission succeeds with HTTP 200 / success message (snapshot creation must not block or error the submission).
- [ ] **4.4** Immediately after submission, check the DB: `SELECT id, source, completeness_score FROM gethired.application_completeness_snapshots WHERE application_id = '<new_application_id>';` — must return one row with `source='application_submit'` and a score > 0.
- [ ] **4.5** Check: `SELECT id, source FROM gethired.application_snapshots WHERE application_id = '<new_application_id>';` — must return one row.
- [ ] **4.6** Check: `SELECT id, source, match_score FROM gethired.match_snapshots WHERE application_id = '<new_application_id>';` — must return one row (match_score may be null if job has no required skills).
- [ ] **4.7** Submit the same application again from the same account (expect 409 "You already applied" response) and confirm no duplicate snapshot rows were created (idempotency: still exactly one row per table per application).
- [ ] **4.8** Check BE logs for any `[applicationSnapshot] snapshot creation failed:` errors. If present, investigate.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 5. Ownership Checks Verified

> Verifies that authorization guards on both new endpoints correctly prevent cross-user and cross-company data access.

### 5a. Applicant self-view endpoint (`GET /applicant/application/snapshot`)

- [ ] **5a.1** Applicant A calls the endpoint with their own `applicationId` — expect HTTP 200 with snapshot data.
- [ ] **5a.2** Applicant A calls the endpoint with Applicant B's `applicationId` (same job, different applicant) — expect HTTP 403 Forbidden.
- [ ] **5a.3** Unauthenticated call (no Bearer token) — expect HTTP 401.
- [ ] **5a.4** Call with a non-existent `applicationId` — expect HTTP 404.
- [ ] **5a.5** Call with no `applicationId` query param — expect HTTP 400 "applicationId is required."

### 5b. Employer snapshot summary endpoint (`GET /job/applicant/snapshot-summary`)

- [ ] **5b.1** Employer from Company A calls with an `applicationId` for a job that Company A owns — expect HTTP 200 with snapshot summary.
- [ ] **5b.2** Employer from Company B calls with the same `applicationId` (Company A's job) — expect HTTP 403 Forbidden.
- [ ] **5b.3** Unauthenticated call (no Bearer token) — expect HTTP 401.
- [ ] **5b.4** Call with a non-existent `applicationId` — expect HTTP 404.
- [ ] **5b.5** Confirm the employer endpoint never returns `applicant_profile_snapshot` raw JSONB — only the summary fields (`completenessScore`, `completenessLevel`, `matchScore`, `matchLevel`, `hasSnapshot`, `matchDisclaimer`).

**Status:** [ ] PASS / [ ] BLOCKED

---

## Checklist Sign-Off

| Section | Status | Verified by | Date |
|---------|--------|-------------|------|
| 1. DB Migration Applied | | | |
| 2. Both Repos In Sync | | | |
| 3. Employer Card Tested | | | |
| 4. Snapshot Creation Verified | | | |
| 5. Ownership Checks Verified | | | |

**All sections must be PASS before this deployment is considered production-ready.**

---

## Known Open Items at Launch

These are not blocking but must be tracked (see GETHIRED_ACTIONS_RECENT_DEPLOYMENT_BACKLOG.md):

- SNAP-P1-001: Applicant self-view UI not yet built (endpoint exists, no FE consumer)
- SNAP-P1-002: No backfill for pre-deployment applications
- SNAP-P2-001: `snapshot_hash` column is always NULL (reserved, not implemented)
- SNAP-P2-002: Match score formula duplicated between snapshot service and signals service
