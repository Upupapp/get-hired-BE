# GETHIRED OBJECT-LEVEL AUTHORIZATION AUDIT (BOLA) — QA Cycle 11
Generated: 2026-06-25

BOLA = Broken Object Level Authorization (OWASP API1:2023)
Pattern: does the endpoint verify the caller owns/is-authorized-for the specific object being accessed?

---

## Methodology
For each endpoint that accesses a specific object (by ID), verify:
1. Is the object ID derived from JWT (safe) or from request body/query (potentially unsafe)?
2. Is there a server-side ownership check before the object is returned/modified?

---

## PASS — Correctly Scoped

| Endpoint | Object | Authorization Method |
|----------|--------|---------------------|
| GET /api/interview/hub | Applications | getUserCompany(uid) → companyId; WHERE j.company_id=$1 |
| GET /api/interview/getall | Interviews | callerBelongsToCompany(uid, companyId) |
| GET /api/interview/getalltemplates | Templates | callerBelongsToCompany(uid, companyId) |
| GET /api/interview/getallrecipients | Recipients | callerBelongsToCompany(uid, companyId) |
| GET /api/interview/gettemplatequestions | Questions | getTemplateCompanyId + callerBelongsToCompany |
| POST /api/interview/savequestiontemplate | Template | getUserCompany(uid) — companyId never from body |
| PUT /api/interview/updatejobinterview | Question | UPDATE WHERE company_id subquery in WHERE clause |
| GET /api/job/applicants | Applicants | getUserCompany + getJobCompanyId ownership check |
| GET /api/job/applicants/signals | Signals | Company ownership via bridge service |
| GET /api/job/applicant/snapshot-summary | Snapshot | Company ownership check in controller |
| PUT /api/job/updatejobs | Job | UPDATE WHERE company_id=$20 in WHERE clause |
| DELETE /api/job/* | Job | DELETE WHERE company_id=$2 |
| PUT /api/auth/archive | Account | uid from JWT only |
| POST /api/application/apply | Application | candidateId from JWT only |
| GET /api/applicant/application/snapshot | Snapshot | candidate_id = req.user.uid check |
| PUT /api/cv/update | CV | UPDATE WHERE user_id=$12 |
| DELETE /api/cv/delete | CV | DELETE WHERE user_id=$2 |
| GET /api/cv/get | CV | SELECT WHERE cv_id=$1 AND user_id=$2 |
| DELETE /api/contacts/deletecontact | Contact | DELETE WHERE contact_id=$1 AND company_id=$2 |
| DELETE /api/groups/deletegroup | Group | DELETE WHERE group_id=$1 AND company_id=$2 |
| PUT /api/company/update | Company | getUserCompany → companyId must match |
| DELETE /api/company/removecompanyuser | User | getUserCompany → companyId must match |
| POST /api/company/addcompanyuser | User | companyId from JWT getUserCompany |
| GET /api/company/getsubscriptionrestrictions | Subscription | companyId from JWT getUserCompany |
| GET /api/job/getsubscriptionrestrictions | Subscription | companyId from JWT getUserCompany |
| GET /api/messages/thread/messages | Messages | loadAuthorizedThread → company or applicant check |
| POST /api/messages/thread/send | Message | loadAuthorizedThread → company or applicant check |
| GET /api/messages/recruiter/threads | Threads | WHERE company_id=$1 (JWT-derived) |
| POST /api/messages/thread | Thread | callerCompany → assertEmployerOwnsThreadsJob |
| GET /api/candidates/* | Candidates | company_id checks throughout candidateController |

---

## FAIL — Missing Object-Level Authorization (New QA11 Findings)

### BOLA-QA11-01: saveGroupInterview — No Company Check
- **Endpoint:** POST /api/interview/savegroupinterview
- **File:** `controllers/interviewController.js` — `saveGroupInterview()`
- **Issue:** Calls `createGroupInterview(req.body, uid)` without calling `getUserCompany(uid)` first. If `req.body` contains a `companyId`, it is trusted directly. Any authenticated user (applicant, or employer from company A) can create interview records attributed to any company.
- **Severity:** P2
- **Fix:** Add the same guard used in `saveQuestionTemplate`:
  ```js
  const callerCompany = await getUserCompany(uid)
  if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
    return res.status(403).json({ message: "You don't have permission to do that." })
  }
  ```
  Then pass `callerCompany.companyId` to `createGroupInterview`, not the body value.

### BOLA-QA11-02: getJobApplicantDetails — No Company Ownership Check
- **Endpoint:** GET /api/job/applicantdetails AND GET /api/candidates/applicantdetails
- **File:** `controllers/jobsController.js` — `getJobApplicantDetails()`
- **Issue:** Accepts `{ jobId, id }` from query params and calls `applicationOfApplicant(jobId, id)` directly. No check that the authenticated caller's company owns the job referenced by `jobId`. Any employer from any company can read any applicant's application details by guessing a jobId.
- **Severity:** P2
- **Fix:**
  ```js
  const callerCompany = await getUserCompany(req.user.uid)
  if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
    return res.status(403).json({ message: "You don't have permission to do that." })
  }
  const jobCompanyId = await getJobCompanyId(jobId)
  if (!jobCompanyId || jobCompanyId !== callerCompany.companyId) {
    return res.status(403).json({ message: "You don't have permission to do that." })
  }
  ```

---

## Previously Fixed BOLA (QA1-QA10, Confirmed Closed)

| Finding | Fixed In | Confirmation |
|---------|---------|-------------|
| getInterviewHub trusted client companyId | QA11 deployment | companyId now JWT-derived only |
| updateCompany body companyId | QA8 | getUserCompany + companyId match |
| createJobs body companyId | QA8 | getUserCompany → companyId from JWT |
| getAllApplicantOfJob unauthenticated | QA8 | verifyAuth + getJobCompanyId ownership |
| saveQuestionTemplate body companyId | QA9 | getUserCompany guard added |
| updateJobInterviewQuestion no company check | QA9 | subquery in UPDATE WHERE |
| addCompanyUser body companyId | QA9 | getUserCompany → companyId from JWT |
| removeCompanyUser no auth | QA8 | verifyAuth + company ownership |
| createApplication body candidateId | QA9 | candidateId = req.user.uid |
| getSubscriptionRestrictions body companyId | QA10 | getUserCompany → JWT-derived |
| updateCandidate body companyId | QA10 | getUserCompany + WHERE clause |
