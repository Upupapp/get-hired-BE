# GETHIRED PROFILE REPORT V6
**Date:** 2026-07-01 | **Baseline:** PROFILE V5 (Google Auth OS) | **Delta:** LinkedIn OIDC

---

## Executive Summary

V6 is a focused audit of the LinkedIn OIDC integration added since V5. The PROFILE/CVCOACH/MATCH pipeline confirmed fully wired end-to-end in V5 (2026-06-24, commit 85843f5) remains intact. The primary new finding is a P1 UX gap: LinkedIn job-seeker signups result in a 0% profile completeness score and an empty-profile dashboard experience because `applicants_profile` is never seeded on LinkedIn signup.

**LinkedIn hydration status: PARTIAL**
- `users.firstname`, `users.lastname`, `users.photo_url`, `users.email` — written ✅
- `user_credentials` — written ✅
- `auth_identities` — written ✅
- `applicants_profile` — NOT created ❌ (P1 gap)

---

## V6 Delta — What Changed Since V5

### 1. LinkedIn OIDC (Applicant-facing)

Full LinkedIn backend-brokered OIDC flow added. Key files:
- `controllers/linkedinAuthController.js` — 570-line implementation
- `middleware/linkedinSession.js` — stateless JWT state + one-time ticket utilities
- `routes/linkedinAuthRoutes.js` — 6 endpoints registered
- `src/app/auth/services/linkedin-auth.service.ts` — FE service
- `src/app/auth/linkedin-complete/linkedin-complete.component.ts` — FE callback handler
- `src/app/auth/linkedin-button/linkedin-button.component.ts` — FE trigger

**Profile hydration audit:** See `GETHIRED_PROFILE_LINKEDIN_HYDRATION_AUDIT_V6.md` (full detail).

### 2. Company Setup Success Modal (Employer-only)

No applicant profile impact. Not audited further.

### 3. Sign-out Fix

Confirmed in prior session. Applicant sign-out clears localStorage correctly.

---

## Profile Completeness System — V6 Status

The completeness scoring pipeline (FE + BE) is unchanged from V5 and fully wired:

```
GET /applicant/profile/completeness
  → applicantsController.getApplicantProfileCompleteness()
  → applicantProfileQualityService.evaluateProfileCompleteness(profile)
  → ProfileReadinessPanelComponent renders score + suggestions
```

**For LinkedIn first-time users, this pipeline works correctly but returns 0% because the input (`applicants_profile` row) doesn't exist.**

---

## Top 5 Profile Gaps (V6)

1. **PRF-LI-001 (P1):** No `applicants_profile` stub created on LinkedIn signup → 0% completeness + empty dashboard for new LinkedIn job seekers
2. **PRF-LI-002 (P2):** `linkedinChooseRole` may lose firstName/lastName/photoUrl when intent=auto (not embedded in ticket JWT, only in consumed DB ticket)
3. **PRF-001 (P2, from V5):** No `(error)` handler on LinkedIn `photo_url` `<img>` tags in recruiter-side components — broken LinkedIn CDN photo shows broken image in some surfaces
4. **PRF-003 (P1, from V5):** `ProfileQualityService` (FE) remains as legacy code even though `ProfileReadinessPanelComponent` now calls the BE endpoint — redundant implementation can drift
5. **PRF-LI-003 (P3):** LinkedIn `storeSession` in `linkedin-auth.service.ts` does not set `isNewUser=true` flag in localStorage — post-signup onboarding prompt (V5 PRF-002) cannot be triggered for LinkedIn users

---

## CVCOACH Integration — V6 Status

CONFIRMED fully wired end-to-end (V5, commit 85843f5). No change in V6. LinkedIn job seekers can access CV Doctor immediately after signup using their `applicant_uid` from localStorage. ✅

---

## MATCH Integration — V6 Status

CONFIRMED fully wired end-to-end (V5). Match scoring uses `applicant_uid` from JWT — same for LinkedIn users. Employer-side signals fully wired. ✅

**Caveat:** MATCH scoring depends on `applicants_profile` data. A LinkedIn user who hasn't filled out their profile will have a near-zero match score with any job until they complete their profile.

---

## Privacy Boundary — V6 Status

LinkedIn OIDC does not expose auth provider to recruiters. `buildSessionResponse()` returns standard user fields (id, email, firstName, lastName, role, photoUrl) with no `provider` field. Recruiters see no difference between LinkedIn, Google, and email+password applicants. ✅

`auth_identities` table (which contains `provider='linkedin'`) is never exposed in any API response visible to employers. ✅

---

## Security — V6 LinkedIn-Specific

| Check | Result |
|---|---|
| Client secret stays server-side | ✅ `LINKEDIN_CLIENT_SECRET` only used in `linkedinAuthController.js` |
| State JWT prevents CSRF | ✅ HS256 signed, 10-min TTL |
| PKCE omitted (confidential client) | ✅ Correct for LinkedIn — no `code_verifier` in token exchange |
| One-time ticket (replay prevention) | ✅ DB-backed via `oauth_tickets` table, `used_at` marking |
| No LinkedIn tokens returned to FE | ✅ Only Firebase ID token returned |
| `sanitizeReturn()` prevents open redirect | ✅ Internal paths only, length-bounded |
| UID is deterministic hash of liSub | ✅ `li_` prefix + sha256(linkedin:sub) |
| No secrets in logs | ✅ uid is truncated in logs |

---

## Files Audited

**Backend:**
- `controllers/linkedinAuthController.js`
- `middleware/linkedinSession.js`
- `routes/linkedinAuthRoutes.js`
- `services/applicant.service.js`
- `services/applicantProfileQualityService.js`
- `controllers/applicantsController.js`

**Frontend:**
- `src/app/auth/services/linkedin-auth.service.ts`
- `src/app/auth/linkedin-complete/linkedin-complete.component.ts`
- `src/app/auth/linkedin-button/linkedin-button.component.ts`
- `src/app/applicant-panel/applicant-dashboard/applicant-dashboard.component.ts`
- `src/app/applicant-panel/applicant-dashboard/applicant-dashboard.component.html`
- `src/app/applicant-panel/applicant-dashboard/components/profile-readiness-panel/profile-readiness-panel.component.ts`
- `src/app/applicant-panel/applicant-dashboard/components/profile-readiness-panel/profile-readiness-panel.component.html`
- `src/app/public/services/profile-quality.service.ts`
- `src/app/public/services/document-quality.service.ts`
- `src/app/applicant/profile-details/profile-details.component.ts`

---

## Files Changed This Pass

**Backend:** 0  
**Frontend:** 0  
(No safe fixes applied — P1 gap documented for backlog, fix requires schema verification)

---

```
PROFILE V6 completed: yes
Source reports used: V5 baseline
LinkedIn profile hydration status: PARTIAL (name/email/photo written to users table; applicants_profile not created)
Profile completeness system status: PASS (pipeline works; returns 0% for LinkedIn new users due to missing stub)
CVCOACH integration status: fully wired (confirmed V5)
MATCH integration status: fully wired (confirmed V5)
Frontend files changed: 0
Backend files changed: 0
Top 5 profile gaps: (1) No applicants_profile stub on LinkedIn signup, (2) choose-role loses name/photo data, (3) LinkedIn photo broken-img risk in recruiter views, (4) legacy ProfileQualityService drift risk, (5) no isNewUser flag for LinkedIn post-signup onboarding
Release gate result: GO WITH CAUTION
```
