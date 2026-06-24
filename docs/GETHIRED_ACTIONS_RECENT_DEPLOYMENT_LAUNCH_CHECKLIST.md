# GETHIRED — Launch Checklist
## Applicant Completeness View + Application Snapshots System
**Generated:** 2026-06-24
**Deployment:** FE 76c545e / BE faa2232
**Supersedes:** Previous launch checklist (same file, Application Snapshots System)

---

## Instructions

Work through each item in order. Do not mark an item complete without direct verification. Anything marked BLOCKED must be resolved before the deployment is considered production-ready.

---

## 1. DB Migration Applied to Production

> Verifies that `application_snapshots_ddl.sql` was applied to the production Postgres instance. The applicant completeness view now makes N live calls to `GET /applicant/application/snapshot` on every page load — if the tables are missing, every call returns a 500, every row silently shows "not available," and snapshots are not being written.

- [ ] **1.1** Connect to the production database with read access.
- [ ] **1.2** Run: `SELECT to_regclass('gethired.application_snapshots');` — result must NOT be null.
- [ ] **1.3** Run: `SELECT to_regclass('gethired.application_completeness_snapshots');` — result must NOT be null.
- [ ] **1.4** Run: `SELECT to_regclass('gethired.match_snapshots');` — result must NOT be null.
- [ ] **1.5** Run: `SELECT COUNT(*) FROM gethired.application_snapshots;` — must return without error (count may be 0 if no applications submitted since deployment).
- [ ] **1.6** Verify the partial unique index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'application_snapshots' AND indexname = 'application_snapshots_application_id_source_unique';` — must return one row.
- [ ] **1.7** Record the timestamp the migration was applied and the person who applied it.

**Status:** [ ] PASS / [ ] BLOCKED (apply `db/application_snapshots_ddl.sql` to production before proceeding)

---

## 2. Both Repos Deployed in Sync (FE 76c545e + BE faa2232)

> Verifies that the BE and FE changes are both live and compatible.

- [ ] **2.1** Confirm the BE deployment at faa2232 includes: `services/applicationSnapshotService.js`, updated `controllers/applicationController.js` (with `getApplicantApplicationSnapshot` and `getEmployerApplicantSnapshotSummary`), updated `routes/applicationRoute.js` (with `GET /applicant/application/snapshot` and `GET /job/applicant/snapshot-summary`).
- [ ] **2.2** Confirm the FE deployment at 76c545e includes: `ApplicantApplicationsComponent` with `snapshotsMap`, `loadSnapshots()`, `snapshotFor()`, `forkJoin` snapshot loading, and the completeness snapshot section in the template; `applicant-applications.component.scss` with skeleton + badge + tip styles; `application.service.ts` with `getApplicationSnapshot()`.
- [ ] **2.3** Check git HEAD of both repos on the production server or deployment platform — confirm both are at the expected commit SHAs.
- [ ] **2.4** Confirm no pending migrations or BE restarts are needed after the DDL was applied.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 3. Applicant "My Applications" Page — Completeness View Tested

> Verifies the new applicant-facing completeness view renders correctly end-to-end.

### 3a. Applications with snapshots (submitted after snapshot deployment)

- [ ] **3a.1** Log in as an applicant with at least one application submitted after the snapshot system was deployed.
- [ ] **3a.2** Navigate to `/user/applications` ("My Applications").
- [ ] **3a.3** Verify that each application row shows a skeleton ("Loading application snapshot") while snapshots are loading.
- [ ] **3a.4** After loading completes, verify that the completeness score (e.g., "70%") is displayed.
- [ ] **3a.5** Verify that the completeness level badge is displayed (e.g., "Strong", "Basic", "Incomplete") with the correct color class:
  - "excellent" or "strong" → `bg-success` (green)
  - "basic" → `bg-warning text-dark` (yellow)
  - "incomplete" → `bg-secondary` (grey)
- [ ] **3a.6** If `snap.missingRequired` is non-empty: verify the required-improvements section is rendered with the heading "Complete your profile to strengthen future applications:" and a list of tip reasons.
- [ ] **3a.7** If `snap.missingRecommended` is non-empty: verify the optional-improvements section is rendered with the heading "Optional ways to stand out:" and a list of tip reasons.
- [ ] **3a.8** Verify the `disclaimerNote` text is rendered below the tip lists.
- [ ] **3a.9** Verify the completeness section has `aria-label="Application completeness"` and the score region has `aria-label="Completeness score"`.

### 3b. Applications without snapshots (submitted before snapshot deployment)

- [ ] **3b.1** Log in as an applicant with at least one application submitted before the snapshot system was deployed.
- [ ] **3b.2** Navigate to `/user/applications`.
- [ ] **3b.3** Verify the snapshot section loads (skeleton appears and resolves).
- [ ] **3b.4** Verify the pre-snapshot message is shown: "Snapshot not available — this application was submitted before completeness tracking was enabled."
- [ ] **3b.5** Verify this message appears instead of an error or blank space.

### 3c. Snapshot fetch failure (simulated)

- [ ] **3c.1** Temporarily throttle or block the `GET /applicant/application/snapshot` endpoint in dev/staging.
- [ ] **3c.2** Navigate to `/user/applications`.
- [ ] **3c.3** Verify that failed snapshot fetches show nothing in the snapshot section (the `#snapSilent` template is rendered — no error message, no broken layout).
- [ ] **3c.4** Verify the application list still shows (job title, company, status) correctly despite snapshot failures.
- [ ] **3c.5** Verify that one application's snapshot failure does not affect other applications' snapshot display.

### 3d. Empty state

- [ ] **3d.1** Log in as an applicant with no applications.
- [ ] **3d.2** Navigate to `/user/applications`.
- [ ] **3d.3** Verify the empty state renders: "No applications yet", description text, and "Find jobs" CTA button.
- [ ] **3d.4** Verify clicking "Find jobs" navigates to `/jobs`.

### 3e. Error state

- [ ] **3e.1** Block the `GET /candidates/appliedjobslist` endpoint in dev/staging.
- [ ] **3e.2** Navigate to `/user/applications`.
- [ ] **3e.3** Verify the error message appears: "We couldn't load your applications right now." and a "Try again" button.
- [ ] **3e.4** Verify clicking "Try again" re-triggers the applications + snapshots load.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 4. Employer Snapshot Card Tested with a Real Application

> Verifies the employer-side snapshot card (deployed in a previous cycle) still renders correctly after BE faa2232.

- [ ] **4.1** Log in as an employer account that has at least one active job with at least one applicant.
- [ ] **4.2** Navigate to the job's applicant list.
- [ ] **4.3** Click the action menu for an applicant and select "View Profile" (or equivalent action).
- [ ] **4.4** Verify the "Application Snapshot" card appears in the detail panel.
- [ ] **4.5** If `snapshotSummary.hasSnapshot` is true: confirm the completeness score and level badge are displayed.
- [ ] **4.6** If `snapshotSummary.matchLevel` is non-null: confirm the match level badge is displayed.
- [ ] **4.7** Confirm the `matchDisclaimer` text is rendered below the snapshot card.
- [ ] **4.8** Verify that viewing another employer's applicant (different company) returns a 403 — the snapshot card shows "No snapshot available" or a graceful empty state.
- [ ] **4.9** Test with a pre-snapshot application: confirm the card shows "No snapshot available for this application." and does not break the profile view.
- [ ] **4.10** Verify the BRAND skeleton animates while `snapshotSummaryLoading` is true and fades in on load completion.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 5. Snapshot Creation Verified in Application Submit Flow

> Verifies that submitting a new application triggers snapshot creation and the rows land in the database.

- [ ] **5.1** Log in as an applicant with a complete profile (has job title, work experience, and skills).
- [ ] **5.2** Submit an application to an active job posting.
- [ ] **5.3** Confirm submission succeeds with HTTP 200 (snapshot creation must not block or error the submission).
- [ ] **5.4** Check the DB: `SELECT id, source, completeness_score FROM gethired.application_completeness_snapshots WHERE application_id = '<new_id>';` — must return one row with `source='application_submit'` and a score > 0.
- [ ] **5.5** Check: `SELECT id, source FROM gethired.application_snapshots WHERE application_id = '<new_id>';` — must return one row.
- [ ] **5.6** Check: `SELECT id, source, match_score FROM gethired.match_snapshots WHERE application_id = '<new_id>';` — must return one row.
- [ ] **5.7** Navigate to `/user/applications` as the same applicant — verify the new application shows the completeness score and tips in the UI.
- [ ] **5.8** Submit the same application again (expect 409 "You already applied") — confirm no duplicate snapshot rows (idempotency: still exactly one row per table per application).
- [ ] **5.9** Check BE logs for any `[applicationSnapshot] snapshot creation failed:` errors after submission.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 6. Ownership and Auth Guards Verified

> Verifies authorization guards on both snapshot endpoints.

### 6a. Applicant self-view endpoint (`GET /applicant/application/snapshot`)

- [ ] **6a.1** Applicant A calls with their own `applicationId` — expect HTTP 200 with snapshot data.
- [ ] **6a.2** Applicant A calls with Applicant B's `applicationId` — expect HTTP 403 Forbidden.
- [ ] **6a.3** Unauthenticated call (no Bearer token) — expect HTTP 401.
- [ ] **6a.4** Call with a non-existent `applicationId` — expect HTTP 404.
- [ ] **6a.5** Call with no `applicationId` query param — expect HTTP 400 "applicationId is required."
- [ ] **6a.6** Verify the response never includes raw `applicant_profile_snapshot` JSONB — only `completenessScore`, `completenessLevel`, `completedSections`, `missingRequired`, `missingRecommended`, `disclaimerNote`, `privacyNote`.

### 6b. Employer snapshot summary endpoint (`GET /job/applicant/snapshot-summary`)

- [ ] **6b.1** Employer from Company A calls with `applicationId` for a job Company A owns — expect HTTP 200.
- [ ] **6b.2** Employer from Company B calls with the same `applicationId` — expect HTTP 403.
- [ ] **6b.3** Employer from Company A with a non-existent `applicationId` — expect HTTP 403 (enumeration oracle: same response as wrong company).
- [ ] **6b.4** Unauthenticated call — expect HTTP 401.
- [ ] **6b.5** Call with no `applicationId` — expect HTTP 400.
- [ ] **6b.6** Verify response includes only summary fields (`completenessScore`, `completenessLevel`, `matchScore`, `matchLevel`, `hasSnapshot`, `matchDisclaimer`) — no raw profile JSONB.
- [ ] **6b.7** Verify the `Array.isArray(callerCompany)` guard works: simulate a user with no company (callerCompany returns `[]`) — expect HTTP 403.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 7. Known Open Items at Launch (Non-Blocking)

These items must be tracked in the backlog but do not block launch:

- SNAP-P0-001: DDL must be confirmed applied to production before this checklist can be considered PASS (listed here but is a hard blocker for section 1)
- SNAP-P1-002: No backfill for pre-deployment applications (graceful fallback is in place)
- SNAP-P1-004: companyId null risk — silently drops snapshots for jobs with null companyId; not yet fixed
- SNAP-P2-001: `snapshot_hash` column is always NULL (reserved, not implemented)
- SNAP-P2-002: Match score formula duplicated between snapshot service and signals service
- COMP-P1-005: N API calls on My Applications page load — no batch endpoint yet
- COMP-P1-006: No CTA from completeness tips to profile edit page
- COMP-P2-007: No fragment anchors for tip deep-links
- COMP-P2-008: Shared `snapshotsLoaded` flag means one slow call blocks all skeletons

---

## Checklist Sign-Off

| Section | Status | Verified by | Date |
|---------|--------|-------------|------|
| 1. DB Migration Applied | | | |
| 2. Both Repos In Sync | | | |
| 3. Applicant Completeness View Tested | | | |
| 4. Employer Snapshot Card Tested | | | |
| 5. Snapshot Creation Verified | | | |
| 6. Ownership and Auth Guards Verified | | | |

**All sections must be PASS before this deployment is considered production-ready.**
**Section 1 (DB Migration) is a hard prerequisite — complete it before proceeding to any other section.**
