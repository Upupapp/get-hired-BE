# NOTIFY-P2: Backlog

**Date:** 2026-06-26

---

## Deferred from this sprint

### P2 — `createGroup` / `updateGroup` broken async forEach

**File:** `contactsController.js` lines 221-239 (`createGroup`) and 271-289 (`updateGroup`)

Both still use `emails.forEach(async option => { ... })` inside `new Promise()`. This is not a false-positive toast issue (these flows have different response paths) but it is a race condition that can cause "headers already sent" Express errors when multiple emails fail. Defer to next maintenance sprint.

**Fix:** Same `Promise.allSettled` refactor as `multipleContact` / `multipleCandidate`.

---

### P3 — `warning-snackbar` color contrast

**File:** `styles.scss`

`#f59e0b` amber on white text fails WCAG AA (contrast ~2.5:1). Consider darker amber (`#b45309`) which passes at ~5.1:1. Deferred because: the copy conveys the outcome in words, color is supplementary, and changing to dark amber may conflict with brand palette.

---

### P3 — `danger-snackbar` ARIA role

Angular Material's `MatSnackBar` uses `aria-live="polite"` by default. Error-outcome toasts would benefit from `aria-live="assertive"`. This requires a custom snackbar component, deferred to accessibility sprint.

---

### P3 — Empty-state UI for "all failed" invite

Currently the dialog closes after showing the error toast, even when all invites failed. A better UX would keep the dialog open with an error state so the employer can correct the emails. Deferred.

---

### P3 — Unit tests for toast outcome logic

Automated unit tests for the three component toast decision branches. Deferred because the repo has no existing component unit test pattern to follow (no `.spec.ts` files in the contact/candidate dialog directories).

---

### P4 — Show failed-email list in partial-success case

For company user invites, the dialog already renders `invitedUsersList` which includes `status: "failed"` items. A visual indicator (red icon) on failed items in the list would make the partial-success state self-explanatory without relying on toast copy alone. Deferred.
