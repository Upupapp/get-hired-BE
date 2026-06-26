# GetHired Error States Guide — NOTIFY-3

## Audited Error States

---

## 1. Job Detail — Fetch Error

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` lines 3–12  
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.ts` lines 98–108

### States

| Variant | Trigger | Heading | Body | CTA |
|---|---|---|---|---|
| Session expired | `jobError$ === 'Unable to load this job for the current session.'` | "Session required" | "Sign in to view this job." | Sign In + Browse all jobs |
| Job unavailable | Any other error | "This job isn't available" | "It may have expired, been removed, or the link may be incorrect." | Browse all jobs |

### Quality Checklist
- [x] Error state is visible (not blank screen)
- [x] Heading is descriptive
- [x] Body explains possible causes without blaming user
- [x] Recovery CTA provided
- [x] `role="alert"` announced to screen readers
- [x] `aria-live="assertive"` for immediate announcement
- [x] SEO: `noindex` meta set (prevents dead pages being indexed)
- [x] SSR: HTTP 404 via RESPONSE token (real 404 for crawlers)
- [ ] No illustration/icon (low priority gap)

---

## 2. HTTP 401/403 (Global Interceptor)

**File:** `src/app/core/interceptor/unauthorize.interceptor.ts`

| HTTP Status | Message | Class | Action |
|---|---|---|---|
| 401 | "Your session has expired. Please sign in again to continue." | danger-snackbar (4s) | logout + /signin redirect |
| 403 | Same message | danger-snackbar (4s) | logout + /signin redirect |
| 429 | "You've made too many requests. Please wait a moment and try again." | warn-snackbar (5s) | No logout, no redirect |

**Quality:** 401 and 403 both handled (previously only 403). 429 correctly does NOT log out. Messages are clear and actionable.

---

## 3. Signup API Error

**File:** `src/app/auth/signup/signup.component.html` lines 82–87  
**File:** `src/app/auth/signup/signup.component.ts` lines 120–126

Error displays as an inline `.alert.alert-danger` with dismissible close button. `role="alert"` present. Content is `{{ error }}` which receives the API error message string. Window scrolls to top on error.

**Gap:** No sanitization of error string before display. If the API returns a raw error object, `{{ error }}` would display `[object Object]`. In practice the API returns string messages, but this is a latent risk.

---

## 4. Signin API Error

**File:** `src/app/auth/signin/signin.component.ts` lines 133–144

Normalizes the email-verification error string ("Please Verify Email...") to a clearer message. All other errors fall through to `localStorage.getItem('loginError')`. Same gap: if localStorage value is an object, display would be `[object Object]`.

---

## 5. Contact/Candidate Import — API Error

Generic danger-snackbar: "Something went wrong please try again later or contact your administrator"

No specific guidance about what went wrong. Adequate for now — import errors are typically transient API failures, not user-caused.

---

## 6. Recording Device Missing

**File:** `src/app/recorder/recorder-setting/recorder-setting.component.ts`

```
"No Available Devices to record"
```
Error-snackbar (now defined). Message is direct and clear. User knows no devices were found.

**Gap:** No guidance on what to do (check browser permissions, connect a device, refresh). Low priority.

---

## Error State Quality Summary

| Error | Visible UI | Screen reader | Recovery CTA | Cause explained | Priority |
|---|---|---|---|---|---|
| Job not found | YES | YES | YES | YES | PASS |
| Job session expired | YES | YES | YES | YES | PASS |
| HTTP 401/403 | Snackbar | Brief | Implicit (redirect) | Partial | PASS |
| HTTP 429 | Snackbar | Brief | Yes ("wait") | YES | PASS |
| Signup API error | Inline alert | YES | No | Depends on API msg | PASS |
| Bulk import API error | Snackbar | Brief | No | No | DEFERRED |
| No recording device | Snackbar | Brief | No | YES | DEFERRED |
