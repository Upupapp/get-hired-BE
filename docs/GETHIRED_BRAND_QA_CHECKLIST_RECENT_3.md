# GETHIRED BRAND — QA CHECKLIST (RECENT 3)
**Date:** 2026-06-26

---

## How to Use

Run these checks manually or in a browser test session against the deployed app or local dev server. Mark each as PASS / FAIL / SKIP with notes.

---

## Section A: Breadcrumb Nav (CLS + Touch Target)

| # | Check | Method | Expected |
|---|---|---|---|
| A1 | Navigate to a job detail URL. Does the breadcrumb appear without layout shift? | Chrome DevTools > Performance > CLS | CLS for breadcrumb < 0.05 |
| A2 | Tap/click on "Home" breadcrumb link on a mobile device. Does it respond to tap? | Manual touch | Link navigates; hit area feels large |
| A3 | Does "Jobs" breadcrumb link navigate to `/jobs`? | Manual click | Navigates to jobs list |
| A4 | For a job with a very long title (> 20 chars), is the current breadcrumb crumb truncated with ellipsis? | Use a real long-title job | Title truncates, no overflow |
| A5 | Under `prefers-reduced-motion: reduce` (toggle in DevTools > Rendering), does the breadcrumb appear without animation? | DevTools | Appears instantly, no fade/translate |
| A6 | Tab to each breadcrumb link — does a visible focus ring appear? | Keyboard navigation | 2px coral outline visible |

---

## Section B: 44px Touch Targets

| # | Check | Method | Expected |
|---|---|---|---|
| B1 | `.btn-apply-now` — rendered height ≥ 44px | DevTools inspect, computed height | ≥ 44px |
| B2 | `.btn-link-cta` in portal pages — rendered height ≥ 44px | DevTools inspect | ≥ 44px |
| B3 | `.btn-cta-primary` in portal pages — rendered height ≥ 44px | DevTools inspect | ≥ 44px |
| B4 | Breadcrumb `<a>` links — rendered height ≥ 44px | DevTools inspect | ≥ 44px (inline-flex expands hit area) |

---

## Section C: Error State

| # | Check | Method | Expected |
|---|---|---|---|
| C1 | Navigate to `/jobs/details/invalid-id`. Does the branded error state show? | Browser | `.job-detail-error-state` with "This job isn't available" |
| C2 | Does the error state have "Browse all jobs" button? | Visual | Yes, button present |
| C3 | Does the error state appear for auth errors? | Sign out, navigate to a job that requires auth (if any) | "Session required" variant shows |
| C4 | Does the error state slide in (not flash)? | With animations enabled | Smooth 160ms fade from above |
| C5 | Does the page title change to "Job not found | GetHired"? | Browser tab | Yes |
| C6 | Is the error state announced by a screen reader? | VoiceOver / NVDA | role=alert triggers announcement |
| C7 | Under reduced motion, does error state appear without animation? | DevTools reduced-motion | Appears instantly |

---

## Section D: Snackbar Colors

| # | Check | Method | Expected |
|---|---|---|---|
| D1 | Trigger a `.warn-snackbar` — correct amber color? | HTTP 429 from server OR check interceptor code | #b45309 amber background |
| D2 | Trigger `.error-snackbar` (recorder settings) — correct red? | Navigate to recorder page, deny device access | #FE6F61 red background |
| D3 | Trigger `.success-snackbar` (share link) — coral background? | Click share icon on job detail | #FF7062 coral background |
| D4 | All snackbar text readable? | Visual / DevTools contrast checker | White text visible |

---

## Section E: OG Image

| # | Check | Method | Expected |
|---|---|---|---|
| E1 | Social share the home URL — is the OG image a dark navy branded card (not the logo)? | Facebook Debugger / LinkedIn Post Inspector | `gethired-og-default.png` shown |
| E2 | Does the SSR shell serve the new og:image in the HTML source? | View source of `https://gethiredonline.app` | `og:image` = `.../brand/gethired-og-default.png` |
| E3 | Is the image 1200×630? | DevTools Network, image response headers OR check `og:image:width/height` meta | 1200×630 |

---

## Section F: Motion Token Conflicts

| # | Check | Method | Expected |
|---|---|---|---|
| F1 | Load job detail — does content reveal animation play correctly (fade + translateY)? | Visual | Smooth 220ms decelerate |
| F2 | Enable reduced motion in DevTools — do ALL animations on job detail page stop? | DevTools Rendering > Emulate prefers-reduced-motion: reduce | No movement visible |
| F3 | Do portal hover effects (card lift, CTA hover) fire under reduced motion? | DevTools reduced-motion + hover | No transform, no box-shadow change |
