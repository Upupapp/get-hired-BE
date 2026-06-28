# GETHIRED SECURE FIX LOG — QA Cycle 11
Generated: 2026-06-25

This file records every code change made during this SECURE pass.
All fixes are safe (no feature changes, no schema changes, no destructive operations).

---

## QA11 FIX-01: saveGroupInterview — BOLA Guard Added

**File:** `controllers/interviewController.js`
**Finding:** BOLA-QA11-01 — P2
**Change:** Added `getUserCompany(uid)` check before `createGroupInterview()`. Overrides any client-supplied `companyId` in `req.body` with the JWT-derived value. Mirrors the exact pattern in `saveQuestionTemplate()` immediately below.
**Pattern:**
```js
const callerCompany = await getUserCompany(uid)
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." })
}
const safeBody = { ...req.body, companyId: callerCompany.companyId }
const dbResponse = await createGroupInterview(safeBody, uid)
```
**Impact:** Any authenticated user (applicant or wrong-company employer) now gets 403 instead of creating a group interview attributed to any company.
**Regression risk:** NONE — valid employers still reach `createGroupInterview`; only the companyId source changes from body to JWT.

---

## QA11 FIX-02: getJobApplicantDetails — BOLA Guard Added

**File:** `controllers/jobsController.js`
**Finding:** BOLA-QA11-02 — P2
**Change:** Added `getUserCompany()` + `getJobCompanyId()` ownership check before `applicationOfApplicant()`. Reuses the same pattern as `getAllApplicantOfJob()` two functions above.
**Pattern:**
```js
const callerCompany = await getUserCompany(req.user.uid);
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
const jobCompanyId = await getJobCompanyId(jobId);
if (!jobCompanyId || jobCompanyId !== callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
```
**Impact:** An employer from Company A can no longer read Company B's applicant details by guessing a jobId.
**Regression risk:** NONE — valid employers (correct company) still reach `applicationOfApplicant`; only cross-company access is blocked.
**Note:** This fix applies to `GET /api/job/applicantdetails`. The route `GET /api/candidates/applicantdetails` calls the same controller function, so both are covered.

---

## QA11 FIX-03: paymentController — Remove PII from Logs

**File:** `controllers/paymentController.js`
**Finding:** LOG-QA11-01 — P2 (PII in logs)
**Change:** Removed `console.log(webHookPaid)` in the `payment.paid` branch which was writing billing PII (name, email, phone) to `be_out.log`. Replaced with a sanitized log containing only the event ID.
**Before:**
```js
console.log("I am payment.paid");
const webHookPaid = data.attributes.data;
console.log(webHookPaid);
```
**After:**
```js
const webHookPaid = data.attributes.data;
console.log('[paymentController] payment.paid event received, id:', webHookPaid && webHookPaid.id);
```
**Impact:** PII no longer written to log files in plaintext.
**Regression risk:** NONE — pure logging change; no functional code altered.

---

## QA11 FIX-04: server.js — Security Headers Added

**File:** `server.js`
**Finding:** P2-04 (missing security headers); closes SEC-03 from QA8/9/10
**Change:** Added a `app.use()` middleware before rate limiters to set three security headers on every response:
- `X-Content-Type-Options: nosniff` — prevents MIME type sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-XSS-Protection: 0` — disables legacy IE XSS filter
**Code:**
```js
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  next();
});
```
**Impact:** All API responses now include baseline security headers. Closes long-standing SEC-03 item.
**Regression risk:** NONE — headers are additive; no existing behavior changes.

---

## Changes NOT Made in QA11 (Deferred, Require External Action)

| Item | Reason Deferred |
|------|----------------|
| PayMongo webhook signature verification | Requires PayMongo webhook secret from dashboard (EA-05) + body parser restructuring — P2 but too invasive to apply silently |
| CORS restriction | Requires knowing the production FE domain (EA-06) |
| bcrypt → bcryptjs | Safe but changes a transitive security function; recommend deliberate PR |
| axios upgrade | Semver-major (0.x → 1.x) change; needs regression testing |
| Node.js upgrade | Infrastructure change; requires coordinated deploy |
| jsonwebtoken upgrade | Requires confirming whether directly used |
| getDashboard Array.isArray guard | P3; consistent with pattern but not critical path |
| Admin role check | P3; requires role query design decision |
