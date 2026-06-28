# GETHIRED FUNCTION-LEVEL AUTHORIZATION AUDIT — QA Cycle 11
Generated: 2026-06-25

Function-Level Authorization: can the caller invoke this function at all, regardless of which specific object?
(OWASP API5:2023 Broken Function Level Authorization)

---

## Pattern Summary

The app uses a single `verifyAuth` middleware (Firebase JWT verification) for authentication.
There is no explicit role-based access control middleware — role is inferred from whether `getUserCompany()` returns a company object.
- **Applicant signal:** `getUserCompany()` returns `[]` (empty array)
- **Employer signal:** `getUserCompany()` returns a company object with `companyId`
- **Admin signal:** No distinct role check — `/api/admin/*` uses `verifyAuth` only (FINDING below)

---

## Function-Level Checks by Category

### Admin Routes
| Endpoint | Auth Check | Role Check | Verdict |
|----------|-----------|-----------|---------|
| GET /api/admin/userprofile | verifyAuth ✓ | None — any user can call | FAIL — P3 |

**Finding FUNC-QA11-01:** The admin route verifies identity (JWT) but not role. Any logged-in user (applicant, employer) can call `/api/admin/userprofile`. Currently this endpoint appears to only return the caller's own profile, so the data exposure is limited. However, as admin functionality grows, the lack of a role gate is a structural weakness.

**Recommendation:** Add a role check: query `user_credentials` for `role = 'admin'` (or equivalent), or verify a custom Firebase claim set by admin provisioning.

---

### Employer-Only Routes (Function Gate via getUserCompany)
| Endpoint | Role Gate | Verdict |
|----------|-----------|---------|
| POST /api/job/create | getUserCompany check | PASS |
| GET /api/job/basiclist | Implicitly employer (no applicant uses this) | PASS (acceptable) |
| GET /api/interview/getall | callerBelongsToCompany | PASS |
| GET /api/interview/hub | getUserCompany guard | PASS |
| POST /api/interview/savequestiontemplate | getUserCompany guard | PASS |
| POST /api/interview/savegroupinterview | NO getUserCompany guard | FAIL — P2 (BOLA-QA11-01) |
| GET /api/messages/recruiter/threads | resolveCallerCompany → 403 if no company | PASS |
| GET /api/company/dashboard | getUserCompany (no Array.isArray) | PARTIAL — stale guard |
| GET /api/company/dashboard/pipeline-overview | getUserCompany + Array.isArray | PASS |
| DELETE /api/company/removecompanyuser | getUserCompany + Array.isArray | PASS |
| POST /api/company/addcompanyuser | getUserCompany + Array.isArray | PASS |

**Note on getDashboard():** `getDashboard` calls `getUserCompany(uid)` but does NOT have the Array.isArray guard. If a user with no company calls `/api/company/dashboard`, `userCompany` will be `[]` and `userCompany.companyId` will be `undefined`, which will likely produce a DB error (500) rather than a clean 403. This is a P3 UX/consistency issue, not a security breach (the query would return no data or error out), but should be hardened.

---

### Applicant-Only Routes (No Explicit Function Gate)
Routes like `POST /api/applicant/createprofile`, `POST /api/application/apply`, etc. are verifyAuth-gated but do not explicitly reject employers.
- **Risk:** Low. An employer calling an applicant route would create data attributed to their own UID. Not a security vulnerability — just unusual usage.
- **Action:** No immediate fix required.

---

### Public Routes (Intentional Function Access)
| Endpoint | Who Can Call | Gate |
|----------|-------------|------|
| GET /api/job/published | Anyone | None (intended) |
| GET /api/company/getAllCompanies | Anyone | None (intended) |
| POST /api/payment/paymongowebhook | PayMongo server | None (intended; needs sig verification) |

---

## Summary

| Finding | Severity | Status |
|---------|---------|--------|
| FUNC-QA11-01: Admin route no role check | P3 | NEW |
| FUNC-QA11-02: getDashboard no Array.isArray guard | P3 | NEW (UX/consistency) |
| BOLA-QA11-01: saveGroupInterview no company gate | P2 | NEW (also in BOLA audit) |
