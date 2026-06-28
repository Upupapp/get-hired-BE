# GETHIRED API CONTRACTS — RECENT DEPLOYMENT — V1 (UPDATED 2026-06-25)

**Date:** 2026-06-25
**Scope:** 7 integration seams — deleteJob, PayMongo webhook, basiclist/expiredlist, interview template

---

## CONTRACT 1 — DELETE /api/job/delete

**Route:** `DELETE /api/job/delete`
**Auth:** `verifyAuth` required (Firebase JWT)
**FE caller:** `JobService.deleteJobPost(jobId)` → `job.service.ts`

### Request
```
Method:  DELETE
Headers: Authorization: Bearer {firebase_id_token}
Body:    { "jobId": "JB123456" }
```
No `companyId` in body — BE derives it from JWT.

### Response (200 OK — success)
```json
{
  "status": "success",
  "data": [
    {
      "jobId": "JB789",
      "jobTitle": "Senior Engineer",
      "jobStatusId": 2,
      "expirationDate": "2026-09-01T00:00:00Z"
    }
  ]
}
```
`data` is the caller's updated `BasicList[]` (all non-deleted jobs for this company, status 0 filter in `getBasicJobList`).

### Response (404 — job not found or wrong company)
```json
{ "error": "Job not found or you do not have access." }
```

### Response (403 — caller has no company record)
```json
{ "message": "Job not found or you do not have access." }
```

### Response (500 — server error)
```json
{ "error": "Operation not successful. Please try again." }
```

### FE error handling
Effect normalises: `body.error || body.message || fallback_string` — all three error shapes handled without crash.

### BOLA guarantee
`DELETE WHERE job_id=$1 AND company_id=$2` — `company_id` is always JWT-derived, never caller-supplied.

---

## CONTRACT 2 — GET /api/job/basiclist

**Route:** `GET /api/job/basiclist`
**Auth:** `verifyAuth` required
**FE caller:** `JobService.getJobBasicList(companyId)` sends `?id={companyId}` — BE ignores this param

### Request
```
Method:  GET
Query:   ?id={companyId}  (sent by FE — ignored by BE)
Headers: Authorization: Bearer {firebase_id_token}
```

### Response (200)
```json
{
  "status": "success",
  "data": [
    {
      "jobId": "JB123",
      "jobTitle": "Engineer",
      "jobStatusId": 2,
      "expirationDate": "2026-09-01T00:00:00Z",
      ...
    }
  ]
}
```

### Contract note
FE still passes `?id=companyId` from the NgRx store. This is harmless — the BE does not read `req.query` in `getJobBasicListOfCompany`. The scope comes exclusively from the JWT. If the store value were stale, it would have no effect.

---

## CONTRACT 3 — GET /api/job/expiredlist

**Route:** `GET /api/job/expiredlist`
**Auth:** `verifyAuth` required
**FE caller:** `JobService.getJobExpiredList(companyId)` sends `?id={companyId}` — BE ignores this param

### Request
```
Method:  GET
Query:   ?id={companyId}  (sent by FE — ignored by BE)
Headers: Authorization: Bearer {firebase_id_token}
```

### Response (200)
Same shape as CONTRACT 2 but filtered to expired jobs (`job_status_id = 10`).

---

## CONTRACT 4 — POST /api/payment/paymongowebhook

**Route:** `POST /api/payment/paymongowebhook`
**Auth:** None (PayMongo cannot supply a Firebase token) — secured by HMAC signature verification
**Caller:** PayMongo platform (not FE)

### Request
```
Method:  POST
Headers:
  paymongo-signature: t={unix_timestamp},li={live_hmac_hex},te={test_hmac_hex}
  Content-Type: application/json
Body:    PayMongo webhook event payload (raw JSON)
```

### Signature algorithm
```
HMAC-SHA256(webhook_secret, "{timestamp}.{rawBodyString}")
```
`webhook_secret` is `env.paymongo_webhook_secret` (from `PAYMONGO_WEBHOOK_SECRET` env var).

### Validation flow
1. Extract `paymongo-signature` header
2. Parse `t`, `li`, `te` values
3. Reject if timestamp is >5 minutes old (replay protection)
4. Compute `expected = HMAC-SHA256(secret, "${t}.${rawBody}")`
5. Compare `li` (or `te`) against `expected` via `crypto.timingSafeEqual`
6. Reject (400) if mismatch

### Response (400 — signature fail)
```json
{ "message": "Invalid webhook signature" }
```

### Response (200 — processed)
```json
{ "status": "success", "data": {...} }
```

### rawBody note
`req.rawBody` is captured as a Buffer by `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })`. Used as `req.rawBody.toString("utf8")` in the webhook handler. Must not be processed through any body-transforming middleware before this handler.

---

## CONTRACT 5 — createInterviewTemplateQuestions (internal service)

**Not an HTTP endpoint — internal service function called during job create/update and interview create.**

### Signature
```javascript
createInterviewTemplateQuestions(jobId, templateName, companyId = null, createdBy = null)
```

### SQL INSERT
```sql
INSERT INTO gethired.job_interview_template
  (job_interview_template_id, job_interview_template_name, created_at, job_id, company_id, created_by)
  VALUES($1, $2, $3, $4, $5, $6)
```

### Schema requirement (P0 BLOCKED)
The live `gethired.job_interview_template` table MUST have:
- `company_id VARCHAR NULL`
- `created_by VARCHAR NULL`

These columns are NOT present in the tracked DDL files (`db/job_ddl.sql`, `db/complete_ddl.sql`). Verify the live DB and apply migration if needed (see `GETHIRED_STITCH_FIX_LOG_RECENT_V1.md`).

### Callers
| Caller | companyId | createdBy |
|---|---|---|
| `jobsController.js createJobs` | `callerCompany.companyId` (JWT-derived) | `uid` (Firebase uid) |
| `interviewController.js` | `callerCompany.companyId` (JWT-derived) | `uid` (Firebase uid) |
| `job.service.js interviewQuestionsUpdate` (new template path) | `null` (no company context in service layer) | `null` |

---

## CONTRACT 6 — updateQuestionById (internal service, F-08)

**Not an HTTP endpoint — called from interviewQuestionsUpdate.**

### Signature
```javascript
updateQuestionById(interviewQuestion, companyId = null)
```

### SQL (with companyId — defence-in-depth mode)
```sql
UPDATE gethired.interview_template_question itq
  SET template_question=$1, template_answer_duration=$2,
      template_question_retakes=$3, updated_at=$4, sequence=$5
  WHERE itq.template_question_id=$6
    AND itq.job_interview_template_id IN (
      SELECT job_interview_template_id
      FROM gethired.job_interview_template
      WHERE company_id=$7
    )
```

### SQL (without companyId — legacy mode)
```sql
UPDATE gethired.interview_template_question
  SET template_question=$1, template_answer_duration=$2,
      template_question_retakes=$3, updated_at=$4, sequence=$5
  WHERE template_question_id=$6
```

### Threading contract
`jobsController.js updateJob` threads `callerCompany.companyId` through `interviewQuestionsUpdate` → `updateQuestionById`. The company-scoped SQL variant is always used for job updates. The legacy (no-companyId) variant is only used when `interviewQuestionsUpdate` creates a new question on a just-created template (the template_id is generated inline and can be trusted).

---

## CONTRACT 7 — NgRx deleteJob state transitions

### Action shapes
```typescript
deleteJob({ jobId: string })
deleteJobSuccess({ basicList: Model.BasicList[] })
deleteJobFail({ payload: string })  // normalised error string
```

### State before delete
```
{ loading: false, list: BasicList[], error: null, succesMsg: null }
```

### State after deleteJob dispatched
```
{ loading: true, succesMsg: null, error: null }
```

### State after deleteJobSuccess
```
{ loading: false, list: action.basicList, succesMsg: 'deleted', error: null }
```

### State after deleteJobFail
```
{ loading: false, error: action.payload, succesMsg: null }
```

### UI trigger
`afterChange('deleted')` in `job-list.component.ts` — shows confirmation toast. List updates automatically because `list` in state is replaced by the BE-returned refreshed array.
