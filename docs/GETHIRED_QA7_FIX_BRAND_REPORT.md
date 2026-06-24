# GetHired QA Cycle 7 — Fix Sprint Brand & Visual Audit

**Date:** 2026-06-25
**Audited files:** employer-panel.component.scss, job.reducer.ts, job-create.component.ts
**Brand references:** src/assets/styles/colors.scss, src/assets/styles/_motion.scss

---

## Summary

All three FE fixes pass the brand audit. No new visual regressions introduced. No safe brand fixes were required or applied.

---

## Task 1 — Billing bar safe-area fix (Fix 7)

**File:** `get-hired-FE/src/app/employer-panel/employer-panel.component.scss`

### calc() syntax

```scss
bottom: calc(56px + env(safe-area-inset-bottom, 0px));
```

Syntax is correct. `calc()` wrapping `env()` is the only way to combine a fixed length with an environment variable in CSS. The 0px fallback is correct for non-notched devices. Browser support: all evergreen browsers plus iOS Safari 11.2+.

### Remaining billing bar styling — intact

| Property | Value | Status |
|---|---|---|
| `background` | `$color-global-sidebar-applicant-gray` (#F6F7FB) | intact |
| `border-top` | `1px solid rgba(0, 0, 0, 0.08)` | intact |
| `padding` | `6px 0` | intact |
| `.gh-billing-bar-link` color | `$color-global-red-buttons` (#FF7062) | intact |
| `.gh-billing-bar-link` font | Manrope 11px/500 | intact |
| hover state | opacity 0.75, `$motion-duration-micro` transition | intact |
| focus-visible ring | `2px solid rgba(255, 112, 98, 0.85)` | intact, matches nav item pattern |
| `@include motion-safe` | present on link transition | intact |

### Standard (non-notched) device clearance

On non-notched devices `env(safe-area-inset-bottom, 0px)` resolves to 0px, so `calc(56px + 0px)` = 56px. The `gh-mobile-nav` bottom bar is itself 56px tall (`min-height: 44px` items plus 6px padding top and 6px padding bottom from `env(...)`). The billing bar sits flush directly above it with no gap and no overlap. Clearance is correct.

### Notched iPhone behaviour

On notched iPhones (iPhone X and later) `env(safe-area-inset-bottom)` is typically 34px (portrait) or 21px (landscape). The billing bar bottom becomes `calc(56px + 34px)` = 90px in portrait. The mobile nav itself already uses `padding: 6px 0 env(safe-area-inset-bottom, 0px)` so its visual height expands by the same inset. The billing bar's bottom tracks this correctly — it stays immediately above the expanded nav. No overlap with any other content; `#sub-company-component` already has `padding-bottom: 72px` on mobile, which may be slightly under-sized for notched devices (content could be obscured behind both bars), but this is a pre-existing sizing choice and not introduced by Fix 7.

**Verdict: PASS. No brand fix needed.**

---

## Task 2 — succesMsg: null visual impact (Fix 8)

**File:** `get-hired-FE/src/app/job/state/job.reducer.ts`

### What the fix changed

Before Fix 8, the `getJobSuccess` case did not set `succesMsg` at all, which meant whatever value was in state from a prior action (`changeJobStatusSuccess` could have set `'archived'` or `'expired'`) persisted in the store after a job load. This allowed a stale status string to be re-broadcast to all subscribers of `success$`.

Fix 8 explicitly sets `succesMsg: null` in `getJobSuccess` (line 438), clearing any stale value when a job is loaded.

### Who subscribes to success$ from the job facade

Three components consume `this.jobFacade.success$`:

1. **`job-list.component.ts`** — `afterChange(event)` opens an `UpdatedDialogComponent` when `event == 'archived'` and refreshes the job list. It ignores all other values including `'expired'`.

2. **`job-create.component.ts`** — `afterSubmit(event)` opens dialogs for `'asDraft'` and `'published'` only. Does not react to `'archived'` or `'expired'`.

3. **`create-interview.component.ts`** — `afterSubmit(event)` shows a snackbar for `'updated'` only. Does not react to `'archived'` or `'expired'`.

### Was any legitimate toast killed by this fix?

No. The toast/dialog for `'archived'` is triggered by `changeJobStatusSuccess` (line 79), not `getJobSuccess`. The `getJobSuccess` action is dispatched when loading a job record for display — this is a read operation and should never trigger a status-change notification. The previous reducer omission left a window where navigating from a job status change directly into `job-create` (edit mode) could cause the `'archived'` dialog to re-fire spuriously on load because `getJobSuccess` left the stale `'archived'` string in place.

Fix 8 eliminates that spurious re-fire. No correctly-designed notification path relied on `getJobSuccess` leaving `succesMsg` populated.

### Legitimate toasts that still fire correctly

| succesMsg value | Trigger action | Consumer | Still works |
|---|---|---|---|
| `'archived'` / `'expired'` | `changeJobStatusSuccess` | job-list `afterChange` | Yes |
| `'asDraft'` / `'published'` | `saveJobSuccess` | job-create `afterSubmit` | Yes |
| `'deleted'` | `deleteJobQuestionSuccess` | (no current consumer reacts; ignored by all three) | N/A |
| `'updated'` | `updateJobQuestionSuccess` | create-interview `afterSubmit` | Yes |

**Verdict: PASS. No toast was killed. The fix prevents a ghost-toast regression. No brand fix needed.**

---

## Task 3 — BE-only fixes — visual impact

**Fixes 1–6, 9 (partial) — BE files:** jobsController.js, companiesController.js, applicantsController.js, contactsController.js, cvController.js

All five BE controllers return HTTP 403 to unauthorized callers or fix internal flow (dangling mutation, Array.isArray guards, ownership checks). None of these changes:

- Alter any HTTP 200 response payload shape consumed by the FE store
- Touch any FE component, service, template, or stylesheet
- Introduce new store actions, selectors, or state slices
- Affect any toast, dialog, snackbar, or loading indicator

The FE handles 403 responses through its existing error interceptor / `getJobFail` / `getJobApplicantsFail` type actions, which set `succesMsg: null` and `error: action.payload` — no visual output beyond whatever error state was already shown pre-fix.

**Verdict: ZERO visual impact. Confirmed.**

---

## Task 4 — Safe brand fixes applied

None required. All three FE visual changes pass the brand audit without modification.

---

## Brand token usage — spot check

The billing bar and nav bar consistently use:
- Colors: `$color-global-sidebar-employer-user-menu`, `$color-global-sidebar-applicant-gray`, `$color-global-red-buttons` — all from `colors.scss`
- Motion: `$motion-duration-micro`, `$motion-ease-standard`, `@include motion-safe` — all from `_motion.scss`
- Focus rings: `2px solid rgba(255, 112, 98, 0.85)` — consistent with the rest of the mobile nav; no hardcoded hex values outside these two files

No brand token violations detected.

---

## Pre-existing concern (not introduced by this sprint)

`#sub-company-component` receives `padding-bottom: 72px` on mobile (line 160 of employer-panel.component.scss). On notched iPhones in portrait, the combined height of the nav bar + billing bar is approximately `(56px + 34px) + ~32px = ~122px`. Page content could be partially hidden behind both bars by ~50px. This is a pre-existing sizing gap and is out of scope for the QA7 fix sprint; logging here for a future safe-area pass.
