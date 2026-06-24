# GETHIRED ACTIONS — Recent Deployment Backlog
## Application Snapshots System
**Generated:** 2026-06-24

Schema: `Action ID | Title | Category | Problem | Priority | Affected files | Effort | Acceptance criteria | Recommended command`

---

## P0 — Blocking

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P0-001 |
| **Title** | Confirm DDL applied to production |
| **Category** | Ops / DB Migration |
| **Problem** | `application_snapshots_ddl.sql` exists and the service code assumes all three tables exist, but there is no confirmation the migration was applied to the production Postgres instance. Every `jobApply()` since deployment silently swallows snapshot errors — if tables are missing, zero snapshots are being stored and a backfill window is growing silently. |
| **Priority** | P0 |
| **Affected files** | `db/application_snapshots_ddl.sql`, production Postgres schema |
| **Effort** | XS |
| **Acceptance criteria** | Run `SELECT COUNT(*) FROM gethired.application_snapshots;` against production. If error, apply DDL immediately. Confirm zero errors. Document the timestamp the migration was applied. |
| **Recommended command** | Manual ops — no code change |

---

## P1 — High Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-001 |
| **Title** | Add snapshot data to applicant application history view |
| **Category** | Feature / FE |
| **Problem** | `ApplicationService.getApplicationSnapshot()` in `application.service.ts` is fully wired to `GET /applicant/application/snapshot` and the backend controller is auth-gated and ownership-verified. However, no Angular component ever calls this method. Applicants submit applications and receive no feedback about what was captured about them, how complete their application was, or what they are missing. The `completenessScore`, `completenessLevel`, `missingRequired`, and `missingRecommended` fields are returned by the API but are entirely unused in the UI. |
| **Priority** | P1 |
| **Affected files** | `get-hired-FE/src/app/application/application.service.ts`, `get-hired-FE/src/app/applicant-panel/applicant-jobs/applicant-jobs.component.ts` (or application history page), `get-hired-FE/src/app/application/state/*` |
| **Effort** | M |
| **Acceptance criteria** | (1) After submitting an application, the applicant can navigate to their application history and see a completeness card for each application. (2) The card shows the `completenessScore` percentage, `completenessLevel` badge, and the list of `missingRequired` items. (3) The card includes the `disclaimerNote` and `privacyNote` from the API response. (4) If no snapshot exists (`hasSnapshot: false`), the card shows a graceful "not yet available" state. (5) The `getApplicationSnapshot` call is best-effort — failure must not break the application history page. |
| **Recommended command** | `/NOTIFY` — to also surface completeness tips as actionable notifications |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-002 |
| **Title** | Backfill snapshots for existing applications |
| **Category** | Data / Migration |
| **Problem** | The snapshot service was deployed after applications already exist in `job_applicants`. No `application_snapshots_ddl.sql` backfill job exists. Applications submitted before the deployment date have no rows in any of the three snapshot tables. The `createApplicationSnapshots` service already supports `source='backfill_current_data'` in its provenance text, indicating backfill was anticipated but the script was never written. Backfill data will reflect current profile/job state (not submission-time state), so the provenance `note` field already contains the correct disclaimer. |
| **Priority** | P1 |
| **Affected files** | New script: `db/backfill_application_snapshots.sql` or `scripts/backfillSnapshots.js`, `services/applicationSnapshotService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) A script exists that iterates all `job_applicants` rows that have no matching row in `application_snapshots`. (2) For each, it calls `createApplicationSnapshots` with `source='backfill_current_data'`. (3) The script is idempotent — safe to re-run. (4) After running, `SELECT COUNT(*) FROM gethired.application_snapshots` equals or exceeds `SELECT COUNT(*) FROM gethired.job_applicants`. (5) All backfilled rows have `source='backfill_current_data'` and the provenance note is accurate. (6) Script logs errors per-application without halting. |
| **Recommended command** | Manual / one-time ops script |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-003 |
| **Title** | Dashboard metric endpoint for completeness distribution across company jobs |
| **Category** | Feature / BE + FE |
| **Problem** | Employers have per-application completeness scores in `application_completeness_snapshots` but no aggregate view. A pipeline overview widget showing the distribution (e.g., how many applicants are "excellent" / "strong" / "basic" / "incomplete" across all their open jobs) would be immediately useful for triage. The `acs_completeness_level_idx` and `acs_company_id_idx` indexes in the DDL already anticipate this query. |
| **Priority** | P1 |
| **Affected files** | `controllers/applicationController.js`, `routes/applicationRoute.js`, `get-hired-FE/src/app/employer-panel/*` |
| **Effort** | M |
| **Acceptance criteria** | (1) New endpoint `GET /job/completeness-distribution?companyId=<id>` (or scoped to the authenticated user's company). (2) Returns aggregate counts by `completeness_level` across all company jobs. (3) Optionally accepts `jobId` to scope to a single job. (4) Enforces company ownership — only the authenticated employer can query their own company's data. (5) A FE widget in the employer pipeline overview displays the distribution. (6) If no snapshots exist yet, returns empty/zero counts gracefully. |
| **Recommended command** | Standard feature development |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-004 |
| **Title** | Fix null companyId NOT NULL constraint risk at snapshot insert |
| **Category** | Bug / BE |
| **Problem** | In `application.service.js` line 150, `createApplicationSnapshots` is called with `companyId: job.companyId \|\| null`. However, all three snapshot tables declare `company_id varchar NOT NULL`. If `jobDetails()` returns a job object where `companyId` is undefined or null (possible if the `jobDetails` mapper does not populate it for all job types), the `INSERT` will fail with a Postgres NOT NULL constraint violation. This error is silently swallowed by the fire-and-forget `.catch()`, meaning snapshots are silently dropped for any such application. |
| **Priority** | P1 |
| **Affected files** | `services/application.service.js` (line 150), `services/applicationSnapshotService.js` (`persistApplicationSnapshot`, `persistCompletenessSnapshot`, `persistMatchSnapshot`), `services/job.service.js` (`jobDetails` mapper) |
| **Effort** | XS |
| **Acceptance criteria** | (1) Before calling `persistApplicationSnapshot`, guard: if `companyId` is null/undefined, log a warning and either skip snapshot creation or fall back to an empty string sentinel. (2) Alternatively, confirm `jobDetails()` always returns a non-null `companyId` and add a unit assertion. (3) Zero DB NOT NULL constraint errors in logs for new applications. |
| **Recommended command** | Standard bug fix |

---

## P2 — Medium Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-001 |
| **Title** | Implement snapshot_hash integrity verification |
| **Category** | Security / Data Integrity |
| **Problem** | `application_snapshots.snapshot_hash` is declared in the DDL (`varchar NULL`) and is reserved for integrity verification, but `persistApplicationSnapshot` never computes or writes this value. The column is always NULL. Without a hash, there is no way to verify that a snapshot's JSONB payload has not been tampered with since storage. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistApplicationSnapshot`), `db/application_snapshots_ddl.sql` |
| **Effort** | S |
| **Acceptance criteria** | (1) Before insert, compute `SHA-256(JSON.stringify(profileSnapshot) + JSON.stringify(jobSnapshot) + JSON.stringify(docsSnapshot) + applicationId)` and write to `snapshot_hash`. (2) A separate `verifySnapshotIntegrity(applicationId)` helper function recomputes the hash and compares it to the stored value. (3) `snapshot_hash` is NOT NULL after any new insert. (4) Existing NULL rows are acceptable (pre-implementation). (5) Unit test for hash computation and verification. |
| **Recommended command** | `/SECURE` pass to validate the integrity design |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-002 |
| **Title** | Delegate match score calculation in persistMatchSnapshot to canonical service |
| **Category** | Architecture / Deduplication |
| **Problem** | `persistMatchSnapshot` in `applicationSnapshotService.js` (lines 404–411) hand-rolls its own match score formula: `(matchedRequired.length / total) * 60 + (hasCv ? 40 : 0)`. This duplicates `REQUIRED_SKILLS_WEIGHT = 60` and `APPLICATION_COMPLETENESS_WEIGHT = 40` from `employerApplicantSignalsService.js`. The `totalScore` already computed by `getApplicantFitSignals` (which `persistMatchSnapshot` receives as `fitSignals`) is not passed through — instead it is re-derived with a slightly different formula (the existing service divides by `jobRequiredSkills.length`; `persistMatchSnapshot` divides by `matchedRequired.length + missingRequired.length` which can differ when those arrays are subsets). If weights are updated in the signals service, `match_snapshots.match_score` will silently diverge. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistMatchSnapshot`), `services/match/employerApplicantSignalsService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) `getApplicantFitSignals` returns (or a new helper exposes) the computed `totalScore` as a field on its return object. (2) `persistMatchSnapshot` uses that value directly instead of re-deriving it. (3) The constants `REQUIRED_SKILLS_WEIGHT` and `APPLICATION_COMPLETENESS_WEIGHT` are defined in exactly one place. (4) A test asserts that `match_snapshots.match_score` for a known application equals what `getApplicantFitSignals` would compute for the same inputs. |
| **Recommended command** | `/MATCHED` QA pass after fixing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-003 |
| **Title** | Unit test coverage for applicationSnapshotService.js |
| **Category** | Testing |
| **Problem** | `applicationSnapshotService.js` contains several pure/mostly-pure functions that have no test coverage in the project: `scoreApplicationCompleteness`, `buildApplicantProfileSnapshot`, `buildJobSnapshot`, `buildSubmittedDocumentsSnapshot`, `buildSubmittedVideoAnswersSnapshot`, and the idempotency guarantee (ON CONFLICT DO NOTHING). The only `.spec.*` files found in the BE repo are inside `node_modules`. A regression in the completeness rubric could go undetected until an employer reports wrong scores. |
| **Priority** | P2 |
| **Affected files** | New: `services/__tests__/applicationSnapshotService.test.js`, `services/applicationSnapshotService.js` |
| **Effort** | M |
| **Acceptance criteria** | (1) `scoreApplicationCompleteness` is tested with: all fields present (expect score >= 90, level = "excellent"), only required fields present (expect score ~70, level = "strong"), no fields present (expect score 0, level = "incomplete"), only optional fields (expect score ~30). (2) `buildApplicantProfileSnapshot` is tested: null profile returns `{ available: false }`, valid profile excludes all `EXCLUDED_FIELDS` keys, URL-only fields for `videoCvUrl`. (3) `persistApplicationSnapshot` is mocked and a test confirms `ON CONFLICT DO NOTHING` is used (not `ON CONFLICT DO UPDATE`). (4) `scoreApplicationCompleteness` never mutates its input arguments. (5) All tests pass in CI. |
| **Recommended command** | `/TEST` after writing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-004 |
| **Title** | Admin view to inspect snapshot data per application |
| **Category** | Feature / Admin |
| **Problem** | `adminController.js` has no snapshot-related endpoints. Operations and support staff cannot inspect snapshot rows for a specific application to debug issues (e.g., "why is the completeness score wrong?", "was a snapshot actually created?", "what profile data was captured at submission?"). The data exists in the DB but is inaccessible without direct SQL access. |
| **Priority** | P2 |
| **Affected files** | `controllers/adminController.js`, `routes/adminRoute.js`, `get-hired-FE/src/app/admin-panel/` |
| **Effort** | M |
| **Acceptance criteria** | (1) New admin endpoint: `GET /admin/application-snapshot?applicationId=<id>` returns all three snapshot rows for an application (application_snapshot, completeness_snapshot, match_snapshot). (2) Endpoint is gated behind admin auth middleware. (3) Response includes raw JSONB fields so admin can read the full captured profile and job state. (4) An admin UI table or detail view displays snapshot data for a selected application. (5) No applicant-facing data is exposed to non-admins via this route. |
| **Recommended command** | Standard feature development |

---

## P3 — Low Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-001 |
| **Title** | Surface completeness improvement tips to applicant in dashboard |
| **Category** | Feature / UX |
| **Problem** | The completeness snapshot API response includes `missingRequired` and `missingRecommended` arrays with human-readable `label` and `reason` fields. These are never shown to applicants, who therefore have no way to act on completeness feedback to improve future applications. The data infrastructure is ready; only a UI surface is missing. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-dashboard/`, `application.service.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) Applicant dashboard includes an "Improve your application" card that calls `getApplicationSnapshot` for recent applications. (2) For each missing required item, a clear tip is shown (e.g., "Add at least one work experience entry"). (3) For each missing recommended item, a secondary-level suggestion is shown. (4) The card shows the `disclaimerNote` ("completeness measures information, not candidate quality"). (5) Card is hidden when all required items are complete. |
| **Recommended command** | `/NOTIFY` to coordinate notification triggers alongside this UI |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-002 |
| **Title** | Webhook or event notification when snapshot is ready |
| **Category** | Architecture / Integration |
| **Problem** | Snapshot creation is fire-and-forget inside `jobApply()`. Downstream consumers (e.g., analytics, CRM, notification service) have no way to know when a snapshot is ready. If a future notification system needs to send "your application completeness score is ready" or an analytics pipeline needs to aggregate fresh scores, it must poll the DB rather than react to an event. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` (`createApplicationSnapshots`), future event/webhook infrastructure |
| **Effort** | S |
| **Acceptance criteria** | (1) After all three snapshots are successfully persisted, `createApplicationSnapshots` emits an internal event (e.g., a Node.js EventEmitter event or a row insert into a `snapshot_events` table) with `{ applicationId, applicantId, jobId, completenessScore, matchLevel }`. (2) The event emission itself is non-blocking — failure must not cause `createApplicationSnapshots` to throw. (3) At least one consumer (even a log-only consumer) is registered to the event in production. (4) Unit test verifies event is emitted on success and not emitted on total failure. |
| **Recommended command** | Standard infrastructure work; coordinate with `/NOTIFY` |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-003 |
| **Title** | Relocate DISCLAIMER to a single canonical location |
| **Category** | Architecture / Maintainability |
| **Problem** | `applicationSnapshotService.js` imports `DISCLAIMER` from `employerApplicantSignalsService.js` and then re-exports it. This means callers who import `DISCLAIMER` from the snapshot service have an indirect dependency on the match service. If either import chain is refactored, the disclaimer can silently become undefined or stale. A single canonical location (e.g., a `constants/matchConstants.js` file or `constants/disclaimers.js`) would be cleaner. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js`, `services/match/employerApplicantSignalsService.js`, new `constants/disclaimers.js` (or equivalent) |
| **Effort** | XS |
| **Acceptance criteria** | (1) `DISCLAIMER` is defined in exactly one source location. (2) Both `employerApplicantSignalsService.js` and `applicationSnapshotService.js` import from that location. (3) No file re-exports a value it did not define. (4) Existing behavior is unchanged — same disclaimer text surfaces in all endpoints. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-004 |
| **Title** | Extract getUserCompany from companiesController into a service |
| **Category** | Architecture / Coupling |
| **Problem** | `applicationController.js` imports `getUserCompany` from `controllers/companiesController.js`. Cross-importing controller helpers from other controllers creates tight coupling and circular-import risk as the codebase grows. Controller functions should not be shared — shared logic belongs in service files. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js`, `controllers/companiesController.js`, `services/company.service.js` |
| **Effort** | XS |
| **Acceptance criteria** | (1) `getUserCompany` is moved to `services/company.service.js` (or a new `services/companyAccess.service.js`). (2) Both `companiesController.js` and `applicationController.js` import from the service, not from each other. (3) All existing tests (if any) pass after the move. (4) No behavior change. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-005 |
| **Title** | Add comment clarifying scoreApplicationCompleteness video-answer detection chain |
| **Category** | Maintainability / Documentation |
| **Problem** | In `createApplicationSnapshots` (line 548), `scoreApplicationCompleteness` is called with `answersSnapshot.answers.filter(a => a.hasAnswerFile)` as the `submittedVideoAnswers` argument. This is a mapped snapshot object (already transformed from raw `interviewAnswers`), not the original input. While the result is currently correct, the indirection is non-obvious and a future maintainer might change the transformation in `buildSubmittedAnswersSnapshot` without realizing this affects the completeness scoring input. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` (line 548) |
| **Effort** | XS |
| **Acceptance criteria** | (1) A short inline comment at the `scoreApplicationCompleteness` call site explains that `submittedVideoAnswers` is derived from the snapshot's mapped answers (not the raw `interviewAnswers`) and clarifies why this is intentional. (2) No behavior change. |
| **Recommended command** | None — code comment only |

---

## Summary Table

| Action ID | Title | Priority | Effort |
|-----------|-------|----------|--------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | XS |
| SNAP-P1-001 | Applicant snapshot self-view UI | P1 | M |
| SNAP-P1-002 | Backfill script for existing applications | P1 | S |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | M |
| SNAP-P1-004 | Fix null companyId NOT NULL risk | P1 | XS |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | S |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | S |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | M |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | M |
| SNAP-P3-001 | Completeness improvement tips in dashboard | P3 | S |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | S |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | XS |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | XS |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | XS |

**Total actions: 14** (P0: 1, P1: 4, P2: 4, P3: 5)
