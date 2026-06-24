# GETHIRED BRAND — Recent Deployment Review
## Application Snapshots System
**Date:** 2026-06-24
**Scope:** Visual/state/motion/a11y audit of the snapshot card only (employer applicant detail view).
**Files reviewed:** `src/app/job/job-applicants/job-applicants.component.html`, `.ts`, `.scss`, `src/assets/styles/_motion.scss`, `src/assets/styles/colors.scss`, `src/styles.scss`

---

## State Coverage Audit

| State | Before | After |
|---|---|---|
| Loading | Plain `<div class="text-muted small">Loading snapshot...</div>` — no visual affordance | Skeleton shimmer with `role="status"` and descriptive `aria-label` |
| Has snapshot (hasSnapshot: true) | Rendered correctly; no fade-in | Fade-in via `.gh-snapshot-reveal` animation (220ms, decelerate easing) |
| No snapshot (hasSnapshot: false) | `class="text-muted small"` only; no dedicated class | `.gh-snapshot-empty` class added for consistent muted styling |
| Error / API failure | `loadSnapshotSummary` already `catchError(() => of(null))`; if null, entire card is hidden by `*ngIf="snapshotSummaryLoading || snapshotSummary"` — graceful collapse | No change needed; error fallback is already clean |

**States covered: loading YES / success YES / null YES / error YES (via null collapse)**

---

## Finding 1 — Loading State: Skeleton Replaces Plain Text

**Before:** `<div class="text-muted small" role="status">Loading snapshot...</div>`

**Problem:** Text-only loading state gives no shape preview, causes layout shift when the card loads (compact text → wider badge+score layout), and offers no branded visual while waiting.

**Fix applied:** Three-element skeleton: a short shimmer line (mimics "Completeness" label), two pill-shaped badge skeletons (mimics the badge row), and a long shimmer line (mimics the disclaimer). Pure CSS `@keyframes gh-shimmer` shimmer — no library. `@include ambient-motion-safe` removes the animation entirely under `prefers-reduced-motion`, leaving only the static gray block (still communicates loading without motion).

**Layout shift impact:** Skeleton height (12px lines + 20px badge pills + gaps) approximates the loaded content height, minimizing CLS.

---

## Finding 2 — aria-live Scope Was Incomplete

**Before:** The `aria-live="polite"` region wrapped only the loading `<div>`. The `<ng-container>` with the actual snapshot data was OUTSIDE the `aria-live` region. Screen readers would announce "Loading snapshot..." but never announce when the real data appeared.

**Fix applied:** Moved `aria-live="polite" aria-atomic="true"` to a wrapper `<div>` that contains BOTH the skeleton state and the loaded content. Now when Angular swaps from skeleton to data, the screen reader re-evaluates the live region and announces the change.

**Accessibility improvements: +1 (aria-live scope corrected)**

---

## Finding 3 — Badge Text Capitalization

**Before:** Badge text came directly from the API (`snapshotSummary.completenessLevel`, `snapshotSummary.matchLevel`) with no case normalization. Values like "excellent", "strong", "basic", "incomplete", "possible", "low" rendered in lowercase. If the API ever returns `"STRONG"` or `"Strong"`, the display would be inconsistent.

**Fix applied:** `.gh-snapshot-badge { text-transform: capitalize; }` normalizes all values to sentence case regardless of what the API returns. Badge text was already present alongside color (no color-alone issue) so this is a polish fix only.

---

## Finding 4 — role="status" on Skeleton Container

**Before:** The loading text had `role="status"` but no `aria-label` — the text content served as the accessible name.

**Fix applied:** Skeleton container gets `role="status" aria-label="Loading application snapshot"` since the skeleton has no visible text that AT can read.

**Accessibility improvements: +1 (skeleton role+label)**

---

## Finding 5 — Fade-In on Snapshot Reveal

**Before:** Zero animation on the snapshot data appearing. The card snapped from skeleton to content instantly.

**Fix applied:** `.gh-snapshot-reveal` uses `animation: gh-snapshot-fadein $motion-duration-card $motion-ease-decelerate both`. `$motion-duration-card: 220ms` and `$motion-ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1)` are pulled from the existing `_motion.scss` token file (confirmed globally imported in `styles.scss`). `@include motion-safe` suppresses this under `prefers-reduced-motion`.

The fade (opacity 0→1) and micro-slide (translateY 4px→0) are intentionally subtle — this is a data card, not a hero element.

**Motion improvements: +1 (fade-in reveal)**

---

## Finding 6 — No .gh-pressable Opportunity (Correct)

The snapshot card is a read-only data display panel. There are no interactive elements (buttons, links) inside it. Adding `.gh-pressable` would be incorrect. This is not a gap — it is the right UX for a passive data card.

---

## Finding 7 — Badge Color Accessibility (Informational)

The completeness and match-level badges use Bootstrap's `bg-success` (green), `bg-warning` (amber), `bg-info` (teal), and `bg-secondary` (gray). Each badge already carries explicit text content (the level label) and an `aria-label`. Color is not the sole communication channel — this already passes WCAG 1.4.1 (Use of Color).

However: `bg-warning text-dark` (amber + black text) is high-contrast; `bg-success` white-on-green contrast ratio is approximately 3.5:1 at Bootstrap's default `#198754` — borderline AA for small text. No fix applied now (Bootstrap overrides are risky to chain in a component SCSS) but this should be tracked for a global theme-token pass.

---

## Finding 8 — Haptic Recommendation (Not Implemented)

There is no Web Vibration API call on snapshot load. A single 10ms pulse via `navigator.vibrate(10)` in `loadSnapshotSummary`'s subscribe callback (after `snapshotSummaryLoading = false`) would provide a tactile confirmation on mobile when the snapshot data arrives. This was not implemented because:
- It requires a `navigator.vibrate` guard (`if ('vibrate' in navigator)`)
- It touches TypeScript logic (out of scope for this visual-only pass)
- Browser support is mixed (no iOS Safari support)

**Recommendation:** When NOTIFY or a future BRAND pass touches the `.ts` layer, add a best-effort `navigator.vibrate(10)` call at the end of `loadSnapshotSummary`'s success branch.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/job/job-applicants/job-applicants.component.html` | Skeleton loading state; aria-live scope expanded; `.gh-snapshot-card`, `.gh-snapshot-reveal`, `.gh-snapshot-empty`, `.gh-snapshot-badge`, `.gh-snapshot-disclaimer` classes applied |
| `src/app/job/job-applicants/job-applicants.component.scss` | Added `@import "src/assets/styles/motion"` + all snapshot-card SCSS blocks: skeleton shimmer, fade-in keyframe, badge polish, empty state |

**No logic changes. No API changes. No new npm packages.**

---

## Build Verification Needed

1. Run `ng build` or `ng serve` in `get-hired-FE` and confirm no SCSS compile errors (the `@extend %gh-skeleton-base` pattern with a placeholder selector in a component SCSS should compile cleanly in Angular's default SCSS pipeline).
2. Open an applicant detail view in a browser. Confirm:
   - Snapshot card skeleton shows while loading (three shimmer lines)
   - On load, content fades in smoothly
   - No layout shift visible in Chrome DevTools Performance panel
   - In DevTools accessibility tree, the `aria-live` region is present with the correct role
3. Test with `prefers-reduced-motion: reduce` via Chrome DevTools Rendering panel — skeleton shimmer and fade-in should be suppressed; static skeleton blocks should still be visible.

---

## Summary

```
BRAND RECENT DEPLOYMENT completed: yes
Files changed: [job-applicants.component.html, job-applicants.component.scss]
States covered: loading YES / success YES / null YES / error YES
Accessibility improvements: 2 (aria-live scope corrected; skeleton role+label added)
Motion/haptic improvements: 1 (CSS fade-in reveal; haptic deferred to TS pass)
Top 5 brand findings:
  1. Loading state was plain text — replaced with CSS skeleton shimmer matching loaded content shape
  2. aria-live region only covered loading div, not the revealed data — scope expanded to wrap both
  3. Badge text not capitalized — text-transform: capitalize added for API-value resilience
  4. Skeleton had no accessible role/label — role="status" + aria-label added
  5. Zero motion on snapshot reveal — 220ms fade-in + 4px micro-slide added using existing motion tokens
```
