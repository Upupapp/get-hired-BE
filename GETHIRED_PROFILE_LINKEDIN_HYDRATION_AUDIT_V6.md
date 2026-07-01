# GETHIRED PROFILE — LinkedIn Hydration Audit V6
**Date:** 2026-07-01 | **Command:** PROFILE V6 | **Status:** PARTIAL (P1 gap confirmed)

---

## Executive Summary

When an applicant signs in via LinkedIn for the first time, the backend writes to `users` and `user_credentials` tables (name, email, photo_url) but does NOT create a row in `applicants_profile`. The profile completeness score therefore returns **0% immediately after first LinkedIn login** for job-seeker role. This is a P1 UX gap: the applicant expects their LinkedIn name to pre-populate and their profile to start building — instead they see an empty shell.

---

## What LinkedIn Auth Actually Writes

### `createLinkedinUser()` — called on first signup (lines 337–371 of `linkedinAuthController.js`)

| Table | Fields written | Source |
|---|---|---|
| `gethired.user_credentials` | `uid`, `email`, `password` (dummy hash), `role`, `created_date` | LinkedIn userinfo email + derived UID |
| `gethired.users` | `uid`, `email`, `firstname`, `lastname`, `photo_url` | LinkedIn `given_name`, `family_name`, `picture` |
| `gethired.auth_identities` | `user_uid`, `provider`, `provider_subject`, `provider_email`, `provider_email_verified`, `provider_name`, `provider_picture`, `linked_at`, `last_login_at` | Full LinkedIn identity |

### What is NOT written

| Table | Status | Impact |
|---|---|---|
| `gethired.applicants_profile` | NOT created | Profile completeness = 0%; `getApplicantProfileById` returns null |
| `applicant_skills` | NOT created | Skills section empty |
| `work_experience` | NOT created | Experience section empty |
| `educational_background` | NOT created | Education section empty |

---

## Flow Analysis

### New LinkedIn jobseeker (intent=jobseeker or after choose-role)

```
linkedinCallback → createLinkedinUser(role=3)
  → INSERT users (email, firstname, lastname, photo_url)  ✅
  → INSERT user_credentials (uid, email, role=3)          ✅
  → INSERT auth_identities (linkedin identity)            ✅
  → [NO INSERT into applicants_profile]                   ❌
```

After login, `ApplicantService.getApplicantById()` calls `appplicantProfile(uid)` which JOINs on `applicants_profile`. If no row exists, the JOIN returns null → profile is treated as completely empty → completeness score = 0%.

### Contrast: Google auth (from V5 baseline)

Google's `chooseRole` controller also writes to `users` and `user_credentials`, and does NOT create `applicants_profile` either. This was flagged in V5 as the same P1 gap. LinkedIn has the identical issue.

### Contrast: Email+password signup

Email+password new users also have no `applicants_profile` stub created at signup. The user must manually fill out the profile form to trigger `createApplicationProfile()` in `applicant.service.js`.

---

## LinkedIn-Specific Data Available for Pre-Population

From `ui` (LinkedIn userinfo response), the following data is available:
- `ui.given_name` → `firstName` (written to `users.firstname`) ✅
- `ui.family_name` → `lastName` (written to `users.lastname`) ✅
- `ui.picture` → `photoUrl` (written to `users.photo_url`) ✅
- `ui.email` → written to `users.email` and `user_credentials.email` ✅
- `ui.name` → stored in `auth_identities.provider_name` ✅

**None of this data is copied into `applicants_profile`** — because `applicants_profile` is never created on LinkedIn signup.

---

## Completeness Score After LinkedIn First Login

| Field | Available? | In applicants_profile? | Score contribution |
|---|---|---|---|
| `jobTitle` | No | No row | 0 |
| `shortBio` | No | No row | 0 |
| `contactNumber` | No | No row | 0 |
| `city` | No | No row | 0 |
| `country` | No | No row | 0 |
| `workSetupId` | No | No row | 0 |
| `jobTypeId` | No | No row | 0 |
| `jobLevelId` | No | No row | 0 |
| `salaryMinimum` | No | No row | 0 |
| `salaryMaximum` | No | No row | 0 |
| `workExperience[]` | No | No row | 0 |
| `educationalBackground[]` | No | No row | 0 |
| `skills[]` | No | No row | 0 |
| `photoUrl` | Yes (LinkedIn picture) | NOT in applicants_profile | 0 |
| **TOTAL** | | | **0% / Just Started** |

Note: Even though `users.photo_url` is populated, the completeness scorer reads `profile.photoUrl` from `appplicantProfile(uid)` which queries `applicants_profile`. Since no row exists, `photo_url` from `users` is not picked up by the scorer. The profile readiness panel will show 0%.

---

## Dashboard UX After LinkedIn First Login

1. LinkedIn job seeker is created and redirected to `/user/dashboard`
2. `ApplicantDashboardComponent.ngOnInit()` calls `getApplicantById(userId)`
3. `ApplicantFacade.getApplicantById()` → `ApplicantService.getApplicant()` → GET `/applicant/profile`
4. Backend: `getApplicantProfileById()` → `appplicantProfile(uid)` → LEFT JOIN on `applicants_profile` → returns null
5. `profile$` async pipe falls into `#noProfile` template: "Update your profile to showcase your skills"
6. `ProfileReadinessPanelComponent` calls `getProfileCompleteness()` → `evaluateProfileCompleteness(null)` → `{ score: 0, label: 'Just Started' }`
7. Panel shows: "Create your profile to get started."

**The applicant who just logged in with LinkedIn sees NO name, NO photo (from their LinkedIn), just the empty-profile fallback.** Their `users.firstname + lastname + photo_url` data is in the DB but the profile widget doesn't read from `users` directly.

---

## P1 Gap: No applicants_profile Stub on LinkedIn Signup

**Gap ID:** PRF-LI-001  
**Priority:** P1  
**Type:** UX — first impression completeness failure  
**Impact:** 100% of new LinkedIn job-seeker signups start with 0% profile score and see the empty-profile shell despite having name/email/photo available

### Recommended Fix (not applied — no-new-features rule)

In `createLinkedinUser()`, after the INSERT into `users`, add:

```javascript
// Only for jobseeker role (roleId === 3)
if (roleId === 3) {
  var profileId = 'AP' + crypto.randomBytes(3).toString('hex').toUpperCase();
  await dbQuery.query(
    `INSERT INTO ${dbSchema}.applicants_profile
     (applicant_profile_id, user_id, photo_url, is_profile_ready, created_at)
     VALUES ($1,$2,$3,false,NOW())
     ON CONFLICT DO NOTHING`,
    [profileId, uid, photoUrl || null]
  );
}
```

This would give a 10% starting score (photoUrl fills `photoOrVideo` weight) instead of 0%.

The same fix is needed for Google auth (V5 PRF-002 equivalent).

**This fix is deferred (P1 backlog, not applied this pass).** Applying it requires schema knowledge of all NOT NULL constraints on `applicants_profile`.

---

## LinkedIn Photo URL Risk

LinkedIn profile photo URLs from the `/v2/userinfo` endpoint are scoped to the OAuth access token. GetHired does not store the access token (correct — security). However, the `photo_url` written to `users.photo_url` is a LinkedIn CDN URL. If LinkedIn rotates or expires these URLs:

- `applicant-sidebar.component.html` has a conditional: `*ngIf="user.photoUrl"` / else shows initials. **Handles broken URL gracefully via the `*ngIf` fallback. No `(error)` handler needed here since the ngIf already guards the img element.**
- Other photo displays: need audit per PRF-001 from V5 (still open)

---

## role_required Flow — Profile Hydration Gap

When `intent='auto'` (no explicit role), the user goes through the `role_required` picker. On `linkedinChooseRole`, the profile data (firstName, lastName, etc.) may be empty:

```javascript
// linkedinAuthController.js lines 503–510
email     = pendingPayload.email     || '';
firstName = pendingPayload.firstName || '';  // may be empty if not in token
lastName  = pendingPayload.lastName  || '';  // may be empty
```

The `pendingPayload` (the ticket JWT) does NOT embed firstName/lastName/photoUrl — `makeTicketJwt()` only stores `uid`, `status`, `intent`, `returnTo`, `roleRequired`. Therefore the `choose-role` path may create a user with empty `firstname`/`lastname`/`photo_url` in `users`.

**This is a secondary hydration gap** (PRF-LI-002): LinkedIn name/photo available during callback but NOT passed through to choose-role handler.

---

## Summary

| Question | Answer |
|---|---|
| Does `linkedinComplete` create a Firebase user? | Yes — creates Firebase custom token from deterministic UID |
| Is `given_name + family_name` written to DB? | Yes — to `users.firstname` and `users.lastname` |
| Is email written to any profile table? | Yes — to `users.email` and `user_credentials.email` |
| Is `applicants_profile` stub created? | NO — P1 gap |
| Is profile completeness score > 0 after first login? | NO — 0% because no `applicants_profile` row exists |
| Does LinkedIn photoUrl pre-populate the profile? | Partially — stored in `users.photo_url` but NOT read by completeness scorer |

**LinkedIn hydration status: PARTIAL** (name/email/photo written to `users`, but no `applicants_profile` stub — completeness = 0%)
