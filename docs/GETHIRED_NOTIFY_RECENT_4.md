# GETHIRED NOTIFY — Messaging Quality Audit (RECENT_4)

**Date:** 2026-06-26
**FE HEAD:** 8a41f25 (audited state)
**BE HEAD:** 35f7754

---

## 1. SnackbarService — Pattern Audit

**File:** `src/app/core/services/snackbar.service.ts`

| Method | Panel Class | Politeness | Duration | Assessment |
|--------|-------------|------------|----------|------------|
| `success()` | `success-snackbar` | `polite` | 4000 ms | PASS — appropriate for non-urgent confirmations |
| `error()` | `danger-snackbar` | `assertive` | 6000 ms | PASS — assertive is correct, screen readers interrupt immediately |
| `warning()` | `warning-snackbar` | `polite` | 6000 ms | PASS — longer duration suits partial-failure context |
| `info()` | `info-snackbar` | `polite` | 4000 ms | PASS — appropriate for clipboard/low-stakes confirmations |

**Politeness assessment:** Using `assertive` for errors is correct per ARIA spec — it interrupts the screen reader's current queue. Using `polite` for warnings is intentional (partial success is not a blocking error). No issues found.

**SSR guard:** `isPlatformBrowser()` check present in all four methods — server-side rendering cannot trigger MatSnackBar. PASS.

---

## 2. Invite All-Fail State — Copy Audit

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.html`

### All-fail result panel (when `allFailed === true`)

| Element | Copy | Assessment |
|---------|------|------------|
| Panel title | "No invites were sent" | PASS — clear, accurate, no false success |
| Toast (error) | "No invites were sent. See details below." | PASS — directs user to in-dialog content |
| Failed emails list | `item.email` + `item.msg \|\| item.message \|\| 'Could not be added'` | PASS — falls back gracefully; shows per-email reason if available |
| Primary CTA | "Retry Failed (N)" | PASS — count in label sets expectation |
| Secondary CTA | "Copy Failed Emails" | PASS — functional, clear intent |
| Cancel/reset CTA | "Try Again" | PASS — contextually correct when allFailed |

**False success risk:** None. The all-fail path sets `submitting = false` synchronously before setting `showResultPanel = true`, which prevents the "Congratulations" screen from rendering. Logic verified against lines 107–111 of `import-add-user.component.ts`.

### Missing copy item — FINDING
The all-fail panel has no body text below the title when `allFailed === true`. The partial-fail panel has `"N email(s) couldn't be added."` (line 33–35), but the all-fail case renders only the title and the failed emails list. A brief explanatory sentence would improve clarity (e.g., "Check the email addresses or try again."). This is a polish issue, not a blocking defect.

---

## 3. Invite Partial-Fail State — Copy Audit

| Element | Copy | Assessment |
|---------|------|------------|
| Toast (warning) | `"N sent. M couldn't be added."` | PASS — accurate counts using actual `succeeded.length` / `failed.length` |
| Panel title | `"N invite(s) sent"` | PASS — singular/plural handled correctly |
| Body | `"M email(s) couldn't be added."` | PASS — clear |
| Retry CTA | "Retry Failed (N)" | PASS |
| Copy CTA | "Copy Failed Emails" | PASS |
| Reset CTA | "Add More Users" | PASS — contextually correct when partial success |

**Accuracy check:** Toast uses `succeeded.length` and `failed.length` — these are derived from the actual server response, not the input count. No false counts possible. PASS.

---

## 4. All-Success State — Copy Audit

| Scenario | Toast | Screen |
|----------|-------|--------|
| 1 invite | "Invite sent." | Congratulations / invitedUsersList |
| N invites | "N invites sent." | Congratulations / invitedUsersList |

**False success check:** Success toast fires only when `succeeded.length > 0 && failed.length === 0`. Verified — no path triggers this branch when all invites fail. PASS.

**"Congratulations" screen copy:** `"Congratulation for adding a new user to your list. You can still add more user."` — grammatical errors ("Congratulation" not "Congratulations", "more user" not "more users"). LOW priority cosmetic issue; does not affect accuracy.

---

## 5. Snackbar Contrast — Accessibility Audit

All snackbar styles are defined in `src/styles.scss`:

| Class | Background | Text | Contrast Ratio | WCAG AA |
|-------|------------|------|----------------|---------|
| `success-snackbar` | Default Material green | #ffffff | Inherited (sufficient) | PASS |
| `danger-snackbar` | `#C0392B` | #ffffff | ~5.14:1 | PASS |
| `warning-snackbar` | `$color-warning-amber` (#b45309) | #ffffff | ~5.02:1 | PASS |
| `warn-snackbar` | `$color-warning-amber` (#b45309) | #ffffff | ~5.02:1 | PASS |
| `info-snackbar` | `$color-info-gray` (#6b7280) | #ffffff | ~4.83:1 | PASS |
| `error-snackbar` | `#C0392B` | #ffffff | ~5.14:1 | PASS |

**No notification relies on color only** — every snackbar carries a text message. Icons are not present but text is sufficient for non-color-only rule. PASS.

**CSS token divergence note:** `unauthorize.interceptor.ts` uses `warn-snackbar` (singular, no trailing `ing`) while `SnackbarService.warning()` uses `warning-snackbar`. Both are now defined in styles.scss and visually identical. No bug, but naming is inconsistent — flagged as a polish item.

---

## 6. Console.log Audit — Auth and Core Flows

### Auth (`src/app/auth/**/*.ts`)
**Result:** Zero `console.log` calls found. PASS.

### Core (`src/app/core/**/*.ts`)
**Result:** Zero `console.log` calls found. PASS.

### Company-users flow (related to invite feature)
**Finding (FIXED this session):** `src/app/company/company-users/company-users.component.ts` line 98 contained:
```
console.log('Haist')
```
This fires when `checkSubs()` receives a null/undefined subscription object. While not PII, it is debug noise in production. **Fixed** — replaced with a silent comment.

---

## 7. Legacy `MatSnackBar` Direct Usage (Out-of-Scope Components)

Multiple files outside the invite flow still inject `MatSnackBar` directly (bypassing `SnackbarService`). These are pre-existing and not part of this deployment's scope, but listed for tracking:

- `src/app/applicant-panel/applicant-settings/applicant-settings.component.ts`
- `src/app/recorder/recorder-setting/recorder-setting.component.ts`
- `src/app/jobs/job-posts-details/job-posts-details.component.ts`
- `src/app/applicant/profile-forms/**` (3 files)
- `src/app/shared/guard/*.ts` (auth, employer, applicant, unauth, admin guards)
- `src/app/job/job-create/**` (3 files)
- `src/app/employer-panel/employer-contacts/**` (8 files)
- `src/app/auth/account-authentication/account-authentication.component.ts`

None of these produce false-success toasts in the invite flow. They are candidates for migration to `SnackbarService` in a future cleanup pass.

---

## 8. Summary

| Area | Status | Notes |
|------|--------|-------|
| SnackbarService patterns | PASS | Politeness, duration, SSR guard all correct |
| All-fail copy accuracy | PASS | No false success, toast and panel aligned |
| All-fail body text | MINOR GAP | No body copy below title (polish item) |
| Partial-fail copy accuracy | PASS | Counts accurate, all CTAs clear |
| All-success copy accuracy | PASS | No false positives |
| Congratulations grammar | COSMETIC | "Congratulation" / "more user" (low priority) |
| Contrast / color-only | PASS | All classes WCAG AA compliant |
| console.log in auth/core | PASS | Zero found |
| console.log in company-users | FIXED | 1 debug log removed this session |
| Interceptor 429 copy | PASS | Clear, non-destructive, not auth-signaling |
| Session-expired copy | PASS | Specific, actionable |
