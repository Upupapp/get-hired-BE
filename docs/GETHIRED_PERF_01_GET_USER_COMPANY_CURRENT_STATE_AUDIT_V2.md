# PERF-01 Current State Audit
**GETHIRED_PERF_01_GET_USER_COMPANY_CURRENT_STATE_AUDIT_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## getUserCompany Definition

**File:** `controllers/companiesController.js`
**Lines:** 182–208 (before patch), same location after patch

**SQL:**
```sql
SELECT c.*, ce.employee_id, i.industry_name AS company_industry_name
FROM gethired.company_employees ce
  LEFT JOIN gethired.companies c ON c.company_id = ce.company_id
  LEFT JOIN gethired.industry i ON c.industry_id = i.industry_id
WHERE ce.employee_uuid = $1
```

**Parameter:** `id` — Firebase UID (employee_uuid in company_employees)

**Return shape:**
- If no row found: `[]` (empty array — NOT null)
- If found: `{ ...mappedCompany(rows[0]), employeedCompanyId: rows[0].employee_id }`
  - `mappedCompany` expands to: companyId, companyName, companyEmail, companyDetails, industryId, workSetupId, numberOfEmployee, companyCity, companyContactNumber, companyCountry, companyLogoUrl, companyAddress, withActiveSubscription, companyIndustryName, companyState, companyTown, companyZip, companyMapUrl, companyAddressOne

**Return is a single employer/recruiter company** (one row: the company the uid is an employee of).

---

## All Call Sites

### Controllers

| File | Lines | uid Source | Trusted? | Calls/Handler |
|------|-------|-----------|----------|---------------|
| `controllers/companiesController.js` | 135, 248, 363, 396, 507, 630 | `req.user.uid` / `uid=req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/contactsController.js` | 16, 43, 97, 128, 156, 181, 208, 245, 284, 317, 348 | `req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/candidateController.js` | 22, 44, 93, 120, 143 | `req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/jobsController.js` | 86, 172, 192, 203, 223, 313, 398, 694, 736, 775 | `req.user.uid` / `uid=req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/interviewController.js` | 24, 97, 118, 165, 238 | `req.user.uid` / `uid=req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/applicationController.js` | 136 | `uid=req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/employerController.js` | 18, 33 | `uid=req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/subscriptionController.js` | 31, 127 | `req.user.uid` | ✅ Firebase token | 1 per handler |
| `controllers/userController.js` | 66 | `credentials.id` (DB user ID from login) | ⚠️ Different ID type — not Firebase UID | 1 per handler |

### Services (no req — not patched)

| File | Line | uid Source | Notes |
|------|------|-----------|-------|
| `services/message.service.js` | 23 | `callerUid` (from `req.user.uid` via controller) | No req in service signature — intentional |
| `services/match/matchReadinessBridgeService.js` | 49 | `callerFirebaseUid` (from `req.user.uid` via controller) | No req in service signature — intentional |

---

## Middleware Analysis

**`middleware/verifyAuth.js`**: Calls `firebaseAdmin.auth().verifyIdToken(idToken)`, sets `req.user = decodedIdToken`. Does NOT call `getUserCompany`. No company context is loaded at middleware level.

**No existing request cache infrastructure found.** No `req.context`, `res.locals` company, AsyncLocalStorage, DataLoader, Redis, LRU-cache, or node-cache found in codebase.

---

## Duplicate Call Analysis

**Current pattern (before patch):** Each route handler calls `getUserCompany` exactly **once** per HTTP request. No single handler calls it 2-4x directly.

**Sources of effective 2-4x DB cost** (real, measurable):
1. The employer dashboard Angular page makes 4+ simultaneous API calls on load:
   - `GET /employer/company` → 1 getUserCompany
   - `GET /api/jobs/company/baselist` → 1 getUserCompany
   - `GET /api/contacts/list` → 1 getUserCompany
   - `GET /api/subscription/restrictions` → 1 getUserCompany
   = **4 independent DB queries for the same uid within the same browser page load**

2. The `getJobApplicantsWithFitSignals` route calls `getEmployerJobApplicantsForMatch` (bridge service) which calls `getUserCompany`. If the controller layer ever adds a second getUserCompany call, the service layer would duplicate it — no deduplication in place.

3. Future routes combining multiple operations (e.g. "create job + return updated company dashboard") would easily call getUserCompany 2x without the cache.

**Root cause classification:** Missing request-scoped memoization + missing in-flight promise deduplication.

---

## Security Baseline

All controller call sites use `req.user.uid` — the Firebase-verified decoded token UID, set by `verifyAuth` middleware. This is the trusted path.

**Exception:** `userController.js:66` uses `credentials.id` (the DB user_credentials PK, not Firebase UID). This is in the login handler before Firebase auth is established; kept as direct `getUserCompany(credentials.id)` call — not patched.

---

## Existing Test Coverage

No dedicated tests for `getUserCompany` or affected routes found in `tests/` or `__tests__/` directories.

---

## Error Behavior (current)

- DB error: `getUserCompany` re-throws. Controllers return HTTP 500 via `errorResponse`.
- User not found: returns `[]`. Controllers check `Array.isArray(callerCompany)` and return 403.
- Company not found: same as user not found (same `[]` return path).
