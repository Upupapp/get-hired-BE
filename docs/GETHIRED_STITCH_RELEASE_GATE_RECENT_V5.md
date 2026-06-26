# GETHIRED STITCH V5 — Release Gate
_Scoped to FE HEAD `41b5920` / BE HEAD `6a7755c`_
_Generated: 2026-06-26_

---

## Gate Verdict: PASS — SHIP

No blockers found. The current deployment is safe to release. All five targeted integration risks were resolved as PASS or LOW/INFO. No CRITICAL or HIGH findings were raised.

---

## Gate Checklist

### Auth Integrity

| Check | Result |
|---|---|
| verifyAuth guards all private endpoints | PASS |
| optionalVerifyAuth used correctly on public-but-personalizable endpoints | PASS |
| 403 response body change does not break FE interceptor | PASS |
| All controllers derive identity from req.user.uid (JWT), not query/body | PASS |
| verifyRoles always runs after verifyAuth (uid available) | PASS |
| BOLA protections on applicant sub-arrays (workexp, educbg, cert, skills, docs) | PASS |
| SEC-01 IDOR protection on GET /applicant/userprofile | PASS |
| SEC-02 optionalVerifyAuth on GET /job/details | PASS |

### API Contract

| Check | Result |
|---|---|
| GET /applicant/profile: no query param required, JWT-only identity | PASS |
| HTTP status codes consistent (200/401/403/429) | PASS |
| FE effects normalize error body for both string and JSON 403 responses | PASS (for new effects; see V5-02 for old effects) |
| Response shape: no breaking changes introduced in this deployment | PASS |

### FE Integration

| Check | Result |
|---|---|
| AuthInterceptor attaches Bearer token on all requests | PASS |
| UnAuthorizedInterceptor handles 401+403 (logout) and 429 (warn, no logout) | PASS |
| auth.guard.ts navigateByUrl does not break returnUrl flow | PASS |
| Correct guard for each role (admin/employer/applicant) | PASS |
| jobError$ subscription cleaned up in ngOnDestroy | PASS |
| normalizedJobSub subscription cleaned up in ngOnDestroy | PASS |
| structuredData.remove() called in ngOnDestroy | PASS |

### SSR / SEO

| Check | Result |
|---|---|
| setJsonLd() uses DOCUMENT token (SSR-safe) | PASS |
| JSON-LD deduplication via getElementById guard | PASS |
| setCanonical / clearCanonical uses DOCUMENT token | PASS |
| stripHtml has separate SSR (regex) and browser (textarea) paths | PASS |
| noindex on error jobs (jobError$ meta update) | PASS (with latent bleed risk — see V5-01) |
| JobPosting JSON-LD only for active jobs (jobStatusId === 2) | PASS |
| SSR module (AppServerModule) imports ServerModule + AppModule | PASS |

### Security

| Check | Result |
|---|---|
| Rate limiting active (4 tiers: global / auth / write / sensitive) | PASS |
| Security headers (nosniff, X-Frame-Options, X-XSS-Protection) | PASS |
| CORS restricted to env.app_url | PASS |
| JSON body size limit (1mb) | PASS |
| XML escape in sitemap.xml endpoint | PASS |

---

## Known / Accepted Items (Non-Blocking)

| ID | Description | Decision |
|---|---|---|
| V5-01 | state.error not cleared on getJob dispatch — stale error briefly sets robots noindex on new job navigation | Accept for this release. Fix in next maintenance sprint. No SEO or UX impact. |
| V5-02 | Old effects use destructuring pattern for error extraction; safe in practice because UnAuthorizedInterceptor catches 403 first | Accept for this release. Normalize in cleanup sprint. |
| V5-03 | `getApplicant(userId)` has dead `userId` parameter | Accept. Cosmetic cleanup only. |
| V5-04 (pre-existing) | `verifyAuth` 403 = plain string; `verifyRoles` 403 = JSON — asymmetry in auth error format | Accept. FE handles both. Document only. |

---

## Deferred / Out of Scope (Previously Flagged)

- `interviewRoute.js` auth coverage — not audited this cycle. Verify if interviewer-specific PII is served.
- `cvRoutes.js` / `cvBuilderRoutes.js` — not audited. File upload routes warrant a dedicated security pass.
- `messageRoutes.js` — deferred per prior checkpoint (missing `is_read` column, unfinished feature).
- MIME magic-byte verification on video uploads — explicitly out of scope per prior SECURE sprint decision.
- Redis store for rate limiting — deferred until horizontal scaling is needed.

---

## Ship Conditions

Current HEADs (`FE 41b5920` / `BE 6a7755c`) are clear to ship as-is.

Before the next sprint, create tickets for:
1. FIX-V5-01: Add `error: null` to `getJob` and `getJobSuccess` reducer handlers.
2. FIX-V5-02: Normalize error extraction pattern across old job effects.
3. FIX-V5-03: Remove dead `userId` param from `ApplicantService.getApplicant()`.
