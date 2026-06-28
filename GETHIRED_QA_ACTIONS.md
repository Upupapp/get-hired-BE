# GETHIRED QA ACTIONS
## QA Cycle 11

**Generated:** 2026-06-25

---

## Current QA State Assessment

**Test runner:** Not configured (`npm test` exits 1).
**Test files:** Zero unit/integration tests found in BE.
**FE specs:** Some spec files exist (`import-add-candidate.component.spec.ts`, `contact-group.component.spec.ts`, `group-list.component.spec.ts`) but were not authored as part of this session's scope.
**CI:** GitHub Actions workflow added for FE deployment (QA Cycle 10) but no test step in pipeline.

---

## QA-01 — Configure Test Runner (Critical Foundation)
**Priority:** P1
**Effort:** S (2 hours)
**Files:** `package.json`, `.babelrc` (new)
**Action:**
1. `npm install --save-dev jest babel-jest @babel/preset-env`
2. Add `jest.config.js`:
   ```javascript
   module.exports = {
     testEnvironment: 'node',
     transform: { '^.+\\.js$': 'babel-jest' },
     testMatch: ['**/tests/**/*.test.js'],
     collectCoverageFrom: ['controllers/**/*.js', 'services/**/*.js', 'helpers/**/*.js'],
     coverageThreshold: { global: { statements: 50 } }
   };
   ```
3. Update `package.json:test` to `jest --coverage`
**Acceptance Criteria:**
- [ ] `npm test` exits 0 with no test files (pending state)
- [ ] `npm test` runs tests and prints coverage when test files exist
- [ ] CI step `npm test` added to GitHub Actions workflow

---

## QA-02 — Unit Tests: getInterviewHub Controller
**Priority:** P2
**Effort:** M (3 hours)
**File:** `tests/interviewController.test.js` (new)
**Test cases required:**
- [ ] No company → returns 403
- [ ] Company found → runs SQL with correct companyId bound
- [ ] SQL returns rows → maps to InterviewHubItem shape correctly
- [ ] LIMIT applied (mock returns 200 rows, verifies query arg)
- [ ] `video_answer_count` coerced to int correctly (including "0" string case)
- [ ] DB error → returns 500 with generic message
**Mocking strategy:** Mock `getUserCompany` and `dbQuery.query` directly.

---

## QA-03 — Unit Tests: RecruiterInterviewHub Component (FE)
**Priority:** P2
**Effort:** M (3 hours)
**File:** `recruiter-interview-hub.component.spec.ts` (new)
**Test cases required:**
- [ ] Loading state shown while service call pending
- [ ] Items rendered on success
- [ ] Error state shown on HTTP error
- [ ] Retry() calls loadHub() again
- [ ] `getFilteredItems()` with filter='all' returns all items
- [ ] `getFilteredItems()` with filter='has-video' returns only items where hasVideoAnswers=true
- [ ] `getFilteredItems()` with filter='review-stage' returns only items where applicationStatusId=3
- [ ] `trackByApplicationId` returns applicationId

---

## QA-04 — Unit Tests: listRecruiterThreads Service
**Priority:** P2
**Effort:** M (3 hours)
**File:** `tests/messageService.test.js` (new)
**Test cases required:**
- [ ] No company → throws FORBIDDEN
- [ ] Company found → SQL includes correct company_id
- [ ] applicantName is constructed as "First Last" when both names present
- [ ] applicantName falls back to email when names are null
- [ ] applicantName is null when both name and email are null
- [ ] lastMessageSnippet truncated to 120 chars
- [ ] needsReply=true when lastSenderRole='applicant'
- [ ] needsReply=false when lastSenderRole='employer'
- [ ] needsReply=false when lastSenderRole is null (no messages)

---

## QA-05 — Integration Smoke Test: Rate-Limit Headers
**Priority:** P2
**Effort:** S (2 hours)
**Type:** Manual + automated HTTP check
**Test cases:**
- [ ] `curl -I /api/auth/signin` includes `RateLimit-Limit: 20` header
- [ ] `curl -I /api/auth/changepassword` includes `RateLimit-Limit: 10`
- [ ] `curl -I /api/interview/hub` includes `RateLimit-Limit: 500` (global)
- [ ] 21st request to `/api/auth/signin` in 15 minutes returns 429
- [ ] 429 body is `{ "message": "Too many authentication attempts. Please try again in 15 minutes." }`

---

## QA-06 — Regression Test: BOLA Guards
**Priority:** P1
**Effort:** M (4 hours)
**Type:** Manual API test (Postman or curl)
**Test cases:**
- [ ] POST `/api/interview/savequestiontemplate` with JWT of Company A → creates template for Company A only (not caller-supplied company B in body)
- [ ] PUT `/api/interview/updatejobinterview` with JWT of Company A → cannot update a question belonging to Company B
- [ ] GET `/api/messages/recruiter/threads` with JWT of Company A → returns only Company A threads
- [ ] GET `/api/interview/hub` with applicant JWT (no company) → returns 403
- [ ] PUT `/api/company/update` with JWT of Company A → cannot update Company B via body-supplied companyId

---

## QA-07 — Regression Test: Auth Route Coverage
**Priority:** P1
**Effort:** S (1 hour)
**Test cases:**
- [ ] GET `/api/cv/getall` without Authorization header → 401/403 (not 200)
- [ ] GET `/api/job/applicants` without Authorization header → 401/403
- [ ] GET `/api/interview/getallrecipients` without Authorization header → 401/403
- [ ] POST `/api/subscription/paymentintent` without Authorization header → 401/403
- [ ] POST `/api/company/addcompanyuser` without Authorization header → 401/403

---

## QA-08 — End-to-End: Recruiter Messages Flow
**Priority:** P2
**Effort:** M (3 hours — manual test on staging)
**Flow:**
1. Employer logs in, navigates to /recruiter/messages
2. Confirms thread list loads with applicant names (not UIDs)
3. Applicant photo avatar renders (or initials fallback)
4. Selects a thread — message history loads
5. Sends a reply — new message appears in thread
6. needsReply badge: thread that had applicant as last sender shows indicator
7. needsReply badge disappears after recruiter replies
8. Mobile: hamburger opens nav drawer, Escape closes it
**Pass criteria:** All 8 steps pass on staging without console errors.

---

## QA-09 — End-to-End: Interview Hub Flow
**Priority:** P2
**Effort:** M (2 hours — manual test on staging)
**Flow:**
1. Employer logs in, navigates to /recruiter/interview (or hub route)
2. Hub loads with real applicants for employer's jobs
3. "All applicants" filter shows full list
4. "Video answers" filter shows only applicants with video_answer_count > 0
5. "Under review" filter shows applicants with statusId=3
6. Loading skeleton shown while fetching
7. Error state shown and Retry button visible on network failure
8. Empty state shown when company has no applications
**Pass criteria:** All 8 steps pass on staging.

---

## QA-10 — CI Pipeline: Add Test Step
**Priority:** P1
**Effort:** S (1 hour)
**Files:** `.github/workflows/` (BE CI file — check if exists; create if not)
**Action:** Add step to BE GitHub Actions workflow:
```yaml
- name: Run tests
  run: npm test
```
Ensure this runs after `npm install` and before deploy step.
**Acceptance Criteria:**
- [ ] `npm test` runs in CI on every PR to main
- [ ] Failed test blocks deployment
- [ ] Test results visible in GitHub Actions summary
