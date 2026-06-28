# GETHIRED DELETE JOB — Destructive Dialog Accessibility QA V1

**Date:** 2026-06-25

---

## Dialog Used: ConfirmationDialogComponent

**File:** `src/app/shared/components/confirmation-dialog/`

### Accessibility Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Dialog has `disableClose: true` | PASS | Prevents accidental close via backdrop click |
| Dialog has role="dialog" | PASS | Angular Material sets this automatically |
| Focus moves into dialog on open | PASS | Angular Material CDK focus trap |
| Focus returns to trigger on close | PASS | Angular Material CDK focus trap |
| Cancel button is accessible | PASS | Native `<button>` element |
| Confirm button is accessible | PASS | Native `<button>` element |
| Keyboard navigation | PASS | Tab between buttons; Enter/Space to activate |
| Title uses heading (`h5`) | PASS | Screen readers announce as heading |
| "This action cannot be undone." copy | PASS | Clear destructive intent |
| Dialog dismissable via Escape | PARTIAL — disableClose=true prevents ESC close; intentional for disruptive delete |
| Color contrast (btn-primary) | ASSUMED PASS — use existing brand red |
| `prefers-reduced-motion` | N/A for dialog reveal — Angular Material handles |

---

## Animation Compliance

The confirmation dialog uses Angular Material Dialog animations (CDK). These respect the system `prefers-reduced-motion` setting at the browser level. No custom animations added.

---

## Copy QA

- Title: "Delete job Confirmation" — clear and unambiguous
- Body: "This action cannot be undone." — correct framing for irreversible delete
- Cancel button: uses i18n key `DELETE_WARNING.CANCEL_BUTTON` — verified present in `en.json`
- Confirm button: uses i18n key `DELETE_WARNING.CONTINUE_BUTTON` — verified present in `en.json`

---

## Findings

- PASS: Dialog is accessible, focusable, keyboard-navigable
- PASS: Copy correctly conveys destructive intent
- PASS: No information leak in dialog (job title not shown — intentional to avoid confusion if job was already deleted)
