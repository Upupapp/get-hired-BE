# GETHIRED DELETE JOB — Backend Fix Log V1

**Date:** 2026-06-25

---

## Fix 1: Register the DELETE Route

**File:** `routes/jobsRoute.js`

**Before:**
```javascript
// router.delete("/jobs/delete", deleteJob);
```

**After:**
```javascript
router.delete("/job/delete", verifyAuth, deleteJob);
```

**Why:** The route was commented out, making the controller dead code. Added `verifyAuth` middleware to enforce authentication. Note: path changed from `/jobs/delete` to `/job/delete` to match the existing URL prefix used by all other job routes (`/job/...`).

---

## Fix 2: Remove req.body.companyId from deleteJob

**File:** `controllers/jobsController.js`

**Before:**
```javascript
const { jobId, companyId } = req.body;
// ...
const jobs = await getJobList(companyId);  // used attacker-supplied companyId
```

**After:**
```javascript
const { jobId } = req.body;  // companyId completely removed
// ...
const jobs = await getBasicJobList(callerCompany.companyId, 0);  // server-derived
```

**Why:** `req.body.companyId` is attacker-controlled. Even though the DELETE itself was safe, the response list was being scoped to whatever company the attacker supplied.

---

## Fix 3: Add RETURNING Clause

**Before:**
```sql
DELETE FROM gethired.jobs WHERE job_id=$1 AND company_id=$2
```

**After:**
```sql
DELETE FROM gethired.jobs WHERE job_id=$1 AND company_id=$2 RETURNING job_id
```

**Why:** Makes the zero-row check explicit. `RETURNING job_id` confirms the row existed and was deleted.

---

## Fix 4: Switch from getJobList() to getBasicJobList()

**Before:** `getJobList(companyId)` — uses obsolete schema with `company_jobs` join that doesn't exist in production.

**After:** `getBasicJobList(callerCompany.companyId, 0)` — current production function used by all other authenticated list endpoints.

---

## Fix 5: Use 404 for Not-Found/Wrong-Company

**Before:** 403 for both auth failure and job-not-found.

**After:**
- 403 only for callerCompany lookup failure (user has no company)
- 404 for job not found or company mismatch — avoids revealing existence

---

## Files Changed (Backend)

- `routes/jobsRoute.js` — uncommenting and registering route
- `controllers/jobsController.js` — deleteJob function rewrite
