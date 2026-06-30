# GETHIRED_GOOGLE_AUTH_CV_MATCH_CONTINUATION_V1

## CV Doctor / CV Coach Pending State

The CV Doctor (CV Coach) feature uses a per-service localStorage key to track anonymous CV Doctor sessions. After Google sign-in, the authenticated user should be able to resume their CV Doctor session.

## Current Implementation

`RoleClassificationComponent` does not currently check for CV Doctor pending intent (the schema for anonymous CV Doctor temporary storage was flagged as missing in earlier SWEEP reports — see todo_master.md).

## Storage Pattern (when implemented)

```ts
// Set at CV Doctor gate for unauthenticated user:
localStorage.setItem('gh_pending_cv_session', sessionToken);

// RoleClassificationComponent detection (to add when CV Doctor is fully wired):
this.hasCvDoctorIntent = !!localStorage.getItem('gh_pending_cv_session');
```

## Post-Auth Continuation

After Google sign-in (job seeker path):
1. `returnURL` set to CV Doctor page
2. `storeSession()` navigates to returnURL
3. CV Doctor page reads `gh_pending_cv_session` and resumes the session

## Current Status

CV Doctor anonymous storage is a known gap (flagged in todo_master.md as a blocker). This Google auth implementation does not block on CV Doctor — it adds the infrastructure (hasCvDoctorIntent detection point) that will be wired when CV Doctor storage is implemented.

The MATCH engine and PROFILE features use different continuation patterns and are documented separately in the PROFILE/CVCOACH/MATCH checkpoint memory.
