# GETHIRED SECURE TEST PLAN — QA Cycle 11
Generated: 2026-06-25

---

## Test Coverage for QA11 Fixes

### T-QA11-01: saveGroupInterview BOLA Guard

**Test 1 — Applicant account (no company) → 403**
```
POST /api/interview/savegroupinterview
Authorization: Bearer <applicant-firebase-token>
Body: { "companyId": "COMPANY_XYZ", "groupInterviewName": "Test" }

Expected: 403 { "message": "You don't have permission to do that." }
```

**Test 2 — Employer from Company A tries to use Company B's ID → companyId overridden**
```
POST /api/interview/savegroupinterview
Authorization: Bearer <company-A-employer-token>
Body: { "companyId": "COMPANY_B_ID", ...valid body... }

Expected: 201/200 with group interview created under COMPANY_A_ID, not COMPANY_B_ID
Verify: SELECT company_id FROM group_interviews WHERE group_interview_id = <returned_id>
        → should return COMPANY_A_ID
```

**Test 3 — Valid employer → succeeds**
```
POST /api/interview/savegroupinterview
Authorization: Bearer <valid-employer-token>
Body: { ...valid body without companyId... }

Expected: 200/201 with created group interview
```

---

### T-QA11-02: getJobApplicantDetails BOLA Guard

**Test 1 — Employer tries to read details of applicant on another company's job**
```
GET /api/job/applicantdetails?jobId=<company-B-job>&id=<applicant-id>
Authorization: Bearer <company-A-employer-token>

Expected: 403 { "message": "You don't have permission to do that." }
```

**Test 2 — Valid employer reads their own job's applicant details**
```
GET /api/job/applicantdetails?jobId=<company-A-job>&id=<applicant-id>
Authorization: Bearer <company-A-employer-token>

Expected: 200 with applicant details
```

**Test 3 — Applicant with no company → 403**
```
GET /api/job/applicantdetails?jobId=<any>&id=<any>
Authorization: Bearer <applicant-firebase-token>

Expected: 403
```

**Test 4 — Same guard on /api/candidates/applicantdetails**
```
GET /api/candidates/applicantdetails?jobId=<company-B-job>&id=<applicant-id>
Authorization: Bearer <company-A-employer-token>

Expected: 403
```

---

### T-QA11-03: Security Headers

**Test — Verify headers on any API response**
```sh
curl -I https://[production-host]/api/job/published
```

Expected response headers to include:
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `x-xss-protection: 0`
- `ratelimit-limit: 500` (from Tier 1 standardHeaders)
- `ratelimit-remaining: [N]`
- `ratelimit-reset: [timestamp]`

---

### T-QA11-04: Rate Limiting Verification

**Test 1 — Tier 2 auth limit enforcement**
```
Run 21 POSTs to /api/auth/signin in under 15 minutes from same IP
Expected: First 20 → 200 or 400 (invalid credentials); 21st → 429 with:
{
  "message": "Too many authentication attempts. Please try again in 15 minutes."
}
```

**Test 2 — Tier 3 write limit enforcement**
```
Run 101 POSTs to /api/application/apply in under 15 minutes from same IP
Expected: 101st → 429
```

**Test 3 — Tier 4 sensitive limit enforcement**
```
Run 11 GETs to /api/auth/getpwresetlink?email=test@test.com in under 1 hour
Expected: 11th → 429 with "Too many attempts. Please try again in an hour."
```

**Test 4 — GET /api/job/published bypasses Tier 3 (write skip)**
```
Run 150 GETs to /api/job/published in under 15 minutes
Expected: No 429 from Tier 3 (GETs are skipped); may hit Tier 1 at 500
```

---

### T-QA11-05: Interview Hub BOLA (Previously Shipped, Regression Test)

**Test — Recruiter with no company → 403 (not 500)**
```
GET /api/interview/hub
Authorization: Bearer <user-with-no-company-firebase-token>

Expected: 403 { "message": "You don't have permission to do that." }
NOT: 500 (would indicate Array.isArray guard missing or companyId undefined)
```

**Test — Recruiter from Company A cannot see Company B data**
```
GET /api/interview/hub
Authorization: Bearer <company-A-employer-token>

Expected: 200 with items[] only containing applications for Company A's jobs
Verify: No job from Company B appears in items[]
```

---

### T-QA11-06: PayMongo Webhook (Known Gap — Manual Test)

**Test — Unsigned webhook request rejected (AFTER P2-01 fix is implemented)**
```
POST /api/payment/paymongowebhook
No x-paymongo-signature header
Body: { "data": { "attributes": { "type": "link.payment.paid", ... } } }

Expected (after fix): 400 { "error": "Missing signature" }
Current behavior (before fix): 200 + processes payment — confirms P2-01 is open
```

---

## Regression Test Checklist (Re-run QA10 Pass Cases)

- [ ] Login valid credentials → 200 (Tier 2 not broken)
- [ ] GET /api/job/published → 200 public (no auth required)
- [ ] GET /api/interview/hub with valid employer → 200 + items
- [ ] POST /api/messages/thread/send with 4001-char body → 400 (body length cap)
- [ ] PUT /api/company/update with cross-company companyId → 403
- [ ] GET /api/job/applicants with valid employer + correct jobId → 200
- [ ] GET /api/cv/get with correct userId → 200; wrong userId → 403
