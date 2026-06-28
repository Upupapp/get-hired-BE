# GETHIRED F-08 JOB UPDATE BOLA — CURRENT STATE AUDIT
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## 1. Route Discovery

| Route | Method | Auth Middleware | Controller |
|-------|--------|-----------------|------------|
| `/job/updatejobs` | PUT | `verifyAuth` (Firebase JWT) | `updateJob` in `controllers/jobsController.js` |
| `/job/changestatus` | PUT | `verifyAuth` | `updateStatusOfJob` in `controllers/jobsController.js` |
| `/job/create` | POST | `verifyAuth` | `createJobs` |
| `/job/deleteinterviewquestion` | DELETE | `verifyAuth` | `deleteInterviewQuestion` |

---

## 2. F-08 Core — updateJob Controller (BOLA Gap Status)

**File:** `controllers/jobsController.js` lines 250–374

### Current State (at time of audit):
The `updateJob` controller contains the F-08 BOLA fix already applied in a prior session. The fix is IN PLACE:

```js
// F-08 BOLA fix: verify the authenticated caller's company owns this job
const callerCompany = await getUserCompany(req.user.uid);
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to update this job." });
}
// ...
UPDATE ${dbSchema}.jobs SET ... WHERE job_id=$19 AND company_id=$20 returning *;
// ...
if (!rows || rows.length === 0) {
  return res.status(403).json({ message: "You don't have permission to update this job." });
}
```

**Assessment: The primary BOLA gap is CLOSED.**

---

## 3. Residual Gap Found: Child-Table Question Updates (F-08 sub-gap)

**File:** `services/interview.service.js` — `updateQuestionById()`

**Before this sprint:**
```js
const updateQuestionById = async interviewQuestion => {
  // WHERE template_question_id=$6 — no company_id scope
  const updateQuery = `UPDATE ${dbSchema}.interview_template_question
  SET ... WHERE template_question_id=$6 returning *;`
```

**Risk:** If `interviewQuestionsUpdate` was ever called from a route that did NOT enforce ownership (e.g., a future refactor), `updateQuestionById` would allow updating any question by ID. Within the current `updateJob` flow the risk is mitigated because `interviewQuestionsUpdate` is only called after `rows.length > 0` (i.e., after the ownership-scoped UPDATE succeeds). But the defence was single-layer.

**Status: HARDENED in this sprint** — `updateQuestionById` now accepts optional `companyId` and adds a defence-in-depth JOIN through `job_interview_template.company_id`.

---

## 4. getUserCompany — Scope Derivation Pattern

**File:** `controllers/companiesController.js` lines 189–215

```js
const getUserCompany = async (id) => {
  const searchQuery = `select c.*, ce.employee_id, i.industry_name...
    from ${dbSchema}.company_employees ce
    left join ${dbSchema}.companies c on c.company_id = ce.company_id
    where ce.employee_uuid = $1`;
  // Returns mapped company object or []
```

**Assessment:**
- Never accepts caller-supplied company_id — derives from JWT uid only.
- Returns `[]` (empty array, not null) when no company found — callers guard with `Array.isArray()`.
- All job-mutating routes call this correctly.

---

## 5. Ownership Fields in Database

| Field | Table | Role | Protected? |
|-------|-------|------|-----------|
| `company_id` | `jobs` | Owner company | Yes — never updated through updateJob SET clause |
| `job_id` | `jobs` | Job identifier | Yes — never mutated |
| `created_at` | `jobs` | Creation timestamp | Yes — not in SET clause |
| `job_status_id` | `jobs` | Status | Mutable via separate changestatus route; also in updateJob (intentional) |

---

## 6. FE Job Update Flow

- **Service:** `job.service.ts` `saveJob()` — sends PUT `/job/updatejobs` when `job.jobId` is set
- **Component:** `job-create.component.ts` — `publishJobPost()` / `saveAsDraft()` → `formatJob()` → `jobFacade.saveJob()`
- **NgRx effect:** `job$` in `job.effects.ts` — catches 403 and normalises error message
- **Gap at audit time:** Draft save button had no loading spinner; no error message was displayed on 403/404; success pulse absent

---

## 7. Route Aliases / Old Routes

- Commented-out: `router.delete("/jobs/delete", deleteJob)` — inactive
- No duplicate update routes found
- No unprotected update paths found

---

## 8. Verdict

| Check | Status |
|-------|--------|
| updateJob has verifyAuth | PASS |
| updateJob derives company from JWT (not body) | PASS |
| updateJob WHERE includes AND company_id | PASS |
| Zero-row check returns 403 | PASS |
| Ownership fields excluded from SET clause | PASS |
| Child-table calls gated behind parent ownership | PASS (implicit gate) |
| updateQuestionById company-scoped | HARDENED this sprint |
| No unprotected update aliases | PASS |
| FE error handling for 403/404 | HARDENED this sprint |
| Draft save loading state | HARDENED this sprint |
