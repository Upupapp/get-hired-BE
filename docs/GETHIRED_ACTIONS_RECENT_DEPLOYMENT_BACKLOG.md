# GETHIRED ACTIONS — Recent Deployment Backlog
## Applicant Completeness View + Application Snapshots System
**Generated:** 2026-06-24
**Supersedes:** Previous snapshot system backlog (same file)

Schema: `Action ID | Title | Category | Problem | Priority | Affected files | Effort | Acceptance criteria | Recommended command`

---

## Status of Carried-Over Items

| Action ID | Title | Previous Priority | Current Status |
|-----------|-------|-------------------|----------------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | STILL OPEN |
| SNAP-P1-001 | Add snapshot data to applicant application history view | P1 | RESOLVED — deployed in FE 76c545e |
| SNAP-P1-002 | Backfill script for existing applications | P1 | STILL OPEN |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | STILL OPEN |
| SNAP-P1-004 | Fix null companyId NOT NULL constraint risk | P1 | STILL OPEN (not touched in this cycle) |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | STILL OPEN |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | STILL OPEN |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | STILL OPEN |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | STILL OPEN |
| SNAP-P3-001 | Completeness improvement tips in dashboard | P3 | PARTIALLY RESOLVED — tips visible in My Applications; dashboard widget not built |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | STILL OPEN |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | STILL OPEN |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | STILL OPEN |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | STILL OPEN |

---

## P0 — Blocking

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P0-001 |
| **Title** | Confirm DDL applied to production |
| **Category** | Ops / DB Migration |
| **Problem** | `application_snapshots_ddl.sql` exists and the service code assumes all three tables exist (`application_snapshots`, `application_completeness_snapshots`, `match_snapshots`). The applicant completeness view (FE 76c545e) now calls `GET /applicant/application/snapshot` for every application on page load. If the tables do not exist in production, every call returns a 500, the `catchError` silences it, and every row shows the "snapshot not available" message — but no snapshots are being written either. The window of silent failure grows with every new application submitted. |
| **Priority** | P0 |
| **Affected files** | `db/application_snapshots_ddl.sql`, production Postgres schema |
| **Effort** | XS |
| **Acceptance criteria** | Run `SELECT to_regclass('gethired.application_snapshots');` against production. Result must not be null. Run same for `application_completeness_snapshots` and `match_snapshots`. If any return null, apply the DDL immediately. Record the timestamp and operator. |
| **Recommended command** | Manual ops — no code change |

---

## P1 — High Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-002 |
| **Title** | Backfill snapshots for existing applications |
| **Category** | Data / Migration |
| **Problem** | All applications submitted before the snapshot system was deployed have no rows in any of the three snapshot tables. The "My Applications" page gracefully handles this case (`!snap.hasSnapshot` → text message), but the underlying data gap means these applicants never get completeness feedback and employers can never see snapshot summaries for old applications. The `createApplicationSnapshots` service already supports `source='backfill_current_data'` — backfill was anticipated but the script was never written. |
| **Priority** | P1 |
| **Affected files** | New script: `db/backfill_application_snapshots.sql` or `scripts/backfillSnapshots.js`, `services/applicationSnapshotService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) A script iterates all `job_applicants` rows with no matching row in `application_snapshots`. (2) For each, calls `createApplicationSnapshots` with `source='backfill_current_data'`. (3) Script is idempotent — safe to re-run. (4) After running, row count in `application_snapshots` equals or exceeds row count in `job_applicants`. (5) All backfilled rows have `source='backfill_current_data'` and the provenance note is accurate. (6) Script logs errors per-application without halting the batch. |
| **Recommended command** | Manual / one-time ops script |

---

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

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P1-004 |
| **Title** | Fix null companyId NOT NULL constraint risk at snapshot insert |
| **Category** | Bug / BE |
| **Problem** | `application.service.js` passes `companyId: job.companyId \|\| null` into `createApplicationSnapshots`. All three snapshot tables declare `company_id varchar NOT NULL`. If `jobDetails()` returns a job where `companyId` is undefined or null, the INSERT fails with a Postgres NOT NULL violation — silently swallowed by the fire-and-forget `.catch()`. Snapshots are silently dropped for those applications. This was identified last cycle and was not addressed in this deployment. |
| **Priority** | P1 |
| **Affected files** | `services/application.service.js` (line ~150), `services/applicationSnapshotService.js` (`createApplicationSnapshots` orchestrator), `services/job.service.js` (`jobDetails` mapper) |
| **Effort** | XS |
| **Acceptance criteria** | (1) In `createApplicationSnapshots`, guard: if `companyId` is null/undefined, log a structured warning including `applicationId` and `jobId`, and skip all three snapshot inserts rather than passing null. (2) Alternatively, confirm `jobDetails()` always returns a non-null `companyId` by verifying the SQL query JOINs `jobs` to the `companies` table and maps the result. (3) Zero DB NOT NULL constraint errors appear in BE logs for new applications. |
| **Recommended command** | Standard bug fix |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P1-005 |
| **Title** | Add batch snapshot endpoint to eliminate N API calls on My Applications page load |
| **Category** | Performance / BE + FE |
| **Problem** | `ApplicantApplicationsComponent.loadSnapshots()` fires one HTTP call per application via `forkJoin`. For a user with 10 applications this is 10 requests to `GET /applicant/application/snapshot?applicationId=...` on every page load. The current implementation uses parallel requests (correct), but the BE still handles N separate ownership checks, N separate DB queries across 2 tables each, and N response payloads. As application counts grow this creates measurable latency and unnecessary server load. |
| **Priority** | P1 |
| **Affected files** | `controllers/applicationController.js` (new function), `routes/applicationRoute.js` (new route), `get-hired-FE/src/app/application/application.service.ts`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) New endpoint `GET /applicant/application/snapshots?applicationIds=id1,id2,...` (max 50 IDs). (2) Returns a map of `{ [applicationId]: snapshotPayload }` for all requested IDs the caller owns. (3) IDs the caller does not own are silently omitted from the response (no 403, since partial ownership is expected if the list is pre-filtered by the applicant's own applications). (4) `ApplicantApplicationsComponent` calls the batch endpoint once instead of N individual calls. (5) `forkJoin` is replaced with a single observable. (6) The FE falls back to the N-call approach if the batch endpoint is unavailable (feature-flag or try-catch). |
| **Recommended command** | Standard feature development |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P1-006 |
| **Title** | Add "Fix this now" CTA from completeness tips to profile edit page |
| **Category** | UX / FE |
| **Problem** | The improvement tips UI on the "My Applications" page shows the applicant what is missing (e.g., "Add work experience", "Add skills") but provides no way to act on the tip. The user must manually navigate to `/user/profile/edit`. The `Router` is already injected in `ApplicantApplicationsComponent`. The profile edit route exists at `/user/profile/edit`. Without a CTA, the completeness feedback is informational-only — the conversion from "I see I'm missing X" to "I went and fixed X" is broken. |
| **Priority** | P1 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.scss` |
| **Effort** | XS |
| **Acceptance criteria** | (1) Each item in `snap.missingRequired` renders a "Complete profile" button or link alongside the tip text. (2) Clicking the button navigates to `/user/profile/edit` (or the appropriate deep-link if fragment anchors are in place — see COMP-P2-007). (3) The CTA is accessible: keyboard-focusable, has a descriptive `aria-label` (e.g., "Go to profile edit to add work experience"). (4) The CTA is styled as a secondary action (not equal weight to the primary application status). (5) The CTA does not appear for recommended items — those remain informational. |
| **Recommended command** | None — XS FE change |

---

## P2 — Medium Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-001 |
| **Title** | Implement snapshot_hash integrity verification |
| **Category** | Security / Data Integrity |
| **Problem** | `application_snapshots.snapshot_hash` is declared in the DDL (`varchar NULL`) and is reserved for integrity verification, but `persistApplicationSnapshot` never computes or writes this value. Without a hash there is no way to verify a snapshot's JSONB payload has not been tampered with since storage. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistApplicationSnapshot`) |
| **Effort** | S |
| **Acceptance criteria** | (1) Before insert, compute `SHA-256(JSON.stringify(profileSnapshot) + JSON.stringify(jobSnapshot) + JSON.stringify(docsSnapshot) + applicationId)` and write to `snapshot_hash`. (2) A `verifySnapshotIntegrity(applicationId)` helper recomputes the hash and compares to stored value. (3) `snapshot_hash` is NOT NULL after any new insert. (4) Existing NULL rows are acceptable (pre-implementation). (5) Unit test for hash computation and verification. |
| **Recommended command** | `/SECURE` pass to validate the integrity design |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-002 |
| **Title** | Delegate match score calculation in persistMatchSnapshot to canonical service |
| **Category** | Architecture / Deduplication |
| **Problem** | `persistMatchSnapshot` hand-rolls `(matchedRequired.length / (matchedRequired.length + missingRequired.length)) * 60 + (hasCv ? 40 : 0)`. `employerApplicantSignalsService` uses `jobRequiredSkills.length` as the denominator, which differs when matched + missing is a subset of required (e.g. when the skill comparison has incomplete overlap). If weights are updated in the signals service, `match_snapshots.match_score` silently diverges. |
| **Priority** | P2 |
| **Affected files** | `services/applicationSnapshotService.js` (`persistMatchSnapshot`), `services/match/employerApplicantSignalsService.js` |
| **Effort** | S |
| **Acceptance criteria** | (1) `getApplicantFitSignals` returns (or a new helper exposes) the computed `totalScore` as a field on its return object. (2) `persistMatchSnapshot` uses that value directly. (3) `REQUIRED_SKILLS_WEIGHT` and `APPLICATION_COMPLETENESS_WEIGHT` defined in exactly one place. (4) Test asserts `match_snapshots.match_score` equals `getApplicantFitSignals` output for the same inputs. |
| **Recommended command** | `/MATCHED` QA pass after fixing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-003 |
| **Title** | Unit test coverage for applicationSnapshotService.js |
| **Category** | Testing |
| **Problem** | `scoreApplicationCompleteness`, `buildApplicantProfileSnapshot`, `buildJobSnapshot`, `buildSubmittedDocumentsSnapshot`, `buildSubmittedVideoAnswersSnapshot`, and the idempotency guarantee have no test coverage. A regression in the completeness rubric goes undetected until employers report wrong scores. |
| **Priority** | P2 |
| **Affected files** | New: `services/__tests__/applicationSnapshotService.test.js` |
| **Effort** | M |
| **Acceptance criteria** | (1) `scoreApplicationCompleteness` tested with: all fields present (score >= 90, level = "excellent"), only required fields (score ~70, "strong"), nothing present (score 0, "incomplete"), only optional fields (score ~30). (2) `buildApplicantProfileSnapshot` tested: null profile returns `{ available: false }`, valid profile excludes all `EXCLUDED_FIELDS`. (3) `persistApplicationSnapshot` mocked — test confirms `ON CONFLICT DO NOTHING` (not `DO UPDATE`). (4) `scoreApplicationCompleteness` never mutates input arguments. (5) All tests pass in CI. |
| **Recommended command** | `/TEST` after writing |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P2-004 |
| **Title** | Admin view to inspect snapshot data per application |
| **Category** | Feature / Admin |
| **Problem** | `adminController.js` has no snapshot-related endpoints. Operations and support staff cannot inspect snapshot rows for a specific application without direct SQL access. |
| **Priority** | P2 |
| **Affected files** | `controllers/adminController.js`, `routes/adminRoute.js`, `get-hired-FE/src/app/admin-panel/` |
| **Effort** | M |
| **Acceptance criteria** | (1) New admin endpoint `GET /admin/application-snapshot?applicationId=<id>` returns all three snapshot rows. (2) Admin auth middleware required. (3) Response includes raw JSONB fields. (4) Admin UI table displays snapshot data for a selected application. (5) No applicant-facing data exposed to non-admins. |
| **Recommended command** | Standard feature development |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-007 |
| **Title** | Add fragment anchors to profile edit sections for completeness tip deep-links |
| **Category** | UX / FE |
| **Problem** | The completeness tip fields (`work_experience`, `skills`, `education`, `cv_submitted`, `certifications`) map to distinct sections in `ApplicantProfileFormComponent`, but the profile edit page has no fragment-based anchors. Tip CTAs (COMP-P1-006) can only link to `/user/profile/edit` — the user still has to scroll to find the relevant section. Fragment navigation (`/user/profile/edit#work-experience`) would create a fully guided fix flow. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-profile/applicant-profile-form/applicant-profile-form.component.html`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) `ApplicantProfileFormComponent` template has `id` attributes on section headings for: `work-experience`, `skills`, `education`, `cv-upload`, `certifications`. (2) `ApplicantApplicationsComponent` maps tip fields to fragment targets in a const map (e.g., `FIELD_FRAGMENT_MAP`). (3) CTA button uses `router.navigate(['/user/profile/edit'], { fragment: fragmentKey })`. (4) Angular's `ViewportScroller` or a scroll-to-fragment directive scrolls the target section into view on load. (5) Gracefully degrades to `/user/profile/edit` (no fragment) for any field not in the map. |
| **Recommended command** | None — FE UX change |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P2-008 |
| **Title** | Replace shared snapshotsLoaded flag with per-row resolved state |
| **Category** | UX / FE |
| **Problem** | `forkJoin` in `loadSnapshots()` sets `snapshotsLoaded = true` only when ALL calls complete. If one application's snapshot call is slow, all rows continue showing skeleton until the last call resolves. Users with a mix of fast and slow-responding applications see all rows frozen in skeleton state while the slowest call finishes. |
| **Priority** | P2 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`, `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` |
| **Effort** | S |
| **Acceptance criteria** | (1) `snapshotsLoaded` is replaced with `snapshotsReady = new Set<string>()` tracking which application IDs have resolved. (2) Each call uses `tap()` or `finalize()` to add its ID to `snapshotsReady` on completion (success or error). (3) Template condition becomes `snapshotsReady.has(app.jobApplicationId)` for per-row skeleton vs. content. (4) The `retry()` method clears `snapshotsReady` in addition to `snapshotsMap`. (5) No user-visible regression for the single-application case. |
| **Recommended command** | None — FE UX polish |

---

## P3 — Low Priority

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-001 |
| **Title** | Surface completeness improvement tips to applicant in dashboard |
| **Category** | Feature / UX |
| **Problem** | The completeness tips are now visible on "My Applications" (resolved by SNAP-P1-001). However, the applicant dashboard (`/user/dashboard`) still has no completeness widget. An applicant who does not navigate to "My Applications" never sees the feedback. A dashboard summary card ("Your last application was 62% complete — here's what to fix") would increase profile completion rates. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-dashboard/`, `application.service.ts` |
| **Effort** | S |
| **Acceptance criteria** | (1) Dashboard includes an "Improve your application" card that calls `getApplicationSnapshot` for the most recent application only. (2) Shows missing required items as actionable tips with CTAs (linking to `/user/profile/edit` per COMP-P1-006). (3) Shows the `disclaimerNote`. (4) Card is hidden when all required items are complete or when no snapshot exists. (5) Card is dismissible (localStorage flag). |
| **Recommended command** | `/NOTIFY` to coordinate notification triggers |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-002 |
| **Title** | Webhook or event notification when snapshot is ready |
| **Category** | Architecture / Integration |
| **Problem** | Snapshot creation is fire-and-forget. Downstream consumers (analytics, notification service) have no hook to react when a snapshot is ready. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` (`createApplicationSnapshots`) |
| **Effort** | S |
| **Acceptance criteria** | (1) After all three snapshots are successfully persisted, `createApplicationSnapshots` emits an internal event with `{ applicationId, applicantId, jobId, completenessScore, matchLevel }`. (2) Emission is non-blocking. (3) At least one consumer registered in production (log-only acceptable initially). (4) Unit test verifies event emitted on success, not on total failure. |
| **Recommended command** | Standard infrastructure work; coordinate with `/NOTIFY` |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-003 |
| **Title** | Relocate DISCLAIMER to a single canonical location |
| **Category** | Architecture / Maintainability |
| **Problem** | `applicationSnapshotService.js` imports `DISCLAIMER` from `employerApplicantSignalsService.js` then re-exports it. Callers importing `DISCLAIMER` from the snapshot service have an indirect dependency on the match service. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js`, `services/match/employerApplicantSignalsService.js`, new `constants/disclaimers.js` |
| **Effort** | XS |
| **Acceptance criteria** | (1) `DISCLAIMER` defined in exactly one source location. (2) Both services import from that location. (3) No file re-exports a value it did not define. (4) No behavior change. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-004 |
| **Title** | Extract getUserCompany from companiesController into a service |
| **Category** | Architecture / Coupling |
| **Problem** | `applicationController.js` imports `getUserCompany` from `controllers/companiesController.js`. Cross-importing controller helpers from other controllers creates tight coupling and circular-import risk. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js`, `controllers/companiesController.js`, `services/company.service.js` |
| **Effort** | XS |
| **Acceptance criteria** | (1) `getUserCompany` moved to `services/company.service.js`. (2) Both controllers import from the service. (3) No behavior change. |
| **Recommended command** | Standard refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | SNAP-P3-005 |
| **Title** | Add comment clarifying scoreApplicationCompleteness video-answer detection chain |
| **Category** | Maintainability / Documentation |
| **Problem** | In `createApplicationSnapshots` line ~548, `scoreApplicationCompleteness` is called with `answersSnapshot.answers.filter(a => a.hasAnswerFile)` as `submittedVideoAnswers`. This is a mapped snapshot object, not the original `interviewAnswers`. The indirection is non-obvious. |
| **Priority** | P3 |
| **Affected files** | `services/applicationSnapshotService.js` (line ~548) |
| **Effort** | XS |
| **Acceptance criteria** | (1) Inline comment explains that `submittedVideoAnswers` is derived from the snapshot's mapped answers and why this is intentional. (2) No behavior change. |
| **Recommended command** | None — code comment only |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P3-009 |
| **Title** | Fix retry() to call a private data-load method instead of ngOnInit() |
| **Category** | Maintainability / FE |
| **Problem** | `retry()` in `ApplicantApplicationsComponent` calls `this.ngOnInit()`. Angular's lifecycle contract does not expect `ngOnInit` to be called more than once on a live component. While this works today, it bypasses Angular conventions and can cause subtle issues with lifecycle-aware third-party libraries or future change-detection strategies. |
| **Priority** | P3 |
| **Affected files** | `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` |
| **Effort** | XS |
| **Acceptance criteria** | (1) The data-loading logic in `ngOnInit` is extracted to a `private loadApplications(): void` method. (2) `ngOnInit` calls `this.loadApplications()`. (3) `retry()` calls `this.loadApplications()` (not `ngOnInit`). (4) Behavior is identical to the current implementation. |
| **Recommended command** | None — XS refactor |

---

| Field | Value |
|-------|-------|
| **Action ID** | COMP-P3-010 |
| **Title** | Clarify that completeness score is "at time of application" in disclaimer |
| **Category** | UX / Copy |
| **Problem** | The completeness score shown in "My Applications" reflects the profile state at submission time (snapshot is intentionally immutable). If an applicant fills in missing fields after applying, their score on the page will not update. The current `disclaimerNote` ("Application completeness measures submitted information, not candidate quality. It is not a hiring score.") does not mention that the score is frozen at submission time. An applicant who adds work experience and then checks "My Applications" will see an unchanged "incomplete" score and may believe their profile update did not save. |
| **Priority** | P3 |
| **Affected files** | `controllers/applicationController.js` (`getApplicantApplicationSnapshot` — `disclaimerNote` string), `services/applicationSnapshotService.js` (evidence object disclaimer text) |
| **Effort** | XS |
| **Acceptance criteria** | (1) `disclaimerNote` text updated to include: "This score reflects your profile at the time you submitted this application. Updating your profile now will not change this score." (2) The updated text is returned by the API and rendered by the FE template (the template already renders `snap.disclaimerNote` — no FE code change needed). (3) No behavior change. |
| **Recommended command** | None — copy change only |

---

## Summary Table

| Action ID | Title | Priority | Effort | Is New |
|-----------|-------|----------|--------|--------|
| SNAP-P0-001 | Confirm DDL applied to production | P0 | XS | Carried over |
| COMP-P1-005 | Batch snapshot endpoint (eliminate N API calls) | P1 | S | NEW |
| COMP-P1-006 | Add "Fix this now" CTA from tips to profile edit | P1 | XS | NEW |
| SNAP-P1-002 | Backfill script for existing applications | P1 | S | Carried over |
| SNAP-P1-003 | Completeness distribution dashboard endpoint | P1 | M | Carried over |
| SNAP-P1-004 | Fix null companyId NOT NULL constraint risk | P1 | XS | Carried over |
| COMP-P2-007 | Fragment anchors for completeness tip deep-links | P2 | S | NEW |
| COMP-P2-008 | Per-row resolved state instead of shared snapshotsLoaded | P2 | S | NEW |
| SNAP-P2-001 | Implement snapshot_hash integrity verification | P2 | S | Carried over |
| SNAP-P2-002 | Delegate match score to canonical service | P2 | S | Carried over |
| SNAP-P2-003 | Unit tests for applicationSnapshotService.js | P2 | M | Carried over |
| SNAP-P2-004 | Admin view for snapshot data per application | P2 | M | Carried over |
| COMP-P3-009 | Fix retry() — call private method not ngOnInit | P3 | XS | NEW |
| COMP-P3-010 | Clarify score is frozen at submission time in disclaimer | P3 | XS | NEW |
| SNAP-P3-001 | Surface completeness improvement tips in dashboard | P3 | S | Carried over (partially resolved) |
| SNAP-P3-002 | Webhook/event when snapshot is ready | P3 | S | Carried over |
| SNAP-P3-003 | Relocate DISCLAIMER to canonical location | P3 | XS | Carried over |
| SNAP-P3-004 | Extract getUserCompany to service layer | P3 | XS | Carried over |
| SNAP-P3-005 | Comment on video-answer detection chain | P3 | XS | Carried over |

**Total actions: 19**
**P0: 1 | P1: 5 | P2: 6 | P3: 7**
**Resolved this cycle: 1 (SNAP-P1-001)**
**New actions from this deployment: 6 (COMP-P1-005, COMP-P1-006, COMP-P2-007, COMP-P2-008, COMP-P3-009, COMP-P3-010)**
