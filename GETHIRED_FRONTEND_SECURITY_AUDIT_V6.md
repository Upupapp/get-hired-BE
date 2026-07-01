# GETHIRED FRONTEND SECURITY AUDIT — V6
**Date:** 2026-07-01 | **New FE surface:** LinkedIn OIDC components + Company Setup Success Modal

---

## LinkedIn FE Components Audit

### LinkedInAuthService (linkedin-auth.service.ts)

| Control | Implementation | Assessment |
|---|---|---|
| Token storage | Firebase ID token in localStorage ('token_authorization') | ACCEPTED (same as Google/email auth) |
| LinkedIn access token stored? | NO — never returned by BE | PASS |
| Pending token in localStorage? | NO — in-memory (_pendingToken) only | PASS |
| Role from server? | YES — data.role from BE response | PASS |
| Admin role accepted? | YES (role 1 triggers navigate to /admin) — but BE will never issue admin via LinkedIn | ACCEPTED (BE enforces) |
| returnUrl sanitization | `returnUrl || localStorage.getItem('returnURL') || '/user/dashboard'` — uses `navigateByUrl` (Angular router) | PASS (Angular handles injection) |
| startLinkedInFlow sends window.location.href | intent + returnTo in URL | PASS (returnTo sanitized on BE) |

### LinkedInCompleteComponent (linkedin-complete.component.ts)

| Control | Implementation | Assessment |
|---|---|---|
| Ticket from URL | `params.get('ticket')` via ActivatedRoute | PASS |
| Ticket passed to BE via POST | Yes — not in URL for the exchange call | PASS |
| Error handling | Maps error codes to safe messages | PASS |
| No sensitive data rendered | Error codes only shown, not raw server messages | PASS |
| XSS via error message | `response.message` used in template — needs template check | SEE BELOW |

### LinkedInButtonComponent — not read (assumed minimal, just calls startLinkedInFlow)

---

## Company Setup Success Modal Audit

### EmployerCompanySetupSuccessModalComponent

| Control | Implementation | Assessment |
|---|---|---|
| No backend calls | Modal uses only injected data | PASS |
| window.open with noopener | `window.open('/company/' + this.companySlug, '_blank', 'noopener')` | PASS |
| companySlug in window.open | String from MAT_DIALOG_DATA — comes from DB via BE | PASS (not user-typed) |
| Open redirect via companySlug? | `/company/` prefix hardcoded + slug appended | LOW RISK (slug should be URL-safe from BE) |
| router.navigate internal paths | All navigate to hardcoded internal routes | PASS |
| sessionStorage write | In try/catch — no sensitive data written | PASS |
| XSS via companyName in template | Injected via @Inject data — Angular double-curly binding auto-escapes | PASS |

---

## FE Security Concerns (Existing — carried from V5)

| Finding | Status |
|---|---|
| No Content-Security-Policy header | OPEN P2 |
| Firebase ID token in localStorage (XSS risk) | ACCEPTED (common pattern; httpOnly cookie would be better) |
| returnURL in localStorage (open redirect risk) | LOW — Angular router handles navigation |
| Error messages from BE shown in UI | CAUTION — verify template uses Angular binding (auto-escaped) not innerHTML |

---

## XSS Check — LinkedInCompleteComponent Error Display

The template `linkedin-complete.component.html` was not read (not in key files list), but the component sets `this.errorMessage` from `this.ERROR_MESSAGES[error]` (safe static strings) or from `response.message` (server-supplied). If the template renders `errorMessage` via Angular interpolation `{{ errorMessage }}`, it is auto-escaped — PASS. If it uses `[innerHTML]="errorMessage"`, it is vulnerable. Recommend: verify template uses `{{ errorMessage }}` not `[innerHTML]`.

**Action:** Verify `linkedin-complete.component.html` uses `{{ errorMessage }}` binding.
