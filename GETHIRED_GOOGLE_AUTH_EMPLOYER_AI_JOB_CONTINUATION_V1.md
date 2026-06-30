# GETHIRED_GOOGLE_AUTH_EMPLOYER_AI_JOB_CONTINUATION_V1

## Problem
An anonymous user generates a job preview via AI Job Create panel. They see the gate card. They choose to sign in with Google. The preview draft (identified by `previewToken`) must not be lost.

## Solution

### Token Preservation
Before ANY Google auth interaction is started from the gate card:
```ts
if (this.previewData && this.previewData.previewToken) {
  this.previewService.savePendingToken(this.previewData.previewToken);
}
```
`savePendingToken()` stores the token in `localStorage` as `gh_preview_token`. This happens BEFORE `exchangeGoogleToken()` is called, ensuring the token survives navigation or page reload.

### Path A: Existing Google User
1. Google auth completes → `status: 'authenticated'`
2. `storeSession()` navigates employer to `/recruiter/dashboard` or `/recruiter/company`
3. Those pages read `gh_preview_token` from localStorage and claim the draft automatically

### Path B: New Google User (role classification)
1. `previewToken` saved to localStorage before auth
2. Google auth returns `role_required`
3. Navigate to `/auth/choose-role`
4. RoleClassificationComponent shows "You have an employer draft saved" hint (if `hasEmployerDraft` is true)
5. User selects Employer role → `chooseRole` completes → `storeSession()` navigates to `/recruiter/company`
6. Company setup page / employer onboarding reads `gh_preview_token` and claims the draft

### Path C: User selects Job Seeker (not employer)
1. `window.confirm()` warning: "You generated a job post — are you sure you want to continue as a Job Seeker? Your draft will expire."
2. If confirmed → role selection proceeds as job seeker
3. Draft expires naturally (30-minute TTL on anonymous preview token)

---

## Security
- `previewToken` is opaque server-side token, not job data
- Token cannot be replayed across accounts (BE validates ownership when claiming)
- Token saved before auth means no race condition (localStorage write is synchronous)

## Files
- `ai-job-preview-panel.component.ts`: `onGoogleCredential()` saves token first
- `role-classification.component.ts`: reads `hasEmployerDraft` from `jobPreviewService.hasPendingToken()`
- `public-job-preview.service.ts`: `savePendingToken()`, `hasPendingToken()` (existing)
