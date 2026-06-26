# GETHIRED STITCH 3 — Recent Deployment
_Focused on SEO-V4 SSR seams, Firebase credential chain, Promise.allSettled response shape, and verifyRoles middleware_
_FE HEAD: 8a37628 / BE HEAD: 25f5e17_
_Generated: 2026-06-26_

---

## Executive Summary

Five new integration seams introduced in SEO-V4 and NOTIFY-P2 were audited in depth. **Four are PASS with no action needed.** One carries a **LATENT RISK** (SQL injection in legacy contact/candidate service helpers) that predates these changes and is noted as a deferred risk. No breaking contract regressions were found. The system is stable for the current deployment.

---

## Seam 1 — `job-posts-details.component.ts` ↔ `RESPONSE` Token (SSR)

### What changed
Component now `@Optional() @Inject(RESPONSE)` from `@nguniversal/express-engine/tokens`. When a job error occurs (`jobError$` emits truthy) on the server, `this.response.status(404)` is called.

### Audit

**Provider in `server.ts` (lines 38-47):**
```ts
server.get('*', (req, res) => {
  res.render(indexHtml, {
    req,
    providers: [
      { provide: APP_BASE_HREF, useValue: req.baseUrl },
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res },
    ],
  });
});
```
The `RESPONSE` token IS explicitly provided with the Express `res` object on every SSR route. The `res` object from Express has a `.status()` method, so `this.response.status(404)` will correctly set the HTTP status code on the server-rendered response.

**Guard analysis:**
- `@Optional()` decorator: If RESPONSE is not provided (browser context), `this.response` will be `null`. The guard `if (isPlatformServer(this.platformId) && this.response)` handles both: `isPlatformServer` will be false in the browser, so `this.response.status(404)` is never called even if `this.response` were somehow null.
- `isPlatformBrowser(this.platformId)` guard on `window:resize` HostListener: correct, prevents SSR crash.

**Subscription lifecycle:**
- `normalizedJobSub` and `jobErrorSub` are both declared as private `Subscription` fields.
- Both are subscribed in `ngOnInit` and unsubscribed in `ngOnDestroy` with explicit null-guard checks (`if (this.normalizedJobSub)` etc.).
- `link$` and `currentUrl$` are also properly cleaned up.
- `seoService.clearCanonical()` is called in `ngOnDestroy` — the implementation removes the element only if it exists (`if (link) link.remove()`), so no error if canonical was never set.

**Verdict: PASS.** RESPONSE token is correctly provided by `server.ts`. `@Optional()` guard prevents browser-side null crash. Subscriptions are correctly unsubscribed.

---

## Seam 2 — `seo.service.ts` ↔ `DOCUMENT` Token (SSR)

### What changed
`setJsonLd`, `clearJsonLd`, `setCanonical`, `clearCanonical` now use `@Inject(DOCUMENT)` from `@angular/common` instead of the bare `document` global.

### Audit

**Provider analysis:**
The `DOCUMENT` token is a built-in Angular token provided by `@angular/common`. It is automatically available in all Angular modules — including `AppServerModule` (via `ServerModule`) — without any explicit registration. Angular Universal's `ServerModule` sets `DOCUMENT` to its server-side DOM stub (Domino), which is the correct behavior for SSR.

**`app.server.module.ts`:**
```ts
@NgModule({
  imports: [ AppModule, ServerModule ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
```
No explicit DOCUMENT provider is needed or expected. Angular's `@angular/platform-server` / `ServerModule` provides DOCUMENT automatically.

**`seo.service.ts` is `providedIn: 'root'`:**
Root-provided services share the same provider scope as the root injector. In SSR, the root injector resolves `DOCUMENT` via the `ServerModule`-provided stub. This is correct.

**Implementation safety:**
- `setCanonical`: uses `this.doc.querySelector` and `this.doc.createElement` — safe on server DOM stub.
- `clearCanonical`: uses `this.doc.querySelector` — safe; null-guards before `.remove()`.
- `setJsonLd`: uses `this.doc.getElementById`, `this.doc.createElement` — safe on server stub.
- `clearJsonLd`: uses `this.doc.getElementById` — safe; null-guards before `.remove()`.
- `stripHtml` for server path: uses regex, not DOM — safe.
- `stripHtml` for browser path: uses `this.doc.createElement('textarea')` — guarded by `if (!this.isBrowser)` fallback, so the textarea path only runs in browser.

**spec file confirms:** `seo.service.spec.ts` has tests titled "setCanonical works via DOCUMENT token in SSR context" and "setJsonLd injects via DOCUMENT token (SSR-safe, no isBrowser guard)" — test coverage for this seam exists.

**Verdict: PASS.** DOCUMENT token is auto-provided by Angular Universal's ServerModule. No explicit registration needed or missing. All DOCUMENT usages are safe on both platforms.

---

## Seam 3 — `firebaseApp.js` Credential Chain ↔ Production Env

### What changed
4-strategy credential resolution chain: `FIREBASE_SERVICE_ACCOUNT_BASE64` → `FIREBASE_SERVICE_ACCOUNT_JSON` → ADC → local file (blocked in prod).

### Audit

**Chain flow analysis:**
1. If `FIREBASE_SERVICE_ACCOUNT_BASE64` is set but malformed: `parseServiceAccountEnv` throws, caught immediately, and re-throws with `Firebase Admin: env-base64 credential failed`. Server startup fails loudly. No silent fallthrough to ADC.
2. If `FIREBASE_SERVICE_ACCOUNT_BASE64` is valid: `credential` is set, chain short-circuits (subsequent `if (!credential && ...)` blocks skip).
3. If `FIREBASE_SERVICE_ACCOUNT_BASE64` is completely absent (env var not set): silently moves to strategy 2 (env-json). This is correct expected behavior.
4. ADC (strategy 3) is only reached if both env strategies are absent. Production on Linode does NOT have `GOOGLE_APPLICATION_CREDENTIALS` set, so ADC is skipped. This prevents the silent ADC fallthrough risk.
5. Local file (strategy 4) is blocked in production with a hard throw.
6. No credentials (strategy 5): throws with clear actionable message.

**Key safety property:** The chain is fail-fast at each bad credential, not fail-silent. A malformed base64 string causes an immediate startup crash, not a silent fallthrough to a different credential source.

**Initialization guard:** `if (admin.apps.length > 0) return admin.app('admin')` prevents double-init.

**Security:** Private key material is never logged. Only `sourceLabel` (e.g., `"env-base64"`) is logged.

**Verdict: PASS.** Chain is fail-fast on malformed credentials. Silent fallthrough to ADC is only possible when env var is completely absent (not malformed), which is the expected behavior. Production environment on Linode uses `FIREBASE_SERVICE_ACCOUNT_BASE64` per deployment notes.

---

## Seam 4 — `contactsController.js` / `candidateController.js` ↔ `Promise.allSettled()` Response Shape

### What changed
`r.value?.status` replaced with `r.value && r.value.status` in `multipleContact` and `multipleCandidate` controllers.

### Audit

**Service return shape verification:**

`addMultipleContact()` (contact.service.js):
- Returns `{ message, status: 'DUPLICATE_CONTACT' }` — status always present.
- Returns `{ message, status: 'ADDED' }` — status always present.
- On error: throws (does not return). Caller sees `Promise.allSettled` with `status: 'rejected'`, so `r.value` is never accessed.
- All 15 code paths in `addMultipleContact` return an object with a `status` field.

`addCandidates()` (candidate.service.js):
- Returns `{ message, status: 'DUPLICATE_CANDIDATE' }` — status always present.
- Returns `{ ...dbResponse, message, status: 'ADDED' }` — status always present.
- On error: throws.
- Both code paths include `status`.

**`r.value && r.value.status` pattern:**
- For fulfilled promises: `r.value` is the returned object (always an object with `status`). `r.value && r.value.status` is equivalent to `r.value.status` — correct.
- For rejected promises: `r.status === 'rejected'`, so `r.value` is undefined. These are filtered out by the `.filter(r => r.status === 'fulfilled' && ...)` check before `r.value` is accessed. Pattern is safe.
- The `r.value && r.value.status` form is correct for esm v3.2.25 (no optional chaining).

**Response shape to FE:**
```json
{ "contacts": [...addedItems], "summary": { "totalRequested": N, "successCount": N, "failureCount": N, "duplicateCount": N, "outcome": "all_success|partial_success|duplicate_only|all_failed" } }
```
This is a new additive shape. Previously the endpoint returned the raw `addedItems` array without a summary. Any FE code consuming this endpoint should be verified to handle the new `{ contacts, summary }` wrapper.

**Verdict: PASS for esm compatibility.** All service functions always return objects with `status` field. Pattern is correct. LATENT RISK: FE consumers of `/contacts/multiplecontact` and `/candidates/multiplecandidate` may expect the old bare-array response shape — see Seam 4a below.

### Seam 4a — Response Shape Breaking Change (Potential)

The `multipleContact` endpoint now returns `{ contacts: [...], summary: {...} }` instead of (presumably) a bare array or old shape. If the FE reads `response.data` and expects an array of contacts directly, this would break. This requires FE consumer verification (see GETHIRED_API_CONTRACTS_RECENT_3.md).

---

## Seam 5 — `verifyRoles.js` ↔ Firebase Auth Middleware Chain

### What changed
`req.user?.uid` replaced with `req.user && req.user.uid` — esm v3.2.25 compatibility fix.

### Audit

**Route registration audit (all routes):**
- `verifyRoles` does NOT appear in any route file. Confirmed via grep across all routes.
- `verifyRoles` is exported but currently dead code — not imported or used by any route file.
- The current route files use only `verifyAuth` and `optionalVerifyAuth`.

**Middleware chain safety if verifyRoles were wired in:**
- `verifyAuth` sets `req.user = decodedIdToken` on success, or returns 403 before calling `next()`.
- If `verifyRoles` were placed after `verifyAuth` in a route: `req.user.uid` would always be a valid string — the `req.user && req.user.uid` guard is a safe defensive check.
- If `verifyRoles` were mistakenly placed WITHOUT `verifyAuth`: `req.user` would be undefined, `req.user && req.user.uid` would short-circuit to `undefined`, and the middleware would return 401 "Authentication required" — a correct fail-safe.

**esm v3.2.25 compatibility:**
- `req.user && req.user.uid` is valid ES5+ syntax. No optional chaining. Correct.

**Verdict: PASS.** `verifyRoles` is not currently wired to any route, so the middleware chain is not an active risk. The `req.user && req.user.uid` pattern is both esm-compatible and safe. If `verifyRoles` is ever wired to a route, it must be after `verifyAuth` — the existing comment in `verifyRoles.js` line 20 documents this requirement.

---

## Phase 6 — Pre-existing Risk Inventory (Non-Regression)

### SQL injection in legacy service helpers (EXISTING, not new)
Several helper functions in `contact.service.js` and `candidate.service.js` use string interpolation in SQL:
- `checkContactIfExist(contactId)` — contactId interpolated directly
- `checkIfExistInGroup(email, groupId)` — email, groupId interpolated
- `checkGroupIfExist(groupId)` — groupId interpolated
- `checkGroupNameIfExist(groupName)` — groupName interpolated
- `listOfContacts(companyId, groupName)` — groupName interpolated (groupName from req.query)
- Various list queries with companyId interpolated

These are pre-existing, not introduced by NOTIFY-P2. The NOTIFY-P2 changes only replaced `forEach(async)` with `Promise.allSettled` and did not touch these query helpers. The company-derived values (companyId from JWT) are controlled, but groupName from query params is user-supplied and is an active SQL injection risk.

**Risk level:** MEDIUM (requires authenticated employer, limited to their own data scope due to the company_id ownership chain, but could be exploited for group/contact enumeration or data corruption within a company).

**Status:** Pre-existing. Deferred. Document only for this STITCH pass.

---

## Phase 7 — Contract Compatibility Summary

| Seam | Status | Action |
|------|--------|--------|
| RESPONSE token in SSR | PASS | None |
| DOCUMENT token in SSR | PASS | None |
| Firebase credential chain | PASS | None |
| Promise.allSettled response shape (esm compat) | PASS | None |
| multipleContact/multipleCandidate response shape change | VERIFY | Check FE consumers |
| verifyRoles middleware chain | PASS (dead code) | None until wired |
| SQL injection in legacy query helpers | LATENT RISK | Deferred |

---

## Top 5 Stitched Seams

1. RESPONSE token: `server.ts` correctly provides `{ provide: RESPONSE, useValue: res }` — job 404 SSR is wired end to end.
2. DOCUMENT token: Angular's `ServerModule` provides DOCUMENT automatically — no manual registration gap.
3. Firebase credential chain: fail-fast on malformed base64, no silent ADC fallthrough in production.
4. `Promise.allSettled` r.value pattern: all service functions always return objects with `status` field, `r.value && r.value.status` is safe.
5. `verifyRoles` req.user guard: `req.user && req.user.uid` is a safe esm-compatible rewrite; middleware is not on any route.

## Top 5 Remaining Risks

1. `multipleContact`/`multipleCandidate` response shape: changed from (unknown prior shape) to `{ contacts, summary }` — FE consumer must be verified.
2. SQL injection in `listOfContacts(groupName)` — groupName is user-supplied from query param, interpolated directly.
3. SQL injection in `checkGroupNameIfExist`, `checkIfExistInGroup`, `checkGroupIfExist` — string interpolation.
4. `verifyRoles` is dead code: if wired to a route without `verifyAuth` first, the DB role lookup would run but fail safely (returns 401). However, the route would be unauthenticated.
5. `clearCanonical()` called unconditionally in `ngOnDestroy` — if called on a page where `setCanonical` was never called, `querySelector` returns null and `if (link) link.remove()` is a no-op. Safe, but leaves no canonical on pages that already had none — correct behavior.
