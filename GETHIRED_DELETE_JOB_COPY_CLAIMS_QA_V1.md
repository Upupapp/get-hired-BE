# GETHIRED DELETE JOB — Copy & Claims QA V1

**Date:** 2026-06-25

---

## All User-Facing Copy in the Delete Flow

| Surface | Copy | Truthful | Appropriate |
|---------|------|----------|-------------|
| Table control menu button | "Delete Job Post" (via i18n DELETE_JOB_BUTTON) | YES — this IS a delete | YES |
| Confirmation dialog title | "Delete job Confirmation" | YES | YES |
| Confirmation dialog body | "This action cannot be undone." | YES — hard delete, not archive | YES |
| Confirmation cancel button | i18n DELETE_WARNING.CANCEL_BUTTON | YES | YES |
| Confirmation confirm button | i18n DELETE_WARNING.CONTINUE_BUTTON | YES | YES |
| Success snackbar | "Job deleted." | YES — job is permanently deleted | YES |
| Error snackbar (general) | "We couldn't delete this job. It may no longer exist or you may not have access." | YES — covers both 404 and 403 cases | YES |
| Error snackbar (BE-provided) | Backend error message passed through | CONDITIONAL — BE messages verified above | YES |

---

## Previous Copy Issues Fixed

| Before | After | Why |
|--------|-------|-----|
| "Would you like to save your progress in Delete?" | "This action cannot be undone." | Old copy was misleading — "save your progress" contradicts a delete |
| No success feedback | "Job deleted." | Users had no confirmation the delete worked |
| No error feedback for delete | "We couldn't delete this job..." | Users had no feedback on delete failures |

---

## Claims Audit

- "This action cannot be undone." — TRUE: hard DELETE from DB, no soft-delete or archive. No recovery mechanism exists.
- "Job deleted." — only shown on 200 response from backend after `rowCount > 0`. Never shown optimistically.
- Error copy — only shown on non-200 response. Never faked.

---

## i18n Status

`DELETE_JOB_BUTTON` key verified in:
- `en.json`: "Delete Job Post" — PASS
- `vie.json`: "Xóa công việc đã đăng" — PASS

Cancel/Continue button keys use existing `DELETE_WARNING.*` i18n keys — not changed.
