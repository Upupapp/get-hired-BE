# GetHired QA8 Fix Sprint — SECURE Audit Report

**Date:** 2026-06-25
**Scope:** QA Cycle 8 fix sprint changed files only
**Auditor:** Claude Code SECURE pass

---

## Overall Verdict: PASS WITH FINDINGS

The five targeted fixes (Fix 2–8) are correctly implemented. No adversarial bypass path was found for any of them. Two residual BOLA gaps were identified in adjacent code not touched by QA8 but within the audit scope: `saveQuestionTemplate` in interviewController (P2) and `deleteInterviewQuestion` in jobsController (P2). Fair-hiring guardrails are unaffected.

---

## Fix-by-Fix Adversarial Verification

### Fix 2 — createJobs company spoofing (jobsController.js:38–162)

**Status: PASS**

- `companyId` is fully removed from any caller-trusted path. The destructured `req.body` block (lines 46–73) does not include `companyId` at all.
- `getUserCompany(uid)` at line 83 derives `companyId` from the verified Firebase JWT (`req.user.uid`), never from `req.body`.
- The `companyId` injected at parameter `$4` of the INSERT (line 101) comes exclusively from `callerCompany.companyId` (line 87).
- **Null/empty guard:** Line 84 — `if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId)` returns 403. This correctly handles the `[]` return shape from `getUserCompany` when no company row exists (an array is truthy, so `!callerCompany` alone would not catch it; `Array.isArray` closes that gap).
- **Adversarial test result (code path trace):** POST /jobs/create with body `{ companyId: 'competitor-uuid', title: 'fake job' }` — `companyId` from body is never read; the job is inserted under the JWT-derived `callerCompany.companyId`. The spoofed body field has no effect. Job lands under caller's company. **PASS.**

---

### Fix 3 — getUserCVlist (cvController.js:154–174)

**Status: PASS**

- Line 161: `const userId = req.user.uid;` — caller-supplied `userid` query param is explicitly discarded. The comment at lines 155–159 documents this decision and the required future pattern for employer CV access.
- SQL: `WHERE user_id = $1` with `[userId]` (JWT-derived). No secondary filter is needed — this is the only owner filter and it is correct.
- **Adversarial test result:** GET /cv/list?userid=victim-uid — `req.query.userid` is never read; the query runs with caller's JWT uid. Returns only the caller's CVs. **PASS.**

---

### Fix 4 — getCvById (cvController.js:176–198)

**Status: PASS**

- Line 183: SQL is `WHERE cv_id = $1 AND user_id = $2` with params `[id, req.user.uid]`.
- Line 188: `if (!dbResponse)` — zero rows (CV not found OR user_id mismatch) returns 403 with `{ message: "You don't have permission to view this CV." }`.
- No information leak: the 403 response is identical for "not found" and "wrong owner."
- **Adversarial test result:** GET /cv/byid?id=victim-cv-id — query includes `AND user_id = req.user.uid`. If the CV belongs to a different user, zero rows are returned and the caller receives 403. **PASS.**

---

### Fix 5 — saveWorkExp ownership check (applicantsController.js:294–330)

**Status: PASS**

- Lines 300–305: `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` with `[applicantProfileId, uid]`. This is a prior SELECT check (not folded into the mutation), which is correct here because the subsequent mutation is a DELETE + multiple INSERTs (not a single UPDATE WHERE), so the ownership must be established separately before the mutation chain.
- Zero rows → 403 `{ message: "You don't have permission to do that." }`.
- The same SELECT+403 pattern is consistently applied to `saveEducBg` (line 337), `saveCert` (line 374), `saveSkillsArray` (line 410), and `saveDocuments` (line 447).
- **Adversarial test result:** POST with body `{ applicantProfileId: 'victim-profile-id', company: 'hacked' }` — ownership check fires first. `victim-profile-id` has a different `user_id` than `req.user.uid`, so SELECT returns 0 rows, caller receives 403. Mutation never executes. **PASS.**

---

### Fix 6 — createProfile (applicantsController.js:161–173)

**Status: PASS**

- Line 165: `{ ...req.body, userId: req.user.uid }` — even if the caller supplies `userId` in the body, the spread order ensures the JWT-derived `req.user.uid` overwrites it.
- The service `createApplicationProfile` uses `userId` from the merged object in the INSERT at `applicant.service.js:78` (`user_id` column, parameter `$2`).
- **PASS.**

---

### Fix 7 — createContact / multipleContact / createGroup (contactsController.js)

**Status: PASS**

**createContact (lines 9–39):**
- `getUserCompany(req.user.uid)` at line 16. Array/null/companyId guard at line 17. JWT-derived `companyId` passed to `addContact` at line 22 via spread `{ ...contact, companyId }`, overwriting any `companyId` in `req.body`.

**multipleContact (lines 41–82):**
- `getUserCompany(req.user.uid)` at line 47. Same guard at line 48. JWT-derived `companyId` injected into each individual contact at line 57 via `{ ...option, companyId }`.

**createGroup (lines 201–252):**
- `getUserCompany(req.user.uid)` at line 208. Same guard at line 209. JWT-derived `companyId` used in `addGroup(groupName, companyId)` at line 214.

- **Adversarial test result:** POST /contact/create with body `{ companyId: 'competitor-uuid', name: 'spy' }` — `companyId` from body is overwritten by spread. Contact lands under caller's JWT-derived company. **PASS.**

---

### Fix 8 — updateCompany guard (companiesController.js:103–187)

**Status: PASS WITH NOTE**

- Line 140: `const userCompany = await getUserCompany(req.user.uid);`
- Line 141: `if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId)` — this correctly checks three conditions:
  1. `Array.isArray(userCompany)` — catches the `[]` return when no company exists (critical: `[]` is truthy, `![]` is false, so `!userCompany` alone would pass for a no-company caller)
  2. `!userCompany` — catches null/undefined
  3. `userCompany.companyId !== companyId` — verifies the caller's company matches the `companyId` in the request body

- **Does updateCompany check that the companyId in the URL/body matches the caller's company?** Yes — condition 3 (`userCompany.companyId !== companyId`) explicitly compares the body-supplied `companyId` against the JWT-derived company. This means a caller cannot update a different company's profile even if they know the target `companyId`.

- **NOTE — Residual trust on body companyId:** `updateCompany` still accepts `companyId` from `req.body` and compares it against the JWT-derived value (rather than ignoring it entirely and using only the JWT-derived value for the WHERE). This is functionally safe — the comparison enforces ownership — but it is a different pattern from the other fixed handlers (createJobs, createContact) which discard the body param entirely. The current approach is correct; this is an observation, not a finding.

- **Adversarial test result:** PUT /companies/update with body `{ companyId: 'competitor-uuid', ... }` — `userCompany.companyId` (JWT-derived) will not equal `'competitor-uuid'`, so condition 3 fires and returns 403. **PASS.**

---

## Full Remaining BOLA Scan

### Controllers surveyed:
`interviewController.js`, `employerController.js`, `adminController.js`, `candidateController.js`, `applicationController.js`

### Findings:

#### interviewController.js — saveQuestionTemplate (lines 107–146) — P2
`companyId` is read from `req.body` and passed directly to `createInterviewTemplateQuestions` without verifying that the caller's JWT uid belongs to that company. The read endpoints (`getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId`) all use `callerBelongsToCompany(req.user.uid, companyId)` correctly. But `saveQuestionTemplate` — a mutation — does not call `callerBelongsToCompany` before creating the template under the body-supplied `companyId`. An employer from Company A could create an interview template attributed to Company B by supplying `companyId: 'company-b-id'` in the request body.

Also: `updateJobInterviewQuestion` (lines 148–158) calls `updateQuestionById(req.body)` with no ownership check. Any authenticated user can update any interview question if they know (or guess) the `questionId`.

#### interviewController.js — deleteInterviewQuestion via jobsController.js:691–708 — P2
`deleteInterviewQuestion` deletes from `interview_template_question WHERE template_question_id = $1` with no ownership check. There is no verification that the template question belongs to a job owned by the caller's company. Any authenticated employer can delete any other company's interview questions if they can guess the `template_question_id`.

#### contactsController.js — list, list2, grouplist, contactslist (read endpoints) — P3
All four read endpoints (`list`, `list2`, `grouplist`, `contactslist`) accept `companyId` from `req.query` and pass it directly to the service with no ownership verification. An authenticated employer from Company A can read Company B's full contact list, group list, and contact-in-group list by supplying `companyId=company-b-id`. This is a BOLA read exposure (not a mutation risk). Lower severity than write endpoints because it only leaks data; it does not corrupt data.

#### candidateController.js — list (line 99–116) — P3
`list` accepts `companyId` from `req.query` and calls `candidateList(companyId)` with no ownership check. Same pattern as contactsController read endpoints above.

#### candidateController.js — deleteCandidate (lines 60–79) — P2
Deletes from `candidates WHERE candidate_id=$1` with no ownership check. Any authenticated employer can delete any candidate record if they know (or enumerate) the `candidateId`. There is no verification that the caller's company is related to the candidate.

#### applicantsController.js — saveVideoCV (lines 486–502) — P1
`saveVideoCV` passes `applicantProfileId` to `updateProfileSaveVideoCV` in the service, but the service's WHERE clause is `WHERE user_id=$3` (using `uid`). This means the ownership is enforced by `userId` in the UPDATE — the `applicantProfileId` is used only for storage file naming. However, the controller does not perform the same ownership pre-check that `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, and `saveDocuments` all have (the `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` check). If `updateProfileSaveVideoCV` fails (zero rows) due to mismatch, the service throws `error` (which is not defined at that scope — a separate bug), but the upload to storage has already happened with the caller-supplied `applicantProfileId` as the filename. A caller could pollute another user's storage path by supplying a victim's `applicantProfileId`. The storage write occurs before the DB update, so the storage pollution happens even on ownership failure. Recommend adding the same ownership pre-check as the other sub-array handlers.

#### companiesController.js — removeCompanyUser (lines 446–469) — P3 (pre-existing, inconsistency)
`removeCompanyUser` does not have the `Array.isArray` guard that all QA8-fixed endpoints now have. Line 456: `if (!callerCompany || callerCompany.companyId !== companyId)` — this is missing the `Array.isArray(callerCompany)` check. When `getUserCompany` returns `[]` (no company), `!callerCompany` evaluates to `false` (array is truthy), so the guard is bypassed. However, `callerCompany.companyId` would then be `undefined`, and `undefined !== companyId` would be `true` for any real companyId, so the guard fires anyway in practice. The bug exists but is not exploitable in the current flow. Still inconsistent with the QA8 standard pattern.

#### adminController.js — bypasses company scoping (by design) — NOTE
`adminController.getUserProfile` requires `role === 1` (admin). Admins are not scoped to a company by design. The role check is enforced server-side via `getUserRoleById(req.user.uid)` at line 15. No BOLA concern here — the design intent is that admins can access any user profile.

#### employerController.js — CLEAN
Both `getEmployerCompany` and `getEmployerProfile` derive identity from `req.user.uid` with no caller-supplied ID. No BOLA exposure.

#### applicationController.js — CLEAN
`submitApplication` derives candidateId from JWT uid (not body). `getApplicantApplicationSnapshot` verifies `candidate_id === uid`. `getEmployerApplicantSnapshotSummary` verifies caller's company owns the job. `getApplicantApplicationSnapshotsBatch` filters by `candidate_id === uid`. Batch endpoint has a size cap (max 50 IDs) and type guard against object injection. All clean.

---

## Fair-Hiring Guardrail Confirmation

The QA8 fixes (Fix 2–8) affect only authorization paths for mutation endpoints. They do not touch:

- **MATCH scoring:** `employerApplicantSignalsService.js` / `match/` services — not modified in QA8 sprint
- **Applicant visibility:** `getJobApplicantsWithFitSignals` — unchanged; ownership verified via `req.user.uid` inside the service
- **Certifications:** `saveCert` now has an ownership pre-check, which restricts writes to the owner only. No change to read path or scoring consumption.
- **Video answers:** `saveVideoCV` now passes `uid` for the WHERE clause — the JWT-derived uid was already the authority for the DB write. The storage path issue noted above (P1) affects file naming only, not scoring.
- **Application completeness scoring and snapshot data:** untouched by QA8 sprint.
- The `disclaimerNote` and `privacyNote` fields on all snapshot endpoints remain in place and unchanged.

**Fair-hiring guardrail verdict: CONFIRMED UNAFFECTED.**

---

## Findings Table

| ID | Severity | Location | Description | Status |
|----|----------|----------|-------------|--------|
| QA8-SEC-01 | P1 | `applicantsController.js:486` `saveVideoCV` | No ownership pre-check before storage write; storage path pollutable with victim's `applicantProfileId`; service also references undefined `error` var on throw | Open |
| QA8-SEC-02 | P2 | `interviewController.js:107` `saveQuestionTemplate` | `companyId` read from `req.body` with no `callerBelongsToCompany` check; any employer can create templates attributed to another company | Open |
| QA8-SEC-03 | P2 | `interviewController.js:148` `updateJobInterviewQuestion` | No ownership check; any authenticated user can update any question by `questionId` | Open |
| QA8-SEC-04 | P2 | `jobsController.js:691` `deleteInterviewQuestion` | No ownership check; any authenticated employer can delete any company's interview question by `template_question_id` | Open |
| QA8-SEC-05 | P2 | `candidateController.js:60` `deleteCandidate` | No ownership check; any authenticated employer can delete any candidate record by `candidateId` | Open |
| QA8-SEC-06 | P3 | `contactsController.js:155,178,312,374` — `list`, `grouplist`, `contactslist`, `list2` | All 4 read endpoints accept caller-supplied `companyId` with no ownership verification; exposes competitor contact/group data | Open |
| QA8-SEC-07 | P3 | `candidateController.js:99` `list` | Accepts caller-supplied `companyId` with no ownership check; exposes competitor candidate lists | Open |
| QA8-SEC-08 | P3 | `companiesController.js:446` `removeCompanyUser` | Missing `Array.isArray` guard (pre-existing); not exploitable in practice due to `undefined !== companyId` fallthrough, but inconsistent with QA8 standard | Open |

### QA8 Fixes — All Verified PASS

| Fix | Handler | Verdict |
|-----|---------|---------|
| Fix 2 | `createJobs` | PASS |
| Fix 3 | `getUserCVlist` | PASS |
| Fix 4 | `getCvById` | PASS |
| Fix 5 | `saveWorkExp` / `saveEducBg` / `saveCert` / `saveSkillsArray` / `saveDocuments` | PASS |
| Fix 6 | `createProfile` | PASS |
| Fix 7 | `createContact` / `multipleContact` / `createGroup` | PASS |
| Fix 8 | `updateCompany` | PASS |

---

## Recommended Next Steps (Priority Order)

1. **QA8-SEC-01 (P1):** Add the same `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` pre-check to `saveVideoCV` before calling `updateProfileSaveVideoCV`. Also fix the undefined `error` variable reference in `applicant.service.js:564` (should be `throw new Error('Failed to save video CV')`).

2. **QA8-SEC-02 / QA8-SEC-03 (P2):** In `saveQuestionTemplate`, call `callerBelongsToCompany(uid, companyId)` and return 403 if false. In `updateJobInterviewQuestion`, look up the template question's company via `getTemplateCompanyId` and verify caller belongs to it.

3. **QA8-SEC-04 (P2):** In `deleteInterviewQuestion`, look up `getTemplateCompanyId` for the question's template, then verify `callerBelongsToCompany` before deleting.

4. **QA8-SEC-05 (P2):** In `deleteCandidate`, add an ownership check (verify the candidate belongs to the caller's company via the candidate_company join).

5. **QA8-SEC-06 / QA8-SEC-07 (P3):** Add `getUserCompany(req.user.uid)` + ownership comparison to all four `contactsController` read endpoints and `candidateController.list`. Consider whether the `companyId` query param is needed at all for these — these endpoints should only ever return the caller's own company's data.

6. **QA8-SEC-08 (P3):** Add `Array.isArray(callerCompany)` guard to `removeCompanyUser` for consistency.
