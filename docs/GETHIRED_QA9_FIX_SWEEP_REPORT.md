# GETHIRED QA9 FIX SWEEP REPORT

**Generated:** 2026-06-25  
**Scope:** QA9 fix sprint — 10 BE files + 2 FE files  
**Auditor:** Claude Code SWEEP (full file read)

---

## Overall Verdict

**PASS with 4 findings (0 P0, 1 P1, 2 P2, 1 P3).**

All 13 targeted fixes are present and correctly implemented. No security regression was introduced. Three new issues were found: one functional regression risk (P1), one pre-existing crash risk that the sprint could have closed (P2), and one FE memory-leak gap (P2), plus one code-quality gap (P3).

---

## Fix-by-Fix Correctness

### Fix 1 — deleteApplication / createApplication (applicantsController.js)

| Check | Result |
|---|---|
| `req.user.uid` used as `candidateId` in both handlers | PASS |
| deleteApplication WHERE clause includes `candidate_id=$2` with `req.user.uid` | PASS — `DELETE … WHERE application_id=$1 AND candidate_id=$2` |
| ReferenceError for `candidateId` is gone | PASS — `const candidateId = req.user.uid` is defined before use |
| createApplication still works for legitimate applicants | PASS — inserts `(jobId, candidateId, now(), status)` normally; `candidateId` is now the JWT uid, which is correct |

**PASS — Fix 1 is correct and complete.**

Note: `getApplicationWithJobDetails` (line 145) contains a pre-existing SQL syntax error — `on a.candidate_id = c a.candidate_id` — that is **not** part of Fix 1's scope and is logged as a separate finding (P3 below).

---

### Fix 2 — saveVideoCV ownership + crash (applicantsController.js + applicant.service.js)

| Check | Result |
|---|---|
| Ownership pre-check before any storage write | PASS — `SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2` runs before `updateProfileSaveVideoCV` |
| `throw error` replaced in service | PASS — replaced with `throw new Error('Failed to save video CV')` (line 567 of applicant.service.js) |
| Successful uploads still handled correctly | PASS — `updateProfileSaveVideoCV` returns `{ videoCVUrl, updatedAt }` and controller forwards it to the success response |

**PASS — Fix 2 is correct and complete.**

---

### Fix 3 — addCompanyUser (companiesController.js)

| Check | Result |
|---|---|
| `companyId` JWT-derived from `getUserCompany(req.user.uid)` | PASS — lines 497–500 |
| Array.isArray guard applied | PASS — `Array.isArray(callerCompany)` |
| Target `companyId` verified to match caller's company | PASS — `companyId` is derived solely from the JWT; there is no separate body-supplied companyId path |

**PASS — Fix 3 is correct and complete.**

Minor observation: `addCompanyUser` iterates `emails` with `.map()` wrapped in `Promise.all(await emails.map(...))`. The `await` before `.map()` is redundant (`.map` returns an array, not a promise), but this is a pre-existing code smell and does not break correctness.

---

### Fixes 4 + 5 + 6 — saveQuestionTemplate / updateJobInterviewQuestion / deleteInterviewQuestion

| Check | Result |
|---|---|
| saveQuestionTemplate: `companyId` JWT-derived | PASS — `getUserCompany(uid)` → `callerCompany.companyId` (interviewController.js line 117–121) |
| updateJobInterviewQuestion: join-based ownership check | PASS — joins `interview_template_question` to `job_interview_template` on `job_interview_template_id`, checks `jit.company_id=$2` (interviewController.js lines 170–177) |
| deleteInterviewQuestion: same join-based check | PASS — identical join pattern in jobsController.js lines 702–713 |
| `dbQuery` and `dbSchema` imports present in interviewController.js | PASS — `import dbQuery from '../db/dbQuery'` (line 15) and `const dbSchema = env.schema` (line 19) |

**PASS — Fixes 4, 5, 6 are correct and complete.**

---

### Fix 7 — deleteCandidate (candidateController.js)

| Check | Result |
|---|---|
| Ownership check folded into `DELETE WHERE candidate_id=$1 AND company_id=$2` | PASS — lines 82–88 |
| `company_id` derived from `getUserCompany(req.user.uid)` | PASS |
| Multi-company scenario | The `candidates` table has a `company_id` set at import time; a candidate record is owned by exactly one company. Zero `rowCount` returns 403. This is correct for the data model. |

**PASS — Fix 7 is correct and complete.**

---

### Fix 8 — xlsx (FE package.json)

| Check | Result |
|---|---|
| `package.json` updated to `xlsx ^0.18.5` | PASS — line 60 of FE package.json: `"xlsx": "^0.18.5"` |
| Breaking API changes visible in usage | None detected — `excel-downloader.service.ts` uses `XLSX.utils.json_to_sheet`, `XLSX.write`, `{ bookType: 'csv', type: 'array' }`. All three APIs are unchanged between 0.17 and 0.18. |

**PASS — Fix 8 is correct.**

---

### Fix 9 — removeCompanyUser guard (companiesController.js)

| Check | Result |
|---|---|
| Array.isArray guard present | PASS — `Array.isArray(callerCompany)` on line 459 |
| 403 response is JSON | PASS — `res.status(403).json({ message: "You don't have permission to do that." })` |

**PASS — Fix 9 is correct and complete.**

---

### Fix 10 — getJobApplicantFitSignals (jobsController.js)

| Check | Result |
|---|---|
| "Forbidden" now JSON `{ message: "..." }` | PASS — `res.status(403).json({ message: "You don't have permission to do that." })` on line 684 |

**PASS — Fix 10 is correct.**

---

### Fix 11 — await Promise.all (applicantsController.js)

| Check | Result |
|---|---|
| `saveWorkExp`: wrapped with `await Promise.all` | PASS — lines 324–329 |
| `saveEducBg`: wrapped with `await Promise.all` | PASS — lines 363–368 |
| `saveCert`: wrapped with `await Promise.all` | PASS — lines 402–407 |
| `saveDocuments`: already had `await Promise.all` | PASS — unchanged, still correct (lines 478–489) |
| `saveSkillsArray`: was it also fixed? | **GAP** — `saveSkillsArray` (lines 419–455) still calls `saveApplicantDetailsList` directly (no `.map(async)` + `Promise.all` needed — the service itself does `Promise.all` internally), so the pattern is different and the risk is lower. However, there is an unused `skillArr` variable (line 439) with no `await`. The service `saveApplicantDetailsList` does use `await Promise.all` internally, so skills are actually safe. Not a Fix 11 gap. |

**PASS — Fix 11 is correct. `saveSkillsArray` does not need the same fix (service owns the Promise.all).**

---

### Fix 12 — contacts list / grouplist (contactsController.js)

| Check | Result |
|---|---|
| `companyId` JWT-derived in `list` | PASS — `getUserCompany(req.user.uid)` → `callerCompany.companyId` (lines 161–165) |
| `companyId` JWT-derived in `grouplist` | PASS — same pattern (lines 189–193) |
| Array.isArray guard applied in both | PASS |

**PASS — Fix 12 is correct and complete.**

---

### Fix 13 — jobError$ deduplication (job-list.component.ts)

| Check | Result |
|---|---|
| Exactly one subscription to `jobError$` | PASS — only one subscription exists, inside `ngOnInit` at lines 139–148. The class-field duplicate was removed and replaced with the comment at lines 72–76 |
| Kept subscription uses proper cleanup | PARTIAL — `req.add(this.jobFacade.jobError$.pipe(takeUntil(this.unsubscribe$)).subscribe(...))` adds to the `req` Subscription AND uses `takeUntil(unsubscribe$)`. In `ngOnDestroy`, `this.req.unsubscribe()` is called. However, `unsubscribe$` is never completed (`unsubscribe$.next()` / `unsubscribe$.complete()` are missing from `ngOnDestroy`). This means `takeUntil` never fires its terminal signal, and the subscription relies entirely on `req.unsubscribe()` for teardown. Since `req.unsubscribe()` IS called, the sub is cleaned up — but the `takeUntil` is effectively decorative. Not a crash risk; mild code smell. |
| `JobListComponent` implements `OnDestroy` | **GAP** — class declaration is `implements OnInit` only (line 33). `ngOnDestroy` is present and called by Angular, but the `OnDestroy` interface is not declared. This is a TypeScript contract omission — Angular will still call `ngOnDestroy`, so there is no runtime impact, but it means the compiler cannot enforce the method signature. |

**PASS (functional) with P2 note on missing `OnDestroy` interface declaration.**

---

## Regression Scan

### createApplication locked to req.user.uid — employer impact?

No regression. The `createApplication` endpoint is applicant-side: an applicant applies to a job. There is no employer use case for this endpoint. Employer application management goes through separate endpoints (`getAllApplicantOfJob`, `getJobApplicantFitSignals`, etc.) which are not touched.

### deleteCandidate with company_id check — multi-company scenarios?

No regression. The `candidates` table holds imported contacts/candidates with a single `company_id` set at import time. A candidate record belongs to exactly one company; the ownership check is correct. An employer from Company A cannot delete Company B's candidate records.

### contacts list / grouplist with JWT-derived companyId — FE regression?

**P1 FINDING — regression risk.** The FE service `contacts.service.ts` (line 16) calls `GET /contacts/list?companyId=${data.payload}` passing `companyId` as a query param. After Fix 12, the BE `list` handler ignores the query param entirely and derives `companyId` from JWT. This is a **correct security fix** and produces correct data, but there is a mismatch: the FE still sends the query param (harmlessly ignored) and the BE ignores it. The functional result is correct as long as the JWT user belongs to exactly one company (which is the current data model). However, the FE service call continues to pass a stale companyId value — if that value is null/undefined (e.g., before the company is loaded into the store), the call will still succeed on the BE (JWT-derived), but a future FE developer might not realize the param is now ignored. This is **not a current functional bug**, but the FE service should be updated to remove the now-ignored query param to avoid confusion.

Similarly, `groups.service.ts` (line 16) calls `GET /groups/list?companyId=${data.payload}`. The `/groups/list` route maps to `list2` which still reads `req.query.companyId` (Fix 12 only fixed `list` and `grouplist`). This means `list2` is **still vulnerable** to BOLA — any employer can read another company's group data. See P1 finding below.

### xlsx 0.18.5 — export functionality?

No regression. The only xlsx consumer is `excel-downloader.service.ts` using `json_to_sheet`, `WorkBook`, and `write` with `{ bookType: 'csv', type: 'array' }`. These APIs are stable across 0.17 → 0.18. The change from 0.17.5 to 0.18.5 also resolves a known prototype-pollution vulnerability (CVE-2023-30533), which is the purpose of the bump.

---

## New Issues Scan

### Remaining mutation endpoints not yet covered

1. `updateApplication` (applicantsController.js lines 85–113) — takes `candidateId` from `req.body` with no ownership check. The UPDATE SQL uses this body-supplied `candidateId` directly (`SET candidateId=$2`). This is a BOLA risk: an authenticated user could update another applicant's application by supplying a different `candidateId`. This endpoint has a pre-existing malformed SQL alias (`c a.candidate_id`) in `getApplicationWithJobDetails` that would crash the post-update read, so this path is already broken — but the input is still unvalidated.

2. `contactslist` (contactsController.js lines 323–344) — reads `req.query.companyId` with no JWT ownership check. Maps to `GET /groups/contactlist`. Any employer can read any company's contact-group list by supplying a different companyId. Fix 12 missed this handler.

3. `list2` (contactsController.js lines 385–406) — reads `req.query.companyId` with no JWT ownership check. Maps to `GET /groups/list`. Any employer can read any company's full group list.

4. `getAllCompanyUser` (companiesController.js lines 474–486) — reads `req.query.id` with no JWT ownership verification. Any authenticated employer can list users of any company by supplying a different company id.

### Remaining crash risks

`getApplicationWithJobDetails` (applicantsController.js lines 136–155) contains a SQL syntax error: `on a.candidate_id = c a.candidate_id` (line 145). This will throw a PostgreSQL syntax error on every call to `updateApplication`. This is pre-existing and not introduced by QA9, but it means `updateApplication` has been broken for all environments.

### Remaining raw error patterns

`getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId`, `getInterviewTemplateQuestions` in interviewController.js (lines 35, 51, 67, 83) all return `res.status(403).send('Forbidden')` as a bare string. Fix 5 applied JSON shape to `updateJobInterviewQuestion` but the four read endpoints were not updated. These should return `res.status(403).json({ message: "..." })` for consistency with every other endpoint in the codebase.

---

## Findings Table

| ID | Priority | File | Issue | Status |
|---|---|---|---|---|
| QA9-F1 | P1 | contactsController.js (contactslist, list2) + groups.service.ts | `contactslist` and `list2` handlers still read `companyId` from query param with no JWT ownership check. Fix 12 missed both. Any employer can read any company's contact-group and group data. | New — not yet fixed |
| QA9-F2 | P2 | contactsController.js (contactslist) + groups.service.ts | `GET /groups/contactlist` passes `companyId` from FE query param; BE ignores JWT. Same BOLA pattern as Fix 12 was meant to close. | New — not yet fixed |
| QA9-F3 | P2 | job-list.component.ts | `JobListComponent` declares `implements OnInit` but not `OnDestroy`. `unsubscribe$` is never completed in `ngOnDestroy` (missing `.next()` / `.complete()`), making `takeUntil` decorative. Cleanup works via `req.unsubscribe()` but TypeScript contract is incomplete and the `takeUntil` is misleading. | New — not yet fixed |
| QA9-F4 | P2 | applicantsController.js (updateApplication) | `updateApplication` takes `candidateId` from `req.body` with no ownership check — BOLA risk. The handler is also partially broken by the pre-existing SQL syntax error in `getApplicationWithJobDetails`. | Pre-existing, not in scope of QA9 |
| QA9-F5 | P3 | applicantsController.js (getApplicationWithJobDetails) | SQL syntax error `on a.candidate_id = c a.candidate_id` — will crash every `updateApplication` call. Pre-existing, not introduced by QA9. | Pre-existing |
| QA9-F6 | P3 | interviewController.js | Four read-only `callerBelongsToCompany` rejection paths return bare string `'Forbidden'` instead of `{ message: "..." }`. Inconsistent with all other 403 responses in the codebase. | Pre-existing, Fix 5 only patched the mutation path |
| QA9-F7 | P3 | contacts.service.ts + groups.service.ts (FE) | FE services still pass `companyId` as a query param to `/contacts/list` and `/groups/list`. The BE now ignores these params (JWT-derived). Harmless today; confusing for future maintainers. | Code-smell consequence of Fix 12 |

---

## Summary

All 13 QA9 sprint fixes verified correct and complete. No security regression was introduced. The most important new finding is **QA9-F1 (P1)**: `contactslist` and `list2` were not covered by Fix 12 and remain BOLA-vulnerable — any authenticated employer can read any company's contact-group list by supplying a different `companyId`. This should be addressed in QA10.
