# GETHIRED SEC-02 — Frontend Patch Log

**Date:** 2026-06-25

---

## File 1: `src/app/job/job.service.ts` — `getJobById()`

**Reason:** Frontend read uid from localStorage and appended it as `?uid=` query param. Any user modifying localStorage could spoof the uid.

**Before:**
```typescript
getJobById(jobId: string) {
  const user = localStorage.getItem('user');
  const uid = user ? JSON.parse(user)._id : null;
  return this.baseService.get<Model.Job[]>(`${this.jobUrl}/details?id=${jobId}&uid=${uid}`);
}
```

**After:**
```typescript
getJobById(jobId: string) {
  // SEC-02 FIX: uid query param removed. Auth interceptor sends Firebase
  // token as Authorization Bearer. Backend derives viewerContext from token.
  return this.baseService.get<Model.Job[]>(`${this.jobUrl}/details?id=${jobId}`);
}
```

**Security impact:** Frontend no longer sends any caller-supplied user identifier. The `AuthInterceptor` already adds `Authorization: Bearer <token>` to all requests when a token is in localStorage. The backend now uses that token exclusively.

**Compatibility impact:** None — the `isApplied` field continues to work for authenticated users because the backend uses the token instead of the uid query param. Anonymous users continue to get `isApplied: false`.

**Consumers of getJobById:** 8 components all go through `JobFacade.getJobById()` → `JobEffects.getJob$` → `JobService.getJobById()`. All are fixed by this single service change:
- `public-details.component.ts`
- `job-posts-details.component.ts`
- `employer-job-dashboard.component.ts`
- `job-applicants.component.ts`
- `job-view.component.ts`
- `job-create.component.ts`
- `jobs-facade.ts`
- `job.effects.ts`

---

## File 2: `src/app/jobs/job-posts-details/job-posts-details.component.html`

**Reason:** Error state did not distinguish between "job unavailable" and "session required" (SEC-02 403 response). Generic "This job isn't available" copy would confuse users who get a 403 due to BOLA probe detection.

**Change:** Updated error state template to detect the SEC-02 403 message and show appropriate copy + Sign In link:
- Default: "This job isn't available / It may have expired..."
- SEC-02 403: "Session required / We couldn't load this job for your current session. Please sign in again." + Sign In button

**Compatibility impact:** Additive UI change. Existing "job unavailable" error behavior unchanged.

---

## File 3: `src/app/jobs/job-posts-details/job-posts-details.component.scss`

**Reason:** SEC-02 command requires haptics/effects on all touched frontend surfaces.

**Added:**
- `@import "src/assets/styles/motion"` — motion tokens
- `@keyframes gh-job-detail-reveal` — content fade+slide reveal
- `@keyframes gh-applied-chip-reveal` — applied chip scale reveal
- `@keyframes gh-error-banner-reveal` — error/session banner fade+slide
- `@keyframes gh-skeleton-shimmer` — loading skeleton shimmer utility
- `.btn-apply-now:active` — tap compression with `$gh-scale-press` token
- `.btn-apply-now:focus-visible` — keyboard focus ring with brand color
- `@media (prefers-reduced-motion: reduce)` — suppresses all animations
