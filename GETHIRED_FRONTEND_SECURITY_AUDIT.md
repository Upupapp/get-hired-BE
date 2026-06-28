# GETHIRED FRONTEND SECURITY AUDIT — QA Cycle 11
Generated: 2026-06-25 | FE: Angular 13+ SPA

---

## Angular Security Baseline

Angular provides built-in XSS protection via its template compiler:
- Template interpolation (`{{ }}`) auto-escapes HTML
- Property binding (`[innerHTML]`) is protected by DomSanitizer
- Angular disallows direct DOM manipulation in templates

---

## Key Security Checks

### 1. XSS via Template Injection
Angular's default template compiler escapes interpolated values. Risk is LOW unless `DomSanitizer.bypassSecurityTrust*()` is used.

**Check:** grep for `bypassSecurityTrust` usage:
- Not found in prior audits. Risk: LOW.

### 2. Stored XSS via API Responses
The BE returns job descriptions, user profiles, and company descriptions as plain text/JSON. If the FE renders these via `[innerHTML]`, XSS could occur.

**Risk:** MEDIUM — job/company descriptions may contain user-supplied HTML-like content. Angular's `DomSanitizer` should sanitize `[innerHTML]` binding, but the exact FE implementation requires verification.

**Recommendation:** Confirm no `[innerHTML]` binding on job description or profile fields. If used, verify `DomSanitizer.sanitize()` is called first.

### 3. JWT Storage
The FE receives Firebase ID tokens. These should be stored in memory or HttpOnly cookies, not in `localStorage`.

**Known pattern in codebase:** Firebase SDK manages token refresh and provides `getIdToken()` in-memory. If the Angular service calls this before each API request, storage in localStorage is not needed.

**Check:** No explicit localStorage/sessionStorage of tokens found in prior audits. Risk: LOW.

### 4. CORS Behavior
The BE has `cors()` with no origin restriction. The FE is an Angular SPA served from a separate domain. With CORS open, any third-party site can make authenticated requests on behalf of users who visit that site (CSRF via CORS).

**Risk:** MEDIUM — depends on whether cookies vs. headers are used for auth. If Bearer header only (FE-initiated), CSRF is not exploitable. If `__session` cookie is used, CSRF is possible without CORS restrictions.

**Recommendation:** Restrict CORS to production FE domain (EA-06 in external actions).

### 5. Content Security Policy
No CSP header set by BE. Angular apps deployed as static files may have CSP set at the web server/CDN level.

**Risk:** MEDIUM — without CSP, any injected scripts can execute. CSP is a defense-in-depth control; Angular's templating already prevents most XSS.

**Recommendation:** Add CSP header at nginx/CDN level: `default-src 'self'; script-src 'self'; connect-src 'self' https://firebaseapp.com https://api.paymongo.com;`

### 6. Sensitive Data in Angular Routes / URL Parameters
Checked route patterns: job IDs, company IDs, application IDs appear in URLs. These are UUIDs/random strings, not sequential integers — harder to enumerate.

**Risk:** LOW.

### 7. Angular Guards for Protected Routes
FE route guards should redirect unauthenticated users. Backend authorization is the true security boundary; FE guards are UX only.

**Risk:** LOW — BE enforces auth independently.

### 8. Error Message Exposure
BE returns generic error messages (confirmed throughout controllers). FE should not display raw API error objects to users.

**Risk:** LOW — verified in prior passes.

### 9. Firebase SDK Version
FE uses firebase@9.14.0. Firebase SDK v9 (modular) is actively maintained. No known critical CVEs in 9.14.x.

**Risk:** LOW.

### 10. Angular Version
Package uses Angular (version not directly read but SPA structure consistent with Angular 13-15 based on prior session notes). Angular 13+ has built-in protections and is within LTS.

**Risk:** LOW.

---

## FE-Specific Findings (QA11)

| Finding | Severity | Status |
|---------|---------|--------|
| CSP header missing | P3 | OPEN (nginx/CDN level fix) |
| CORS unrestricted (affects FE security) | P2 | OPEN (server.js fix) |
| [innerHTML] usage on descriptions not verified | P3 | Needs FE code check |
| FE GitHub Actions deploy workflow needs secrets | Non-security | Separate tracking |

---

## Recommendations

1. Restrict CORS in `server.js` to the production FE domain.
2. Add CSP at nginx/CDN level.
3. Confirm no `DomSanitizer.bypassSecurityTrust*()` usage in FE components that render job/user content.
4. Confirm Bearer-header-only auth (not cookie-based) to confirm CSRF is not exploitable.
