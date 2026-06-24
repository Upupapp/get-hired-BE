# GETHIRED EMPLOYER ROUTE FIX IMPLEMENTATION LOG V4

**Document:** 30 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Implementation complete — all 3 fixes applied

---

## Fix 1: Company Not Setup — Navigate to Company Details

**File:** `get-hired-FE/src/app/company/company-not-setup/company-not-setup.component.ts`  
**Function:** `redirectToSetup()`

### Before

```typescript
redirectToSetup() {
  this.dialogRef.close();
  // this.router.navigate(['../company/settings']);
}
```

### After

```typescript
redirectToSetup() {
  this.dialogRef.close();
  this.router.navigate(['/recruiter/company/details']);
}
```

### Reason

When an employer without a configured company lands in the employer panel, `CompanyNotSetupComponent` opens as a dialog. The dialog contains a "Setup Company" button that calls `redirectToSetup()`. Before this fix, clicking the button closed the dialog but did not navigate anywhere. The employer was left on the same page with the dialog gone and no obvious path forward.

The commented-out `navigate` call referenced a relative path `../company/settings` that no longer exists. The correct route is the absolute path `/recruiter/company/details`.

### Risk

Low. The fix removes a comment and activates a navigation call. The Router dependency was already injected (`private router: Router`). No other code paths are affected.

### UX Impact

Employers who do not have a company set up now reach the company details page immediately after closing the setup dialog. This unblocks a previously dead-end flow.

### Accessibility Impact

The button now performs its stated function. Previously, pressing the button did not take any navigational action, which is an accessibility violation (buttons must do what their label says).

---

## Fix 2: Publish Blocked Snackbar — Danger Color

**File:** `get-hired-FE/src/app/job/job-create/job-create.component.ts`  
**Function:** `publishJobPost()`  
**Line:** approximately 399–402

### Before

```typescript
this.snackBar.open(`Job not ready to be Published. Missing: ${missingJob}`, '', {
  duration: 5000,
  panelClass: ['success-snackbar'],
});
```

### After

```typescript
this.snackBar.open(`Job not ready to be Published. Missing: ${missingJob}`, '', {
  duration: 5000,
  panelClass: ['danger-snackbar'],
});
```

### Reason

When a publish attempt fails due to missing required fields, the snackbar message "Job not ready to be Published. Missing: [fields]" was displayed using `panelClass: ['success-snackbar']`. The success snackbar applies the app's success color scheme (coral/green tones), which is visually inappropriate for an error message. Employers could misread the message as a confirmation that the job was published.

The `danger-snackbar` class applies the correct error color scheme, making the message visually consistent with its meaning.

### Risk

Low. This is a CSS class name change only. The snackbar content, duration, and behavior are unchanged. No data or form state is affected.

### Note on Co-located Code

The snackbar call on publish success (after `UpdatedDialogComponent` closes) at line ~454 correctly uses `['success-snackbar']` and is not modified. The two snackbar calls are distinct:

- Publish blocked (error): now `danger-snackbar`
- Publish success + talent proof copy: remains `success-snackbar`

---

## Fix 3: Sidebar Label — "Company Profile"

**File:** `get-hired-FE/src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`  
**Location:** `ngOnChanges()` > `sidebarItems` array

### Before

```typescript
{
  title: this.translate.instant('ADMIN_DASHOBOARD.SIDEBAR_EMPLOYER_BRANDING'), icon: 'account.png', class: 'accounts',
  route: 'company/details'
}
```

### After

```typescript
{
  title: 'Company Profile', icon: 'account.png', class: 'accounts',
  route: 'company/details'
}
```

### Reason

The sidebar item linking to `company/details` was labeled "Employer Branding" via a translation key. The translation key `ADMIN_DASHOBOARD.SIDEBAR_EMPLOYER_BRANDING` is descriptive of a different concept: branding assets, logos, visual identity. The actual destination (`company/details`) is a general company profile page covering name, description, location, logo, and contact details.

The misleading label could cause employers to skip this item when they need to complete their profile, or navigate to it expecting brand asset management tools that do not exist.

The translation key is dropped and replaced with a literal string `'Company Profile'` because:
1. The translation key itself encodes the wrong concept
2. Changing the translation key would require updating all locale files
3. The literal string is already English, consistent with other sidebar items that use literal strings

### Risk

Low. Label-only change. The route, icon, and class are unchanged. The `translate.instant()` call that was previously used was loading a translation key; if the key was missing from any locale file, it would fall back to the raw key string ("ADMIN_DASHOBOARD.SIDEBAR_EMPLOYER_BRANDING"), which is worse than a hardcoded correct label.

---

## Deferred Items

The following were considered and explicitly deferred from this fix pass:

| Item | Reason for Deferral |
|---|---|
| Global messages route | New route, new component, backend endpoint needed — not a safe code-only fix |
| Interview page replacement | XL effort, new feature |
| Sidebar keyboard navigation (div to button) | Structural change; requires template + SCSS updates |
| prefers-reduced-motion in main-animations.ts | Angular animation API change; requires test pass |
| interviewQuestions publish requirement removal | Product decision required before changing publish gates |
| Post-publish route to job-level dashboard | New navigation flow; deferred to B05 |
| inviteApplicant() TODO | Feature implementation required |
| Mobile sidebar/nav | Responsive layout work; not a safe one-line fix |
