# GETHIRED PROFILE APPLY INTEGRATION V6
**Date:** 2026-07-01 | **Status:** WIRED (no gating on profile completeness)

---

## Apply Flow Overview

The application flow does NOT gate on profile completeness. A LinkedIn user with 0% completeness can submit a job application immediately. This is by design — low friction over high-quality filtering.

---

## Application Snapshot Pattern

At application time, `applicationSnapshotService.js` captures a point-in-time snapshot of the applicant's profile. This snapshot is stored and used for recruiter review, decoupling the application data from future profile edits.

For LinkedIn users with no `applicants_profile` row:
- Snapshot will contain empty/null profile fields
- `firstname`/`lastname` from `users` table may still be included (depends on snapshot JOIN logic)
- Application can be submitted but the snapshot quality will be low

---

## Profile Documents in Apply Flow

Two components handle document selection during application:
- `src/app/application/application-process/steps/profile-documents/profile-documents.component.ts`
- `src/app/views/home/pages/job-post-details-apply/steps/profile-documents/profile-documents.component.ts`

These read from the applicant's `documents[]` array. For LinkedIn users on first login, `documents[]` is empty → document selector shows empty state → user must upload before applying.

---

## Profile Preview in Apply Flow

`src/app/views/home/pages/job-post-details-apply/steps/profile-preview/profile-preview.component.ts` shows the applicant a preview of how their profile looks to recruiters. For LinkedIn users with 0% completeness, this will show an empty profile preview — potentially discouraging them from submitting. This could be a conversion friction point.

---

## Recommendation

Add a "Profile incomplete" warning with a "Complete before applying" CTA in the apply flow when `profileQuality.score < 30`. This is a P2 improvement, not a blocker.

---

## No Changes

No changes to apply integration in V6. Flow is functional for LinkedIn users.
