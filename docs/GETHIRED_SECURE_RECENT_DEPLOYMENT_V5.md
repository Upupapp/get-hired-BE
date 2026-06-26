# GETHIRED_SECURE_RECENT_DEPLOYMENT_V5.md

**Audit date:** 2026-06-26
**BE HEAD:** 6a7755c  |  **FE HEAD:** 41b5920
**Scope:** 5 targeted change sets + broad continuity verification of prior P0/P1 fixes

---

## Executive Summary

No new P0 security vulnerabilities introduced by this deployment. Four of the five
targeted changes are clean. One finding (SEC-V5-01) is a low-severity informational
gap in the `jobError$` / `normalizedJob$` interaction on route re-use — it cannot
leak data but creates a noindex flicker window. No fixes are required to unblock
ship. Two prior open items (Firebase key in git history; P1 PayMongo secret ops
check) remain open but unchanged.

---

## Change-by-Change Analysis

### Change 1 — `middleware/verifyAuth.js`: error message hardening

**Status: PASS — clean**

The change replaced `res.status(403).send(error)` (which serialized the raw
Firebase error object, potentially exposing internal error codes, stack frames, or
token-structure hints) with the static string `'Authentication failed.'`.

Verification:
- Token is verified at line 30 via `firebaseAdmin.auth().verifyIdToken(idToken)`
  before any error branch is reached. The 403 on an absent/malformed token (lines
  9-25) is an early-exit guard — it fires before `verifyIdToken` is called, which
  is correct: no verification is skipped.
- The expired-token branch (line 35-37) still returns `'Token Expired. Login again.'`
  separately and correctly.
- No auth bypass introduced. The only change is what the catch block returns to the
  caller — the verification logic is untouched.
- The new message reveals nothing about internal token structure or Firebase error
  codes to a potential attacker.

**Finding:** None.

---

### Change 2 — `seo.service.ts`: DOCUMENT token + sameAs removal

**Status: PASS — clean, with one clarification**

**DOCUMENT token swap:** Using Angular's injected `DOCUMENT` token instead of the
bare `document` global is strictly safer for SSR: the bare global throws on the
server under Angular Universal because `globalThis.document` is not defined.
`this.doc` resolves to the server-side DOM stub, which is controlled and scoped.
No new XSS surface introduced.

**`sameAs: []` removal from `setOrganizationJsonLd()`:** Removing an empty array
field from JSON-LD has no security impact. An empty `sameAs` had no attack surface
anyway; its removal is a quality improvement only.

**`stripHtml()` in SSR context:**

The SSR path (line 411-413 of `seo.service.ts`):
```ts
return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
```
This result is placed into `script.text = JSON.stringify(data)` — a JSON-encoded
`<script type="application/ld+json">` block. The critical question is whether any
attacker-controlled content can escape the JSON encoding.

- `JSON.stringify()` escapes all double-quotes, backslashes, and control characters.
  The only vector that could escape JSON is a literal `</script>` sequence in the
  job description, which would close the script block early.
- The regex `/<[^>]*>/g` removes all HTML tag-like patterns from the input.
  A `</script>` tag in the job description would match `<[^>]*>` and be stripped
  to ` ` before `JSON.stringify` is applied. This is safe.
- **Edge case:** a malformed tag with a newline inside — e.g. `</scr\nipt>` — would
  NOT match `<[^>]*>` because `.` does not cross newlines. However, such a string
  would survive as literal text inside the JSON value, which is harmless: it would
  appear as the string `</scr\nipt>` encoded as `"<\/scr\\nipt>"` by
  `JSON.stringify`, which does not produce a closing script tag.
- The browser path uses `<textarea>.innerHTML` which is a safe parser boundary
  (confirmed in prior SECURE-V3 audit).

**Finding:** SSR stripHtml is safe for all realistic inputs. No change required.

---

### Change 3 — `applicant.service.ts`: `getApplicant()` URL change

**Status: PASS — clean, IDOR fully closed**

The FE change removes `?id=${userId}` from the `GET /applicant/profile` call.

**BE verification confirms identity derivation:**

File: `controllers/applicantsController.js`, function `getApplicantProfileById` (line 218):
```js
const { uid } = req.user;  // JWT-derived, set by verifyAuth middleware
```
The function ignores `req.query` entirely. The route is mounted with `verifyAuth`
at `routes/applicationRoute.js` line 56:
```js
router.get("/applicant/profile", verifyAuth, getApplicantProfileById);
```
There is no fallback to `req.query.id`. If the FE had passed an `id` param previously,
the BE was already ignoring it (the BOLA fix was applied to the BE in a prior sprint).
The FE change is therefore a cleanup that matches what the BE already enforces.

**No regression:** the FE `userId` param was unused by the BE; removing it cannot
cause a different user's profile to be returned.

**Finding:** None. IDOR on this endpoint is closed at both layers.

---

### Change 4 — `auth.guard.ts`: `navigateByUrl` instead of `navigate` with queryParams

**Status: PASS — no access-control impact**

The change:
```ts
// Before:
this.router.navigate(['/admin/dashboard'], {queryParams: {isMobileViewAllowed: false}})
// After:
this.router.navigateByUrl('/admin/dashboard')
```

Verification of `isMobileViewAllowed` usage:

A repo-wide search for `isMobileViewAllowed` in `src/` returned zero matches.
It is referenced only in:
- `GETHIRED_OPEN_BACKLOG.md` (tagged as dead code, no guard reads it)
- `GETHIRED_SEO_ROUTE_SURFACE_AUDIT_V4.md` (notes it as dead code annotation)

The `AuthGuard.checkUserLogin()` function makes access decisions solely based on:
1. `localStorage.getItem('state') == 'true'` — authenticated/not
2. `route.data.role.indexOf(userRole) === -1` — role match

No guard anywhere reads `queryParams.isMobileViewAllowed`. Removing it from the
navigation call has no access-control effect. The change simplifies the code without
any security regression.

**Finding:** None. Dead query param safely removed.

---

### Change 5 — `job-posts-details.component.ts`: `meta.updateTag` noindex on jobError$

**Status: LOW — informational finding, no fix required to ship**

The component sets two competing robots directives via subscriptions:

```ts
// On job load success:
this.normalizedJobSub = this.normalizedJob$.subscribe(job => {
  if (job) {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    // ...
  }
});

// On job load error:
this.jobErrorSub = this.jobError$.subscribe(err => {
  if (err) {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
});
```

**Reset on navigation:**

`ngOnDestroy()` calls `this.structuredData.remove()` and resets the title.
However, it does NOT explicitly reset `robots` to `index, follow`.
`SeoService.resetToDefaults()` sets `robots: 'index, follow'` but it is not called
from `ngOnDestroy`.

**Race condition / stale noindex:**

If a user navigates from a 404-error job page to a valid job page in the same
Angular SPA session, the sequence could be:

1. Job-A (invalid): `jobError$` emits → noindex set
2. User navigates to Job-B (valid)
3. `ngOnDestroy` of Job-A fires: no robots reset
4. New component loads for Job-B
5. `normalizedJob$` emits for Job-B → `index, follow` is set

In practice the `index, follow` on step 5 corrects the stale noindex.
However there is a brief window (between step 3 and step 5) where Job-B's initial
SSR or partial render may carry noindex. For Googlebot, which typically crawls SSR
output, this is not an issue because noindex is set client-side via Angular Meta
(not in SSR output, unless SSR renders the error page for that URL).

**Attacker enumeration via robots meta tag:**

An attacker could probe job IDs by observing the rendered `robots` meta tag:
- Valid job ID → `<meta name="robots" content="index, follow">`
- Invalid job ID → `<meta name="robots" content="noindex">`

This is a low-severity information disclosure. Job IDs are already implicit in the
URL path (`/jobs/details/:id`), and returning a 200 with an error message for
invalid IDs already signals the same. The robots difference adds marginal information
but does not expose private data. Bots could only enumerate which IDs exist — not
any user data.

**Finding SEC-V5-01 (LOW):** Stale noindex possible on fast same-SPA navigation;
job ID existence enumerable via robots meta. Neither blocks ship. Recommend:
- In `ngOnDestroy`, call `this.meta.updateTag({ name: 'robots', content: 'index, follow' })` to reset.
- Alternatively, call `this.seoService.resetToDefaults()` if SeoService is injectable here.

---

## Continuity Checks — Prior P0/P1 Fixes

### BOLA/IDOR Fixes (SEC-01/02/07)

**Status: HOLDING**

`applicantsController.js` `getApplicantProfileById` (line 218-236): derives uid
from `req.user` (JWT), ignores `req.query`. Confirmed no `req.query.id` path.

`getUserProfile` (line 249-277): explicit mismatch check — if `req.query.id` is
supplied and differs from `tokenUid`, logs a security event and returns 403.
This defence-in-depth check is still in place.

`createApplication`, `deleteApplication`, `updateApplication` in `applicantsController.js`:
all derive `candidateId` from `req.user.uid`. No body-supplied identity trust.

`createJobs` in `jobsController.js` (lines 79-86): `companyId` derived from
`getUserCompany(uid)` — JWT-derived. `company_id` scoping confirmed in UPDATE/DELETE
WHERE clauses at lines 221-226, 251-262, 384-408. BOLA closures intact.

### PayMongo HMAC Signature Verification

**Status: HOLDING**

`paymentController.js` lines 58-100: `verifyPaymongoSignature()` is defined and
called as the first action in `paymongoWebhook()`. If verification fails, returns
400 and logs a warning. Timing-safe comparison (`crypto.timingSafeEqual`) still
present. Replay protection (5-minute window) still present. No changes to this
function detected.

### CORS

**Status: HOLDING**

`server.js` line 90: `app.use(cors({ origin: env.app_url }))` — unchanged.
No wildcard origin. No secondary CORS middleware added.

### 4-Tier Rate Limiter

**Status: HOLDING**

`server.js` lines 44-127: all four tiers (globalLimiter, authLimiter, writeLimiter,
sensitiveLimiter) present and mounted in the same positions. The `writeLimiter.skip`
exception for `/payment/paymongowebhook` is still in place (line 73).

### Security Headers (nosniff, X-Frame-Options)

**Status: HOLDING**

`server.js` lines 105-110: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `X-XSS-Protection: 0` all still applied before route
mounting.

### Firebase Key in Git History

**Status: STILL OPEN (P0)**

Not introduced by this deployment. Tracked in `GETHIRED_SECRET_INCIDENT_REPORT.md`.
Requires a credential rotation + git history rewrite. This cannot be fixed by
code changes alone — it is an ops/infra action.

---

## New Attack Surface Review

### Breadcrumb anchor XSS via job title

Template line 19 of `job-posts-details.component.html`:
```html
<li class="gh-breadcrumb-item--current" aria-current="page">{{ selectedJobPost?.jobTitle }}</li>
```
Angular's `{{ }}` interpolation automatically HTML-encodes the value. A job title
containing `<script>` or `"><img onerror=...>` would be rendered as escaped text.
No `[innerHTML]` binding is used. XSS via breadcrumb is not possible.

The banner uses `{{selectedJobPost?.jobTitle}}` at line 27 — same encoding guarantee.
The `<title>` is set via `this.titleService.setTitle(...)` which also encodes.

**Finding:** No XSS via breadcrumb or banner job title. Angular's template engine
provides safe defaults here.

### Job ID enumeration via noindex robots meta

Covered under SEC-V5-01 above. Low severity.

---

## Summary Table

| ID | Item | Severity | Status |
|----|------|----------|--------|
| CHG-1 | verifyAuth error message hardening | — | PASS |
| CHG-2 | SEO service DOCUMENT token swap + sameAs removal | — | PASS |
| CHG-3 | getApplicant() URL; BE IDOR closure | — | PASS |
| CHG-4 | auth.guard navigateByUrl; isMobileViewAllowed removal | — | PASS |
| CHG-5 | jobError$ noindex / robots meta | — | PASS (see SEC-V5-01) |
| SEC-V5-01 | Stale noindex on fast nav; job ID enumerable via robots | LOW | Open (non-blocking) |
| SEC-01/02/07 | BOLA/IDOR fixes | — | HOLDING |
| PayMongo HMAC | Signature verification | — | HOLDING |
| CORS | Origin scoping | — | HOLDING |
| Rate limiter | 4-tier rate limiting | — | HOLDING |
| Headers | Security response headers | — | HOLDING |
| P0-GIT | Firebase key in git history | P0 | Still open, no change |
