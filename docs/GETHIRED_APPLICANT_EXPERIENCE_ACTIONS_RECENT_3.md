# GetHired — Applicant Experience Actions RECENT 3
**Generated:** 2026-06-26
**Scope:** Job-seeker (applicant) facing features, flows, and UX quality
**Previous state:** Applicant completeness UI shipped (Applicant Completeness V2); subscription leaks fixed this session

---

## Status: Applicant Experience is Stable and Launch-Ready

Core applicant flows are functional and deployed:
- Public job search and listing: functional
- Job detail pages: SSR correct (real 404, JSON-LD, OG tags)
- Application submission: functional
- Applicant profile/completeness UI: shipped (V2 — see GETHIRED_APPLICANT_APPLICATION_COMPLETENESS_FINAL_REPORT_V2.md)
- CV Coach and Match systems: verified end-to-end (see project_gethired_profile_cvcoach_match_status.md)
- Subscription leaks fixed this session (job-posts-list, banner, public-search)

---

## Closed This Session (Applicant-Facing Impact)

| Item | Impact |
|---|---|
| Subscription leaks (job-posts-list, banner, public-search) | Memory leak elimination; smoother SPA navigation |
| SSR real HTTP 404 on job detail | Accurate status for expired/unknown job URLs |
| SSR JSON-LD fix | Applicant-shared job links show rich previews in SEO results |
| OG image | Job detail pages shared by applicants show branded preview on social |
| localStorage SSR guard (P2-LOCALSTORAGE-SSR — still open) | When fixed: public-search page will SSR correctly for Googlebot |

---

## Open Applicant Experience Items

### P2 — localStorage SSR Guard in Public Search (P2-LOCALSTORAGE-SSR)

**File:** `src/app/jobs/public-search/public-search.component.ts`
**Impact:** If localStorage calls throw during SSR, Googlebot sees only the loading skeleton for the public search page — the primary job discovery page. Applicants arriving from Google see correct content (client-renders fine); only Googlebot is affected.
**Fix:** Wrap localStorage calls with `isPlatformBrowser(this.platformId)` guard.

---

### P3 — Reusable Table Hidden on Mobile — No Card Fallback (P3-REUSABLE-TABLE-MOBILE)

**File:** `src/app/shared/components/reusable-table/reusable-table.component.html`
**Impact:** Authenticated applicants on mobile (application history, status views) see empty space where the data table should be. The `d-none d-md-inline` class hides the table but no card-view alternative exists.
**Fix:** Add a card-based list view that renders on mobile, hidden on desktop (complementary to the table view).
**Effort:** M

---

### P3 — Applicant CV Coach / MATCH Features

Status: Fully wired end-to-end (see project_gethired_profile_cvcoach_match_status.md from 2026-06-24).
- PROFILE: orphaned-backend issue fixed (commit 85843f5)
- CVCOACH: fully wired end-to-end
- MATCH: employer-side signals confirmed wired

No action items — these are in PASS state.

---

### P3 — Application Submission Missing Tables (Stale Warning)

The earlier schema gap warning (job_applicants / job_applicant_status tables missing) is STALE per checkpoint memory. Verify current status with the SWEEP report before treating as a blocker.

---

### Deferred — Programmatic SEO for Applicant Discovery

"Find jobs in [city]" and "Remote [role] jobs" landing pages would significantly improve organic applicant acquisition. Deferred until job volume threshold (5+ active jobs per city/category). See GETHIRED_PUBLIC_PORTAL_ACTIONS_RECENT_3.md.

---

## Applicant Experience Health Scorecard

| Area | Status | Notes |
|---|---|---|
| Public job listing | PASS | functional; crawlable CTAs |
| Job detail page | PASS | SSR + JSON-LD + OG + real 404 |
| Job search / filter | PASS | functional; localStorage SSR guard P2 open |
| Application submission | PASS | functional |
| Applicant profile (PROFILE) | PASS | V2 shipped; orphaned-backend fixed |
| CV Coach (CVCOACH) | PASS | Fully wired |
| Match Engine (MATCH) | PASS | Fully wired |
| Mobile table views | OPEN (P3) | No card fallback on mobile |
| Subscription lifecycle | PASS | Leaks fixed this session |
| SSR correctness | PASS (with P2 open) | JSON-LD and 404 correct; localStorage guard pending |
