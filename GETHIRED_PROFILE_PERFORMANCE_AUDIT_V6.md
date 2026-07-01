# GETHIRED PROFILE PERFORMANCE AUDIT V6
**Date:** 2026-07-01 | **Status:** No regressions; LinkedIn adds minimal overhead

---

## LinkedIn Auth Performance Impact

### Additional DB Queries on LinkedIn Login

| Step | Queries | Notes |
|---|---|---|
| `linkedinCallback` — lookup by liSub | 1 SELECT on `auth_identities` | Indexed by `(provider, provider_subject)` (assumed) |
| `linkedinCallback` — lookup by email (if no identity) | 1 SELECT via `getUserCredentialsByEmail` | Indexed by email |
| `linkedinCallback` — user creation (new user) | 3 INSERTs + 1 email send | One-time, async welcome email |
| `linkedinCallback` — store ticket | 1 INSERT into `oauth_tickets` | |
| `linkedinComplete` — consume ticket | 1 UPDATE on `oauth_tickets` | |
| `linkedinComplete` — fetch profile | 1 SELECT on `users` JOIN `user_credentials` | |
| `buildSessionResponse` — getUserCompany | 1 SELECT | |
| `buildSessionResponse` — companySubscriptions | 1 SELECT (conditional) | |

Total queries on login: ~6–8 (same order as Google auth). No N+1 pattern. Acceptable.

### External Network Calls on Login

| Call | Timeout | Notes |
|---|---|---|
| LinkedIn token exchange (POST) | 15000ms | One-time per login |
| LinkedIn userinfo (GET) | 10000ms | One-time per login |
| Firebase customToken→idToken exchange (POST) | 10000ms | Via Google identitytoolkit API |
| Welcome email send | Async, non-fatal | Fire-and-forget with try/catch |

Total external call chain: up to ~35s in worst case (all calls at max timeout). In practice ~1–3s. No parallel calls — sequential by design (each step depends on previous). Acceptable for an auth flow.

---

## Profile Completeness Endpoint Performance

`GET /applicant/profile/completeness` → `appplicantProfile(uid)` → multiple JOINs:
- `applicants_profile`
- `work_experience` (sub-query)
- `educational_background` (sub-query)
- `applicant_skills` (sub-query)
- `documents` (sub-query)
- `users`

This is the same query as `getApplicantProfileById`. It runs on every dashboard load (via `ProfileReadinessPanelComponent`). For LinkedIn users with no `applicants_profile` row, the JOIN returns null quickly — no expensive sub-queries execute. ✅

For users with full profiles, the N sub-queries could be slow without proper indexes on `applicant_profile_id`. This is a V5 carry-over concern, not new in V6.

---

## `evaluateProfileCompleteness` Performance

Pure function, O(1), zero DB calls. Trivially fast. ✅

---

## No Performance Regressions

LinkedIn OIDC is an auth flow triggered once per session. No profile-serving hot paths changed. No performance regressions in V6.
