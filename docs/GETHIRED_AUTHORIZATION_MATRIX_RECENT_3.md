# GetHired — Authorization Matrix (SECURE 3)
**Date:** 2026-06-26

Roles: **1** = Admin, **2** = Employer, **3** = Job Seeker / Applicant, **P** = Public (no auth)

---

## User / Auth Routes (`/api/auth/*`)

| Endpoint | Method | Auth required | Allowed roles | Notes |
|---|---|---|---|---|
| /auth/signin | POST | No | P | Rate-limited (authLimiter) |
| /auth/signup | POST | No | P | Role param validated: only 2 or 3 allowed |
| /auth/resendverificationlink | POST | No | P | |
| /auth/getverificationlink | POST | No | P | |
| /auth/manualexcelverification | POST | No | P | Admin-only use case; no auth gate (technical debt) |
| /auth/logout | POST | Yes | 1,2,3 | verifyAuth |
| /auth/verifyemail | POST | No | P | Token-based |
| /auth/getpwresetlink | GET | No | P | sensitiveLimiter (10/hr) |
| /auth/changepassword | POST | No | P | sensitiveLimiter (10/hr); token in body |
| /auth/getprofile | GET | Yes | 1,2,3 | verifyAuth |
| /auth/updateprofile | PUT | Yes | 1,2,3 | verifyAuth |
| /auth/archive | PUT | Yes | 1,2,3 | verifyAuth; sensitiveLimiter |

---

## Job Routes (`/api/job/*`)

| Endpoint | Method | Auth required | Allowed roles | Notes |
|---|---|---|---|---|
| /job/published | GET | No | P | Public job list |
| /job/details | GET | Optional | P,1,2,3 | optionalVerifyAuth; BOLA probe blocked |
| /job/sharelink | GET | Optional | P,1,2,3 | optionalVerifyAuth |
| /job/create | POST | Yes | 2 | verifyAuth; company derived from JWT |
| /job/updatejobs | PUT | Yes | 2 | verifyAuth; company ownership enforced |
| /job/delete | DELETE | Yes | 2 | verifyAuth; company ownership in WHERE clause |
| /job/basiclist | GET | Yes | 2 | verifyAuth; company-scoped |
| /job/expiredlist | GET | Yes | 2 | verifyAuth; company-scoped |
| /job/categories | GET | Yes | 1,2,3 | verifyAuth; lookup data |
| /job/industries | GET | Yes | 1,2,3 | verifyAuth; lookup data |
| /job/badges | GET | Yes | 1,2,3 | verifyAuth; lookup data |
| /job/rolelist | GET | Yes | 1,2,3 | verifyAuth; lookup data |
| /job/changestatus | PUT | Yes | 2 | verifyAuth |
| /job/applicants | GET | Yes | 2 | verifyAuth + company ownership check |
| /job/applicants/signals | GET | Yes | 2 | verifyAuth + company ownership in service |
| /job/applicantdetails | GET | Yes | 2 | verifyAuth |
| /job/deleteinterviewquestion | DELETE | Yes | 2 | verifyAuth |
| /job/getsubscriptionrestrictions | GET | Yes | 2 | verifyAuth |

---

## Applicant Routes (`/api/applicant/*`, `/api/application/*`)

| Endpoint | Method | Auth required | Allowed roles | Notes |
|---|---|---|---|---|
| /application/create | POST | Yes | 3 | verifyAuth |
| /application/updateJobs | PUT | Yes | 3 | verifyAuth |
| /application/delete | DELETE | Yes | 3 | verifyAuth |
| /application/apply | POST | Yes | 3 | verifyAuth |
| /applicant/application/snapshot | GET | Yes | 3 | verifyAuth |
| /applicant/application/snapshots | GET | Yes | 3 | verifyAuth (batch) |
| /job/applicant/snapshot-summary | GET | Yes | 2 | verifyAuth |
| /applicant/createprofile | POST | Yes | 3 | verifyAuth |
| /applicant/updateprofile | PUT | Yes | 3 | verifyAuth |
| /applicant/updatebasicinfo | PUT | Yes | 3 | verifyAuth |
| /applicant/userprofile | GET | Yes | 3 | verifyAuth; IDOR check (SEC-01) |
| /applicant/dashboard | GET | Yes | 3 | verifyAuth |
| /applicant/profile | GET | Yes | 3 | verifyAuth; JWT uid |
| /applicant/profile/completeness | GET | Yes | 3 | verifyAuth |
| /applicant/workexp | POST | Yes | 3 | verifyAuth + profile ownership |
| /applicant/educbg | POST | Yes | 3 | verifyAuth + profile ownership |
| /applicant/cert | POST | Yes | 3 | verifyAuth + profile ownership |
| /applicant/skills | POST | Yes | 3 | verifyAuth + profile ownership |
| /applicant/docs | POST | Yes | 3 | verifyAuth + profile ownership |
| /applicant/savevideocv | PUT | Yes | 3 | verifyAuth |

---

## Company Routes (`/api/*companies*`)

| Endpoint | Method | Auth required | Notes |
|---|---|---|---|
| All company endpoints | Various | Yes (verifyAuth) | Company ownership enforced via getUserCompany(uid) |

---

## CV, Candidate, Interview Routes

| Route group | Auth | Notes |
|---|---|---|
| /cv/* (5 routes) | verifyAuth | user_id=$uid in all queries |
| /candidates/* (6 routes) | verifyAuth | company_id from JWT |
| /interview/* (9 routes) | verifyAuth | company-scoped |

---

## Payment Routes

| Endpoint | Method | Auth required | Notes |
|---|---|---|---|
| /payment/paymongopaymentlink | POST | Yes | verifyAuth |
| /payment/paymongowebhook | POST | No (PayMongo calls directly) | HMAC signature verification required |

---

## Admin Routes

| Endpoint | Method | Auth required | Roles | Notes |
|---|---|---|---|---|
| /admin/userprofile | GET | Yes | 1 | verifyAuth + verifyRoles(['1']) |

---

## Public Routes (No Auth)

| Endpoint | Notes |
|---|---|
| GET /sitemap.xml | Public; in-memory cached; no DB query per request |
| GET / | Health check |
| GET /job/published | Published jobs only |
| GET /job/details | optionalVerifyAuth |
| GET /job/sharelink | optionalVerifyAuth |
