# GetHired — Frontend Security Audit (SECURE 3)
**Date:** 2026-06-26
**FE Stack:** Angular 13, Angular Universal SSR

---

## 1. Firebase Web SDK API Key Exposure

**File:** `src/environments/environment.prod.ts`

Firebase Web SDK API keys (`apiKey`, `appId`, etc.) are present in the production environment file. This is **intentional and acceptable** — Firebase Web SDK keys are designed to be public. They identify the project but do not grant admin access. Firebase security rules (Firestore Rules, Storage Rules) must be configured to restrict what authenticated/unauthenticated clients can do.

**Concern:** The `apiKey: 'AIzaSyB6zvOfgenO-ed_KkyjYus1PcSk5aiMo4A'` (top-level, different from the firebase config) and the firebase.apiKey appear in plaintext in the built JS bundles.

**Status: ACCEPTED** — standard Firebase Web SDK deployment pattern. Requires Firebase Security Rules to be properly configured (verify in Firebase Console).

---

## 2. SSR Security Properties

### 2.1 JSON-LD Injection (Verified in SECURE-V5)
The SSR path uses `stripHtml()` + `JSON.stringify()` for structured data. A `</script>` in job descriptions is stripped by the regex before reaching `JSON.stringify`. **PASS.**

### 2.2 DOCUMENT token (Verified in SECURE-V5)
Angular's injected `DOCUMENT` token is used instead of bare `document` global — safer for SSR and avoids server-side throws. **PASS.**

### 2.3 Universal SSR XSS surface
No server-side HTML rendering with unescaped user content found. Angular template binding escapes by default. **PASS.**

---

## 3. AuthGuard Analysis (SECURE-V5 Verified)

`auth.guard.ts` decisions based on:
1. `localStorage.getItem('state') == 'true'` — authenticated flag
2. `route.data.role.indexOf(userRole) === -1` — role check

No query params influence access decisions (`isMobileViewAllowed` dead code confirmed removed). **PASS.**

---

## 4. Token Storage

Firebase tokens are managed by the Firebase SDK in `localStorage`. This is the standard Firebase Web SDK pattern. Risks:
- XSS can steal tokens from localStorage (mitigated by Angular template escaping)
- No httpOnly cookie flag (inherent to client-SDK pattern)

**Mitigation:** Angular's default interpolation escaping prevents XSS injection of malicious scripts. `X-XSS-Protection: 0` header is set (correct — disables the broken IE filter). No CSP header is set (see below).

---

## 5. Missing Security Headers (FE perspective)

Headers missing from BE responses that affect FE security:

| Header | Status | Impact |
|---|---|---|
| `Content-Security-Policy` | MISSING | No XSS mitigation beyond Angular defaults |
| `Strict-Transport-Security` | MISSING | No HSTS enforcement |
| `Referrer-Policy` | MISSING | Full referrer sent to third parties |
| `Permissions-Policy` | MISSING | Browser features not restricted |
| `X-Content-Type-Options: nosniff` | PRESENT | PASS |
| `X-Frame-Options: DENY` | PRESENT | Clickjacking prevented |
| `X-XSS-Protection: 0` | PRESENT | PASS (disables broken IE filter) |

---

## 6. recaptcha Site Key

`recaptchaSiteKey: "6LdO9FYmAAAAADJsvwivUIbrsh-onjVZhIlFJ23U"` in environment.prod.ts — public site keys are designed to be public. No issue.

---

## 7. Dead External Server Reference

`server: 'https://ssr-back.herokuapp.com'` in `environment.prod.ts` — references a defunct Heroku endpoint. If this URL is still referenced in FE code for API calls, it would fail silently. Should be verified and cleaned up.

---

## 8. Summary

| Item | Status |
|---|---|
| Firebase Web SDK keys exposed | ACCEPTED (public by design) |
| SSR JSON-LD injection | PASS |
| AuthGuard access control | PASS |
| XSS via template binding | PASS (Angular default escaping) |
| CSP header | MISSING — recommended |
| HSTS header | MISSING — recommended |
| nosniff header | PASS |
| X-Frame-Options | PASS |
| Dead Heroku server reference | INFO — verify and remove |
