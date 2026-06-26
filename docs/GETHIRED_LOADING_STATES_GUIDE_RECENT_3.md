# GetHired Loading States Guide — NOTIFY-3

## Audited Loading States

---

## 1. Job Detail — Loading State

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` line 1

```html
<app-inline-loading *ngIf="(loading$ | async) && !(details$ | async)"></app-inline-loading>
```

**Condition:** Shows while `loading$` is true AND `details$` has not emitted a value yet.  
**Behavior:** Hides as soon as details or an error arrive.  
**Quality:** Correct. Does not show the loading state alongside the error state or content.

---

## 2. Signup — Submitting State

**File:** `src/app/auth/signup/signup.component.html` lines 225–239

```html
<button [disabled]="submitting || !(registerForm.valid && ...)" [attr.aria-busy]="submitting ? 'true' : null">
  <ng-container *ngIf="!submitting">Create Account / Create employer account</ng-container>
  <ng-container *ngIf="submitting">Creating account...</ng-container>
  <img *ngIf="submitting" aria-hidden="true" ... loading GIF>
</button>
```

**Quality:** 
- [x] Button disabled during submit
- [x] Label changes to "Creating account..." (clear in-progress message)
- [x] `aria-busy="true"` set during submission (screen reader signal)
- [x] Loading GIF has `aria-hidden="true"` (decorative)
- [x] Spinner is hidden from AT while label is descriptive

---

## 3. Contact/Candidate Import — Loading State

Both components use `isLoading` boolean set to `true` on `uploadFile()` or `submitForm()` and cleared in the store subscription on response/error.

**Quality gap:** The `isLoading` flag controls internal state but there is no clear visual indicator for the user (no spinner, no button label change). The submit button becomes non-interactive by omission, not by an explicit disabled binding on the import forms. Low priority.

---

## 4. Auth Guard / Auth Facade Loading

`this.loading$` from `authFacade.loading$` is available in signup. The signup component uses it as part of `combineLatest([success$, loading$])` to decide when to open the verification page. No visual loading indicator from the facade loading state — the `submitting` local flag handles that.

---

## Loading State Checklist

| Page/Flow | Loading indicator shown | Button disabled | aria-busy set | Loading GIF/spinner hidden from AT |
|---|---|---|---|---|
| Job detail fetch | YES (app-inline-loading) | N/A | N/A | N/A |
| Signup submit | YES (label change + GIF) | YES | YES | YES (aria-hidden) |
| Contact import | Partial (isLoading flag) | Not explicitly | No | N/A |
| Candidate import | Partial (isLoading flag) | Not explicitly | No | N/A |
