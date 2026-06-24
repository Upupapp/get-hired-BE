# GETHIRED APPLICATION SNAPSHOTS — Implementation Report

**Command:** GETHIRED_APPLICATION_SNAPSHOTS_COMPLETENESS_MATCH_SNAPSHOT_WORLD_CLASS_V2
**Date:** 2026-06-24

## What was built

### New Database Tables (3)
All in `gethired` schema, migration: `db/application_snapshots_ddl.sql`. Applied locally, confirmed OK.

1. **`gethired.application_snapshots`** — immutable submitted-state record (profile snapshot + job snapshot + document/answer metadata)
2. **`gethired.application_completeness_snapshots`** — persisted application completeness score (0–100, "excellent"/"strong"/"basic"/"incomplete")
3. **`gethired.match_snapshots`** — persisted match signals at submission time (skill evidence, match level, factor scores)

Each table has partial unique index on `(application_id) WHERE source = 'application_submit'` for idempotency.

### New Backend Service
**`services/applicationSnapshotService.js`** — Core snapshot builder:
- `createApplicationSnapshots()` — orchestrates all 3 snapshot types; never throws (best-effort)
- `scoreApplicationCompleteness()` — rubric v1 (required: profile+workExp+skills = 70%; recommended: education+CV+videoAnswers+certs = 30%)
- `buildApplicantProfileSnapshot()` — privacy-safe profile capture (24 excluded fields documented)
- `buildSubmittedDocumentsSnapshot()` / `buildSubmittedAnswersSnapshot()` — metadata only, never binaries
- `persistApplicationSnapshot()`, `persistCompletenessSnapshot()`, `persistMatchSnapshot()` — DB writers with ON CONFLICT DO NOTHING
- `getApplicationSnapshotSummaryForEmployer()` — summary view with disclaimer
- Exports: `SNAPSHOT_VERSION`, `COMPLETENESS_RUBRIC_VERSION`, `MATCH_ALGORITHM_VERSION`, `EXCLUDED_FIELDS`, `DISCLAIMER`

### Application Submit Integration
**`services/application.service.js`** — Added `createApplicationSnapshots()` call at end of `jobApply()`:
- Fire-and-forget (`.catch()` on the Promise, never awaited in the return path)
- Snapshot failure writes to console and is silently swallowed — application submit always succeeds
- Passes: `applicationId`, `applicantId`, `jobId`, `companyId` (from `job.companyId`), document arrays, interview answers

### New API Endpoints (2)
**`controllers/applicationController.js`** + **`routes/applicationRoute.js`**:

1. `GET /applicant/application/snapshot?applicationId=<id>` (auth required)
   - Caller must own the application (candidate_id check)
   - Returns: completeness score, level, completed sections, missing required/recommended
   - Privacy note and disclaimer included in response

2. `GET /job/applicant/snapshot-summary?applicationId=<id>` (auth required)
   - Caller's company must own the job (company ownership check)
   - Returns: hasSnapshot, completenessScore, completenessLevel, matchScore, matchLevel, matchDisclaimer
   - Never exposes raw applicant profile data or cross-company data

### BE Fix: applicationId now in applicant list
**`services/job.service.js`** — `mappedBasicApplicantDetails()` now includes `applicationId: raw.job_application_id` so the employer FE can look up snapshot by application.

### New FE Service Methods (2)
- **`job.service.ts`** — `getApplicantSnapshotSummary(applicationId)` → `GET /job/applicant/snapshot-summary`
- **`application.service.ts`** — `getApplicationSnapshot(applicationId)` → `GET /applicant/application/snapshot`

### Employer FE Integration
**`job-applicants.component.ts`**:
- `snapshotSummary` and `snapshotSummaryLoading` state properties
- `loadSnapshotSummary(applicationId)` — best-effort, `catchError(() => of(null))`
- Called when employer opens applicant detail panel (from `viewMenu()` via `result.data.data.applicationId`)

**`job-applicants.component.html`**:
- New "Application Snapshot" card shown above `app-application-preview` in the detail view
- Shows: completeness score + level badge (color-coded: green/excellent+strong, yellow/basic, grey/incomplete)
- Shows: match level at submission (green/strong, blue/possible, grey/low)
- Shows: match disclaimer from backend
- Only shown when `snapshotSummary` is available; graceful loading state

## Security / Privacy Constraints (All Met)
- No protected attributes in snapshot (24 EXCLUDED_FIELDS documented)
- No file/video binaries stored in JSON
- No cross-company data exposure (company ownership verified before every employer endpoint)
- Applicant can only see their own snapshot (candidate_id ownership check)
- Match snapshots are guidance only, never auto-rank/reject/hide signals
- No new table affects existing `job_applicants` writes
- Best-effort pattern ensures no application submission can fail due to snapshot errors

## Build Status
- FE production build: PASS (no new errors, same pre-existing warnings)
- BE module loads: PASS (`applicationController`, `applicationRoute`, `applicationSnapshotService` all load clean)
- DB migration: PASS (applied locally, 3 tables + 14 indexes created)

## What's NOT done (deferred/backlog)
- Applicant FE: application history completeness badge (service method added, component not updated — applicant history screen needs a separate pass)
- Backfill job: no retroactive snapshot creation for existing applications (no-op is safe; employers just see "No snapshot available" for old applications)
- Dashboard metric aggregation: `GET /company/dashboard/metrics/completeness` — aggregate completeness distribution across all jobs
- Snapshot versioning: `snapshot_hash` column reserved but not populated
- Webhook/event notification when match snapshot is ready

## Files Changed

**BE:**
- NEW: `db/application_snapshots_ddl.sql`
- NEW: `services/applicationSnapshotService.js`
- MODIFIED: `services/application.service.js` (import + fire-and-forget call in `jobApply()`)
- MODIFIED: `controllers/applicationController.js` (2 new controllers + imports)
- MODIFIED: `routes/applicationRoute.js` (2 new routes)
- MODIFIED: `services/job.service.js` (added `applicationId` to `mappedBasicApplicantDetails()`)

**FE:**
- MODIFIED: `src/app/job/job.service.ts` (added `getApplicantSnapshotSummary()`)
- MODIFIED: `src/app/application/application.service.ts` (added `getApplicationSnapshot()`)
- MODIFIED: `src/app/job/job-applicants/job-applicants.component.ts` (snapshot state + load)
- MODIFIED: `src/app/job/job-applicants/job-applicants.component.html` (snapshot card in detail view)

**Docs:**
- NEW: `docs/GETHIRED_APPLICATION_SNAPSHOTS_CURRENT_STATE_AUDIT_V2.md`
- NEW: `docs/GETHIRED_APPLICATION_SNAPSHOT_DATA_CONTRACT_V2.md`
- NEW: `docs/GETHIRED_APPLICATION_SNAPSHOTS_IMPLEMENTATION_REPORT_V2.md` (this file)
