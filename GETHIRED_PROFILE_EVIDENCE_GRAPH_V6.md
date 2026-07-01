# GETHIRED PROFILE EVIDENCE GRAPH V6
**Date:** 2026-07-01 | **Status:** Unchanged from V5; LinkedIn adds identity node

---

## Evidence Graph Definition

The evidence graph maps every data point on an applicant's profile to its sources, consumers, and trust level.

---

## Nodes

### Identity Layer (LinkedIn-new in V6)

| Node | Source | Table | Trust | Consumer |
|---|---|---|---|---|
| `uid` | Derived (sha256 of liSub) | `user_credentials`, `users`, `auth_identities` | High (deterministic) | All applicant queries |
| `email` | LinkedIn userinfo `email` (verified) | `users`, `user_credentials` | High (emailVer=true enforced) | Auth, notifications |
| `firstname` | LinkedIn userinfo `given_name` | `users` | Medium (LinkedIn self-reported) | Display, sessions |
| `lastname` | LinkedIn userinfo `family_name` | `users` | Medium (LinkedIn self-reported) | Display, sessions |
| `photo_url` | LinkedIn userinfo `picture` | `users` | Medium (may expire) | Display avatar |
| `provider_name` | LinkedIn userinfo `name` | `auth_identities` | Medium | Link status display |

### Profile Layer (applicant-managed)

| Node | Source | Table | Trust | Consumer |
|---|---|---|---|---|
| `jobTitle` | Applicant self-entry | `applicants_profile` | Unverified | Completeness, MATCH |
| `shortBio` | Applicant self-entry | `applicants_profile` | Unverified | Profile display |
| `contactNumber` | Applicant self-entry | `applicants_profile` | Unverified | Contact |
| `city`, `country` | Applicant self-entry | `applicants_profile` | Unverified | Search, MATCH |
| `workSetupId`, `jobTypeId`, `jobLevelId` | Applicant selection | `applicants_profile` | Unverified | MATCH, completeness |
| `salaryMinimum`, `salaryMaximum` | Applicant self-entry | `applicants_profile` | Unverified | MATCH |
| `workExperience[]` | Applicant self-entry | `work_experience` | Unverified | MATCH, profile |
| `educationalBackground[]` | Applicant self-entry | `educational_background` | Unverified | MATCH, profile |
| `skills[]` | Applicant selection | `applicant_skills` | Unverified | MATCH, search |
| `documents[]` | File upload | `documents` (GCS) | Low (MIME verified) | CV Doctor, applications |
| `videoCVUrl` | File upload | `applicants_profile` | Low | Profile display |

---

## Evidence Trust Levels

| Level | Meaning | Examples |
|---|---|---|
| High | Third-party verified, not self-reported | LinkedIn email (verified), Firebase UID |
| Medium | Third-party sourced but self-reported to the third party | LinkedIn name, photo, Google display name |
| Low | Applicant-uploaded, MIME-checked | Documents |
| Unverified | Applicant self-reported directly to GetHired | Bio, skills, salary, experience |

---

## LinkedIn Identity Evidence

LinkedIn OIDC adds one new trust anchor: **verified email** (`email_verified: true` is enforced in the callback — login blocked if not verified). This is stronger evidence than email+password (no email verification enforced in email auth flow per V5 findings).

LinkedIn name and photo are Medium trust — LinkedIn users can set arbitrary display names. GetHired does not verify employment history from LinkedIn (no LinkedIn API beyond userinfo). The `provider_name` and `provider_picture` are purely cosmetic.

---

## Evidence Not Available from LinkedIn

- Employment history (LinkedIn jobs API not used — only `openid profile email` scope)
- Skills endorsements (not fetched)
- Education (not fetched)
- Connections count (not fetched)

**All profile content beyond name/email/photo must be entered manually by the applicant.** LinkedIn sign-in provides identity convenience, not profile pre-population for the job-seeker intelligence layer.

---

## Graph Integrity — LinkedIn Path

The LinkedIn auth path correctly isolates identity evidence (in `auth_identities`) from profile evidence (in `applicants_profile`). The schema design is sound. The gap is that the profile layer node for a LinkedIn user is empty (no stub row), not that the evidence graph is corrupted.
