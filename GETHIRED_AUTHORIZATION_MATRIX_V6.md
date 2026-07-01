# GETHIRED AUTHORIZATION MATRIX — V6
**Date:** 2026-07-01 | **Updated for:** LinkedIn OIDC endpoints

---

## Role Definitions

| Role ID | Name | Description |
|---|---|---|
| 0 | Unauthenticated | No Firebase token |
| 1 | Admin | Internal staff |
| 2 | Employer | Company recruiter |
| 3 | Job Seeker | Applicant |

---

## LinkedIn OIDC Route Authorization

| Route | Method | Auth Required | Role Required | Middleware | Notes |
|---|---|---|---|---|---|
| /api/auth/linkedin/start | GET | No | None | None | Public — initiates OAuth2 flow |
| /api/auth/linkedin/callback | GET | No | None | None | Public — LinkedIn redirects here with code+state |
| /api/auth/linkedin/complete | POST | No | None | None | Public — ticket exchange; self-authenticating via signed JWT |
| /api/auth/linkedin/choose-role | POST | No | None | None | Public — protected by pending token JWT |
| /api/auth/linkedin/unlink | DELETE | YES | Any | verifyFirebaseIdToken | Scoped to req.user.uid |
| /api/auth/linkedin/link-status | GET | YES | Any | verifyFirebaseIdToken | Scoped to req.user.uid |

---

## LinkedIn Account Creation Role Mapping (Server-side)

| intent parameter | roleId assigned | Can create admin? |
|---|---|---|
| jobseeker | 3 | NO |
| employer | 2 | NO |
| auto | N/A (role_required flow) | NO |
| anything else | N/A | NO |

In `linkedinChooseRole`, selectedRole mapping:
- `job_seeker` → 3
- `employer` → 2
- anything else → 400 error

Admin (role 1) cannot be created via LinkedIn OAuth. PASS.

---

## Full Route Authorization Matrix (carried from V5, LinkedIn added)

| Route Group | Public Routes | Auth Required | Role Locked |
|---|---|---|---|
| Auth (Google/LinkedIn/Email) | /start, /callback, /complete, /choose-role, /firebase-session | N | N |
| Auth (protected) | N/A | /unlink, /link-status | Any role |
| Jobs (public) | /jobs (GET all), /job/:id (GET) | N | N |
| Jobs (employer) | POST/PUT/DELETE /job/* | verifyAuth + role 2 | Employer only |
| Applications | All | verifyAuth | Role-specific |
| Company | GET (public profile) | Employer mutations: verifyAuth + role 2 | |
| Subscriptions | All | verifyAuth + role 2 | Employer |
| Payments | /create-link | verifyAuth + role 2 | Employer |
| Payments | /webhook | None (public webhook) | Sig verified |
| CV/Profile | All | verifyAuth | Role 3 |
| Messages | All | verifyAuth | Any |
| Admin | All | verifyAuth + role 1 | Admin only |
