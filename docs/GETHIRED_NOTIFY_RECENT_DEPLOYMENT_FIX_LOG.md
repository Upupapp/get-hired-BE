# GetHired NOTIFY — Fix Log: Recent Deployment
**Scope:** FE HEAD 5ab9a05 (completeness badge, card, detail page, applications list)
**Date:** 2026-06-24
**Rule:** Small/safe copy and aria-label fixes only — no logic changes, no business rule changes, no schema changes. No emails sent.

---

## Fixes Applied: 4

---

### Fix 1 — Badge null-state aria-label: "unavailable" → "Snapshot unavailable"

**File:** `get-hired-FE/src/app/shared/components/application-completeness-badge/application-completeness-badge.component.ts`
**Method:** `get accessibleLabel()`

**Before:**
```ts
if (!this.level && this.score === null) return 'Application completeness: unavailable';
```

**After:**
```ts
if (!this.level && this.score === null) return 'Application completeness: Snapshot unavailable';
```

**Reason:** Spec requires "Application completeness: Snapshot unavailable". The lowercase "unavailable" produced a mismatch between aria-label and visible badge text ("Unavailable"). The longer form explains what is unavailable (the snapshot), not just a generic state.

**Impact:** Screen reader users. No visible change.

**Risk:** None — aria-label copy change only.

---

### Fix 2 — Back button: added explicit aria-label for directional clarity

**File:** `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.html`
**Line:** 4

**Before:**
```html
<button type="button" class="aad-back" (click)="goBack()">
  <span aria-hidden="true">‹</span> My Applications
</button>
```

**After:**
```html
<button type="button" class="aad-back" aria-label="Back to My Applications" (click)="goBack()">
  <span aria-hidden="true">‹</span> My Applications
</button>
```

**Reason:** Visible text "My Applications" is accessible but lacks directional context. A screen reader user tabbing to this button needs to understand it *navigates back*. "Back to My Applications" is unambiguous. The `‹` icon is aria-hidden so the aria-label becomes the complete accessible name.

**Impact:** Screen reader users. No visual change.

**Risk:** None — additive aria-label.

---

### Fix 3 — Toggle button: replaced title-only with dynamic aria-label

**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Lines:** 23–29 (completeness toggle button)

**Before:**
```html
<button type="button"
        class="app-completeness-toggle"
        [attr.aria-expanded]="expandedSnapshotId === app.jobApplicationId"
        [attr.aria-controls]="'completeness-' + app.jobApplicationId"
        (click)="toggleSnapshot(app.jobApplicationId)"
        title="View application completeness details">
```

**After:**
```html
<button type="button"
        class="app-completeness-toggle"
        [attr.aria-expanded]="expandedSnapshotId === app.jobApplicationId"
        [attr.aria-controls]="'completeness-' + app.jobApplicationId"
        [attr.aria-label]="(expandedSnapshotId === app.jobApplicationId ? 'Hide' : 'Show') + ' application completeness for ' + app.jobTitle"
        (click)="toggleSnapshot(app.jobApplicationId)"
        title="View application completeness details">
```

**Reason:** `title` attributes are not reliably announced by screen readers. The button had no explicit aria-label. Multiple rows in the list meant screen readers could not distinguish which job's toggle was focused. The dynamic aria-label now reads "Show application completeness for {jobTitle}" or "Hide application completeness for {jobTitle}", matching the aria-expanded state.

**Impact:** Screen reader users in applications list. No visual change.

**Risk:** None — additive aria-label; title retained for tooltip users.

---

### Fix 4 — "View full details" link: added descriptive aria-label per application

**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Lines:** 57–61

**Before:**
```html
<a class="app-detail-link"
   [routerLink]="['/user/applications', app.jobApplicationId]"
   [state]="{ jobTitle: app.jobTitle, companyName: app.companyName, status: app.applicantStatusName }">
  View full details <span aria-hidden="true">→</span>
</a>
```

**After:**
```html
<a class="app-detail-link"
   [routerLink]="['/user/applications', app.jobApplicationId]"
   [state]="{ jobTitle: app.jobTitle, companyName: app.companyName, status: app.applicantStatusName }"
   [attr.aria-label]="'View full application details for ' + app.jobTitle">
  View full details <span aria-hidden="true">→</span>
</a>
```

**Reason:** "View full details" is ambiguous in a list context — a screen reader user tabbing through links would hear "View full details, View full details..." with no way to distinguish which application each link opens. The aria-label is descriptive out of context.

**Impact:** Screen reader users in applications list. No visual change.

**Risk:** None — additive aria-label; visible text unchanged.

---

## Fixes Considered and Rejected

| Considered Fix | Reason Not Applied |
|----------------|-------------------|
| Change visible back-button text to "← Back to My Applications" | Requires SCSS change (visual scope exceeds copy-only); aria-label fix (Fix 2) is sufficient |
| Remove `title` from toggle button | `title` provides tooltip for mouse/pointer users; harmless to retain alongside aria-label |
| Add explicit `aria-live` to badge loading span | `role="status"` already implies `aria-live="polite"` per HTML spec; duplication unnecessary |
| Change "What was missing when you applied" wording | Current copy is historically precise; altering it would misrepresent the snapshot's purpose (historical observation, not current recommendation) |
