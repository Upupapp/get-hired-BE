# GetHired — Object Level Authorization Audit (SECURE 3)
**Date:** 2026-06-26
**Focus:** BOLA (Broken Object Level Authorization / OWASP API1:2023)

---

## Methodology

For each resource type, we verify:
1. Object identity derived from JWT (not from caller-supplied params)
2. Ownership check in DB query (WHERE company_id=$n or user_id=$n)
3. Error response for unauthorized access is non-informative

---

## Jobs

| Operation | File | JWT-derived ID | Ownership check in SQL | Status |
|---|---|---|---|---|
| Create job | jobsController.js line 86 | `getUserCompany(uid)` | `company_id = companyId` (JWT-derived) in INSERT | PASS |
| Update job | jobsController.js | `getUserCompany(uid)` | `WHERE job_id=$1 AND company_id=$2` | PASS |
| Delete job | jobsController.js | `getUserCompany(uid)` | `WHERE job_id=$1 AND company_id=$2` | PASS |
| Get applicants | jobsController.js | `getUserCompany(uid)` | `getJobCompanyId()` cross-checks company owns job | PASS |
| Get job details (public) | jobsController.js line 627 | optionalVerifyAuth; viewerUid from token | No ownership needed (public data) | PASS |
| BOLA probe on /job/details | jobsController.js line 637 | Token uid compared to query param uid | 403 + security event if mismatch | PASS |

---

## Applicant Profiles

| Operation | File | JWT-derived ID | Ownership check | Status |
|---|---|---|---|---|
| Get user profile | applicantsController.js line 249 | `req.user.uid` (token) | `user_id=$uid` in query; query param mismatch → 403 | PASS |
| Update profile | applicantsController.js | `req.user.uid` | `applicant_profile_id=$1 AND user_id=$2` | PASS |
| Save work exp | applicantsController.js ~line 317 | `req.user.uid` | `SELECT 1 WHERE applicant_profile_id=$1 AND user_id=$2` ownership check | PASS |
| Save cert | applicantsController.js ~line 355 | `req.user.uid` | Same ownership check | PASS |
| Save educ bg | applicantsController.js ~line 392 | `req.user.uid` | Same ownership check | PASS |
| Save skills | applicantsController.js ~line 429 | `req.user.uid` | Same ownership check | PASS |
| Save docs | applicantsController.js ~line 465 | `req.user.uid` | Same ownership check | PASS |

---

## CV Records

| Operation | File | Ownership check | Status |
|---|---|---|---|
| Create CV | cvController.js | `user_id=$1` (from JWT uid) in INSERT | PASS |
| Update CV | cvController.js | `WHERE cv_id=$1 AND user_id=$2` | PASS |
| Delete CV | cvController.js line 136 | `WHERE cv_id=$1 AND user_id=$2` | PASS |
| Get CV list | cvController.js line 158 | `WHERE user_id=$1` | PASS |
| Get CV by ID | cvController.js line 177 | `WHERE cv_id=$1 AND user_id=$2` | PASS |

---

## Candidates

| Operation | File | Ownership check | Status |
|---|---|---|---|
| Create candidate | candidateController.js | `getUserCompany(uid)` → `companyId` in INSERT | PASS |
| Multiple candidates | candidateController.js | `companyId` spread overrides body; each INSERT has `company_id=$8` | PASS |
| Delete candidate | candidateController.js line 101 | `WHERE candidate_id=$1 AND company_id=$2` | PASS |
| Update candidate | candidateController.js | Company ownership check | PASS |
| List candidates | candidateController.js | `getUserCompany(uid)` → company-scoped query | PASS |

---

## Contacts

| Operation | File | Ownership check | Status |
|---|---|---|---|
| Create contact | contactsController.js | `getUserCompany(uid)` → `companyId` | PASS |
| Multiple contacts | contactsController.js | `companyId` spread overrides body | PASS |
| Delete contact | contactsController.js line 105 | `WHERE contact_id=$1 AND company_id=$2` | PASS |
| Delete group | contactsController.js line 325 | `WHERE group_id=$1 AND company_id=$2` | PASS |

---

## Applications

| Operation | File | Ownership check | Status |
|---|---|---|---|
| Get applicant snapshot | applicationController.js | `req.user` from JWT + join verifies ownership | PASS |
| Get employer snapshot summary | applicationController.js | `verifyAuth` + company check in service | PASS |
| Batch snapshots | applicationController.js line 180 | `WHERE job_application_id = ANY($1)` — cross-applicant risk if IDs not validated | NEEDS REVIEW |

### Batch snapshot risk note:
Line 180 in `applicationController.js`:
```js
`SELECT job_application_id, candidate_id FROM ${dbSchema}.job_applicants WHERE job_application_id = ANY($1::text[])`
```
The `$1` is the array of applicationIds from the caller. If the caller can supply arbitrary IDs from other applicants, this is a BOLA risk. Need to verify the controller adds a user ownership filter.

---

## Messages

| Operation | File | Ownership check | Status |
|---|---|---|---|
| Open thread | messageController.js | `req.user.uid` → company/user lookup in service | PASS |
| Get thread messages | messageController.js | Thread membership check in service | PASS |
| Post message | messageController.js | Thread membership verified in service | PASS |
| Get recruiter threads | messageController.js | `listRecruiterThreads()` company-scoped | PASS |

---

## Summary

| Resource | BOLA Status | Notes |
|---|---|---|
| Jobs | CLEAN | JWT company enforcement across all operations |
| Applicant profiles | CLEAN | JWT uid + ownership in all queries |
| CVs | CLEAN | JWT uid in all queries |
| Candidates | CLEAN | JWT company enforcement |
| Contacts | CLEAN | JWT company enforcement |
| Applications | MOSTLY CLEAN | Batch snapshot needs ownership validation review |
| Messages | CLEAN | Company/user scoped in service layer |
| Payments | CLEAN | Auth-gated; webhook is not user-identity-dependent |
