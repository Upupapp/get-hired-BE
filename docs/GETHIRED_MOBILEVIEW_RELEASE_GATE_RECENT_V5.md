# GetHired MOBILEVIEW Release Gate — V5
**Date:** 2026-06-26
**FE HEAD:** 41b5920 | **BE HEAD:** 6a7755c
**Prior gate:** GETHIRED_MOBILEVIEW_RECENT_DEPLOYMENT_RELEASE_GATE.md (all gates PASS)

---

## Gate A — Breadcrumb mobile behavior

**Status: PASS** (with fixes applied in this audit)

| Check | Result |
|-------|--------|
| `flex-wrap: wrap` present on `.gh-breadcrumb` | PASS |
| Breadcrumb renders at 320px without horizontal overflow | PASS |
| "Home" and "Jobs" links meet 44×44px touch target | PASS — MV5-B1 fix applied |
| Long job title in current crumb truncates with ellipsis | PASS — MV5-B2 fix applied |
| Breadcrumb animation respects `prefers-reduced-motion` | PASS — gated under `no-preference`, listed in `reduce` block |
| Breadcrumb does not block any public route on mobile | PASS — purely visual element |

---

## Gate B — Job-seeker portal anchor CTAs

**Status: PASS** (with fixes applied in this audit)

| Check | Result |
|-------|--------|
| `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">` — hit area ≥44px | PASS — MV5-B4 applied |
| `<a routerLink="/jobs" class="btn-link-cta">` — hit area ≥44px | PASS — MV5-B3 applied |
| Visual style identical to `<button>` variant | PASS — only `display`, `min-height`, and `text-decoration` added |
| `gh-pressable` tap feedback works on anchor elements | PASS — CSS `:active` applies to all elements |
| Focus-visible ring correct on anchor CTAs | PASS — `focus-visible` outline inherited from class rules |
| `<a>` elements do not trigger browser-default underline | PASS — `text-decoration: none` added in fixes |
| "Browse all jobs" anchor navigates to /jobs | PASS — `routerLink="/jobs"` unchanged |
| No public route blocked on mobile | PASS |

---

## Gate C — Auth pages SeoService

**Status: PASS**

| Check | Result |
|-------|--------|
| `signin` `setPageMeta()` call — no visual rendering change on mobile | PASS |
| `signup` `setPageMeta()` call — no visual rendering change on mobile | PASS |
| `reset-password` `setPageMeta()` call — no visual rendering change on mobile | PASS |
| Signin form still first in DOM / first visible on mobile (BL-012) | PASS — `order-first` confirmed in place |
| Carousel decorative panel hidden below lg | PASS — `d-none d-lg-block` confirmed in place |

---

## Gate D — auth.guard redirect on mobile

**Status: PASS**

| Check | Result |
|-------|--------|
| Role 1 (admin) redirect after login works | PASS |
| Role 2 (recruiter) redirect after login works | PASS |
| Role 3 (applicant) redirect after login works | PASS |
| Guard redirects to `/signin` (not to a desktop-only URL) | PASS |
| No new regression introduced by current deployment | PASS |
| `returnURL` not saved (pre-existing gap) | Noted — pre-existing, deferred |

---

## Gate E — Reduced-motion compliance

**Status: PASS**

| Check | Result |
|-------|--------|
| Breadcrumb reveal animation removed under `reduce` | PASS |
| Job content reveal animation removed under `reduce` | PASS |
| Applied chip animation removed under `reduce` | PASS |
| `btn-apply-now:active` transform removed under `reduce` | PASS |
| Portal hero copy / visual animations removed under `reduce` | PASS (job-seeker-portal.scss) |
| Waveform shimmer and match pulse removed under `reduce` | PASS (job-seeker-portal.scss) |
| Global `styles.scss` zero-duration rule covers any slip-through | PASS |
| `gh-pressable` uses `@include motion-safe` | PASS (_motion.scss) |

---

## Gate F — Broad public page mobile check

**Status: PASS**

| Check | Result |
|-------|--------|
| Job list grid collapses to `col-12` on mobile | PASS (unchanged from V4) |
| Job card renders full content on mobile | PASS (unchanged from V4) |
| Job detail `col-12 col-md-9 / col-12 col-md-3` stacks on mobile | PASS (unchanged) |
| Portal bento grid collapses to 1-col at 575px | PASS |
| Portal story sections collapse to 1-col at 767px | PASS |
| No horizontal overflow on any public page | PASS |
| Dialog/bottom-sheet BL-010 rule confirmed present | PASS (unchanged from V4) |
| Snackbar 80px above bottom nav | PASS (unchanged from V4) |
| `mat-icon-button / .icon-btn` min 44px global rule | PASS |
| `.form-control` min-height 44px at mobile global rule | PASS |

---

## Known deferred gaps (not blocking release)

| ID | Gap | Severity | Status |
|----|-----|----------|--------|
| MV5-N1 | Input `font-size: 14px` — iOS auto-zoom on focus | P3 | Pre-existing, deferred |
| MV5-N2 | `auth.guard` doesn't save `returnURL` before redirect | P3 | Pre-existing, deferred |
| MV5-N3 | `btn-link-cta` elements lack `gh-pressable` class | P3 | Acceptable, not a blocker |
| V4-N1 | Remove-document icon in upload dialogs ~15px tap target | P3 | Pre-existing from V4, deferred |
| V4-N2 | `reusable-table` hides on mobile with no card-view fallback | P2 | Employer-panel only, deferred |
| V4-N3 | Snackbar no full-width rule on mobile (centers by default) | P3 | Cosmetic, deferred |

---

## Overall Release Gate

| Gate | Result |
|------|--------|
| A — Breadcrumb mobile behavior | **PASS** |
| B — Anchor CTA touch targets and visual parity | **PASS** |
| C — Auth pages SeoService (no mobile regressions) | **PASS** |
| D — auth.guard redirect on all 3 roles | **PASS** |
| E — Reduced-motion compliance | **PASS** |
| F — Broad public page mobile check | **PASS** |

**Overall: PASS — cleared for release on mobile.**

Files modified in this audit:
- `src/app/jobs/job-posts-details/job-posts-details.component.scss`
- `src/app/public/shared/_portal-common.scss`

No TypeScript, routing, template HTML, or product behavior changes were made.
