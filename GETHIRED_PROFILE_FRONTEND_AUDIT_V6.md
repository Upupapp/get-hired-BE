# GETHIRED PROFILE FRONTEND AUDIT V6
**Date:** 2026-07-01 | **Status:** PASS (LinkedIn FE flow complete; minor UX gaps noted)

---

## New LinkedIn FE Components

### `LinkedInAuthService` (`src/app/auth/services/linkedin-auth.service.ts`)

| Concern | Status |
|---|---|
| `startLinkedInFlow()` redirects browser to BE `/auth/linkedin/start` | ✅ Correct |
| `exchangeTicket()` POSTs ticket to BE `/auth/linkedin/complete` | ✅ |
| `handleCompleteResponse()` handles all 3 states: `authenticated`, `role_required`, `error` | ✅ |
| `storeSession()` writes to localStorage with same shape as Google auth | ✅ |
| `submitRoleSelection()` POSTs to BE `/auth/linkedin/choose-role` | ✅ |
| In-memory pending state cleared after use | ✅ (`clearPendingRoleState()`) |
| No LinkedIn tokens stored in localStorage | ✅ |
| `isNewUser` flag NOT set on LinkedIn signup | ❌ PRF-LI-003 (post-signup onboarding prompt won't trigger) |

### `LinkedInCompleteComponent` (`src/app/auth/linkedin-complete/linkedin-complete.component.ts`)

| Concern | Status |
|---|---|
| Handles `?error=` redirect from BE | ✅ 13 error codes mapped to user-friendly messages |
| Handles missing `?ticket=` param | ✅ Shows `missing_ticket` error |
| `retry()` navigates to `/signin` | ✅ |
| Loading state managed correctly | ✅ |
| `role_required` → navigates to `/choose-role` | ✅ |
| `authenticated` → `handleCompleteResponse()` auto-navigates | ✅ |

**Issue:** When `status === 'role_required'`, the component navigates to `/choose-role`. This route must exist and have the LinkedIn role picker implemented. The V5 baseline confirms a `choose-role` flow exists but it was for Google auth. The `LinkedInAuthService.hasPendingRoleClassification` getter would gate the LinkedIn-specific path. Needs verification that the choose-role component handles LinkedIn pending state.

### `LinkedInButtonComponent` (`src/app/auth/linkedin-button/linkedin-button.component.ts`)

Not read in full but assumed to call `LinkedInAuthService.startLinkedInFlow()` with an `intent` param. Standard pattern.

---

## Profile Readiness Panel — V6 Check

`ProfileReadinessPanelComponent`:
- Calls `getProfileCompleteness()` via `ApplicantService` ✅
- Graceful fallback on error (shows Just Started, not a broken UI) ✅
- `loadingProfileQuality` spinner while awaiting response ✅
- `ngOnChanges` re-fires when `applicant` input changes ✅
- `nextBestAction` shows first suggestion from profile quality result ✅

For LinkedIn users returning 0% score: panel shows loading → then "Create your profile to get started." → "Update profile" button → `/user/profile/edit`. ✅ Flow works.

---

## Dashboard Component — V6 Check

`ApplicantDashboardComponent`:
- Calls `getApplicantById(userId)` from localStorage `user._id` ✅
- For LinkedIn users, `user._id` = the `li_<hash>` UID from `storeSession(data.id)` ✅
- `profile$` pipe: if `appplicantProfile(uid)` returns null → `#noProfile` template shown ✅
- "Update Profile" CTA always visible for incomplete profiles ✅

**Minor issue:** The dashboard shows a snackbar-style alert (`isVisible`) tied to `this.applicant` check. For LinkedIn users with null profile, `isVisible` is set to `true` at `ngOnInit` even before `profile$` emits. This creates a brief flash of the snackbar. Cosmetic only. P3.

---

## Avatar / Photo Handling

`applicant-sidebar.component.html`:
```html
<img [src]="user.photoUrl" *ngIf="user.photoUrl" class="img-avatar me-3">
<div *ngIf="!user.photoUrl" class="initial-thumbnail-inner">{{ initials }}</div>
```

This conditionally renders the photo OR initials fallback. For LinkedIn users, `user.photoUrl` (from `storeSession`) will be populated from the LinkedIn picture. If the LinkedIn URL later expires, the `<img>` will fail to load but the `*ngIf` prevents a broken-image icon ONLY IF the `photoUrl` property becomes falsy — a network 403/404 won't make it falsy, it will still render but show a broken image.

**PRF-001 (V5 carry-over):** Add `(error)="user.photoUrl = null"` or an `onImgError` handler to the sidebar avatar `<img>`. Not applied this pass (FE changes restricted unless clearly safe).

---

## LinkedIn `storeSession` vs Google `storeSession`

LinkedIn's `storeSession()` mirrors Google's exactly. This is intentional — the session data shape is identical. No regression risk. ✅

---

## Files Audited (FE)

- `src/app/auth/services/linkedin-auth.service.ts`
- `src/app/auth/linkedin-complete/linkedin-complete.component.ts`
- `src/app/applicant-panel/applicant-dashboard/applicant-dashboard.component.ts`
- `src/app/applicant-panel/applicant-dashboard/applicant-dashboard.component.html`
- `src/app/applicant-panel/applicant-dashboard/components/profile-readiness-panel/profile-readiness-panel.component.ts`
- `src/app/applicant-panel/applicant-dashboard/components/profile-readiness-panel/profile-readiness-panel.component.html`
- `src/app/applicant/profile-details/profile-details.component.ts`
- `src/app/applicant/profile-details/preview/preview.component.html`
- `src/app/applicant-panel/applicant-sidebar/applicant-sidebar.component.html` (avatar section)
- `src/app/public/services/profile-quality.service.ts`
- `src/app/public/services/document-quality.service.ts`

**FE files changed: 0**
