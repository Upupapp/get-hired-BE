# GETHIRED — Launch Checklist
## Application Snapshots System — Batch Endpoint + Backfill + CTA Cycle
**Generated:** 2026-06-24
**Deployment:** FE 20a44c5 / BE 422d340
**Supersedes:** Previous launch checklist (FE 76c545e / BE faa2232)

---

## Instructions

Work through each item in order. Do not mark an item complete without direct verification. Items marked BLOCKED must be resolved before the deployment is considered production-ready. Sections 1 and 2 are hard prerequisites — complete them before any other section.

---

## 1. DB Migration Applied to Production

> Hard prerequisite for this deployment and for running the backfill script. If the tables are missing, the batch endpoint (BE 422d340) will throw on every call, catchError will silence it, and all rows on "My Applications" will show "not available." The backfill script will crash immediately.

- [ ] **1.1** Connect to the production database with read access.
- [ ] **1.2** Run: `SELECT to_regclass('gethired.application_snapshots');` — result must NOT be null.
- [ ] **1.3** Run: `SELECT to_regclass('gethired.application_completeness_snapshots');` — result must NOT be null.
- [ ] **1.4** Run: `SELECT to_regclass('gethired.match_snapshots');` — result must NOT be null.
- [ ] **1.5** Run: `SELECT COUNT(*) FROM gethired.application_snapshots;` — must return without error.
- [ ] **1.6** Verify the partial unique index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'application_snapshots' AND indexname = 'application_snapshots_application_id_source_unique';` — must return one row.
- [ ] **1.7** Record the timestamp the migration was applied and the person who applied it.

**Status:** [ ] PASS / [ ] BLOCKED (apply `db/application_snapshots_ddl.sql` to production before proceeding to any other section)

---

## 2. Both Repos Deployed in Sync (FE 20a44c5 + BE 422d340)

> Verifies that the BE and FE changes are both live and compatible.

- [ ] **2.1** Confirm the BE deployment at 422d340 includes: updated `controllers/applicationController.js` (with `getApplicantApplicationSnapshotsBatch` and the new route), updated `routes/applicationRoute.js` (with `GET /applicant/application/snapshots`), updated `services/applicationSnapshotService.js` (with companyId null guard), `scripts/backfill_application_snapshots.js`.
- [ ] **2.2** Confirm the FE deployment at 20a44c5 includes: `ApplicantApplicationsComponent` using the batch endpoint (`getApplicationSnapshots` single call replacing forkJoin), `appsSub` subscription pattern, `ngOnDestroy`, "Update your profile" routerLink, `privacyNote` display.
- [ ] **2.3** Check git HEAD of both repos on the production server or deployment platform — confirm both are at the expected commit SHAs.
- [ ] **2.4** Confirm no pending migrations or BE restarts are needed.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 3. Batch Snapshot Endpoint Tested

> Verifies the new batch endpoint operates correctly end-to-end.

- [ ] **3.1** Log in as an applicant with at least two applications. Note their `jobApplicationId` values from the DB or from the network tab on `/user/applications`.
- [ ] **3.2** Call `GET /applicant/application/snapshots?applicationIds=<id1>,<id2>` with a valid Bearer token. Expect HTTP 200 and `data.snapshots` as a map keyed by application ID.
- [ ] **3.3** Verify each snapshot entry includes: `hasSnapshot`, `completenessScore`, `completenessLevel`, `missingRequired`, `missingRecommended`, `disclaimerNote`, `privacyNote`.
- [ ] **3.4** Call with an applicationId owned by a different applicant mixed into the list. Verify that ID is silently omitted from the response (not a 403).
- [ ] **3.5** Call with more than 50 IDs. Expect HTTP 400 "applicationIds must be a non-empty comma-separated list of up to 50 IDs."
- [ ] **3.6** Call with no `applicationIds` param. Expect HTTP 400 "applicationIds is required."
- [ ] **3.7** Call with an empty string `applicationIds=`. Expect HTTP 400.
- [ ] **3.8** Call unauthenticated (no Bearer token). Expect HTTP 401.
- [ ] **3.9** Confirm in BE logs that one request is handled (not N) for the batch call.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 4. Applicant "My Applications" Page — Batch Loading Tested

> Verifies the FE now uses the batch endpoint and renders correctly.

### 4a. Normal load with applications

- [ ] **4a.1** Log in as an applicant with at least two applications.
- [ ] **4a.2** Navigate to `/user/applications` and open the network tab.
- [ ] **4a.3** Verify exactly ONE request to `/applicant/application/snapshots` (not N requests to `/applicant/application/snapshot`).
- [ ] **4a.4** Verify skeleton rows appear while the batch call is in-flight.
- [ ] **4a.5** After the batch call resolves, verify all rows reveal simultaneously (expected behavior with the shared snapshotsLoaded flag).
- [ ] **4a.6** Verify each row with a real snapshot shows: completeness score, level badge, missingRequired tips (if any), missingRecommended tips (if any), disclaimerNote, privacyNote.
- [ ] **4a.7** Verify the "Update your profile" link is present for rows with missing required items and navigates to `/user/profile/edit`.
- [ ] **4a.8** Verify `privacyNote` is rendered below the completeness data (not just in the API response but visible in the UI).

### 4b. Pre-snapshot applications

- [ ] **4b.1** Log in as an applicant with an application submitted before the snapshot system was deployed (no row in `application_snapshots` with `source = 'application_submit'`).
- [ ] **4b.2** Navigate to `/user/applications`.
- [ ] **4b.3** Verify that application row shows `hasSnapshot: false` path — "Snapshot not available — this application was submitted before completeness tracking was enabled." (or equivalent).
- [ ] **4b.4** Verify no error or blank space where the snapshot section would be.

### 4c. Batch call failure (simulated)

- [ ] **4c.1** Temporarily block the `/applicant/application/snapshots` endpoint in dev/staging.
- [ ] **4c.2** Navigate to `/user/applications`.
- [ ] **4c.3** Verify `catchError` fires: all rows show the "not available" silent fallback (no error banner, no broken layout).
- [ ] **4c.4** Verify the application list itself (job title, company, status) is unaffected.

### 4d. Empty state

- [ ] **4d.1** Log in as an applicant with no applications.
- [ ] **4d.2** Navigate to `/user/applications`.
- [ ] **4d.3** Verify the empty state renders: "No applications yet", description text, and "Find jobs" CTA.
- [ ] **4d.4** Verify clicking "Find jobs" navigates to `/jobs`.

### 4e. Error state and retry

- [ ] **4e.1** Block the `GET /candidates/appliedjobslist` endpoint in dev/staging.
- [ ] **4e.2** Navigate to `/user/applications`.
- [ ] **4e.3** Verify error message and "Try again" button.
- [ ] **4e.4** Click "Try again" — verify the applications and batch snapshot call re-fires.
- [ ] **4e.5** Verify `snapshotsMap` is cleared on retry (no stale data from a previous successful load).

**Status:** [ ] PASS / [ ] BLOCKED

---

## 5. companyId Null Guard Verified

> Verifies the null guard in createApplicationSnapshots prevents NOT NULL violations.

- [ ] **5.1** Check BE source: confirm `createApplicationSnapshots` in `services/applicationSnapshotService.js` has an early return when `companyId` is null/undefined, with a structured warning log.
- [ ] **5.2** In dev/staging: submit an application to a job where the job's `company_id` is null in the DB (or mock `companyId: null` in the service call). Confirm:
  - The application submission itself succeeds (HTTP 200).
  - No Postgres NOT NULL violation appears in BE logs.
  - A structured warning log entry appears: `[createApplicationSnapshots] skipping: companyId is null` (or equivalent), including `applicationId` and `jobId`.
  - No row is inserted in any of the three snapshot tables for that application.
- [ ] **5.3** Confirm that for a normal application with a valid `companyId`, all three snapshot rows are still written (no regression from the guard).

**Status:** [ ] PASS / [ ] BLOCKED

---

## 6. Backfill Script — Pre-Flight Verification

> Verifies readiness to run the backfill script. Do NOT run the live backfill until all items here are PASS.

- [ ] **6.1** Section 1 (DDL verification) must be PASS before proceeding. Do not run the backfill if any snapshot table is missing.
- [ ] **6.2** Run the backfill in dry-run mode against production: `node scripts/backfill_application_snapshots.js --dry-run`. Verify it prints the count of un-snapshotted applications and exits cleanly.
- [ ] **6.3** Run the backfill with `--limit=5` (live, not dry-run) against a staging environment with the real schema. Verify 5 rows are inserted in `application_completeness_snapshots` with `source = 'backfill_current_data'`.
- [ ] **6.4** Rerun with `--limit=5` against the same staging environment. Verify no duplicate rows are created (idempotency: the LEFT JOIN filter skips already-backfilled rows and `ON CONFLICT DO NOTHING` handles any race).
- [ ] **6.5** Check BE logs during the staging run for any `[createApplicationSnapshots] skipping:` or partial-error entries. Investigate before running on prod.
- [ ] **6.6** Note: the script does NOT have a pre-flight DDL check of its own (tracked as BACKFILL-P0-001 — not yet fixed). Rely on section 1 of this checklist as the gate.
- [ ] **6.7** Schedule the live prod backfill run during a low-traffic window. Monitor logs in real time.
- [ ] **6.8** After the live run: `SELECT COUNT(*) FROM gethired.application_completeness_snapshots WHERE source = 'backfill_current_data';` — count should equal the number reported by the dry-run query.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 7. Snapshot Creation Verified in Application Submit Flow

> Verifies that submitting a new application still triggers snapshot creation correctly (regression test).

- [ ] **7.1** Log in as an applicant with a complete profile.
- [ ] **7.2** Submit an application to an active job posting.
- [ ] **7.3** Confirm submission succeeds with HTTP 200 and snapshot creation does not block or error the submission.
- [ ] **7.4** Check the DB: `SELECT id, source, completeness_score FROM gethired.application_completeness_snapshots WHERE application_id = '<new_id>';` — must return one row with `source='application_submit'` and score > 0.
- [ ] **7.5** Check: `SELECT id, source FROM gethired.application_snapshots WHERE application_id = '<new_id>';` — must return one row.
- [ ] **7.6** Check: `SELECT id, source, match_score FROM gethired.match_snapshots WHERE application_id = '<new_id>';` — must return one row.
- [ ] **7.7** Navigate to `/user/applications` as the same applicant — verify the new application shows completeness score and tips via the batch endpoint.
- [ ] **7.8** Submit the same application again (expect 409) — confirm no duplicate snapshot rows.
- [ ] **7.9** Check BE logs for any `[applicationSnapshot] snapshot creation failed:` errors.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 8. Ownership and Auth Guards Verified

> Verifies authorization on all snapshot endpoints including the new batch endpoint.

### 8a. Batch endpoint (`GET /applicant/application/snapshots`)

- [ ] **8a.1** Applicant A calls with their own applicationIds — expect HTTP 200 with snapshot data for each owned ID.
- [ ] **8a.2** Applicant A calls with a mix of their own IDs and Applicant B's IDs — expect HTTP 200 with only Applicant A's IDs in the response (Applicant B's IDs silently omitted).
- [ ] **8a.3** Applicant A calls with ONLY Applicant B's IDs — expect HTTP 200 with `data.snapshots = {}` (empty map, not a 403).
- [ ] **8a.4** Unauthenticated call — expect HTTP 401.
- [ ] **8a.5** More than 50 IDs — expect HTTP 400.

### 8b. Single-application endpoint (`GET /applicant/application/snapshot`)

- [ ] **8b.1** Applicant A calls with their own `applicationId` — expect HTTP 200.
- [ ] **8b.2** Applicant A calls with Applicant B's `applicationId` — expect HTTP 403.
- [ ] **8b.3** Unauthenticated call — expect HTTP 401.
- [ ] **8b.4** Non-existent `applicationId` — expect HTTP 404.
- [ ] **8b.5** No `applicationId` param — expect HTTP 400.

### 8c. Employer endpoint (`GET /job/applicant/snapshot-summary`)

- [ ] **8c.1** Employer from Company A calls with an applicationId for Company A's job — expect HTTP 200.
- [ ] **8c.2** Employer from Company B calls with the same applicationId — expect HTTP 403.
- [ ] **8c.3** Non-existent applicationId — expect HTTP 403 (not 404 — enumeration oracle).
- [ ] **8c.4** Unauthenticated call — expect HTTP 401.
- [ ] **8c.5** Verify `Array.isArray(callerCompany)` guard: user with no company (getUserCompany returns `[]`) — expect HTTP 403.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 9. Known Open Items at Launch (Non-Blocking for FE 20a44c5 / BE 422d340)

These items must be tracked in the backlog but do not block deployment:

- SNAP-P0-001: DDL must be confirmed applied to production (listed here but is a hard blocker for section 1 and for the backfill)
- BACKFILL-P0-001: Backfill script has no programmatic pre-flight DDL check — operator must rely on section 1 of this checklist
- BATCH-P2-001: Batch endpoint source filter excludes backfill completeness rows — backfilled applications still show "not available" to applicants
- BACKFILL-P2-001: No resume-from-crash in the backfill script — a crash requires rerunning from scratch (safe but wasteful)
- BACKFILL-P2-002: Backfill completeness data not visually distinguished from real submission data (contingent on BATCH-P2-001)
- COMP-P2-007: No fragment anchors for tip deep-links — CTA lands at top of profile edit form
- COMP-P2-008: snapshotsLoaded still a shared flag — all skeletons spin during the batch call, reveal all at once
- COMP-P3-009: retry() still calls ngOnInit directly (subscription management is correct; naming contract is not)
- COMP-P3-010: Disclaimer does not say score is frozen at submission time
- SNAP-P2-001: snapshot_hash column is always NULL
- SNAP-P2-002: Match score formula duplicated between snapshot service and signals service
- SNAP-P1-003: No completeness distribution endpoint for employers

---

## Checklist Sign-Off

| Section | Status | Verified by | Date |
|---------|--------|-------------|------|
| 1. DB Migration Applied | | | |
| 2. Both Repos In Sync | | | |
| 3. Batch Endpoint Tested | | | |
| 4. My Applications Page — Batch Loading | | | |
| 5. companyId Null Guard | | | |
| 6. Backfill Script Pre-Flight | | | |
| 7. Snapshot Creation — Submit Flow | | | |
| 8. Ownership and Auth Guards | | | |

**All sections must be PASS before this deployment is considered production-ready.**
**Section 1 (DB Migration) is a hard prerequisite — complete it before proceeding to any other section.**
**Section 6 (Backfill Pre-Flight) must PASS before running the live backfill on production.**
