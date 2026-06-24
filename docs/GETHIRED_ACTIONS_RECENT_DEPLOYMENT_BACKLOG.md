# GETHIRED ACTIONS — Recent Deployment Backlog
## Application Snapshots System — Batch Endpoint + Backfill + CTA Cycle
**Generated:** 2026-06-24
**Deployment:** FE 20a44c5 / BE 422d340
**Supersedes:** Previous backlog (same file, FE 76c545e / BE faa2232 cycle)

Schema: `Action ID | Title | Category | Problem | Priority | Affected files | Effort | Acceptance criteria | Recommended command`

---

## Status of All Carried-Over Items

| Action ID | Title | Previous Priority | Current Status |
|-----------|-------|-------------------|----------------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | STILL OPEN |
| SNAP-P1-001 | Add snapshot data to applicant application history view | P1 | RESOLVED — FE 76c545e |
| SNAP-P1-002 | Backfill script for existing applications | P1 | RESOLVED — script written (BE 422d340); not yet run on prod |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | STILL OPEN |
| SNAP-P1-004 | Fix null companyId NOT NULL constraint risk | P1 | RESOLVED — guard added in createApplicationSnapshots (BE 422d340) |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | STILL OPEN |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | STILL OPEN |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | STILL OPEN |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | STILL OPEN |
| SNAP-P3-001 | Completeness improvement tips in dashboard | P3 | PARTIALLY RESOLVED — tips on My Applications; dashboard widget not built |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | STILL OPEN |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | STILL OPEN |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | STILL OPEN |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | STILL OPEN |
| COMP-P1-005 | Batch snapshot endpoint | P1 | RESOLVED — FE 20a44c5 / BE 422d340 |
| COMP-P1-006 | "Fix this now" CTA from tips to profile edit | P1 | RESOLVED — FE 20a44c5 |
| COMP-P2-007 | Fragment anchors for completeness tip deep-links | P2 | STILL OPEN |
| COMP-P2-008 | Per-row resolved state instead of shared snapshotsLoaded | P2 | STILL OPEN (updated framing — now a batch-wide flag, not per-call) |
| COMP-P3-009 | Fix retry() — call private method not ngOnInit | P3 | PARTIALLY RESOLVED — appsSub + ngOnDestroy correct; retry() still calls ngOnInit |
| COMP-P3-010 | Clarify score is frozen at submission time in disclaimer | P3 | STILL OPEN |

---

## P0 — Blocking

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P0-001 |
| **Title** | Confirm DDL applied to production |
| **Category** | Ops / DB Migration |
| **Problem** | `application_snapshots_ddl.sql` exists and the service code assumes all three tables exist. The batch endpoint (BE 422d340) now calls these tables in bulk. If the tables do not exist in production, every batch call returns a 500, `catchError` silences it, and every row shows the "snapshot not available" message — and no snapshots are being written on submit either. The backfill script will also crash before processing any applications (the LEFT JOIN in `getUnsnapshotedApplications` will fail immediately). |
| **Priority** | P0 |
| **Affected files** | `db/application_snapshots_ddl.sql`, production Postgres schema |
| **Effort** | XS |
| **Acceptance criteria** | Run `SELECT to_regclass('gethired.application_snapshots');` against production — result must not be null. Run same for `application_completeness_snapshots` and `match_snapshots`. If any return null, apply the DDL immediately. Record the timestamp and operator. Must be confirmed BEFORE running the backfill script. |
| **Recommended command** | Manual ops — no code change |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P0-001 |
| **Title** | Add pre-flight DDL existence check to backfill script |
| **Category** | Ops / Safety |
| **Problem** | `scripts/backfill_application_snapshots.js` prints a warning comment in its header but does not programmatically verify the required tables exist before running. If `application_snapshots` is missing, the very first query (`getUnsnapshotedApplications`) throws a Postgres relation-not-found error and the script exits with an unhandled error — but only after an operator has already triggered a live run. The failure is noisy but not graceful. A simple pre-flight check would prevent any confusion about whether a crash mid-backfill left data in a partial state. |
| **Priority** | P0 |
| **Affected files** | `scripts/backfill_application_snapshots.js` |
| **Effort** | XS |
| **Acceptance criteria** | (1) At the start of `run()`, before any batching, execute `SELECT to_regclass('gethired.application_snapshots') AS t1, to_regclass('gethired.application_completeness_snapshots') AS t2, to_regclass('gethired.match_snapshots') AS t3`. (2) If any result is null, print a clear error naming the missing table and call `process.exit(1)`. (3) Only if all three tables exist does the script proceed to `getUnsnapshotedApplications`. (4) The `--dry-run` flag still performs this check. |
| **Recommended command** | None — single-file script fix |

---

## P1 — High Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-003 |
| **Title** | Completeness distribution dashboard endpoint for employers |
| **Category** | Feature / BE + FE |
| **Problem** | Employers have per-application completeness scores in `application_completeness_snapshots` but no aggregate view. A pipeline overview widget showing distribution (how many applicants are "excellent" / "strong" / "basic" / "incomplete" across all their open jobs) would be immediately useful for triage. The `acs_completeness_level_idx` and `acs_company_id_idx` indexes in the DDL already anticipate this query. |
| **Priority** | P1 |
| **Affected files** | `controllers/applicationController.js`, `routes/applicationRoute.js`, `get-hired-FE/src/app/employer-panel/*` |
| **Effort** | M |
| **Acceptance criteria** | (1) New endpoint `GET /job/completeness-distribution` scoped to the authenticated user's company. (2) Returns aggregate counts by `completeness_level`. (3) Optionally accepts `jobId` to scope to a single job. (4) Enforces company ownership. (5) A FE widget in the employer pipeline overview displays the distribution. (6) Returns empty/zero counts gracefully when no snapshots exist. |
| **Recommended command** | Standard feature development |

---

## P2 — Medium Priority

| Field | Value |
|-------|-------|
| **Action ID** | BATCH-P2-001 |
| **Title** | Batch endpoint source filter excludes backfill completeness rows |
| **Category** | Bug / BE + FE |
| **Problem** | `getApplicantApplicationSnapshotsBatch` filters both tables on `source = 'application_submit'`. After the backfill runs, applications with `source = 'backfill_current_data'` rows will still return `{ hasSnapshot: false, completenessScore: null }` from the batch endpoint. Applicants who had their data backfilled see no improvement data on "My Applications" — the backfill is effectively invisible to them. This is a design gap: the batch endpoint was built for real-time submissions and the source filter was never updated to account for backfill rows. |
| **Priority** | P2 |
| **Affected files** | `controllers/applicationController.js` (`getApplicantApplicationSnapshotsBatch`), optionally `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) The completeness query in the batch endpoint includes both `source = 'application_submit'` and `source = 'backfill_current_data'` (or removes the source filter entirely, using the most recent row per application). (2) `hasSnapshot` remains `true` only for `application_submit` rows in `application_snapshots` (employer-visible signal should remain restricted to real submissions). (3) A backfilled application returns a non-null `completenessScore` and tips. (4) Optionally: response includes an `isBackfilled: true` flag when the completeness row is `backfill_current_data`, so the FE can show a distinct note ("Score estimated from your current profile"). |
| **Recommended command** | None — BE + optional FE change |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P2-001 |
| **Title** | No progress resume: crash restarts backfill from scratch |
| **Category** | Ops / Reliability |
| **Problem** | If the backfill script crashes (network error, OOM, SIGKILL) midway through batch 5 of 20, rerunning starts from the beginning. The LEFT JOIN filter ensures already-backfilled rows are skipped at the DB level (safe), but the script still re-queries and re-iterates the entire unsnapshotted application set. For small application counts this is negligible. For a dataset of thousands, a crash mid-run can waste significant time on reprocessing. |
| **Priority** | P2 |
| **Affected files** | `scripts/backfill_application_snapshots.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) A `--start-after=<job_application_id>` flag is supported. When provided, `getUnsnapshotedApplications` adds `AND ja.job_application_id > $2 ORDER BY ja.job_application_id ASC` to the query (or equivalent cursor). (2) The script logs the last successfully processed `job_application_id` after each batch. (3) An operator can resume a crashed run by passing `--start-after=<last_logged_id>`. (4) Behavior without the flag is unchanged. |
| **Recommended command** | None — script enhancement |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P2-002 |
| **Title** | Backfill completeness data not visually distinguished in FE |
| **Category** | UX / FE |
| **Problem** | Contingent on BATCH-P2-001 being resolved: when a backfilled application shows completeness data, the score reflects the applicant's current profile — not their profile at submission time. The current disclaimerNote says "This score reflects how much information was included when you applied" which is factually incorrect for backfilled rows (the backfill captures current profile state, not the submitted state). Without a visual distinction, applicants may believe the score is historical when it is actually current, or vice versa. |
| **Priority** | P2 |
| **Affected files** | `controllers/applicationController.js` (batch endpoint response), `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) When the batch endpoint returns `isBackfilled: true` for an application, the FE renders a distinct note: "Completeness estimated from your current profile — not from what you submitted with this application." (2) The standard disclaimerNote is suppressed for backfilled rows and replaced with the backfill note. (3) No visual change for real `application_submit` rows. (4) Contingent on BATCH-P2-001 being implemented first. |
| **Recommended command** | None — FE UX change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-007 |
| **Title** | Add fragment anchors to profile edit sections for completeness tip deep-links |
| **Category** | UX / FE |
| **Problem** | The CTA added in COMP-P1-006 links to `/user/profile/edit` but cannot deep-link to the relevant section. A tip like "Add work experience" lands the applicant at the top of the profile edit form; they still have to scroll to find the right section. The tip fields (`work_experience`, `skills`, `education`, `cv_submitted`, `certifications`) map cleanly to identifiable sections in `ApplicantProfileFormComponent`, but no `id` attributes exist on those sections. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-profile/applicant-profile-form/applicant-profile-form.component.html`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) `ApplicantProfileFormComponent` template has `id` attributes on section headings for: `work-experience`, `skills`, `education`, `cv-upload`, `certifications`. (2) `ApplicantApplicationsComponent` maintains a `FIELD_FRAGMENT_MAP` const mapping tip field names to fragment keys. (3) CTA uses `router.navigate(['/user/profile/edit'], { fragment: fragmentKey })`. (4) Angular `ViewportScroller` or scroll-to-fragment directive scrolls the target into view. (5) Degrades gracefully to `/user/profile/edit` with no fragment for unmapped fields. |
| **Recommended command** | None — FE UX change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-008 |
| **Title** | Replace shared snapshotsLoaded flag with per-row resolved state |
| **Category** | UX / FE |
| **Problem** | `snapshotsLoaded` is set to `true` when the single batch call completes. If the batch call is slow (large payload, slow DB, network latency), all rows spin in skeleton state simultaneously. Previously this was because `forkJoin` waited for all N calls; now it is because the single batch call takes time proportional to the total snapshot data. The structural UX problem is the same: all skeletons reveal at once rather than as data becomes available. For a user with many applications this is a frozen screen for the duration of the batch call. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) `snapshotsLoaded` is replaced with `snapshotsReady = new Set<string>()`. (2) When the batch response arrives, each ID in the response is immediately added to `snapshotsReady`. (3) Template condition per row: `snapshotsReady.has(app.jobApplicationId)` for skeleton vs. content. (4) `retry()` clears `snapshotsReady` in addition to `snapshotsMap`. (5) An ID not in the batch response (e.g., an ID that was not owned by the caller) has a fallback: after a timeout or after the batch completes, its skeleton resolves to the "not available" state rather than spinning indefinitely. |
| **Recommended command** | None — FE UX polish |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-001 |
| **Title** | Implement snapshot_hash integrity verification |
| **Category** | Security / Data Integrity |
| **Problem** | `application_snapshots.snapshot_hash` is declared in the DDL but `persistApplicationSnapshot` never computes or writes this value. Without a hash, there is no way to verify a snapshot's JSONB payload has not been tampered with since storage. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistApplicationSnapshot`) |
| **Effort** | S |
| **Acceptance criteria** | (1) Before insert, compute `SHA-256(JSON.stringify(profileSnapshot) + JSON.stringify(jobSnapshot) + JSON.stringify(docsSnapshot) + applicationId)` and write to `snapshot_hash`. (2) A `verifySnapshotIntegrity(applicationId)` helper recomputes and compares the hash. (3) `snapshot_hash` is NOT NULL after any new insert. (4) Existing NULL rows are acceptable (pre-implementation). (5) Unit test for hash computation and verification. |
| **Recommended command** | `/SECURE` pass |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-002 |
| **Title** | Delegate match score calculation in persistMatchSnapshot to canonical service |
| **Category** | Architecture / Deduplication |
| **Problem** | `persistMatchSnapshot` hand-rolls `(matchedRequired.length / (matchedRequired.length + missingRequired.length)) * 60 + (hasCv ? 40 : 0)`. `employerApplicantSignalsService` uses `jobRequiredSkills.length` as the denominator, which differs when the matched + missing subset is smaller than the full required list. If weights are updated in the signals service, `match_snapshots.match_score` silently diverges. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistMatchSnapshot`), `services/match/employerApplicantSignalsService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) `getApplicantFitSignals` or a new helper exposes the computed `totalScore`. (2) `persistMatchSnapshot` uses that value directly. (3) `REQUIRED_SKILLS_WEIGHT` and `APPLICATION_COMPLETENESS_WEIGHT` defined in exactly one place. (4) Test asserts `match_snapshots.match_score` equals `getApplicantFitSignals` output for same inputs. |
| **Recommended command** | `/MATCHED` QA pass after fixing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-003 |
| **Title** | Unit test coverage for applicationSnapshotService.js |
| **Category** | Testing |
| **Problem** | `scoreApplicationCompleteness`, `buildApplicantProfileSnapshot`, `buildJobSnapshot`, `buildSubmittedDocumentsSnapshot`, and the idempotency guarantee have no test coverage. A regression in the completeness rubric is undetected until employers report wrong scores. |
| **Priority** | P2 |
| **Affected files** | New: `services/__tests__/applicationSnapshotService.test.js` |
| **Effort** | M |
| **Acceptance criteria** | (1) `scoreApplicationCompleteness` tested with: all fields present (score >= 90, level = "excellent"), only required fields (score ~70, "strong"), nothing present (score 0, "incomplete"), only optional fields (score ~30). (2) `buildApplicantProfileSnapshot` tested: null profile returns `{ available: false }`, valid profile excludes all `EXCLUDED_FIELDS`. (3) `persistApplicationSnapshot` mocked — confirms `ON CONFLICT DO NOTHING`. (4) Tests never mutate input arguments. (5) All tests pass in CI. |
| **Recommended command** | `/TEST` after writing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-004 |
| **Title** | Admin view to inspect snapshot data per application |
| **Category** | Feature / Admin |
| **Problem** | `adminController.js` has no snapshot-related endpoints. Ops and support staff cannot inspect snapshot rows for a specific application without direct SQL access. |
| **Priority** | P2 |
| **Affected files** | `controllers/adminController.js`, `routes/adminRoute.js`, `get-hired-FE/src/app/admin-panel/` |
| **Effort** | M |
| **Acceptance criteria** | (1) New admin endpoint `GET /admin/application-snapshot?applicationId=<id>` returns all three snapshot rows. (2) Admin auth middleware enforced. (3) Response includes raw JSONB fields. (4) Admin UI table displays snapshot data for a selected application. (5) No applicant-facing data exposed to non-admins. |
| **Recommended command** | Standard feature development |

---

## P3 — Low Priority

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P3-009 |
| **Title** | Fix retry() to call a private data-load method instead of ngOnInit() |
| **Category** | Maintainability / FE |
| **Problem** | `retry()` in `ApplicantApplicationsComponent` calls `this.ngOnInit()`. The subscription management via `appsSub` + `ngOnDestroy` is now correct (no leak), but calling `ngOnInit` directly from a method outside the Angular lifecycle is still a contract violation and can cause subtle issues with change-detection strategies or lifecycle-aware libraries. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` |
| **Effort** | XS |
| **Acceptance criteria** | (1) Data-loading logic extracted to `private loadApplications(): void`. (2) `ngOnInit` calls `this.loadApplications()`. (3) `retry()` calls `this.loadApplications()` (not `ngOnInit`). (4) Behavior unchanged. |
| **Recommended command** | None — XS refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P3-010 |
| **Title** | Clarify that completeness score is "at time of application" in disclaimer |
| **Category** | UX / Copy |
| **Problem** | The current `disclaimerNote` does not mention that the score is frozen at submission time. An applicant who adds work experience after applying will still see an unchanged score and may believe their profile update did not save. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js` (`getApplicantApplicationSnapshot` — `disclaimerNote` string) |
| **Effort** | XS |
| **Acceptance criteria** | (1) `disclaimerNote` updated to include: "This score reflects your profile at the time you submitted this application. Updating your profile now will not change this score." (2) The template already renders `snap.disclaimerNote` — no FE code change needed. (3) No behavior change. |
| **Recommended command** | None — copy change only |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-003 |
| **Title** | Completeness distribution dashboard endpoint for employers |
| **Category** | Feature / BE + FE |
| **Problem** | Employers have per-application completeness scores but no aggregate view. |
| **Priority** | P1 |
| **Effort** | M |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | Standard feature development |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-001 |
| **Title** | Surface completeness improvement tips to applicant in dashboard |
| **Category** | Feature / UX |
| **Problem** | Tips are visible on "My Applications" but not on the applicant dashboard. An applicant who never navigates to "My Applications" never sees the feedback. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-dashboard/`, `application.service.ts` |
| **Effort** | S |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | `/NOTIFY` to coordinate notification triggers |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-002 |
| **Title** | Webhook or event notification when snapshot is ready |
| **Category** | Architecture / Integration |
| **Problem** | Snapshot creation is fire-and-forget with no hook for downstream consumers. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` |
| **Effort** | S |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | Standard infrastructure; coordinate with `/NOTIFY` |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-003 |
| **Title** | Relocate DISCLAIMER to a single canonical location |
| **Category** | Architecture / Maintainability |
| **Problem** | `applicationSnapshotService.js` imports `DISCLAIMER` from `employerApplicantSignalsService.js` then re-exports it. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js`, `services/match/employerApplicantSignalsService.js`, new `constants/disclaimers.js` |
| **Effort** | XS |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-004 |
| **Title** | Extract getUserCompany from companiesController into a service |
| **Category** | Architecture / Coupling |
| **Problem** | `applicationController.js` imports `getUserCompany` from `controllers/companiesController.js` — cross-controller coupling. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js`, `controllers/companiesController.js`, `services/company.service.js` |
| **Effort** | XS |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-005 |
| **Title** | Add comment clarifying scoreApplicationCompleteness video-answer detection chain |
| **Category** | Maintainability / Documentation |
| **Problem** | In `createApplicationSnapshots`, `scoreApplicationCompleteness` is called with a mapped snapshot object as `submittedVideoAnswers`. The indirection is non-obvious. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` |
| **Effort** | XS |
| **Acceptance criteria** | See previous cycle entry — unchanged. |
| **Recommended command** | None — code comment only |

---

## Summary Table

| Action ID | Title | Priority | Effort | Status |
|-----------|-------|----------|--------|--------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | XS | OPEN |
| BACKFILL-P0-001 | Pre-flight DDL check in backfill script | P0 | XS | NEW |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | M | OPEN |
| BATCH-P2-001 | Batch endpoint source filter excludes backfill rows | P2 | S | NEW |
| BACKFILL-P2-001 | No progress resume: crash restarts from scratch | P2 | S | NEW |
| BACKFILL-P2-002 | Backfill data not visually distinguished in FE | P2 | S | NEW |
| COMP-P2-007 | Fragment anchors for completeness tip deep-links | P2 | S | OPEN |
| COMP-P2-008 | Per-row resolved state instead of shared snapshotsLoaded | P2 | S | OPEN |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | S | OPEN |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | S | OPEN |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | M | OPEN |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | M | OPEN |
| COMP-P3-009 | Fix retry() — call private method not ngOnInit | P3 | XS | PARTIALLY RESOLVED |
| COMP-P3-010 | Clarify score is frozen at submission time in disclaimer | P3 | XS | OPEN |
| SNAP-P3-001 | Surface completeness tips in dashboard | P3 | S | PARTIALLY RESOLVED |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | S | OPEN |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | XS | OPEN |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | XS | OPEN |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | XS | OPEN |

**Total tracked actions: 19**
**P0: 2 | P1: 1 | P2: 8 | P3: 7 (+ 1 partially resolved)**
**Resolved this cycle: 4 (SNAP-P1-002, SNAP-P1-004, COMP-P1-005, COMP-P1-006)**
**Previously resolved (prior cycles): 2 (SNAP-P1-001, SNAP-P1-002 closed as script written)**
**New items this cycle: 5 (BACKFILL-P0-001, BATCH-P2-001, BACKFILL-P2-001, BACKFILL-P2-002, SNAP-SHARED-P2-001 → reclassified as COMP-P2-008 update)**
