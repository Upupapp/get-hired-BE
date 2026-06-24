# GETHIRED ACTIONS — Recent Deployment Backlog
## Applicant Completeness UI — Badge + Card + Detail Route Cycle
**Generated:** 2026-06-24
**Deployment:** FE 5ab9a05 / BE 422d340
**Supersedes:** Previous backlog (FE 20a44c5 / BE 422d340 cycle)

Schema: `Action ID | Title | Category | Problem | Priority | Affected files | Effort | Acceptance criteria | Recommended command`

---

## Status of All Carried-Over Items

| Action ID | Title | Previous Priority | Current Status |
|-----------|-------|-------------------|----------------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | STILL OPEN |
| BACKFILL-P0-001 | Pre-flight DDL check in backfill script | P0 | STILL OPEN |
| SNAP-P1-001 | Add snapshot data to applicant application history view | P1 | RESOLVED — FE 76c545e |
| SNAP-P1-002 | Backfill script for existing applications | P1 | RESOLVED — script written (BE 422d340); not yet run on prod |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | STILL OPEN |
| SNAP-P1-004 | Fix null companyId NOT NULL constraint risk | P1 | RESOLVED — BE 422d340 |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | STILL OPEN |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | STILL OPEN |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | STILL OPEN |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | STILL OPEN |
| SNAP-P3-001 | Completeness improvement tips in dashboard | P3 | PARTIALLY RESOLVED — tips on My Applications + detail page; dashboard widget not built |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | STILL OPEN |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | STILL OPEN |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | STILL OPEN |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | STILL OPEN |
| COMP-P1-005 | Batch snapshot endpoint | P1 | RESOLVED — FE 20a44c5 / BE 422d340 |
| COMP-P1-006 | "Fix this now" CTA from tips to profile edit | P1 | RESOLVED — FE 20a44c5 |
| COMP-P2-007 | Fragment anchors for completeness tip deep-links | P2 | STILL OPEN |
| COMP-P2-008 | Per-row resolved state instead of shared snapshotsLoaded | P2 | STILL OPEN |
| COMP-P3-009 | Fix retry() — call private method not ngOnInit | P3 | RESOLVED — FE 5ab9a05 (loadData() pattern confirmed) |
| COMP-P3-010 | Clarify score is frozen at submission time in disclaimer | P3 | STILL OPEN |
| BATCH-P2-001 | Batch endpoint source filter excludes backfill rows | P2 | STILL OPEN |
| BACKFILL-P2-001 | No progress resume: crash restarts from scratch | P2 | STILL OPEN |
| BACKFILL-P2-002 | Backfill completeness data not visually distinguished | P2 | STILL OPEN |
| Backlog: dedicated detail route | — | RESOLVED — FE 5ab9a05 |
| Backlog: list → detail deep-link | — | RESOLVED — FE 5ab9a05 |
| Backlog: CTA click analytics | — | RESOLVED — FE 5ab9a05 |
| Backlog: snapshotCreatedAt display | — | RESOLVED (detail page) / DEFERRED (list) → DETAIL-P3-001 |
| Backlog: badge_viewed impression | — | STILL OPEN → DETAIL-P2-002 |
| Backlog: unit tests badge + card | — | STILL OPEN → COMP-TEST-P2-001 |

---

## P0 — Blocking

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P0-001 |
| **Title** | Confirm DDL applied to production |
| **Category** | Ops / DB Migration |
| **Problem** | `application_snapshots_ddl.sql` exists and all three endpoints (batch list, single detail, employer summary) assume all three tables exist. If the tables are missing: the batch endpoint throws a 500 silenced by `catchError` — every applicant sees "Snapshot not available"; the single endpoint (new detail page at `/user/applications/:id`) also returns null; the backfill script crashes before processing any applications. This has been open since the snapshot system was first deployed. |
| **Priority** | P0 |
| **Affected files** | `db/application_snapshots_ddl.sql`, production Postgres schema |
| **Effort** | XS |
| **Acceptance criteria** | Run `SELECT to_regclass('gethired.application_snapshots');` against production — result must not be null. Run same for `application_completeness_snapshots` and `match_snapshots`. If any return null, apply the DDL immediately. Record timestamp and operator. Must be confirmed BEFORE running the backfill script. |
| **Recommended command** | Manual ops — no code change |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P0-001 |
| **Title** | Add pre-flight DDL existence check to backfill script |
| **Category** | Ops / Safety |
| **Problem** | `scripts/backfill_application_snapshots.js` prints a warning comment but does not programmatically verify the required tables exist before running. If `application_snapshots` is missing, the first query crashes the process. A pre-flight check prevents operator error during the live prod backfill run. |
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
| **Action ID** | COMP-TEST-P2-001 |
| **Title** | Write Angular unit tests for badge + card + detail components |
| **Category** | Testing |
| **Problem** | `ApplicationCompletenessBadgeComponent`, `ApplicationCompletenessCardComponent`, and `ApplicantApplicationDetailComponent` have no unit test coverage. Test specifications are fully documented in `GETHIRED_APPLICANT_APPLICATION_COMPLETENESS_TEST_LOG_V2.md`. A regression in any of the 7 card states or 5 badge states is currently undetected until a user reports it. |
| **Priority** | P2 |
| **Affected files** | New: `application-completeness-badge.component.spec.ts`, `application-completeness-card.component.spec.ts`, `applicant-application-detail.component.spec.ts` |
| **Effort** | M |
| **Acceptance criteria** | (1) Badge component: 10 test cases from `GETHIRED_APPLICANT_APPLICATION_COMPLETENESS_TEST_LOG_V2.md` all pass. (2) Card component: 16 test cases all pass. (3) Applications list component: 9 test cases all pass. (4) Detail component: loading/error/retry/metadata-absent cases covered. (5) All tests pass in CI with `ng test --watch=false`. |
| **Recommended command** | None — write tests first, then run via `/TEST` |

---

| Field | Value |
|-------|-------|
| **Action ID** | DETAIL-P2-001 |
| **Title** | Direct navigation to /user/applications/:id loses job metadata |
| **Category** | UX / FE |
| **Problem** | `ApplicantApplicationDetailComponent` reads jobTitle, companyName, and status from router navigation state. When a user navigates directly to `/user/applications/abc123` (bookmark, email link, external redirect, back button from outside the app), `getCurrentNavigation()` is null and `window.history.state` may be empty or stale. The heading shows "Application Details" instead of the job name; the status badge is absent. The completeness data loads correctly — this is a metadata UX degradation only. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts`, `services/application.service.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) When router state is empty (jobTitle === ''), the component attempts to fetch job metadata from a fallback source. Preferred: `ApplicationService.getAppliedJobsList()` cached in the service, looked up by `applicationId`. (2) The heading shows the job title even when navigating cold. (3) If the fallback call also fails, "Application Details" heading remains — no error, no broken layout. (4) No regression for warm navigation from the list. |
| **Recommended command** | None — FE data-layer fix |

---

| Field | Value |
|-------|-------|
| **Action ID** | DETAIL-P2-002 |
| **Title** | No impression event when badge or detail page is viewed |
| **Category** | Analytics |
| **Problem** | `trackApplicationCompletenessViewed(applicationId)` fires when the user expands the card in the list. No event fires when: (a) the badge renders in the list (first impression), or (b) the user navigates to the `/user/applications/:id` detail page. Without impression data, the funnel is incomplete: it is impossible to compute conversion from badge_render → card_expand → cta_click. |
| **Priority** | P2 |
| **Affected files** | `src/app/public/services/public-portal-analytics.service.ts`, `applicant-application-detail.component.ts`, optionally `applicant-applications.component.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) New method `trackApplicationCompletenessDetailViewed(applicationId: string)` in `PublicPortalAnalyticsService`. (2) Called in `ApplicantApplicationDetailComponent.ngOnInit()` after `applicationId` is set (and only if not in error state). (3) Optionally: a badge impression event in the list component, debounced or triggered once per session per application to avoid noise. (4) No PII in payload (applicationId only). (5) Consistent with existing analytics method naming pattern. |
| **Recommended command** | None — analytics enhancement |

---

| Field | Value |
|-------|-------|
| **Action ID** | BATCH-P2-001 |
| **Title** | Batch endpoint source filter excludes backfill completeness rows |
| **Category** | Bug / BE + FE |
| **Problem** | `getApplicantApplicationSnapshotsBatch` filters both tables on `source = 'application_submit'`. After the backfill runs, applications with `source = 'backfill_current_data'` rows will still return `{ hasSnapshot: false, completenessScore: null }` from the batch endpoint. Applicants who had their data backfilled see no improvement data on "My Applications" or on the detail page via the list path. |
| **Priority** | P2 |
| **Affected files** | `controllers/applicationController.js` (`getApplicantApplicationSnapshotsBatch`) |
| **Effort** | S |
| **Acceptance criteria** | (1) The completeness query in the batch endpoint includes both `source = 'application_submit'` and `source = 'backfill_current_data'` (or uses the most recent row per application). (2) `hasSnapshot` remains `true` only for `application_submit` rows in `application_snapshots`. (3) A backfilled application returns a non-null `completenessScore` and tips. (4) Response includes `isBackfilled: true` flag when the completeness row is `backfill_current_data`. |
| **Recommended command** | None — BE fix |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P2-001 |
| **Title** | No progress resume: crash at batch N restarts backfill from scratch |
| **Category** | Ops / Reliability |
| **Problem** | If the backfill script crashes midway through, rerunning restarts from the beginning. The LEFT JOIN filter ensures already-backfilled rows are skipped (safe), but for a large dataset a crash mid-run wastes processing time. |
| **Priority** | P2 |
| **Affected files** | `scripts/backfill_application_snapshots.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) A `--start-after=<job_application_id>` flag adds `AND ja.job_application_id > $2 ORDER BY ja.job_application_id ASC` to `getUnsnapshotedApplications`. (2) The script logs the last successfully processed ID after each batch. (3) Behavior without the flag is unchanged. |
| **Recommended command** | None — script enhancement |

---

| Field | Value |
|-------|-------|
| **Action ID** | BACKFILL-P2-002 |
| **Title** | Backfill completeness data not visually distinguished in FE |
| **Category** | UX / FE |
| **Problem** | Contingent on BATCH-P2-001: when a backfilled application shows completeness data, the score reflects the applicant's current profile — not their profile at submission time. The current `disclaimerNote` is factually incorrect for backfilled rows. Without a visual distinction, applicants may believe the score is their at-submission score. |
| **Priority** | P2 |
| **Affected files** | `controllers/applicationController.js` (batch response), `application-completeness-card.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) When `isBackfilled: true`, FE renders: "Completeness estimated from your current profile — not from what you submitted with this application." (2) Standard disclaimerNote is suppressed for backfilled rows. (3) No visual change for real `application_submit` rows. (4) Contingent on BATCH-P2-001. |
| **Recommended command** | None — FE UX change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-007 |
| **Title** | Add fragment anchors to profile edit sections for completeness tip deep-links |
| **Category** | UX / FE |
| **Problem** | CTAs in both the list-view card and the detail-page card route to `/user/profile/edit` with no fragment anchor. A tip like "Add work experience" lands the applicant at the top of the profile form. The tip fields map cleanly to identifiable sections in `ApplicantProfileFormComponent`, but no `id` attributes exist on those sections. Applies to both the in-list expand and the new detail route (both use `ApplicationCompletenessCardComponent`). |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-profile/applicant-profile-form/applicant-profile-form.component.html`, `application-completeness-card.component.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) `ApplicantProfileFormComponent` template has `id` attributes on section headings: `work-experience`, `skills`, `education`, `cv-upload`, `certifications`. (2) Card component maintains a `FIELD_FRAGMENT_MAP` const mapping tip field names to fragment keys. (3) CTAs use `router.navigate(['/user/profile/edit'], { fragment: fragmentKey })`. (4) Angular `ViewportScroller` or `anchorScrolling: 'enabled'` scrolls the target into view. (5) Degrades gracefully to `/user/profile/edit` with no fragment for unmapped fields. |
| **Recommended command** | None — FE UX change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-008 |
| **Title** | Replace shared snapshotsLoaded flag with per-row resolved state |
| **Category** | UX / FE |
| **Problem** | `snapshotsLoaded` is set to `true` when the single batch call completes. All skeletons spin simultaneously and reveal all-at-once. For a user with many applications, a slow network means the entire list is frozen in skeleton state for the duration of the batch call. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`, `.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) `snapshotsLoaded` replaced with `snapshotsReady = new Set<string>()`. (2) When batch response arrives, each ID is added to `snapshotsReady`. (3) Template condition: `snapshotsReady.has(app.jobApplicationId)`. (4) `retry()` clears `snapshotsReady`. (5) IDs absent from batch response resolve to "not available" state after batch completes. |
| **Recommended command** | None — FE UX polish |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-001 |
| **Title** | Implement snapshot_hash integrity verification |
| **Category** | Security / Data Integrity |
| **Problem** | `application_snapshots.snapshot_hash` is declared in the DDL but `persistApplicationSnapshot` never computes or writes this value. Without a hash, snapshot JSONB payload integrity cannot be verified. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistApplicationSnapshot`) |
| **Effort** | S |
| **Acceptance criteria** | (1) Compute `SHA-256(JSON.stringify(profileSnapshot) + JSON.stringify(jobSnapshot) + JSON.stringify(docsSnapshot) + applicationId)` before insert and write to `snapshot_hash`. (2) `verifySnapshotIntegrity(applicationId)` helper recomputes and compares. (3) `snapshot_hash` NOT NULL after any new insert. (4) Unit test for hash computation and verification. |
| **Recommended command** | `/SECURE` pass |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-002 |
| **Title** | Delegate match score calculation in persistMatchSnapshot to canonical service |
| **Category** | Architecture / Deduplication |
| **Problem** | `persistMatchSnapshot` hand-rolls a match score formula that diverges from `employerApplicantSignalsService`. Weights updated in one place silently diverge in the other. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js`, `services/match/employerApplicantSignalsService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) `getApplicantFitSignals` or a new helper exposes the computed `totalScore`. (2) `persistMatchSnapshot` uses that value directly. (3) Weights defined in exactly one place. (4) Test asserts match scores are equal for same inputs. |
| **Recommended command** | `/MATCHED` QA pass after fixing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-003 |
| **Title** | Unit test coverage for applicationSnapshotService.js |
| **Category** | Testing |
| **Problem** | Core scoring and snapshot-building functions have no test coverage. A rubric regression is undetected until employers report wrong scores. |
| **Priority** | P2 |
| **Affected files** | New: `services/__tests__/applicationSnapshotService.test.js` |
| **Effort** | M |
| **Acceptance criteria** | (1) `scoreApplicationCompleteness` tested with all-present, required-only, nothing, optional-only inputs. (2) `buildApplicantProfileSnapshot` tested with null and valid profiles. (3) `persistApplicationSnapshot` mocked with conflict behavior. (4) All tests pass in CI. |
| **Recommended command** | `/TEST` after writing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-004 |
| **Title** | Admin view to inspect snapshot data per application |
| **Category** | Feature / Admin |
| **Problem** | No admin endpoint for snapshot inspection. Ops/support must use direct SQL to investigate score discrepancies. |
| **Priority** | P2 |
| **Affected files** | `controllers/adminController.js`, `routes/adminRoute.js`, `get-hired-FE/src/app/admin-panel/` |
| **Effort** | M |
| **Acceptance criteria** | (1) `GET /admin/application-snapshot?applicationId=<id>` returns all three snapshot rows. (2) Admin auth enforced. (3) No applicant-facing data exposed to non-admins. (4) Admin UI table displays data. |
| **Recommended command** | Standard feature development |

---

## P3 — Low Priority

| Field | Value |
|-------|-------|
| **Action ID** | DETAIL-P3-001 |
| **Title** | snapshotCreatedAt not available in list-view batch response |
| **Category** | UX / BE |
| **Problem** | The batch endpoint does not return `snapshotCreatedAt`. The card component shows "Captured Jan 15, 2026" on the detail page (single endpoint) but not when expanded in the list. Minor UX inconsistency — same component, different data availability. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js` (`getApplicantApplicationSnapshotsBatch`) |
| **Effort** | XS |
| **Acceptance criteria** | (1) Add `captured_at` to the completeness snapshot batch query result (already joined). (2) Return it as `snapshotCreatedAt` in each batch response entry. (3) Card component in list view shows "Captured ..." when present. (4) No FE change required — card already renders the field when not null. |
| **Recommended command** | None — one-line BE query change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P3-010 |
| **Title** | Clarify that completeness score is frozen at submission time in disclaimer |
| **Category** | UX / Copy |
| **Problem** | The current `disclaimerNote` does not mention the score is frozen at submission. An applicant who adds work experience after applying still sees an unchanged score and may think the update failed. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js` (`disclaimerNote` string in both endpoints) |
| **Effort** | XS |
| **Acceptance criteria** | (1) `disclaimerNote` updated to: "This score reflects your profile at the time you submitted this application. Updating your profile now will not change this score." (2) Template already renders `snap.disclaimerNote` — no FE change needed. (3) Update applies to both `getApplicantApplicationSnapshot` and `getApplicantApplicationSnapshotsBatch`. |
| **Recommended command** | None — copy change only |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-001 |
| **Title** | Surface completeness improvement tips in applicant dashboard |
| **Category** | Feature / UX |
| **Problem** | Tips are visible on My Applications and on the detail page but not on the applicant dashboard. An applicant who never navigates to My Applications never sees the completeness feedback. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-dashboard/`, `application.service.ts` |
| **Effort** | S |
| **Acceptance criteria** | Dashboard widget shows: overall completeness trend, top missing required field across all applications, link to My Applications. |
| **Recommended command** | `/NOTIFY` to coordinate notification triggers |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-002 |
| **Title** | Webhook or event notification when snapshot is ready |
| **Category** | Architecture / Integration |
| **Problem** | Snapshot creation is fire-and-forget with no hook for downstream consumers (email triggers, dashboard refresh, notification system). |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` |
| **Effort** | S |
| **Acceptance criteria** | Event emitter or hook point in `createApplicationSnapshots` after all three persists complete. Consumer list TBD. |
| **Recommended command** | Standard infrastructure; coordinate with `/NOTIFY` |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-003 |
| **Title** | Relocate DISCLAIMER to a single canonical location |
| **Category** | Architecture / Maintainability |
| **Problem** | `applicationSnapshotService.js` imports `DISCLAIMER` from `employerApplicantSignalsService.js`. Cross-service constant sharing creates coupling. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js`, `services/match/employerApplicantSignalsService.js`, new `constants/disclaimers.js` |
| **Effort** | XS |
| **Acceptance criteria** | `DISCLAIMER` lives in `constants/disclaimers.js`, imported by both services. No behavior change. |
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
| **Acceptance criteria** | `getUserCompany` moved to `services/company.service.js`. Both controllers import from there. No behavior change. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-005 |
| **Title** | Add comment clarifying scoreApplicationCompleteness video-answer detection chain |
| **Category** | Maintainability / Documentation |
| **Problem** | In `createApplicationSnapshots`, `scoreApplicationCompleteness` is called with a mapped snapshot object as `submittedVideoAnswers`. The indirection is non-obvious to new contributors. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` |
| **Effort** | XS |
| **Acceptance criteria** | A code comment above the `scoreApplicationCompleteness` call explains why `submittedVideoAnswers` is the mapped snapshot object and how the detection chain works. |
| **Recommended command** | None — code comment only |

---

## Summary Table

| Action ID | Title | Priority | Effort | Status |
|-----------|-------|----------|--------|--------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | XS | OPEN |
| BACKFILL-P0-001 | Pre-flight DDL check in backfill script | P0 | XS | OPEN |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | M | OPEN |
| COMP-TEST-P2-001 | Angular unit tests for badge + card + detail | P2 | M | NEW |
| DETAIL-P2-001 | Direct nav to detail loses job metadata | P2 | S | NEW |
| DETAIL-P2-002 | No badge/detail impression analytics event | P2 | S | NEW |
| BATCH-P2-001 | Batch endpoint source filter excludes backfill rows | P2 | S | OPEN |
| BACKFILL-P2-001 | No progress resume: crash restarts from scratch | P2 | S | OPEN |
| BACKFILL-P2-002 | Backfill data not visually distinguished in FE | P2 | S | OPEN |
| COMP-P2-007 | Fragment anchors for completeness tip deep-links | P2 | S | OPEN |
| COMP-P2-008 | Per-row resolved state instead of shared snapshotsLoaded | P2 | S | OPEN |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | S | OPEN |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | S | OPEN |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | M | OPEN |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | M | OPEN |
| DETAIL-P3-001 | snapshotCreatedAt not in batch response | P3 | XS | NEW |
| COMP-P3-010 | Clarify score is frozen at submission time in disclaimer | P3 | XS | OPEN |
| SNAP-P3-001 | Surface completeness tips in dashboard | P3 | S | OPEN |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | S | OPEN |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | XS | OPEN |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | XS | OPEN |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | XS | OPEN |

**Total tracked actions: 22**
**P0: 2 | P1: 1 | P2: 11 | P3: 8**
**Resolved this cycle: 5 (COMP-P3-009, dedicated detail route, list→detail link, CTA analytics, snapshotCreatedAt on detail page)**
**Previously resolved (all prior cycles): SNAP-P1-001, SNAP-P1-002 (script written), SNAP-P1-004, COMP-P1-005, COMP-P1-006**
**New items this cycle: 4 (COMP-TEST-P2-001, DETAIL-P2-001, DETAIL-P2-002, DETAIL-P3-001)**
