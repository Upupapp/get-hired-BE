# NOTIFY-P2: False-Success Related Notification Sweep

**Date:** 2026-06-26

---

## Scope

Sweep of all `snackBar.open(...)` calls in the FE that use `success-snackbar` panelClass, to identify any other flows that may show success based solely on HTTP 200 or truthy response without checking per-item outcome.

---

## Files with `success-snackbar` usage

The following files were identified as using `success-snackbar`. Each was assessed for false-positive risk.

### Assessed — NO false-positive risk

| File | Trigger | Assessment |
|------|---------|------------|
| `import-add-user.component.ts` | `companyUserRes` | FIXED in this sprint |
| `import-add-contact.component.ts` | `contactRes` | FIXED in this sprint |
| `import-add-candidate.component.ts` | `candidateRes` | FIXED in this sprint |
| Job posting create/update | Server response | Single-item, clear success/error only |
| Profile update | Single field update | No per-item batch issue |
| Interview schedule | Single action | No batch |
| Message send | Single message | No batch |
| Login/auth | Auth state | NgRx auth success reducer fires on confirmed auth |

### Not in scope (non-employer-invite flows)

- Applicant profile save — single operation, success/error dichotomy
- Video recorder upload — single upload, response is binary pass/fail
- Payment confirmation — PayMongo handles this separately

---

## `danger-snackbar` sweep

All existing `danger-snackbar` usages (13 files before this sprint) were for error states dispatched by NgRx effects' `catchError` blocks, which only fire on HTTP 4xx/5xx. These were not false-positive risks.

---

## Conclusion

The false-positive success toast pattern was isolated to the three invite/import components patched in this sprint. No other snackbar call was found to have the `emails.length > 0` or truthy-object-as-success anti-pattern.

---

## New risk identified (deferred)

`contactsController.js` `createGroup` and `updateGroup` functions still use the broken `forEach(async ...)` pattern. These are group management operations — not invite flows — and do not have a false-positive TOAST issue (different response path). However, the async race condition could cause "headers already sent" Express errors when multiple emails fail. Logged in BACKLOG as deferred P2.
