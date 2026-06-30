# GETHIRED_GOOGLE_AUTH_JOB_APPLY_CONTINUATION_V1

## Problem
A job seeker clicks "Apply" on a job listing. They are not logged in. They're shown a sign-in gate. They choose "Continue with Google". After auth, they should land back on the job application flow.

## Current Implementation

### `gh_pending_apply_job_id` Pattern
When an unauthenticated user attempts to apply, the job detail page sets:
```js
localStorage.setItem('gh_pending_apply_job_id', jobId);
```

This key survives the Google auth flow (localStorage is not cleared during auth).

### RoleClassificationComponent Detection
```ts
this.hasJobApplyIntent = !!localStorage.getItem('gh_pending_apply_job_id');
```

If `hasJobApplyIntent`, the Job Seeker card gets a "RECOMMENDED" badge.

### Post-Auth Routing (Job Seeker)
```ts
// In GoogleAuthService.storeSession():
const redirect = localStorage.getItem('returnURL');
if (redirect) {
  this.router.navigateByUrl(redirect);
} else {
  this.router.navigate(['/user/dashboard']);
}
```

If `returnURL` was also set (pointing to the job page), user lands directly on the job application page.

## Recommended Pattern (Backlog)

Set both `gh_pending_apply_job_id` AND `returnURL` at the Apply gate:
```ts
localStorage.setItem('gh_pending_apply_job_id', jobId);
localStorage.setItem('returnURL', `/jobs/${jobId}/apply`);
```

The job application page then reads `gh_pending_apply_job_id` to pre-fill/resume the application.

## Current Limitation

As of this implementation, `gh_pending_apply_job_id` consumption after Google auth is wired at the detection layer (role classification badge) but the consuming page (job application) must be verified to read and clear the key. This is a pre-existing pattern — Google auth doesn't change the consumption behavior, only adds detection for the role classification badge.
