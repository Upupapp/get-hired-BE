# GetHired NOTIFY — Fix Log: Recent Deployment Audit
## NOTIFY-P2 — BE 2ff6358 / FE 1863842

**Audit date:** 2026-06-26

---

## Changes Applied This Audit Pass

### FIX-1: Wrong noun in company-user all-failed toast copy
**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`
**Line:** 80
**Change type:** Copy fix

**Before:**
```typescript
this.snackBar.open('No contacts were added.', '', { duration: 6000, panelClass: 'danger-snackbar' });
```

**After:**
```typescript
this.snackBar.open('No invites were sent.', '', { duration: 6000, panelClass: 'danger-snackbar' });
```

**Reason:** The company-user invite flow sends invitations to colleagues/team members, not CRM contacts. Using "contacts" is factually wrong and inconsistent with the success-path verb "Invite sent." / "N invites sent." The corrected copy is consistent, accurate, and uses the right domain noun for this flow.

---

### FIX-2: `.success-snackbar` missing `color: #ffffff`
**File:** `src/styles.scss`
**Line:** 241-244
**Change type:** CSS fix

**Before:**
```scss
.success-snackbar {
  background-color: $color-global-red-buttons;
}
```

**After:**
```scss
.success-snackbar {
  background-color: $color-global-red-buttons;
  color: #ffffff;
}
```

**Reason:** All other snackbar classes (`.danger-snackbar`, `.warning-snackbar`, `.info-snackbar`) explicitly set `color: #ffffff`. Without this declaration, Angular Material inherits its default dark text color on a red (#FF7062) background — potentially rendering near-black text on a medium-bright red, which is a contrast failure. This is consistent with the rest of the snackbar system.

---

## Changes Already in Place (Prior BRAND Pass — Not Applied This Audit)

These changes were made by an earlier automated BRAND pass before this audit ran. They are documented here for traceability.

### BRAND-FIX-A: `.warning-snackbar` amber upgraded for WCAG AA
**File:** `src/styles.scss` (line 258-261), `src/assets/styles/colors.scss` (lines 27-30)

Original NOTIFY-P2 shipped value: `background-color: #f59e0b` (Tailwind amber-400)
- Contrast vs white: 2.15:1 — **WCAG AA fail** (requires 4.5:1 normal text, 3:1 large text)

BRAND pass upgraded to: `background-color: $color-warning-amber` = `#b45309` (Tailwind amber-800)
- Contrast vs white: 5.02:1 — **WCAG AA pass**

Added to `colors.scss`:
```scss
// NOTIFY-P2 toast semantic tokens
$color-warning-amber: #b45309;
$color-info-gray: #6b7280;
```

---

## Summary

| Fix | File | Type | Applied By |
|---|---|---|---|
| FIX-1: "No contacts were added." → "No invites were sent." | import-add-user.component.ts | Copy | This audit |
| FIX-2: `color: #ffffff` on `.success-snackbar` | styles.scss | CSS | This audit |
| BRAND-FIX-A: amber #f59e0b → #b45309 (WCAG AA) | styles.scss + colors.scss | CSS | Prior BRAND pass |

**Total changes applied this audit: 2**
