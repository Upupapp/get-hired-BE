# GETHIRED STITCH V5 — Fix Log
_Scoped to FE HEAD `41b5920` / BE HEAD `6a7755c`_
_Generated: 2026-06-26_

---

## Summary

No CRITICAL or HIGH severity issues were found. Two LOW/INFO items have recommended fixes. This log records both the findings and the recommended remediation; no production-breaking changes are required before deploying the current HEAD.

---

## FIX-V5-01 — Clear state.error on getJob dispatch (LOW)

**Finding:** The `getJob` reducer action sets `jobLoading: true` but does not reset `state.error`. If the user navigates from a job that produced an error (e.g., expired or deleted) to a new valid job, `jobError$` emits the stale error immediately on the new component's `ngOnInit`, briefly marking the robots meta as `noindex`. When the new job loads successfully, `normalizedJobSub` sets robots back to `index, follow` — but `state.error` is never cleared by `getJobSuccess` either.

**Risk:** Low for SEO (SSR renders are unaffected; browser robots meta flickers for < 200ms). Low for UX (no error UI is displayed — only a meta tag changes). Medium for future consumers: any new component that gates display on `jobError$` will show a stale error panel.

**Recommended fix (FE, `job.reducer.ts`):**

In the `getJob` on-handler, add `error: null` to the returned state:

```ts
on(JobActions.getJob, (state): JobState => {
  return {
    ...state,
    jobLoading: true,
    succesMsg: null,
    error: null   // <-- ADD THIS LINE
  };
}),
```

Optionally also clear in `getJobSuccess` for belt-and-suspenders:

```ts
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: null,
    error: null   // <-- ADD THIS LINE
  };
}),
```

**Files:** `get-hired-FE/src/app/job/state/job.reducer.ts`

**Status:** NOT YET APPLIED. Recommended for next maintenance sprint. Not a blocker for current deployment.

---

## FIX-V5-02 — Harden old effects to use normalized error extraction (INFO)

**Finding:** Several older NgRx effects use the destructuring pattern `const { error } = err.error` instead of the normalized pattern `const body = (err && err.error) || {}; const payload = body.error || body.message || '<fallback>'`. If `err.error` is a string (as can happen when `verifyAuth` returns a 403 plain-string body), the destructuring throws a TypeError, which is caught by RxJS and terminates the effect stream.

**Affected effects in `job.effects.ts`:**
- `categoryList$` (line ~192): `catchError((err) => { const { error } = err.error; ... })`
- `industryList$` (line ~210): same pattern
- `badgeList$` (line ~228): same pattern
- `jobRoleList$` (line ~246): same pattern
- `setupList$` (line ~264): same pattern
- `typeList$` (line ~282): same pattern
- `levelList$` (line ~300): same pattern
- `getJobApplicants$` (line ~344): same pattern
- `getJobApplicantDetails$` (line ~358): same pattern
- `updateJobInterviewQuestions$` (line ~381): same pattern
- `deleteJobInterviewQuestions$` (line ~400): same pattern

**Practical risk:** These endpoints are all behind `verifyAuth`. A 403 response would only occur if the token is truly invalid, in which case `UnAuthorizedInterceptor` intercepts the error first and routes the user to `/signin` — the effect's `catchError` never executes for 403s in practice. The risk is theoretical but the inconsistency is a maintenance hazard.

**Recommended fix:** Replace the destructuring pattern with the normalized extraction in each affected catchError:

```ts
// Replace:
catchError((err) => {
  const { error } = err.error;
  return of(JobActions.someActionFail({ payload: error }))
})

// With:
catchError((err) => {
  const body = (err && err.error) || {};
  const payload: string = body.error || body.message || 'Unable to load data. Please try again.';
  return of(JobActions.someActionFail({ payload }))
})
```

**Files:** `get-hired-FE/src/app/job/state/job.effects.ts`

**Status:** NOT YET APPLIED. Low priority. Recommended for a cleanup sprint.

---

## FIX-V5-03 — Remove unused userId parameter from getApplicant() (INFO)

**Finding:** `ApplicantService.getApplicant(userId: string)` declares a `userId` parameter that is no longer used in the URL (URL is now `/applicant/profile` with no query params). The parameter is dead code.

**Recommended fix:** Remove the parameter from the method signature and update all call sites.

```ts
// Before:
getApplicant(userId: string) {
  return this.baseService.get<Model.Applicant>(`${this.applicantUrl}/profile`);
}

// After:
getApplicant() {
  return this.baseService.get<Model.Applicant>(`${this.applicantUrl}/profile`);
}
```

**Files:** `get-hired-FE/src/app/applicant/applicant.service.ts` + all callers (search for `.getApplicant(`)

**Status:** NOT YET APPLIED. Cosmetic cleanup only. Does not affect runtime behavior.

---

## Items CONFIRMED PASSING — No Fix Needed

| Item | Verdict |
|---|---|
| verifyAuth 403 body string vs object | PASS — FE ignores body, branches on status only |
| GET /applicant/profile JWT identity derivation | PASS — uid from req.user, no query param |
| setJsonLd() SSR + browser deduplication | PASS — getElementById guard prevents duplicates |
| auth.guard.ts navigateByUrl vs navigate | PASS — no returnUrl queryParam pattern in use |
| All reviewed route files auth coverage | PASS — no unguarded private endpoints found |
| BOLA protections on profile sub-arrays | PASS — all confirmed present |
| Rate limiting (4 tiers) | PASS — present in server.js |
| Security headers (nosniff, X-Frame-Options) | PASS — present in server.js |
