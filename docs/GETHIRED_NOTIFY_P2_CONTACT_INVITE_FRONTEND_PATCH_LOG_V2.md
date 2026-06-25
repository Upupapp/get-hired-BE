# NOTIFY-P2: Frontend Patch Log

**Date:** 2026-06-26

---

## Patch 1 — `styles.scss`

**Added:** `warning-snackbar` and `info-snackbar` CSS classes.

```scss
.warning-snackbar {
  background-color: #f59e0b;
  color: #ffffff;
}

.info-snackbar {
  background-color: #6b7280;
  color: #ffffff;
}
```

Required because partial-success and no-op states need semantically distinct visual treatment from success (green) and error (red).

---

## Patch 2 — `import-add-user.component.ts`

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

**Before (line 62):**
```typescript
if(invite.companyUserRes.emails.length > 0){
  this.snackBar.open("Successfully added contact", "", {
    duration: 4000,
    panelClass:'success-snackbar'
  });
}
```

**After:**
```typescript
const emails: any[] = invite.companyUserRes.emails || [];
if(emails.length > 0){
  const successCount = emails.filter((e: any) => e.status !== 'failed').length;
  const failureCount = emails.length - successCount;
  this.invitedUsersList = emails;
  this.isLoading = false;
  this.submitting = true;

  if (successCount > 0 && failureCount === 0) {
    const msg = successCount === 1 ? 'Invite sent.' : `${successCount} invites sent.`;
    this.snackBar.open(msg, '', { duration: 4000, panelClass: 'success-snackbar' });
  } else if (successCount > 0 && failureCount > 0) {
    this.snackBar.open(`${successCount} sent. ${failureCount} couldn't be added.`, '', { duration: 6000, panelClass: 'warning-snackbar' });
  } else {
    // successCount === 0 — all failed; never show a success toast
    this.snackBar.open('No contacts were added.', '', { duration: 6000, panelClass: 'danger-snackbar' });
  }
}
```

**Key invariant:** When `successCount === 0`, no success-class toast is ever shown.

---

## Patch 3 — `import-add-contact.component.ts`

**File:** `src/app/employer-panel/employer-contacts/contact-list/dialogs/import-add-contact/import-add-contact.component.ts`

**Before:**
```typescript
if(onboard.contactRes){
  ...
  this.snackBar.open("Successfully added contact", "", { duration: 4000, panelClass:'success-snackbar' });
```

**After:** Reads `res.summary` (bulk) or `res.status` (single) to determine outcome:
- `summary.successCount > 0 && failureCount === 0` → success-snackbar ("N contacts added.")
- `successCount > 0 && failureCount > 0` → warning-snackbar ("N added. M couldn't be added.")
- `duplicateCount > 0 && successCount === 0` → info-snackbar ("Already in your list.")
- `successCount === 0` → danger-snackbar ("No contacts were added.")
- Single, `status === 'DUPLICATE_CONTACT'` → info-snackbar

---

## Patch 4 — `import-add-candidate.component.ts`

**File:** `src/app/employer-panel/employer-contacts/candidate-list/dialogs/import-add-candidate/import-add-candidate.component.ts`

Same pattern as Patch 3. Distinguishes `DUPLICATE_CANDIDATE` for single adds, reads `res.summary` for bulk imports. Default message corrected from "Contact added." to "Candidate added."

---

## Files modified

| File | Change |
|------|--------|
| `src/styles.scss` | +warning-snackbar, +info-snackbar CSS classes |
| `import-add-user.component.ts` | per-email status check; outcome-driven toast |
| `import-add-contact.component.ts` | summary + status-based toast decision |
| `import-add-candidate.component.ts` | summary + status-based toast decision; copy fix |

---

## Invariants enforced

1. `successCount === 0` → NEVER a success-class toast
2. HTTP 200 alone does NOT trigger success message
3. NgRx `subscribe next()` alone does NOT trigger success message
4. Button click/form submit alone does NOT trigger success message
5. Duplicate contacts show informational (info-snackbar) not success or error
