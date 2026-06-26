# GetHired Accessible Status Messages Guide — NOTIFY-3

## WCAG 2.1 SC 4.1.3 Status Messages (Level AA)

Status messages (including toasts, inline errors, and state transitions) must be perceivable by screen readers without the element receiving focus.

---

## Audit Results

### 1. Job Detail Error State

**Element:** `<div class="job-detail-error-state" role="alert" aria-live="assertive">`

| WCAG criterion | Status | Notes |
|---|---|---|
| SC 4.1.3 — status message perceivable | PASS | `role="alert"` announces to screen readers immediately on render |
| SC 1.3.1 — info and relationships | PASS | `<h5>` heading + `<p>` body provide structure |
| SC 2.4.6 — headings descriptive | PASS | "This job isn't available" / "Session required" are descriptive |
| `aria-live="assertive"` appropriate? | YES | Error state that replaces expected content warrants assertive (not polite) |

### 2. Snackbar Toasts (Angular Material MatSnackBar)

Angular Material snackbar uses `role="status"` by default, which maps to `aria-live="polite"`. For error/danger toasts, `role="alert"` (`aria-live="assertive"`) would be more appropriate.

**Current state:** All toasts use the default MatSnackBar behavior (polite). This means error toasts (session expired, all-failed) are announced politely — they do not interrupt an ongoing screen reader announcement.

**WCAG impact:** For session expiry, this means the error announcement may be delayed if the screen reader is busy reading other content. For bulk-import failures, the delay is acceptable. For session expiry, the redirect to `/signin` happens immediately which forces a page load announcement.

**Recommendation (deferred):** For danger-snackbar toasts that accompany forced redirects (session expired), the redirect itself is the dominant UX event — the snackbar announcement being polite is acceptable. No change needed this pass.

### 3. Signup Form Validation

| WCAG criterion | Status | Notes |
|---|---|---|
| SC 3.3.1 — error identification | PASS | `<small class="text-danger">` adjacent to each field |
| SC 3.3.2 — labels or instructions | PASS | Labels present for all fields |
| Programmatic association | PARTIAL | Validation messages use `*ngIf` adjacent, not `aria-describedby` linked to the input |

**Gap:** The validation `<small>` elements are not linked to their inputs via `aria-describedby`. Screen readers may not associate them automatically. This is a pre-existing gap not introduced by this deployment. Deferred.

### 4. Signup Submit Button Accessible State

| Element | Attribute | Value during submit | Correct? |
|---|---|---|---|
| `<button type="submit">` | `[disabled]` | true when submitting | YES |
| `<button type="submit">` | `[attr.aria-busy]` | "true" when submitting | YES |
| Loading GIF | `aria-hidden` | "true" | YES |

The label change to "Creating account..." during submit gives screen readers a descriptive in-progress message when the button receives focus.

### 5. Confirm Password Label Fix

The previous `CREATE_ACCOUNT.PASSWORD_TEXTBOX` key produced "Password" for both password and confirm-password labels. Screen readers would have announced two identically-labelled inputs. The fix to `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` = "Confirm Password" corrects this. Now each input has a unique, descriptive label.

**WCAG SC 2.4.6 (Headings and Labels):** PASS after fix.

---

## Screen Reader Announcement Map

| Event | AT announcement | How |
|---|---|---|
| Job not found error appears | "Session required. Sign in to view this job." | role=alert assertive |
| Snackbar toast appears | Toast text (polite) | MatSnackBar default role=status |
| Signup form error appears | Triggered on re-focus of input (no live region) | No live region — gap (deferred) |
| Submit button disabled | "Creating account... button dimmed" (browser-specific) | [disabled] + label change |
| Confirm password label | "Confirm Password, edit text" | Correct label now |
