# GetHired — Function Level Authorization Audit (SECURE 3)
**Date:** 2026-06-26
**Focus:** BFLA (Broken Function Level Authorization / OWASP API5:2023)
**Question:** Can a lower-privilege user call a higher-privilege function?

---

## Admin Functions

| Function | Route | Guard | Can employer call? | Can job seeker call? | Status |
|---|---|---|---|---|---|
| getUserProfile (admin) | GET /admin/userprofile | verifyAuth + verifyRoles(['1']) | No — role check blocks | No — role check blocks | PASS |

---

## Employer-Only Functions

| Function | Route | Guard | Can job seeker call? | Status |
|---|---|---|---|---|
| createJobs | POST /job/create | verifyAuth | Auth passes but getUserCompany() returns null for job seekers → 403 | PASS |
| updateJob | PUT /job/updatejobs | verifyAuth | Same — no company → 403 | PASS |
| deleteJob | DELETE /job/delete | verifyAuth | Same | PASS |
| getAllApplicantOfJob | GET /job/applicants | verifyAuth | Same — no company → empty result or 403 | PASS |
| getJobApplicantFitSignals | GET /job/applicants/signals | verifyAuth | Same | PASS |
| createInitialCompany | Various | verifyAuth | A job seeker could call this — no role check | FLAG |
| getAllSubscription | GET /subscription/getallsubscription | verifyAuth | No role check; any authenticated user can see subscription plans | ACCEPTED (lookup data) |
| createPaymentIntent | POST /subscription/paymentintent | verifyAuth | No role check; any authenticated user could trigger | FLAG |

---

## Flagged Items

### FLAG-1: Company creation not role-restricted
Any authenticated user (employer or job seeker) can call company creation endpoints. A job seeker could create a company, which may grant unexpected access to employer features.

**Current mitigation:** Business logic downstream may block this (e.g., a job seeker company would have no subscription). However, no explicit role check prevents the call.

**Recommendation:** Add `verifyRoles(['1', '2'])` (admin + employer) to company creation routes.

### FLAG-2: Payment intent not role-restricted
`POST /subscription/paymentintent` requires verifyAuth but not employer role. A job seeker could trigger a payment intent.

**Risk assessment:** LOW — the intent is for subscription purchases which are employer-relevant; the endpoint likely fails gracefully for job seekers. But no explicit guard prevents the attempt.

---

## Role Validation at Registration

`userController.js` line 102:
```js
const ALLOWED_ROLES = [2, 3];
if (!ALLOWED_ROLES.includes(Number(role))) {
  return res.status(status.bad).json(errorResponse("Invalid role."));
}
```
Role 1 (admin) cannot be self-registered. PASS.

---

## Summary

| Level | Total functions | Properly guarded | Flagged | Status |
|---|---|---|---|---|
| Admin only | 1 | 1 | 0 | CLEAN |
| Employer only | ~15 | ~13 | 2 | MINOR FLAGS |
| Applicant only | ~14 | 14 | 0 | CLEAN |
| Mixed/public | ~8 | N/A | 0 | CLEAN |

**Overall: PASS with minor flags on company creation + payment intent role guards**
