# GETHIRED_TEST_RECENT_DEPLOYMENT_V5
**Date:** 2026-06-26  
**BE HEAD:** 6a7755c | **FE HEAD:** 41b5920  
**Scope:** 7-change deployment (1 BE, 6 FE)  
**Verdict:** GO WITH CAUTION — 1 test-fidelity gap found; no runtime regressions; no blocking issues

---

## Summary Table

| # | Change | Behavior OK | Regression Risk | Verdict |
|---|--------|-------------|-----------------|---------|
| 1 | BE `verifyAuth.js` — generic 403 message | PASS | None | GO |
| 2 | FE `seo.service.ts` — DOCUMENT token injection | PASS | Clarification needed (see §3) | GO WITH NOTE |
| 3 | FE `applicant.service.ts` — removed `?id=` from getApplicant | PASS | None | GO |
| 4 | FE routing — removed `isMobileViewAllowed` | PASS | None | GO |
| 5 | FE `job-seeker-portal.component.html` — 3 CTAs to `<a routerLink>` | PASS | Minor (see §5) | GO |
| 6 | FE `job-posts-details` — breadcrumb + Meta + jobError$ noindex | PASS | None | GO |
| 7 | Auth pages — noindex via SeoService | PASS | None | GO |

---

## 1. BE verifyAuth.js — Generic 403 Message

**File:** `middleware/verifyAuth.js`

**What changed:** Line 39. Previously: `res.status(403).send(error)` — sent the raw Firebase error object (serialized to `[object Object]` or a JSON blob exposing internal Firebase error codes). Now: `res.status(403).send('Authentication failed.')`.  
Expired-token path at line 36 already sent a string (`'Token Expired. Login again.'`), unchanged.

**Behavior check:**
- Auth bypass: The guard logic is unchanged. Token validation runs via `firebaseAdmin.auth().verifyIdToken(idToken)`. The `next()` call on success (line 32–33) is unaffected. Only the error-path response body changed.
- Contract: The HTTP status code (403) is preserved. All FE consumers that gate on status code continue to work. No FE code was found that parses the error body text of a 403 to make routing decisions.
- Token extraction paths: Both `Authorization: Bearer <token>` and `__session` cookie paths are unchanged.
- Missing-header path (line 9): sends `"Unauthorized"` string — unchanged.
- Invalid-token path (line 39): was `error` object, now `'Authentication failed.'` — safer (no internal detail leakage).

**Security regression:** None. The change removes information leakage (Firebase internal error codes, token hashes in error objects) without touching the auth decision itself.

**False-positive risk:** None. Auth still only calls `next()` on a successful `verifyIdToken()` resolve.

**Existing test coverage:** No test file exists for `verifyAuth.js` in `get-hired-BE/tests/`. The only BE test is `tests/sitemap.test.js`, which has no dependency on verifyAuth.

**Verdict: PASS — GO**

---

## 2. FE seo.service.ts — DOCUMENT Token Injection

**File:** `src/app/core/services/seo.service.ts`

**What changed (V4):**
- Constructor now injects `@Inject(DOCUMENT) private doc: Document` instead of using the bare `document` global.
- `setCanonical`, `clearCanonical`, `setJsonLd`, `clearJsonLd` all use `this.doc.*` instead of `document.*`.
- The `setJobPostingJsonLd` comment notes the removal of `if (!this.isBrowser) return` guard that previously suppressed JSON-LD on the server — structured data now runs on SSR via `this.doc`.
- Empty `sameAs: []` array removed from `setOrganizationJsonLd`.

**SSR safety analysis:**

The implementation is **SSR-correct** for the stated goal. The `@Inject(DOCUMENT)` token in `@angular/common` resolves to a server-side DOM stub under Angular Universal (`DomAdapter`), which supports `createElement`, `querySelector`, `getElementById`, `head.appendChild`. The service will call these on the server-side stub without throwing. Canonical tags and JSON-LD scripts will appear in SSR-rendered HTML.

Confirmed: `tsconfig.server.json` and `src/main.server.ts` are present — Angular Universal is configured in this project.

**SSR test-fidelity gap (not a runtime bug):**

The spec at `src/app/core/services/seo.service.spec.ts` lines 491–496 contains a test that asserts:
```
spyOn(document, 'querySelector').and.callThrough();
expect(() => service.setCanonical(...)).not.toThrow();
expect(spy).not.toHaveBeenCalled();
```
This test was written expecting `setCanonical` to be a no-op on the server. But the V4 implementation **intentionally calls `this.doc.querySelector`** on the server (that is the whole point — to emit canonical tags into SSR HTML). In JSDOM, `this.doc` is the same object as the global `document`, so the spy WILL be called. The test assertion `expect(spy).not.toHaveBeenCalled()` will **FAIL** under Karma/Jasmine.

Similarly the SSR tests `setJsonLd does NOT inject a script element when isBrowser=false` and `setJobPostingJsonLd does NOT inject a script when isBrowser=false` will FAIL because JSON-LD is now intentionally injected via `this.doc` even in SSR mode — the whole point of the V4 fix.

**This is a test/spec alignment problem, not a runtime regression.** The spec was written for the old (V3) behavior where SSR was a no-op. The V4 implementation is correct; the spec needs to be updated to reflect the new intention (assert that SSR DOES inject the elements, not that it does not).

**Impact:** Karma test suite will report failures for the SSR block. No production behavior is broken.

**sameAs removal:** The `sameAs: []` removal from `setOrganizationJsonLd` is safe. An empty array is semantically meaningless and Google's Rich Results validator may flag it.

**Verdict: PASS (runtime) — GO WITH NOTE: SSR spec block needs update to reflect intentional V4 behavior**

---

## 3. FE applicant.service.ts — Removed `?id=` from getApplicant()

**File:** `src/app/applicant/applicant.service.ts`

**What changed:** `getApplicant(userId: string)` now calls `${this.applicantUrl}/profile` with no query param. Previously the method appended `?id=${userId}`.

**Contract safety:**  
BE route: `GET /applicant/profile` → `getApplicantProfileById` in `controllers/applicantsController.js` (line 218).  
Controller confirmed: it reads `const { uid } = req.user;` — uid derived from the verified Firebase JWT, not from `req.query.id`. This was already fixed in the BE (BOLA fix, comment at line 218–226). The FE change brings the client in sync with the server: the `?id=` param was already being ignored by the BE.

**IDOR closure check:** Confirmed clean:
- FE no longer sends `?id=<userId>`.
- BE derives uid from JWT only (`req.user.uid`).
- All applicant routes go through `verifyAuth` middleware.
- No other FE code in `applicant.service.ts` passes a uid as a query param to this endpoint.

**Unused parameter:** The `userId: string` parameter in `getApplicant(userId: string)` is still declared but now unused. This is harmless in TypeScript but is technical debt. Not a blocker.

**Call sites:** Callers pass their own userId from the auth state — deriving from JWT server-side produces the same result. No data mismatch possible.

**Verdict: PASS — GO**

---

## 4. FE Routing — Removed isMobileViewAllowed

**Files:** `app.routing.module.ts`, `auth.module.ts`, `auth.guard.ts`

**What changed:** `isMobileViewAllowed` annotations and query params removed. Grep across `get-hired-FE/src` returns zero matches — the token is completely absent from the codebase.

**Guard behavior check:**  
`auth.guard.ts` — Full file read. `checkUserLogin` reads from localStorage `'state'` key, calls `coreService.getRole()`, and routes based on `route.data.role`. The role-based routing (`'1'`/`'2'`/`'3'`) in `app.routing.module.ts` is unchanged. The `canActivate`, `canActivateChild`, `canDeactivate`, `canLoad` implementations are all present and unmodified.

`auth.module.ts` — All five auth routes (`signin`, `signup`, `reset-password`, `change-password`, `verify`) retain `canActivate: [UnauthGuard]`. No route lost its guard.

`app.routing.module.ts` — Role-based data (`role: '1'/'2'/'3'`) on `admin`, `recruiter`, `user` mount points is unchanged. The `isMobileViewAllowed` annotation was a data annotation on routes (not a guard class), used to conditionally show/hide a mobile-only view mode. Its removal means no guard decision was affected — it was UI metadata, not auth logic.

**Dead code removal safety:** PASS. No guard evaluated `isMobileViewAllowed` as a condition for allowing or denying access. Confirmed by zero grep matches in the guard files and no reference to it in `canActivate` implementations.

**Verdict: PASS — GO**

---

## 5. FE job-seeker-portal.component.html — 3 CTA buttons → `<a routerLink="/jobs">`

**File:** `src/app/public/job-seeker-portal/job-seeker-portal.component.html`

**What changed:** Three "Browse jobs" / "Browse all jobs" CTAs that previously used `<button (click)="goToJobs()">` or `(click)="goToJobs()"` are now `<a routerLink="/jobs">` anchor elements.

**Behavior check:**  
`goToJobs()` in the component (`job-seeker-portal.component.ts`, line 104) calls `this.router.navigateByUrl('/jobs')`. The `<a routerLink="/jobs">` produces identical navigation. Angular's `RouterLink` directive intercepts the click and calls the router — same destination, same SPA navigation, no full reload.

**SEO uplift:** Anchor elements with `href` (which `RouterLink` generates in the rendered DOM) are crawlable by Googlebot even without JS execution. Button click handlers are not. This is a net positive for SEO.

**Confirmed in template:**
- Line 123: `<a routerLink="/jobs" class="btn-link-cta">Browse jobs</a>` (in workspace section)
- Line 176: `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">Browse all jobs</a>` (fallback when no jobs)
- Line 180: `<a routerLink="/jobs" class="btn-link-cta">Browse all jobs</a>` (when jobs present)
- `createAccount()` and `goToSignin()` remain as `<button>` with click handlers — correct, as signup/signin are not public crawlable destinations.
- The CTA band `primaryClick` still calls `goToJobs()` via event binding — unchanged.

**Regression risk (minor):** One `<a routerLink="/jobs">` in the portal-cta-band at line 214 emits a `primaryClick` event through the child component — confirmed that path still calls `goToJobs()` which navigates to `/jobs`. No double-navigation risk (the `<a>` tag is inside a child component, the CTA band handles navigation via the event, not by following the anchor's href directly).

**Verdict: PASS — GO**

---

## 6. FE job-posts-details — Breadcrumb UI + Meta + jobError$ noindex

**Files:** `job-posts-details.component.html`, `job-posts-details.component.ts`

**What changed:**
- Visual breadcrumb `<nav aria-label="Breadcrumb">` added to the template (lines 15–20). Uses `routerLink="/home"` and `routerLink="/jobs"` — no new service calls.
- `JobStructuredDataService` injected and called via `this.structuredData.apply(job)` on successful job load.
- `jobError$` subscription added: on error, sets `robots: 'noindex'` via `this.meta.updateTag`.
- Both `normalizedJobSub` and `jobErrorSub` subscriptions are properly unsubscribed in `ngOnDestroy`.

**Behavior check:**
- The `details$` observable is unchanged — still reads from `this.jobFacade.getJobById$`.
- The `jobFacade.getJobById(this.jobId)` call in `ngOnInit` is unchanged.
- The `structuredData.remove()` call in `ngOnDestroy` cleans up JSON-LD — confirmed at line 168.
- The title reset in `ngOnDestroy` (line 172) restores the default site title.
- The breadcrumb renders inside the `*ngIf="details$ | async as selectedJobPost"` block — never shown when job is unavailable.
- The error state at lines 2–12 uses `*ngIf` with correct async pipe conditions: only shows when `jobError$` has a value AND `loading$` is false AND `details$` is null.

**noindex subscription correctness:**  
The `jobErrorSub` at lines 90–94 calls `this.meta.updateTag({ name: 'robots', content: 'noindex' })` when `err` is truthy. This correctly marks error/expired job pages as noindex. The error state template (`role="alert" aria-live="assertive"`) remains accessible.

**Contract safety:** No new API endpoints were introduced. `JobStructuredDataService` operates on data already fetched by the existing `normalizedJob$` pipeline.

**Memory leak check:** Both new subscriptions (`normalizedJobSub`, `jobErrorSub`) assigned to class properties and unsubscribed in `ngOnDestroy`. Pattern is consistent with existing `link$` and `currentUrl$` cleanup.

**Verdict: PASS — GO**

---

## 7. Auth Pages — noindex via SeoService

**Files checked:** `signup.component.ts`, `reset-password.component.ts`, `change-pw.component.ts`, `account-authentication.component.ts`

**What changed:** Each component's `ngOnInit` now calls:
```typescript
this.seoService.setPageMeta({
  title: '…',
  description: '…',
  robots: 'noindex, nofollow',
});
```

**Behavior check:**
- `SeoService` is injected via constructor in all four components — confirmed in file reads.
- `setPageMeta` with `robots: 'noindex, nofollow'` updates the `<meta name="robots">` tag. The `Title` service sets the page title.
- No canonical URL is passed — `setPageMeta` will call `clearCanonical()` when canonical is omitted (lines 113–115 of `seo.service.ts`). This is correct: auth pages should not have a canonical URL.
- Auth page functionality (form submission, password validation, Firebase calls, navigation on success/failure) is unchanged in all four components.
- `SeoService` injection does not break `UnauthGuard` behavior — the guard logic runs before the component is activated.

**Coverage of all auth pages:**
| Page | Component | noindex call | Verified |
|------|-----------|--------------|----------|
| /signup | SignupComponent | ngOnInit line 52 | YES |
| /reset-password | ResetPasswordComponent | ngOnInit line 37 | YES |
| /change-password | ChangePwComponent | ngOnInit line 43 | YES |
| /verify | AccountAuthenticationComponent | ngOnInit line 51 | YES |
| /signin | SigninComponent | Not checked — not listed in this deployment | N/A |

Note: `/signin` (`SigninComponent`) was not listed in the deployment spec. Its SEO state is not covered by this gate.

**Verdict: PASS — GO**

---

## Regression Risk Table

| Risk | Severity | Likelihood | Notes |
|------|----------|------------|-------|
| SSR spec failures (seo.service.spec.ts SSR block) | LOW | CERTAIN | Test expectations predate V4 intent; no production impact |
| Auth page functionality broken by SeoService inject | NONE | N/A | SeoService is stateless; constructor injection safe |
| isMobileViewAllowed removal breaks guard | NONE | N/A | Was UI metadata, not guard logic; 0 grep matches |
| `getApplicant` URL change breaks profile fetch | NONE | N/A | BE already read from JWT, not query param |
| CTA anchor vs button click regression | VERY LOW | LOW | RouterLink produces same navigation; no event difference |
| verifyAuth error body parse by FE consumers | NONE | N/A | FE gates on HTTP status code (403), not body text |

---

## Contract Safety

**verifyAuth.js:** HTTP 403 status preserved. Response body changed from object to string — no FE consumer parses the 403 body.

**applicant.service.ts `getApplicant`:** Endpoint path unchanged (`/applicant/profile`). Query param removed. BE was already ignoring it. No contract break.

**No new endpoints introduced.** All FE service methods in the diff call pre-existing routes. The contract matrix from `GETHIRED_TEST_RECENT_DEPLOYMENT_CONTRACT_MATRIX.md` is unaffected.

---

## False-Positive Test Check

**verifyAuth.js:** Could a 403 with a generic message mask a real auth bypass? No. The `next()` call is inside the `try` block and only executes on successful `verifyIdToken()` resolution. The catch block always sends 403 — there is no path where a bad token proceeds past the middleware.

**noindex on auth pages:** Could `noindex` cause a false-positive success signal? No. `noindex` prevents search engine indexing; it does not affect user access, form submission, or redirect logic. A page returning `noindex` is still fully functional for direct access.

**jobError$ noindex:** Could a transient network error on job fetch cause an unrecoverable noindex state? In theory a brief network error would set `noindex` on the page. However, the subscription fires per emission — a retry/re-fetch that succeeds would trigger `normalizedJobSub` to set `robots: 'index, follow'` again. If the user navigates away, `ngOnDestroy` runs and the component is torn down cleanly. No permanent sticky state.

---

## SSR Safety Summary

| Method | Uses `this.doc` | isBrowser guard | SSR behavior | Correct |
|--------|----------------|-----------------|--------------|---------|
| `setCanonical` | YES | NO | Runs on server via DOM stub | YES (intentional) |
| `clearCanonical` | YES | NO | Runs on server via DOM stub | YES |
| `setJsonLd` | YES | NO | Emits JSON-LD in SSR HTML | YES (V4 goal) |
| `clearJsonLd` | YES | NO | Runs on server via DOM stub | YES |
| `stripHtml` | Conditional | YES (`isBrowser`) | Uses regex on server | YES |
| `setPageMeta` | NO (Title/Meta services) | NO | Angular Title/Meta are SSR-safe | YES |

Angular Universal is confirmed present (`server.ts`, `main.server.ts`, `tsconfig.server.json`). The DOCUMENT token injection is the correct pattern for SSR-safe DOM access in Angular 13+.

**SSR spec gap:** The test assertions in the `SeoService (SSR / server platform)` describe block incorrectly assert that `setCanonical` will NOT call `document.querySelector` and that `setJsonLd` will NOT inject a script. These expectations were correct for V3 (when an `isBrowser` guard suppressed SSR execution). They are incorrect for V4. The spec should be updated to assert that SSR DOES run DOM operations via `this.doc` (using the injected DOCUMENT stub), consistent with the V4 intent. This is a spec maintenance issue, not a runtime defect.

---

## Security Regression Check

**verifyAuth.js — information leakage:** FIXED. Raw Firebase error objects are no longer sent in 403 responses. The generic `'Authentication failed.'` string and the already-existing `'Token Expired. Login again.'` for `auth/id-token-expired` are appropriate. No Firebase error codes, token identifiers, or internal state are exposed.

**Auth bypass risk from message change:** None. The authentication decision (`next()` vs `403`) is independent of the error message body.

**applicant.service.ts IDOR fix:** The removal of `?id=` closes the IDOR vector on the FE side. The BE fix (uid from JWT, not query param) was already in place. Both ends are now in sync. The dual fix creates defense-in-depth.

**No new endpoints or middleware introduced.** No new attack surface.

---

## Existing Test Coverage vs Changed Paths

| Changed path | Test file exists | Coverage |
|---|---|---|
| `middleware/verifyAuth.js` | NO | None |
| `core/services/seo.service.ts` | YES (`seo.service.spec.ts`) | Extensive (browser suite); SSR suite has spec-alignment gap |
| `applicant/applicant.service.ts` | NO | None |
| `app.routing.module.ts` | NO | None |
| `auth/auth.module.ts` | NO | None |
| `shared/guard/auth.guard.ts` | YES (`auth/admin.guard.spec.ts`, `applicant.guard.spec.ts`, `company.guard.spec.ts`) | Guards for sub-roles; `auth.guard.ts` itself not directly spec'd |
| `public/job-seeker-portal/` | NO | None |
| `jobs/job-posts-details/` | NO | None |
| `auth/signup/signup.component.ts` | NO | None |
| `auth/reset-password/reset-password.component.ts` | NO | None |
| `auth/change-pw/change-pw.component.ts` | NO | None |
| `auth/account-authentication/account-authentication.component.ts` | NO | None |

---

## Overall Release Gate Verdict

**GO WITH CAUTION**

All 7 changed files are behaviorally correct. No auth bypasses, no API contract breaks, no IDOR regressions, no memory leaks, no route guard regressions.

**One action required before next test run:**

The `SeoService (SSR / server platform)` describe block in `seo.service.spec.ts` (lines 482–526) has spec assertions that contradict the intentional V4 behavior. The SSR tests that assert `setCanonical` and `setJsonLd` are no-ops on the server will FAIL because the V4 implementation intentionally runs them via `this.doc`. Update those tests to reflect the new intent (DOM operations run via the Angular DOCUMENT stub on SSR) or they will cause CI failure on the next test run. This does not block the current deployment — it is a spec maintenance item.

**No runtime blockers found.**
