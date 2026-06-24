# GetHired BRAND — Recent Deployment Review
**Scope:** Applicant Completeness View (FE 76c545e, BE faa2232)
**Date:** 2026-06-24

---

## Files Changed

| File | Change summary |
|------|---------------|
| `src/app/applicant-panel/applicant-applications/applicant-applications.component.html` | Expanded skeleton (1 line → 3 elements); added `app-snapshot-reveal` to score div, tip blocks, and disclaimer; replaced empty `#snapSilent` template with soft "Snapshot unavailable right now." message |
| `src/app/applicant-panel/applicant-applications/applicant-applications.component.scss` | Added `@import "src/assets/styles/motion"`; restructured skeleton to `flex-direction: column`; extracted `%app-skeleton-base` shimmer mixin; added `.app-skeleton-line--medium`, `.app-skeleton-badges`, `.app-skeleton-badge`, `.app-skeleton-badge--wide`; added `@keyframes app-snapshot-fadein` + `.app-snapshot-reveal` using `$motion-duration-card` / `$motion-ease-decelerate` tokens; added `.app-snapshot-unavailable` style; added inline comment explaining tip-block color rationale |

---

## State Coverage

| State | Before | After | Notes |
|-------|--------|-------|-------|
| Loading | Yes | Yes | Skeleton expanded from 1 line to 3 elements hinting at score + badge shape |
| Success | Yes | Yes | Unchanged |
| Null / pre-deployment | Yes (`app-snapshot-empty` paragraph) | Yes | Unchanged |
| Error — snapshot fetch failed | No (silent empty template) | Yes | Soft italic "Snapshot unavailable right now." — no alarming color or icon |

---

## Motion Improvements

**Count: 4**

1. **Skeleton shimmer upgraded** — switched from `background-size: 200px` (too narrow, clipping) to 800px sweep matching employer card. Added `@include ambient-motion-safe` so shimmer is suppressed under `prefers-reduced-motion: reduce`, leaving a static grey placeholder.
2. **`.app-snapshot-reveal` fade-in** — new `@keyframes app-snapshot-fadein` (opacity 0→1, translateY 4px→0). Applied to score block, both tip blocks, and disclaimer simultaneously. Uses `$motion-duration-card` (220ms) and `$motion-ease-decelerate` from `_motion.scss` — mirrors `.gh-snapshot-reveal` on the employer card exactly.
3. **`@include motion-safe`** wraps `.app-snapshot-reveal` so transition is removed entirely under reduced-motion preference (not just slowed).
4. **Skeleton structural alignment** — skeleton container changed from `flex-direction: row` (all one line) to `flex-direction: column` with `gap: 6px`. Three elements now flow vertically: label line → badge row → disclaimer line. Visual footprint matches loaded state.

---

## Employer Card Verification (job-applicants.component.html / .scss)

All BRAND changes from last cycle confirmed **intact** after combined commit:

- `aria-live="polite" aria-atomic="true"` wrapper on snapshot card: present (line 69)
- 3-element skeleton (short line + 2 badges + long line): present (lines 72-77)
- `.gh-snapshot-reveal` fade-in class on data container: present (line 85)
- `.gh-snapshot-badge` capitalize + font-size polish in SCSS: present (lines 128-132)
- `@import "src/assets/styles/motion"` in employer SCSS: present (line 2)
- `gh-shimmer` keyframe + `%gh-skeleton-base` + `ambient-motion-safe`: present (lines 139-173)

No regressions detected.

---

## Top 5 Brand Findings

### 1. Skeleton shape mismatch (fixed)
**Before:** 1 short grey line (140px, horizontal). The loaded state reveals a label, a percentage + badge row, tip blocks, and a disclaimer — visually much taller. The skeleton gave no hint of this layout.
**After:** 3-element column skeleton mirrors the loaded shape. Layout shift is minimised, perceived load is faster.

### 2. Silent error state (fixed)
**Before:** When the snapshot fetch failed, `#snapSilent` rendered absolutely nothing — no visual difference from "loading completed but found nothing." Silent failure is indistinguishable from a genuine null state, which undermines trust.
**After:** "Snapshot unavailable right now." in the same italic grey style as the pre-deployment empty message. Calm, consistent, not alarming.

### 3. Abrupt score reveal (fixed)
**Before:** `.app-snapshot-score` appeared instantly with no transition. On slow network connections, the jump from skeleton to full score panel was jarring.
**After:** `.app-snapshot-reveal` applies to score block + tip blocks + disclaimer simultaneously. 220ms decelerate curve matches the employer card — both sides of the product now feel like the same system.

### 4. Motion token adoption gap (fixed)
**Before:** The component SCSS imported only `colors`; it did not import `_motion.scss`. The shimmer used a 200px background-size (narrower than the employer card's 800px sweep) and had no reduced-motion guard.
**After:** `@import "src/assets/styles/motion"` added. Shimmer uses `%app-skeleton-base` which wraps `@include ambient-motion-safe`. All reveal animations use `$motion-duration-card` and `$motion-ease-decelerate` directly. Motion system is now consistent across both views.

### 5. Tip block color rationale (documented, not changed)
The amber (`#f59e0b` / `#fff7ed`) and sky (`#38bdf8` / `#f0f9ff`) left-bordered tip blocks use colors outside the brand red. This is intentional: they are informational signals, not action prompts. Using brand red here would imply interactive affordance. A comment was added in the SCSS to record this decision for future contributors. No color change made.

---

## ng build Note

`ng build` should be run after these changes. Expected: clean build. Verification points:
- `@import "src/assets/styles/motion"` resolves correctly (same pattern as `job-applicants.component.scss`)
- `%app-skeleton-base` SCSS placeholder extend resolves with no circular-import warning
- `$motion-duration-card` and `$motion-ease-decelerate` variables are in scope

No new npm dependencies introduced.
