# GETHIRED_OPTIMIZE_DO_NOT_TOUCH_RECENT_3
## Do Not Touch — OPTIMIZE Round 3
Date: 2026-06-26

Items that must NOT be changed during optimization passes.

---

## NEVER CHANGE

### seo.service.ts — DOCUMENT token injection pattern
The use of `@Inject(DOCUMENT) private doc: Document` is intentional and correct. Do NOT replace with bare `document` global. The DOCUMENT token is what makes JSON-LD, canonical tags, and og tags appear in the SSR-rendered HTML that Googlebot crawls.

### job-posts-details.component.ts — @Optional() @Inject(RESPONSE)
The `@Optional()` decorator is mandatory. Without it, the component crashes in the browser (no RESPONSE provider). Do NOT remove `@Optional()` or change the injection to a required `@Inject(RESPONSE)`.

### job-posts-details.component.ts — isPlatformServer guard on response.status(404)
The `isPlatformServer(this.platformId)` check before `this.response.status(404)` is mandatory. Without it, `this.response` is null in the browser and calling `.status()` on null throws. Do NOT remove this guard.

### seo.service.ts — setJsonLd() id-based replace pattern
`this.doc.getElementById(id)` is used before `createElement('script')` to prevent duplicate script tags on navigation. Do NOT change this to `appendChild` without the getElementById check.

### BE controllers — companyId from JWT (BOLA guards)
In contactsController.js and candidateController.js, `companyId` is always derived from `getUserCompany(req.user.uid)`. Do NOT add req.body.companyId as a fallback. This is a deliberate BOLA security fix (QA8 FIX-7 / QA10 FIX-5).

### BE controllers — no `?.` or `??` operators
esm v3.2.25 cannot parse optional chaining (`?.`) or nullish coalescing (`??`) in BE source files. Do NOT introduce these operators in any `.js` file in `get-hired-BE/`. Use explicit `=== null || === undefined` checks or ternary operators instead.

### server.js — rate limiter tiers
The 4-tier rate limiter configuration was carefully designed with specific limits per endpoint type. Do NOT change limits without load testing. Do NOT remove the `sensitiveEndpoints` tier.

---

## DO NOT OPTIMIZE THESE (verified clean, change would add risk)

### job-posts-list.component.ts — trackByJobId returning job?.jobId
The `job?.jobId` expression uses optional chaining — fine in FE TypeScript (transpiled before delivery). Do NOT change to `job.jobId` (would throw on null) or `job && job.jobId` (overly defensive). The current form is correct.

### public/components/banner/banner.component.ts — sessionStorage.setItem in findJobs()
The `sessionStorage.setItem('job-search', ...)` in `findJobs()` is inside a user action handler (button click) — it is browser-only by definition. Do NOT add an `isPlatformBrowser` guard to this call; it would add unnecessary complexity.

### public-details.component.ts — @HostListener window:resize
The `window.innerWidth` read inside `@HostListener('window:resize')` is browser-only (Angular Universal does not fire DOM events on the server). Do NOT add an `isPlatformBrowser` guard inside @HostListener. It would be defensive but adds noise with no benefit.

### seo.service.ts — stripHtml isBrowser check
The `if (!this.isBrowser)` branch uses regex stripping on the server, while the browser path uses `textarea.innerHTML`. The regex path is intentional for SSR security (no DOM parsing on server). Do NOT unify these paths to a single implementation.

### asyncLocalStorage in public-search.component.ts
The async wrapper around localStorage is a legacy pattern from before platform guards existed. It is retained for backward compatibility with the `getUserRole()` await. Do NOT refactor to direct localStorage calls without re-auditing all callers.
