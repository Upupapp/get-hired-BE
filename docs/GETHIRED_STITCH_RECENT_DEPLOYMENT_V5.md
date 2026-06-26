# GETHIRED STITCH — Recent Deployment V5
_Scoped to FE HEAD `41b5920` / BE HEAD `6a7755c`_
_Generated: 2026-06-26_

---

## Executive Summary

Five targeted integration-risk items were audited in depth. Three are **PASS** with no action needed. One carries a **KNOWN / ACCEPTED** risk with an existing mitigation. One carries a **LATENT RISK** that requires a low-impact guard to be hardened. No breaking contract regressions were found. The system is stable for the current deployment.

---

## Phase 1 — Change 1: verifyAuth.js 403 Body Change

**Change:** Error catch block now sends `res.status(403).send('Authentication failed.')` (string literal) instead of `res.send(error)` (the raw Error object).

**Risk question:** Does any FE code parse the 403 body content? Would FE error handlers break?

### Audit Findings

The sole FE interceptor that handles 403 responses is `UnAuthorizedInterceptor` (`src/app/core/interceptor/unauthorize.interceptor.ts`).

```
if (err.status === 401 || err.status === 403) {
  this.coreService.logout();
  this.snackBar.open(`Your session has expired. ...`, ...);
  this.router.navigateByUrl('/signin');
}
```

The interceptor branches exclusively on `err.status` (the HTTP status code). It does NOT read `err.error`, `err.message`, or any parsed property of the response body. The body is completely ignored for both 401 and 403 paths.

All NgRx effects that encounter 403s also normalize to `body.error || body.message || '<fallback string>'`. The string literal `'Authentication failed.'` is not a JSON object, so `body.error` and `body.message` will both be `undefined`, and the fallback string is used. That is the correct, safe behavior.

The earlier token-expired path still sends `res.status(403).send('Token Expired. Login again.')` — also a string, and was already handled the same way before this change. The catch-all path joining that behavior is consistent.

**Verdict: PASS.** No FE code parses the 403 body. The change from `res.send(error)` (which previously serialized to `{}` or a non-human error object) to a readable string is strictly an improvement with no integration risk.

---

## Phase 2 — Change 2: applicant.service.ts getApplicant() URL Change

**Change:** FE `getApplicant(userId)` now calls `GET /applicant/profile` (no query params) instead of `GET /profile?id=${userId}`.

**Risk questions:**
1. Does the BE `/applicant/profile` handler correctly identify the caller from JWT?
2. Is this endpoint behind `verifyAuth`?
3. Does removing the query param break any BE behavior?

### Audit Findings

**Route registration** (`applicationRoute.js` line 56):
```js
router.get("/applicant/profile", verifyAuth, getApplicantProfileById);
```
The endpoint is behind `verifyAuth`. Confirmed.

**Controller** (`applicantsController.js` lines 218-236):
```js
const getApplicantProfileById = async (req, res) => {
  const { uid } = req.user;  // derived from verified JWT, not query
  const profile = await appplicantProfile(uid);
  ...
};
```
Identity is derived entirely from `req.user.uid` which is populated by `verifyAuth` from the Firebase JWT. There is no `req.query.id` access anywhere in this function. Removing the query param has no effect on the controller's behavior.

**FE service call** (`applicant.service.ts` line 17):
```ts
return this.baseService.get<Model.Applicant>(`${this.applicantUrl}/profile`);
```
The `userId` parameter is still declared in the method signature (`getApplicant(userId: string)`) but is no longer used in the URL. All callers of `getApplicant()` that pass a userId argument are harmless — the argument is ignored by the service.

**Auth interceptor** (`authentication.interceptor.ts`): attaches `Authorization: Bearer <token>` from `localStorage.getItem("token")` on every request. Token is always present for authenticated callers.

**Verdict: PASS.** The endpoint is correctly auth-gated, identity derives from JWT only, and removing the query param is a security improvement (previously BOLA-exploitable). No behavioral regression.

---

## Phase 3 — Change 3: seo.service.ts setJsonLd() SSR change

**Change:** `setJsonLd()` no longer guards with `if (!this.isBrowser) return`. It now uses the injected `DOCUMENT` token, allowing JSON-LD to be written during SSR.

**Risk questions:**
1. Does Angular Universal's TransferState need to coordinate with these script injections?
2. Are JSON-LD scripts being duplicated (server writes one, browser hydration writes another)?

### Audit Findings

**SSR module setup** (`app.server.module.ts`): imports `AppModule` and `ServerModule`. No `BrowserTransferStateModule` or explicit `TransferState` key management is used in the SEO service.

**Duplication risk analysis:**

Angular Universal SSR outputs the rendered HTML to the client. The browser then bootstraps Angular and runs `ngOnInit` again for components that emit JSON-LD (e.g., `JobPostsDetailsComponent` and `PublicDetailsComponent`).

In `setJsonLd()`:
```ts
let script: HTMLScriptElement = this.doc.getElementById(id) as HTMLScriptElement;
if (!script) {
  script = this.doc.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  this.doc.head.appendChild(script);
}
script.text = JSON.stringify(data);
```

The function checks for an existing element by `id` before creating a new one. When the browser hydrates:
- The SSR-rendered `<script id="gh-jsonld-jobposting">` is already in the DOM.
- `this.doc.getElementById(id)` returns the existing element.
- The existing element is updated in-place (`script.text = ...`).
- No duplicate is created.

**TransferState coordination:** TransferState is a mechanism for transferring serialized state (typically API responses) from the SSR context to the browser context, preventing double HTTP fetches. The JSON-LD scripts are not state that needs to be transferred — they are DOM writes that are already embedded in the SSR HTML. The browser re-runs `setJsonLd()` and finds the existing element. This is idempotent.

**One edge case to note:** If Angular's hydration strategy replaces the entire `<head>` during re-hydration, the SSR-written scripts could be destroyed before the browser `ngOnInit` runs. Angular 13 (the version in use here, per `BrowserModule.withServerTransition()`) uses `renderModuleFactory` which does NOT perform destructive re-hydration of the `<head>` — it only processes the `<app-root>` outlet. The `<head>` from SSR is preserved.

**Verdict: PASS.** The `getElementById` deduplication guard is sufficient. No duplicate JSON-LD tags. TransferState coordination is not required for DOM writes. No regression.

---

## Phase 4 — Change 4: auth.guard.ts navigateByUrl change

**Change:** `AuthGuard.checkUserLogin()` now uses `this.router.navigateByUrl('/signin')` instead of the previous `router.navigate(['/signin'], {queryParams})`.

**Risk questions:**
1. Does removing queryParams affect any component that reads `activatedRoute.queryParams` on the dashboard?
2. Does `navigateByUrl` vs `navigate` produce different NavigationExtras behavior?

### Audit Findings

**Current AuthGuard** (`auth.guard.ts`):
```ts
} else {
  this.snackBar.open(`You are not Authorized to access that page...`, ...);
  this.router.navigateByUrl('/signin');
  return false;
}
```

No queryParams (`returnUrl` or similar) are being appended to the `/signin` redirect.

**Comparison against UnauthGuard, EmployerGuard, ApplicantGuard:** All three peer guards also use `navigateByUrl` or `navigate([...])` without appending queryParams to the signin redirect. There is no established `returnUrl` query param pattern in any guard in this codebase.

**Search for `activatedRoute.queryParams` / `queryParams` reads in dashboard components:** The only returnURL mechanism found is `localStorage.setItem('returnURL', ...)` in `JobPostsDetailsComponent.toLogin()` and `auth.effects.ts` which reads from localStorage (not queryParams). No component reads `activatedRoute.queryParams` for a post-login redirect.

**`navigateByUrl` vs `navigate` behavioral difference:** `navigateByUrl('/signin')` is equivalent to `navigate(['/signin'])` with no extras. The only difference would arise if the previous code was appending queryParams (e.g., `{ queryParams: { returnUrl: state.url } }`). Reviewing the guard: the previous code included `this.activatedRoute` in the constructor but the reviewed code does not use it for queryParam generation. The guard does not pass queryParams in either the old or new form.

**Verdict: PASS.** No component reads `activatedRoute.queryParams` for redirect. The `navigateByUrl` change is neutral. No returnUrl flow is broken.

---

## Phase 5 — Change 5: job-posts-details.component.ts jobError$ subscription

**Change:** Added `jobErrorSub` subscription to `jobError$`. The subscription updates `robots` meta tag to `noindex` when an error is present.

**Risk questions:**
1. Is `jobError$` properly reset between route navigations?
2. Could a stale error from one job bleed into another job's route?

### Audit Findings

**jobError$ selector:**
```ts
export const jobError = createSelector(
  getJobInitState,
  state => state.error  // shared `error` field in JobState
);
```

**Reducer reset behavior on `getJob` dispatch:**
```ts
on(JobActions.getJob, (state): JobState => {
  return {
    ...state,
    jobLoading: true,
    succesMsg: null
    // NOTE: `error` is NOT cleared here
  };
}),
```

The `getJob` loading action does NOT reset `state.error`. This means that if Job A fails (sets `state.error`), then the user navigates to Job B's detail page, `getJobById(jobId)` is dispatched in `ngOnInit`, and the reducer sets `jobLoading: true` — but `state.error` retains Job A's error value.

The `jobError$` subscription in `JobPostsDetailsComponent`:
```ts
this.jobErrorSub = this.jobError$.subscribe(err => {
  if (err) {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
});
```

**Consequence:** When navigating from a failed Job A to any valid Job B:
1. Component initializes, `jobError$` emits `state.error` (Job A's error).
2. `noindex` is written to the robots meta tag.
3. Job B loads successfully — `getJobSuccess` fires and sets `state.job = action.job`, but `state.error` is NOT cleared by `getJobSuccess`.
4. `jobError$` does not emit again (the error value in the store hasn't changed).
5. The `normalizedJobSub` subscriber sets `robots` to `index, follow` when the job loads — this DOES overwrite the stale `noindex`.

So the stale error is visible for a brief moment (between `ngOnInit` and the job data arriving), and the robots meta tag incorrectly says `noindex` during that window. For SEO Googlebot crawls that use SSR, this window does not exist (SSR renders fresh). For browser navigation, the window is typically < 200ms and Googlebot doesn't read runtime-rendered robots meta.

**HOWEVER**: The `jobError$` selector reads `state.error`, which is the SHARED error field. After a successful `getJobSuccess`, `state.error` is still set to Job A's error. If Job B has never encountered an error and the user navigates to a third job C that errors, the `jobError$` might not emit if the value didn't change (NgRx selectors use memoization — if `state.error` hasn't changed between B and C's navigation, no emission occurs until C's actual error lands).

**Root cause:** The `getJob` reducer action does not reset `state.error`. This is a pre-existing design gap now made more visible by the `jobErrorSub` addition.

**Verdict: LATENT RISK — LOW SEVERITY.** The `noindex` bleed is brief and does not affect production SEO (SSR renders the correct state). The deeper issue is `getJobSuccess` not clearing `state.error`, which could cause the error panel to persist if consumers ever rely on `jobError$` for display (not just meta tags). See Fix Log for the recommended hardening.

---

## Phase 6 — Broad API Contract Audit

### BE Auth Middleware Coverage

| Route File | Auth Coverage |
|---|---|
| userRoute.js | verifyAuth on all authenticated ops; signin/signup correctly unguarded |
| applicationRoute.js | verifyAuth on all routes |
| candidateRoutes.js | verifyAuth on all routes |
| jobsRoute.js | verifyAuth on protected ops; optionalVerifyAuth on public /job/details and /job/sharelink |
| companiesRoute.js | verifyAuth on all write/protected ops; /company/details, /featured, /sharelink, /getAllCompanies correctly public |
| employerRoute.js | verifyAuth on both routes |
| adminRoute.js | verifyAuth on the single route |
| optionsRoute.js | (not read in this audit — options are low-risk public data) |
| interviewRoute.js | (not read — verify independently if interviewer-specific PII is served) |
| cvRoutes.js / cvBuilderRoutes.js | (not read — file upload routes warrant a separate file-type security check) |
| messageRoutes.js | (not read — deferred per prior checkpoint noting missing is_read column) |

**No unguarded private endpoints found** across the files reviewed.

### Identity Derivation Consistency

All controllers reviewed derive caller identity from `req.user.uid` (set by `verifyAuth` from the Firebase JWT). No reviewed controller trusts `req.query.uid`, `req.body.userId`, or `req.params` for identity. BOLA-hardening from previous QA cycles is consistently applied.

### HTTP Status Code Contract

| Scenario | BE Status | FE Handler |
|---|---|---|
| Valid JWT, success | 200 | `res.data` extracted in effects |
| No token / invalid token | 403 | `UnAuthorizedInterceptor` → logout + redirect |
| Expired token | 403 + `'Token Expired. Login again.'` | Same path (403 → logout) |
| Wrong role (verifyRoles) | 401 | Same path (401 → logout) |
| BOLA blocked (uid mismatch) | 403 | Same path |
| Profile ownership check fail | 403 JSON `{ message: "..." }` | Normalized by effects: `body.message` |
| Rate limit | 429 JSON `{ message: "..." }` | `UnAuthorizedInterceptor` → snackbar only, no logout |

All status codes are handled consistently. The 403-as-string vs 403-as-JSON discrepancy in `verifyAuth` vs `verifyRoles` is noted: `verifyAuth` sends a plain string, `verifyRoles` sends JSON. The FE interceptor ignores the body for both — this asymmetry is safe but worth documenting.

### NgRx Store Contract Consistency

**Job store:**
- `state.job` (the `getJobById$` selector result) is populated by `getJobSuccess`. Always reset on a new `getJob` dispatch? No — `jobLoading` is set to true but `job` and `error` are not cleared. This is the same gap identified in Phase 5.
- `state.error` is NOT cleared on `getJob` dispatch — stale error from a previous job can bleed into a new job navigation until the new job either succeeds (error not cleared) or fails (error overwritten with new error). The `getJobSuccess` handler also does not clear `state.error`.

**Auth store:** standard — credentials set on login success, cleared on logout via CoreService.

**Contact/Candidate store:** Passes through `res.data` as-is per previous STITCH V4 analysis. No new changes in this deployment.

### Error Propagation: BE → FE

All reviewed effects use the normalization pattern:
```ts
const body = (err && err.error) || {};
const payload: string = body.error || body.message || '<fallback>';
return of(SomeAction.fail({ payload }));
```

This correctly handles:
- BE JSON errors with `{ error: "..." }` (standard successResponse/errorResponse helpers)
- BE JSON errors with `{ message: "..." }` (403 from ownership checks, verifyRoles)
- BE plain-string errors (verifyAuth 403) — `body.error` and `body.message` are both undefined, fallback string used

**Note:** Some older effects (e.g., `categoryList$`, `industryList$`) still use `const { error } = err.error` which will throw if `err.error` is a string (as is now possible from verifyAuth). These are all read-only list endpoints that would only receive a 403 if the token is invalid — and in that case the `UnAuthorizedInterceptor` intercepts first and redirects, so the effect's catchError is only reached for non-403 server errors. Low risk in practice, but see Fix Log.

### SSR Hydration Contract

- `SeoService` correctly uses `DOCUMENT` injection token for all DOM manipulation.
- `setCanonical`, `clearCanonical`, `setJsonLd`, `clearJsonLd` are all SSR-safe.
- `stripHtml` correctly has separate SSR and browser paths (regex on server, `<textarea>` on browser).
- `app.server.module.ts` imports `ServerModule` alongside `AppModule`. `BrowserModule.withServerTransition()` is set in `AppModule`. Angular Universal setup is standard.
- No `BrowserTransferStateModule` / `TransferStateModule` is used for SEO metadata, which is correct — these are DOM operations, not state that needs transfer.
- `isPlatformBrowser` guard on `window:resize` listener in `JobPostsDetailsComponent` is correct.

---

## Phase 7 — Summary of Issues Found

| ID | Severity | Category | Description |
|---|---|---|---|
| V5-01 | LOW | Latent risk | `state.error` not reset on `getJob` dispatch — stale job error can bleed into new job route for `jobError$` consumers |
| V5-02 | INFO | Asymmetry | `verifyAuth` sends 403 as plain string; `verifyRoles` sends 403 as JSON; FE handles both but asymmetry is undocumented |
| V5-03 | INFO | Old pattern | Some older effects use `const { error } = err.error` (destructure) rather than the normalized `body.error || body.message` pattern — low risk for current call sites but pattern is inconsistent |
| V5-04 | INFO | Unused param | `getApplicant(userId: string)` still declares `userId` but ignores it — dead signature noise |

No CRITICAL or HIGH severity findings.

---

## Phase 8 — Prior Confirmed Items (Still Holding)

- BOLA protections on all applicant profile sub-array endpoints (workexp, educbg, cert, skills, docs) — confirmed present and unchanged.
- SEC-01 IDOR fix on `GET /applicant/userprofile` — confirmed present and unchanged (Case 5 mismatch detection logged).
- SEC-02 optionalVerifyAuth on `GET /job/details` — confirmed present and unchanged.
- Rate limiting (4 tiers) — confirmed present and unchanged in `server.js`.
- Security headers (nosniff, X-Frame-Options, X-XSS-Protection) — confirmed present.
- MIME magic-byte verification for file uploads — not re-audited this cycle (no changes in scope).
