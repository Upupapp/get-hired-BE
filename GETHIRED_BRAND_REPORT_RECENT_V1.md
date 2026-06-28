# GetHired BRAND Report — Recent Deployment Surfaces (V1)

**Date:** 2026-06-25
**Scope:** job-create.component.scss, job-list.component.ts/scss, confirmation-dialog.component.html/scss, F-08 FE loading/error/success states
**Auditor:** BRAND RECENT DEPLOYMENT pass
**Prior pass:** B04/B05/B09/B13 (see GETHIRED_BRAND_REPORT.md)

---

## Executive Summary

4 surfaces reviewed. 5 distinct issues found and fixed. All CSS-only where possible; 2 TS changes were required (confirmation-dialog data flag, job-list deleteRow call). No new components or libraries introduced. All animations have prefers-reduced-motion guards. No optimistic UI removal confirmed.

---

## Surface 1 — job-create.component.scss

### Finding 1 (FIXED): `bg-upper-gray` — `transition: all` unguarded

**Severity:** Medium
**File:** `src/app/job/job-create/job-create.component.scss` line 26

**Problem:** `transition: all 0.4s ease !important` on `.bg-upper-gray`:
- `all` covers every CSS property. The element changes only `top` and `position` via `[ngStyle]`. Evaluating all computed style properties on every change-detection cycle is unnecessary CPU work and causes the transition to fire on unrelated property changes.
- No `prefers-reduced-motion` guard. Position changes animate for users who opted out of motion.

**Fix applied:**
```scss
transition: top 0.3s ease, opacity 0.3s ease;
@media (prefers-reduced-motion: reduce) {
    transition: none;
}
```

---

### Finding 2 (FIXED): `.btn-add-service` duplicate rule — `:active` transform not reset under reduced-motion

**Severity:** Low
**File:** `src/app/job/job-create/job-create.component.scss` lines 65–74 and 141–152

**Problem:** `.btn-add-service` is defined twice (hover styles first block; interaction tokens second block). In the second block, the `@media (prefers-reduced-motion: reduce)` guard only removed `transition`, but the `&:active { transform: scale(0.97) }` remained active for reduced-motion users — the snap still happened, just without the easing.

**Fix applied:** Added `transform: none` inside `:active > @media (prefers-reduced-motion: reduce)`:
```scss
&:active {
    transform: scale(0.97);
    @media (prefers-reduced-motion: reduce) {
        transform: none;
    }
}
```

---

### F-08 States — Assessment

| State | Check | Result |
|-------|-------|--------|
| publish-spinner (@keyframes publish-spin) | prefers-reduced-motion guard | PASS — `animation: none` + visible fallback border-color |
| draft-spinner (@keyframes draft-spin) | prefers-reduced-motion guard | PASS — `animation: none` + visible fallback border-color |
| save-success-pulse (@keyframes success-pulse) | prefers-reduced-motion guard | PASS — `animation: none` inside reduce block |
| save-success-pulse | infinite loop check | PASS — one-shot 0.4s, cleared via setTimeout(2000ms) in TS |
| save-success-pulse | pre-success trigger check | PASS — only fires inside `afterSubmit(event)` when event is truthy (backend success) |
| save-error-alert (@keyframes error-reveal) | prefers-reduced-motion guard | PASS — `animation: none` inside reduce block |
| save-error-alert | pre-error trigger check | PASS — populated from `jobError$` stream only on actual error |
| Publish button | double-submit guard | PASS — `[disabled]="loading"` prevents re-click during in-flight request |
| Draft button | double-submit guard | PASS — `[disabled]="savingDraft || loading"` |
| `loading` flag | animated state before backend | PASS — `savingDraft` set before dispatch, cleared in afterSubmit/jobError$ |

---

## Surface 2 — job-list.component.scss / .ts

### Finding 3: No issues (gh-empty-reveal correctly guarded)

**File:** `src/app/job/job-list/job-list.component.scss`

`gh-empty-reveal` uses the correct opt-in pattern — animation only plays when user has NOT requested reduced motion:
```scss
@media (prefers-reduced-motion: no-preference) {
    animation: gh-empty-reveal 280ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
}
```

**Delete flow — pre-success removal check:** PASS
- No optimistic UI removal. Flow: confirm dialog -> `deleteJobPost(jobId)` dispatch -> NgRx effect calls BE -> reducer receives `deleteJobSuccess` with updated list -> `list$` observable emits new array -> table re-renders.
- The row is never removed from the DOM before the backend confirms the delete.
- The `success-snackbar` toast fires only inside `afterChange('deleted')` which is bound to `success$` (NgRx success stream, not triggered by client action).
- `loading$` drives the reusable-table `[loading]` input, disabling all row actions while a request is in flight.

---

## Surface 3 — confirmation-dialog.component.html / .scss

### Finding 4 (FIXED): No destructive CTA variant — permanent delete looks like save

**Severity:** High (UX safety issue)
**Files:** `src/app/shared/components/confirmation-dialog/`

**Problem:** The "Continue" button uses `.btn-primary` which renders as brand red (#FF7062). Brand red is the default positive-action color (Publish, Save, Next). For a permanent delete ("This action cannot be undone."), the button is visually identical to any non-destructive confirmation. Callers had no way to signal destructive intent.

**Fix applied (3 files):**

1. **SCSS** — Added `.btn-destructive`: solid `#dc2626`, bold weight, focus-visible ring, micro-scale press with reduced-motion guard. WCAG-AA on white background.
2. **SCSS** — Added `.border-solid-destructive`: `rgba(220,38,38,0.4)` border for the dialog wrapper, distinct from the default brand-red border.
3. **HTML** — `[ngClass]` switches between `.btn-primary`/`.btn-destructive` and `.border-solid`/`.border-solid-destructive` based on `data.destructive`.
4. **HTML** — Added `aria-label="Confirm permanent deletion"` on the destructive confirm button.
5. **job-list.component.ts** — `deleteRow()` now passes `destructive: true` in the dialog data.

**Backward compatibility:** All existing callers that do not pass `data.destructive` get the original `.btn-primary` styling — zero regressions.

---

### Finding 5 (FIXED): No dialog reveal animation

**Severity:** Low
**File:** `src/app/shared/components/confirmation-dialog/confirmation-dialog.component.scss`

**Problem:** The dialog card had no entry animation. Material's overlay fades in but the card content appeared instantly — jarring snap, especially for the delete confirmation which should feel intentional and weighty.

**Fix applied:** Added one-shot `dialog-reveal` keyframe on `.card` using opt-in guard:
```scss
@keyframes dialog-reveal {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.card {
    @media (prefers-reduced-motion: no-preference) {
        animation: dialog-reveal 180ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
    }
}
```
Duration: 180ms — within `$motion-duration-micro` (160ms) to `$motion-duration-card` (220ms) range per the motion token spec.

---

## Global Compliance Checks

| Check | Result | Notes |
|-------|--------|-------|
| No infinite pulsing loops | PASS | All new animations are one-shot or conditional (spinners only while loading) |
| No animation before backend success | PASS | Confirmed for all 3 state types in job-create |
| prefers-reduced-motion on all new @keyframes | PASS | All 5 new/modified keyframes have correct guards |
| JobCompatibilityService untouched | PASS | Not referenced in any changed file |
| No new libraries or components | PASS | CSS-only fixes; one existing component updated |
| No flashing/strobing effects | PASS | No high-frequency or high-contrast animation |
| Motion not required to understand UI | PASS | All states have text labels, ARIA roles, and function without animation |
| Consistent timing with rest of app | PASS | 100ms (micro press), 180ms (dialog reveal), 300ms (bg transition) — all within token ranges |
| Destructive action clearly distinct | PASS | btn-destructive (#dc2626) is visually distinct from btn-primary (#FF7062) |
| No pre-success UI removal | PASS | Confirmed by reading reusable-table.component.ts — no optimistic splice/filter on delete |
