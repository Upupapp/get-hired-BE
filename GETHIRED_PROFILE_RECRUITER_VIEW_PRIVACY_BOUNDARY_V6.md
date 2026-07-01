# GETHIRED PROFILE RECRUITER VIEW PRIVACY BOUNDARY V6
**Date:** 2026-07-01 | **Status:** CLEAN — LinkedIn auth provider not exposed

---

## Privacy Boundary — LinkedIn Auth Users

The recruiter-facing API (`/job/applicant/snapshot-summary`) and pipeline views do not expose any auth provider information. Specifically:

| Data | Exposed to Recruiter? | Notes |
|---|---|---|
| Applicant `email` | Yes (via application record) | Same for all auth providers |
| `firstname`, `lastname` | Yes | Seeded from LinkedIn but indistinguishable |
| `photo_url` | Yes (as profile avatar) | LinkedIn CDN URL — no different from user-uploaded |
| `provider` field | NO | `buildSessionResponse()` never includes `provider` |
| `auth_identities` rows | NO | Never joined in recruiter queries |
| LinkedIn `sub` (liSub) | NO | Internal identity token only |
| Whether user is a LinkedIn user | NO | Not exposed anywhere in recruiter API |

The privacy boundary is clean. Recruiters cannot determine whether a candidate authenticated via LinkedIn, Google, or email+password. ✅

---

## Role Isolation

`verifyAuth` middleware validates the Firebase ID token and sets `req.user.uid`. Recruiter endpoints (`/job/applicant/*`) are mounted behind `verifyAuth` and have internal role checks. A LinkedIn applicant (role=3) cannot access employer endpoints even though their UID format is different (`li_` prefix). Firebase token validation is role-agnostic; the role check is done in the controller against the DB role value. ✅

---

## Applicant's Own Data Access

LinkedIn applicants can only access their own profile data:
- `getUserProfile`: BOLA fix is present — derives UID from JWT, not query param (V5 fix confirmed)
- `getApplicantProfileById`: Same BOLA fix
- `getApplicantProfileCompleteness`: Always caller's own profile (uid from JWT)

✅ No IDOR vulnerability for LinkedIn users.

---

## Photo URL Privacy

LinkedIn `picture` URL is stored in `users.photo_url`. This URL is:
- Visible to the recruiter when reviewing applicants (same as user-uploaded photo)
- A LinkedIn CDN URL, not a personal data leak beyond what the applicant chose to share on LinkedIn

The applicant explicitly authorized GetHired to read their profile picture via LinkedIn OAuth consent. No additional privacy risk. ✅

---

## Conclusion

The privacy boundary for LinkedIn applicants is equivalent to all other auth providers. No new privacy gaps introduced in V6.
