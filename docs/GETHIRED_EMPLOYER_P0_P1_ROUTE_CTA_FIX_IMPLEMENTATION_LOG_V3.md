# GETHIRED EMPLOYER P0/P1 ROUTE CTA FIX IMPLEMENTATION LOG V3

**Command:** GETHIRED_EMPLOYER_P0_P1_ROUTE_CTA_FIX_SPRINT_WORLD_CLASS_TECHY_V3  
**Date:** 2026-06-24  
**Build result:** PASS — zero new errors

---

## CODE CHANGES LOG

### Fix V3-P0-1 — AuthGuard wrong-role returns true

**File:** `get-hired-FE/src/app/shared/guard/auth.guard.ts`  
**Area:** Auth/route guard  
**Issue ID:** V3-P0-1  
**Severity:** P0

**Before:**
```typescript
if (route.data.role && route.data.role.indexOf(userRole) === -1) {
  this.navigateToUserRole(userRole);
}
return true; // BUG: always returned true even for wrong-role users
```

**After:**
```typescript
if (route.data.role && route.data.role.indexOf(userRole) === -1) {
  this.snackBar.open(`You don't have access to that area. Redirecting you now.`,
    '', { duration: 3000, panelClass: ['danger-snackbar'] });
  this.navigateToUserRole(userRole);
  return false; // FIX: wrong-role user denied + redirected to own panel
}
return true;
```

**Reason:** A signed-in user with the wrong role (e.g. an applicant attempting `/recruiter/`) would trigger `navigateToUserRole()` to redirect them, but the guard still returned `true`, meaning Angular would also try to load the employer panel module in parallel. The employer panel module partially rendered before the redirect completed, creating a brief unauthorized exposure and a race condition.  
**Risk:** Low.  
**Frontend effect:** `danger-snackbar` message guiding the user.  
**Accessibility:** Snackbar uses `danger-snackbar` class, which should have `role="alert"` in the Material theme.  
**Verification:** Build passes. Confirmed guard now returns false for wrong-role access.

---

### Fix V3-P0-2 — UnauthorizedInterceptor catches 401 as well as 403

**File:** `get-hired-FE/src/app/core/interceptor/unauthorize.interceptor.ts`  
**Area:** Session expiry / auth  
**Issue ID:** V3-P0-2  
**Severity:** P0

**Before:** Only caught `err.status === 403`.  
**After:** Catches `err.status === 401 || err.status === 403`.

**Reason:** The backend may return 401 for a truly expired or absent JWT. If the interceptor only caught 403, a 401 would silently surface as API errors in various components (dashboard, applicant list, etc.) with no indication to the employer that they need to re-authenticate.  
**Risk:** Low — additive status code check.  
**Message updated:** `"Your session has expired. Please sign in again to continue."` (more specific than previous generic message).

---

### Fix V3-P1-1 — employer-panel loading/error fallback

**File:** `get-hired-FE/src/app/employer-panel/employer-panel.component.html`  
**Area:** Employer panel shell  
**Issue ID:** V3-P1-1  
**Severity:** P1

**Before:** `*ngIf="employee$ | async as employee"` — panel content disappeared entirely while `employee$` was loading or if it errored.  
**After:** Added `else panelLoading` template. Shows `<app-loading>` while `loading$` is true; shows a recovery message with `/signin` link if loading is false but `employee$` never emitted.

**Reason:** Without a fallback, an employer with a brief API delay would see a completely blank page after login.  
**Risk:** Low — template addition only.  
**Frontend effect:** Smooth transition from `<app-loading>` spinner to panel content.

---

### Fix V3-P1-2 + V3-P1-3 — Sidebar keyboard accessibility and ARIA

**Files:**  
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.html`  
- `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.scss`

**Area:** Sidebar navigation accessibility  
**Issue IDs:** V3-P1-2, V3-P1-3  
**Severity:** P1

**HTML changes:**
- `<div class="sidebar-details">` → `<nav class="sidebar-details" role="navigation" aria-label="Employer panel navigation">`
- Sidebar item `<div>` → `<div role="button" tabindex="0" [attr.aria-current]="..." (keydown.enter) (keydown.space)>`
- Sub-route spans: added `role="button"`, `tabindex="0"`, `keydown.enter/space` handlers, `[attr.aria-current]`
- Logo image: added `alt`, `role="link"`, `tabindex="0"`, `keydown.enter/space`
- Settings button: added `gh-pressable`
- All decorative images: `aria-hidden="true"`

**SCSS changes:**
- Added `@import "~assets/styles/motion"` (for `@include motion-safe`)
- Added `.gh-sidebar-item:focus-visible` outline (coral, 2px, offset 2)
- Added `.sub-label:focus-visible` outline

**Reason:** Screen reader users and keyboard-only users could not navigate the employer sidebar at all. Divs with click handlers are not in the tab order and do not fire on Enter/Space.  
**Risk:** Low — no changes to existing click logic, only adds keyboard equivalents.  
**Frontend effect:** Visible focus ring on keyboard navigation; smooth transition via `motion-safe` mixin.  
**Reduced-motion:** `@include motion-safe` ensures transitions are removed under `prefers-reduced-motion: reduce`.

---

### Fix V3-P1-4 — company-not-setup improved copy, haptic, gh-pressable

**Files:**  
- `get-hired-FE/src/app/company/company-not-setup/company-not-setup.component.html`  
- `get-hired-FE/src/app/company/company-not-setup/company-not-setup.component.ts`

**Area:** Company onboarding blocker dialog  
**Issue ID:** V3-P1-4  
**Severity:** P1

**HTML before:** Title: "A Company has to be set up in order to use most of the App functionality". Button: "Setup Company".  
**HTML after:** Title: "Complete your company profile to start posting jobs and reviewing applicants." Supporting text explaining why. Button: "Complete company profile" with `gh-pressable`, `aria-label`.

**TS change:** Injected `HapticFeedbackService`, added `this.haptics.selection()` call before closing dialog and navigating.

**Reason:** The old copy was vague and imperative. "Setup Company" doesn't tell the employer what they'll do or why it matters. The new copy is outcome-focused and matches the "Complete company profile" CTA language used elsewhere in the dashboard action center. The haptic call (`selection()` — lightest pattern) gives physical confirmation of the button press on supported devices.  
**Risk:** Low — copy and additive injection only.  
**Frontend effect:** `gh-pressable` scale press on click; haptic feedback on supported devices.

---

### Fix V3-P1-5 — Job create haptic feedback on publish success + warning

**File:** `get-hired-FE/src/app/job/job-create/job-create.component.ts`  
**Area:** Job creation publish flow  
**Issue ID:** V3-P1-5  
**Severity:** P1

**Changes:**
- Imported `HapticFeedbackService`
- Added to constructor injection
- `publishJobPost()` failure path: added `this.haptics.warning()` before the error snackbar
- `afterSubmit()` published path: added `this.haptics.jobPublished()` before the success snackbar

**Reason:** Publish success is the primary first-value moment for a new employer. Haptic confirmation (`jobPublished()` — pattern [12,30,12]) makes this moment feel physically real on mobile. The warning pattern on publish-blocked gives tactile feedback that something needs to be fixed.  
**Risk:** Low — additive service injection, calls are fail-silent per `HapticFeedbackService` spec.

---

### Fix V3-P1-6 + V3-P1-7 — Job list empty state + gh-pressable on create button

**Files:**  
- `get-hired-FE/src/app/job/job-list/job-list.component.html`  
- `get-hired-FE/src/app/job/job-list/job-list.component.scss`

**Area:** Job list empty state  
**Issue IDs:** V3-P1-6, V3-P1-7  
**Severity:** P1

**HTML changes:**
- "Create Job" button: added `gh-pressable`, `aria-hidden` on icon
- Wrapped `app-reusable-table` in `*ngIf="list.length === 0; else jobTable"` pattern
- Empty state: role="status", aria-label, icon, title "No jobs yet", desc, "Post your first job" CTA with `gh-pressable`

**SCSS changes:**
- Added motion import
- `.gh-job-list-empty` styles with centered layout
- `.gh-job-list-empty-inner` with `@media (prefers-reduced-motion: no-preference)` reveal animation
- `@keyframes gh-empty-reveal` — fade + translate-up

**Reason:** An employer with no jobs sees a blank table with no prompt to take action. The V4 audit confirmed this as a known gap. "Post your first job" directly activates the subscription-check → job-create flow.  
**Risk:** Low — change is entirely inside a new `ng-container *ngIf` block that only renders when `list.length === 0`. The existing table path is unchanged and wrapped in `<ng-template #jobTable>`.  
**Frontend effect:** Gentle reveal animation (fade + 8px up). `gh-pressable` on both the header button and empty state CTA.  
**Reduced-motion:** Empty state animation wrapped in `@media (prefers-reduced-motion: no-preference)` — no animation at all under reduced motion.

---

### Fix V3-P1-8 + V3-P1-9 + V3-P1-10 — Applicant list empty state + breadcrumb + back button

**Files:**  
- `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`  
- `get-hired-FE/src/app/job/job-applicants/job-applicants.component.scss`

**Area:** Applicant list  
**Issue IDs:** V3-P1-8, V3-P1-9, V3-P1-10  
**Severity:** P1

**HTML changes:**
- Breadcrumb "Jobs" span: added `role="button"`, `tabindex="0"`, `class="gh-breadcrumb-link"`, `keydown.enter/space`, `aria-label`, `aria-hidden` on icon
- "Back" button: added `gh-pressable`
- Applicant table: wrapped in `*ngIf="applicants.length === 0; else applicantTable"` with empty state and `<ng-template #applicantTable>`
- Empty state: `role="status"`, icon, title "No applicants yet", description, "Back to jobs" button

**SCSS changes:**
- Replaced `@import "src/assets/styles/motion"` with `~assets/styles/motion` (consistent with project pattern)
- Added `.gh-breadcrumb-link` with coral color, underline, focus-visible ring, `@include motion-safe`
- Added `.gh-applicant-empty` with reveal animation
- Added `@keyframes gh-empty-reveal`

**Reason:** Empty applicant list had no guidance. The employer had no context ("Is my job published? Did anyone apply?") and no action to take. Empty state provides context ("Make sure the job is published") and a recovery path ("Back to jobs").  
**Risk:** Low — change is inside new ng-container/template pattern, existing table path unchanged.  
**Frontend effect:** Gentle reveal animation; `gh-pressable` on back button.  
**Reduced-motion:** Animation wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

### Non-code change — main-animations.ts documentation comment

**File:** `get-hired-FE/src/app/shared/animations/main-animations.ts`

Added a comment explaining why Angular 13 does not support `@media` queries inside `trigger()` definitions, and documenting that reduced-motion safety is handled via `_motion.scss` CSS utilities instead. No functional change to the animation triggers.

---

## FRONTEND EFFECTS LOG

| Effect | Component | Route/State | UX Purpose | Reduced-Motion Fallback |
|--------|-----------|-------------|------------|------------------------|
| `gh-pressable` scale press | Sidebar settings button | All employer routes | Confirms button press physically | Scale transition removed via `@include motion-safe` |
| `gh-pressable` scale press | "Complete company profile" dialog button | Company setup blocker | Confirms button press | Same |
| `haptics.selection()` | CompanyNotSetupComponent | Company setup dialog | Physical confirmation of setup intent | Not applicable (vibration API unavailable = silent) |
| `haptics.warning()` | JobCreateComponent | Publish-blocked state | Tactile signal that something needs fixing | Not applicable |
| `haptics.jobPublished()` | JobCreateComponent | Publish success | Physical celebration of publish milestone | Not applicable |
| `gh-pressable` scale press | Job create button + empty-state CTA | Job list | Button press feedback | Same |
| Empty state reveal animation | Job list | No-jobs state | Gentle attention-drawing motion | Animation removed under `prefers-reduced-motion: reduce` |
| `gh-pressable` scale press | Applicant list back button | Applicant list | Button press feedback | Same |
| Empty state reveal animation | Applicant list | No-applicants state | Gentle context reveal | Animation removed under `prefers-reduced-motion: reduce` |
| focus-visible ring | Sidebar items | All employer routes | Keyboard navigation visibility | Always shown for keyboard users (outline, not animation) |
| focus-visible ring | Breadcrumb link | Applicant list | Keyboard navigation visibility | Always shown |
