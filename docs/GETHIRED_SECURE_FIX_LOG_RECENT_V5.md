# GETHIRED_SECURE_FIX_LOG_RECENT_V5.md

**Audit date:** 2026-06-26
**BE HEAD:** 6a7755c  |  **FE HEAD:** 41b5920

---

## Fixes Applied This Cycle

None. No code changes were required by this security audit.

All five targeted changes were reviewed and found to be correct and safe.
The one finding (SEC-V5-01) is non-blocking and its fix is deferred to the next
available sprint.

---

## Deferred Fix: SEC-V5-01

**File:** `get-hired-FE/src/app/jobs/job-posts-details/job-posts-details.component.ts`
**Severity:** LOW
**Effort:** 1 line

**Problem:** `ngOnDestroy()` does not reset the robots meta tag. On fast SPA
navigation from an error job page to a valid job page, there is a brief window
where the valid page carries a stale `noindex` directive from the previous route.
Also, job ID existence is weakly enumerable by reading the robots meta tag.

**Recommended fix — add to `ngOnDestroy()`:**
```ts
// Reset robots to the safe default so the next page doesn't inherit noindex.
this.meta.updateTag({ name: 'robots', content: 'index, follow' });
```

Or, if SeoService is injectable into this component:
```ts
this.seoService.resetToDefaults();
```

**Not a blocking fix:** The `normalizedJob$` subscription for valid jobs already
resets robots to `index, follow` when the job loads. The stale window is transient
and invisible to Googlebot (which crawls SSR output, not SPA navigations).

---

## Continuity — No Regressions Detected

The following prior security fixes were verified to still be in place:

| Fix | Location | Verified |
|-----|----------|---------|
| BOLA: getApplicantProfileById uses req.user.uid | applicantsController.js:218 | Yes |
| BOLA: getUserProfile UID mismatch blocked + logged | applicantsController.js:255 | Yes |
| BOLA: createApplication candidateId from JWT | applicantsController.js:34 | Yes |
| BOLA: deleteApplication candidateId from JWT | applicantsController.js:66 | Yes |
| BOLA: createJobs companyId from getUserCompany(uid) | jobsController.js:82 | Yes |
| BOLA: deleteJob WHERE company_id=$2 | jobsController.js:221-226 | Yes |
| BOLA: updateJob WHERE company_id=$20 | jobsController.js:251-262 | Yes |
| BOLA: profile sub-arrays (workexp/educ/cert/skills/docs) ownership check | applicantsController.js:317-519 | Yes |
| PayMongo HMAC: verifyPaymongoSignature called before event processing | paymentController.js:97 | Yes |
| PayMongo replay: 5-minute timestamp window | paymentController.js:75 | Yes |
| PayMongo timing-safe compare | paymentController.js:90 | Yes |
| CORS: cors({ origin: env.app_url }) | server.js:90 | Yes |
| Rate limiter: globalLimiter applied at app level | server.js:115 | Yes |
| Rate limiter: authLimiter on /api/auth | server.js:118 | Yes |
| Rate limiter: writeLimiter on /api (method-skip GET/HEAD/OPTIONS) | server.js:121 | Yes |
| Rate limiter: sensitiveLimiter on changepassword/archive/getpwresetlink | server.js:124-126 | Yes |
| Security headers: nosniff, X-Frame-Options:DENY, X-XSS-Protection:0 | server.js:105-110 | Yes |
| candidateRoutes: verifyAuth on all 6 routes | candidateRoutes.js:12-19 | Yes |
| applicationRoute: verifyAuth on all applicant routes | applicationRoute.js:34-63 | Yes |
