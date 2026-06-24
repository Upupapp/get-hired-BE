# GETHIRED — Launch Checklist
## Applicant Completeness UI — Badge + Card + Detail Route Cycle
**Generated:** 2026-06-24
**Deployment:** FE 5ab9a05 / BE 422d340 (BE unchanged from prior cycle)
**Supersedes:** Previous launch checklist (FE 20a44c5 / BE 422d340)

---

## Instructions

Work through each item in order. Do not mark an item complete without direct verification. Items marked BLOCKED must be resolved before the deployment is considered production-ready. Sections 1 and 2 are hard prerequisites — complete them before any other section.

Section 6 (Backfill) must be completed after section 1 but can be done separately from the rest.

---

## 1. DB Migration Applied to Production

> Hard prerequisite for ALL snapshot functionality. If the tables are missing: the batch endpoint returns 500s silenced by catchError (every applicant sees "not available"); the detail page single endpoint also returns null; the backfill script crashes immediately. This check was on the previous checklist and has not been confirmed closed — it remains the single most important action.

- [ ] **1.1** Connect to the production database with read access.
- [ ] **1.2** Run: `SELECT to_regclass('gethired.application_snapshots');` — result must NOT be null.
- [ ] **1.3** Run: `SELECT to_regclass('gethired.application_completeness_snapshots');` — result must NOT be null.
- [ ] **1.4** Run: `SELECT to_regclass('gethired.match_snapshots');` — result must NOT be null.
- [ ] **1.5** Run: `SELECT COUNT(*) FROM gethired.application_snapshots;` — must return without error.
- [ ] **1.6** Verify the partial unique index: `SELECT indexname FROM pg_indexes WHERE tablename = 'application_snapshots' AND indexname = 'application_snapshots_application_id_source_unique';` — must return one row.
- [ ] **1.7** Record the timestamp the migration was applied and the person who applied it.

**Status:** [ ] PASS / [ ] BLOCKED — apply `db/application_snapshots_ddl.sql` to production before proceeding

---

## 2. Both Repos Deployed in Sync (FE 5ab9a05 + BE 422d340)

> BE is unchanged from the prior cycle. The FE-only changes in this cycle add a new route and component. Confirm the FE is at the correct commit.

- [ ] **2.1** Confirm the FE deployment at 5ab9a05 includes:
  - `ApplicantApplicationDetailComponent` in `src/app/applicant-panel/applicant-application-detail/`
  - Route declared in `applicant-panel.module.ts` (path: `applications/:id`, component: `ApplicantApplicationDetailComponent`)
  - `ApplicationCompletenessCardComponent` updated with `@Input() applicationId` and `onCtaClick()` analytics handler
  - `applicant-applications.component.html` includes "View full details →" link passing router state
  - `PublicPortalAnalyticsService` includes `trackApplicationCompletenessDetailViewed` (if added this cycle) or `trackApplicationCompletenessCtaClicked` (wired to CTA clicks)
- [ ] **2.2** Confirm BE deployment at 422d340 is unchanged from prior cycle — no new endpoints or schema changes needed for this FE-only release.
- [ ] **2.3** Check git HEAD on production for both repos — confirm FE at 5ab9a05, BE at 422d340.
- [ ] **2.4** Confirm no pending BE restarts or migrations needed.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 3. New Detail Route: /user/applications/:id

> Verifies the dedicated application detail page is accessible and functional.

### 3a. Normal navigation from list

- [ ] **3a.1** Log in as an applicant with at least one application.
- [ ] **3a.2** Navigate to `/user/applications`. Verify the list loads.
- [ ] **3a.3** Expand a badge by clicking the toggle button. Verify the card reveals within the list row.
- [ ] **3a.4** Click "View full details →" in the expanded section. Verify navigation to `/user/applications/<id>`.
- [ ] **3a.5** Verify the detail page header shows the correct job title, company name, and status (populated from router state).
- [ ] **3a.6** Verify the "Application completeness" section shows the `ApplicationCompletenessCardComponent` in its correct state (loading → resolved).
- [ ] **3a.7** For an application with a real snapshot, verify `snapshotCreatedAt` is displayed as "Captured <date>" below the score.
- [ ] **3a.8** Verify the "My Applications" back button navigates to `/user/applications`.

### 3b. Cold navigation (direct URL)

- [ ] **3b.1** Paste `/user/applications/<id>` directly in the address bar (or open in a new tab without prior list navigation).
- [ ] **3b.2** Verify the page loads without error.
- [ ] **3b.3** Verify completeness data loads correctly (the single endpoint is called regardless of router state).
- [ ] **3b.4** Verify the heading falls back gracefully to "Application Details" when jobTitle and companyName are absent from router state (this is the expected fallback for cold navigation — DETAIL-P2-001).
- [ ] **3b.5** Verify no broken layout, no 404, no infinite loading.

### 3c. Non-existent application ID

- [ ] **3c.1** Navigate to `/user/applications/nonexistent-id`.
- [ ] **3c.2** Verify error state is shown: the card component renders the error block.
- [ ] **3c.3** Verify no unhandled exception or blank white screen.

### 3d. Error and retry on detail page

- [ ] **3d.1** In dev/staging: block `GET /applicant/application/snapshot?applicationId=<id>`.
- [ ] **3d.2** Navigate to `/user/applications/<id>`.
- [ ] **3d.3** Verify error state renders in the card with a "Try again" button.
- [ ] **3d.4** Restore the endpoint. Click "Try again". Verify data loads.
- [ ] **3d.5** Verify `retry()` clears `loading`, `error`, and `snapshot` before re-calling `load()`.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 4. CTA Analytics — Verify Click Events Fire

> Verifies that the CTA analytics wiring in ApplicationCompletenessCardComponent works correctly.

- [ ] **4.1** Open browser DevTools console.
- [ ] **4.2** Navigate to `/user/applications` as an applicant with a non-complete application (has missingRequired or missingRecommended items).
- [ ] **4.3** Expand the completeness card for that application.
- [ ] **4.4** Click "Update your profile →" in the amber required-tips block. Verify:
  - Console shows `[Analytics] applicationCompletenessCtaClicked { applicationId: '...', ctaLabel: 'Update your profile' }` (or equivalent debug output).
  - Navigation to `/user/profile/edit` occurs.
- [ ] **4.5** Navigate back. Expand the card for an application with only recommended tips.
- [ ] **4.6** Click "Add to your profile →" in the blue recommended-tips block. Verify:
  - Console shows `[Analytics] applicationCompletenessCtaClicked { applicationId: '...', ctaLabel: 'Add to your profile' }` (or equivalent).
  - Navigation to `/user/profile/edit` occurs.
- [ ] **4.7** Click "View full details →" to navigate to the detail page. Verify the card CTAs also fire analytics on the detail page (same component reused with `[applicationId]` input set).
- [ ] **4.8** Verify `applicationId` in the analytics payload matches the actual application being viewed (not null, not a different ID).

**Status:** [ ] PASS / [ ] BLOCKED

---

## 5. snapshotCreatedAt Display Verified

> Verifies the "Captured on..." timestamp appears on the detail page and is absent (gracefully) on the list.

- [ ] **5.1** Log in as an applicant with an application that has a real snapshot (`source = 'application_submit'` row in `application_completeness_snapshots`).
- [ ] **5.2** Navigate to `/user/applications/<id>` (detail page, direct or via "View full details" link).
- [ ] **5.3** Verify "Captured <date>" is displayed in the completeness card, using the `snapshotCreatedAt` value from the single endpoint.
- [ ] **5.4** Navigate back to `/user/applications`. Expand the same application's card.
- [ ] **5.5** Verify the in-list card does NOT show "Captured <date>" (batch endpoint does not return `snapshotCreatedAt`). This is expected behavior (DETAIL-P3-001 tracks the future fix). No error, no blank field — the timestamp section is simply absent.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 6. Batch Snapshot Endpoint (From Prior Cycle — Carry-Forward)

> These items were on the prior checklist. If they were previously verified, confirm they still pass. If not yet verified, complete them now.

- [ ] **6.1** Log in as an applicant with at least two applications. Call `GET /applicant/application/snapshots?applicationIds=<id1>,<id2>` with a valid Bearer token. Expect HTTP 200.
- [ ] **6.2** Verify response contains `data.snapshots` as a map keyed by application ID with all required fields.
- [ ] **6.3** Mix in an unowned application ID — verify it is silently omitted from the response.
- [ ] **6.4** Call with >50 IDs — expect HTTP 400.
- [ ] **6.5** Call unauthenticated — expect HTTP 401.
- [ ] **6.6** On `/user/applications`, verify exactly ONE request to `/applicant/application/snapshots` in the network tab (not N requests).

**Status:** [ ] PASS / [ ] BLOCKED / [ ] CARRY-FORWARD (already verified in FE 20a44c5 cycle)

---

## 7. Backfill Script — Pre-Flight Verification

> Section 1 (DDL check) must be PASS before this section. Do NOT run the live backfill until all items here are PASS.

- [ ] **7.1** Section 1 must be PASS. Do not proceed if any snapshot table is missing.
- [ ] **7.2** Run dry-run against production: `node scripts/backfill_application_snapshots.js --dry-run`. Verify it prints the count of un-snapshotted applications and exits cleanly.
- [ ] **7.3** Run with `--limit=5` against staging (real schema). Verify 5 rows in `application_completeness_snapshots` with `source = 'backfill_current_data'`.
- [ ] **7.4** Rerun `--limit=5` against same staging env. Verify no duplicates (idempotent).
- [ ] **7.5** Note: BACKFILL-P0-001 is still open — the script has no programmatic DDL pre-flight check. Rely on section 1 of this checklist as the gate. Do not skip section 1.
- [ ] **7.6** Schedule live prod backfill during a low-traffic window. Monitor logs in real time.
- [ ] **7.7** After live run: `SELECT COUNT(*) FROM gethired.application_completeness_snapshots WHERE source = 'backfill_current_data';` — count must equal the dry-run count.

**Status:** [ ] PASS / [ ] BLOCKED / [ ] NOT YET STARTED

---

## 8. Regression Verification — Prior Features Still Work

> Confirms this FE-only cycle did not break prior functionality.

- [ ] **8.1** `/user/applications` list loads without errors. Applications list is intact.
- [ ] **8.2** Empty state renders for applicant with no applications.
- [ ] **8.3** Error state and "Try again" button work for a failed applications list request.
- [ ] **8.4** In-list badge toggle still works: click opens card, click again closes it.
- [ ] **8.5** "Update your profile" CTA in the list-view card still routes to `/user/profile/edit`.
- [ ] **8.6** Message thread toggle (`toggleMessages`) still works alongside badge toggle (both can be open independently).
- [ ] **8.7** Employer side: `GET /job/applicant/snapshot-summary` endpoint still returns correct employer-scoped snapshot data (no regression from FE-only change).
- [ ] **8.8** Reduced-motion simulation (DevTools → Rendering → Prefer reduced motion): badge shimmer and card fade-in are suppressed.
- [ ] **8.9** Keyboard navigation: toggle button for badge is reachable and activatable via Enter/Space. Detail page back button is reachable via Tab + Enter.
- [ ] **8.10** `ng build --configuration production` — confirm zero new errors (was PASS in the release gate for 5ab9a05).

**Status:** [ ] PASS / [ ] BLOCKED

---

## 9. Ownership and Auth Guards — Detail Route

> Verifies the new detail route and single endpoint enforce ownership correctly.

- [ ] **9.1** Applicant A navigates to `/user/applications/<applicant-A-app-id>` — expect completeness data for that application.
- [ ] **9.2** Applicant A navigates to `/user/applications/<applicant-B-app-id>` — the single endpoint should return HTTP 403. The detail page should render the error state (not a 500).
- [ ] **9.3** Unauthenticated user navigates to `/user/applications/<id>` — expect redirect to login (Angular auth guard fires before the route is activated).
- [ ] **9.4** Verify the single endpoint ownership check: `getApplicantApplicationSnapshot` must verify `candidate_id = uid` before returning data.

**Status:** [ ] PASS / [ ] BLOCKED

---

## 10. Known Open Items at Launch (Non-Blocking for FE 5ab9a05)

These items must be tracked in the backlog but do not block deployment:

- **SNAP-P0-001** — DDL must be confirmed applied to production. Hard blocker for ALL snapshot functionality, but tracked separately from this FE release. Treat as an infrastructure ticket that must be closed ASAP.
- **BACKFILL-P0-001** — Backfill script has no programmatic pre-flight DDL check.
- **DETAIL-P2-001** — Direct URL navigation to `/user/applications/:id` loses job metadata; heading falls back to "Application Details".
- **DETAIL-P2-002** — No badge impression or detail page view analytics event.
- **COMP-TEST-P2-001** — No Angular unit tests for badge, card, or detail components.
- **BATCH-P2-001** — Backfilled applications still show "not available" in the list (source filter gap).
- **BACKFILL-P2-001** — Backfill script has no resume-from-crash capability.
- **BACKFILL-P2-002** — Backfill completeness data not visually distinguished from real submission data.
- **COMP-P2-007** — CTA deep-links go to top of `/user/profile/edit`, not to the relevant section.
- **COMP-P2-008** — All skeletons reveal simultaneously on batch call completion.
- **DETAIL-P3-001** — `snapshotCreatedAt` not returned by batch endpoint; timestamp only visible on detail page.
- **COMP-P3-010** — Disclaimer does not state score is frozen at submission time.
- **SNAP-P2-001** — `snapshot_hash` column always NULL.
- **SNAP-P2-002** — Match score formula duplicated between snapshot and signals services.
- **SNAP-P1-003** — No completeness distribution endpoint for employers.

---

## Checklist Sign-Off

| Section | Status | Verified by | Date |
|---------|--------|-------------|------|
| 1. DB Migration Applied | | | |
| 2. Both Repos In Sync | | | |
| 3. New Detail Route /user/applications/:id | | | |
| 4. CTA Analytics Wiring | | | |
| 5. snapshotCreatedAt Display | | | |
| 6. Batch Endpoint (carry-forward) | | | |
| 7. Backfill Script Pre-Flight | | | |
| 8. Regression Verification | | | |
| 9. Ownership and Auth Guards — Detail Route | | | |

**Sections 1 and 2 are hard prerequisites — complete them before any other section.**
**Section 1 is also a prerequisite for section 7.**
**Sections 3–9 (excluding 7) can be completed in parallel once 1 and 2 pass.**
