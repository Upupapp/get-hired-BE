# GetHired NOTIFY — Fix Log V5
## FE 41b5920 / BE 6a7755c
**Date:** 2026-06-26

---

## Fixes Applied This Pass

### NOTIFY-V5-F1 — Add `.warn-snackbar` CSS class

**File:** `get-hired-FE/src/styles.scss`

**Problem:** `unauthorize.interceptor.ts` uses `panelClass: ['warn-snackbar']` for HTTP 429 (rate-limit) toasts. The CSS class was never defined. Angular Material would fall back to its default snackbar style — a dark chip with no semantic color signal. Users hitting rate limits would see an unstyled toast with no amber warning color, making it visually indistinguishable from any other informational message.

**Fix:** Added `.warn-snackbar` class with `background-color: $color-warning-amber` (#b45309, amber-800) and `color: #ffffff`. Contrast ratio 5.02:1 vs white — WCAG AA pass. Intentionally distinct from `.danger-snackbar` (brand red) because 429 is "wait and retry", not an auth error.

**Change type:** CSS only. No product behavior change.

**Test:** Load any authenticated page, spam requests until 429, observe amber toast "You've made too many requests. Please wait a moment and try again."

---

### NOTIFY-V5-F2 — Add `.error-snackbar` CSS class

**File:** `get-hired-FE/src/styles.scss`

**Problem:** `recorder-setting.component.ts` uses `panelClass: ['error-snackbar']` when no recording devices are detected. The class was never defined. Same fallback behavior as F1 — unstyled toast.

**Fix:** Added `.error-snackbar` class with `background-color: $color-global-red` (#FE6F61) and `color: #ffffff`. Consistent with `.danger-snackbar` color (same semantic severity: device/hardware error). Both classes can coexist for future specialization.

**Change type:** CSS only. No product behavior change.

**Test:** Open the video recorder on a machine with no camera/microphone or with camera permissions denied. Observe a red "No Available Devices to record" toast.

---

### NOTIFY-V5-F3 — Confirm-password label i18n key in signup.component.html

**File:** `get-hired-FE/src/app/auth/signup/signup.component.html` (line ~165)

**Problem:** The confirm-password input's floating label used the translation key `CREATE_ACCOUNT.PASSWORD_TEXTBOX` — the same key as the password field above. In English, both labels read "Password". The i18n file at `assets/i18n/en.json` already defines `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` = "Confirm Password" and `assets/i18n/vie.json` defines the Vietnamese equivalent `CONFIRM_PASSWORD_TEXTBOX` = "Mật khẩu". The key existed — it just wasn't being used in the template.

**Impact:** Sighted users must rely on field position to distinguish password from confirm-password. Screen reader users hear "Password" twice with no audible distinction between the two inputs — they cannot know the second is a confirmation field without using context clues.

**Fix:** Changed `'CREATE_ACCOUNT.PASSWORD_TEXTBOX'` to `'CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX'` on the confirm-password label. No i18n file changes needed.

**Change type:** Template copy/i18n key only. No product behavior change.

**Test:** Open /signup. Tab through the form. Password field label reads "Password". Confirm Password field label reads "Confirm Password".

---

## No-Fix Notes (Already Correct)

The following items from the audit scope were inspected and found to require no change:

- Breadcrumb nav in job-posts-details — `aria-label`, `aria-current`, and current-item text are all correct.
- Job error state — copy distinguishes session-required vs job-unavailable correctly. Error div has `role="alert" aria-live="assertive"`.
- Browse-jobs anchor elements in job-seeker-portal — semantically correct as `<a routerLink>`. CSS classes render identically on anchor vs button. Focus/hover states correct.
- verifyAuth.js 403 body — FE interceptor ignores the body and shows its own message; no UX regression.
- Auth page noindex calls — `seoService.setPageMeta` is working correctly; the title/description side effects are intentional and correct per each page's own setPageMeta call.
- NOTIFY-P2 constraints — all four hard constraints verified clean across import-add-user, import-add-candidate, import-add-contact.
