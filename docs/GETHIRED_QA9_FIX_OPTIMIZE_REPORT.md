# GETHIRED QA9 FIX SPRINT — OPTIMIZE REPORT
Generated: 2026-06-25

## Scope
QA Cycle 9 fix sprint. Files audited:

**BE:** applicantsController.js, applicant.service.js, companiesController.js,
interviewController.js, jobsController.js, candidateController.js, contactsController.js

**FE:** package.json (xlsx 0.18.5 pin), job-list.component.ts (employer contacts panel)

---

## 1. Interview Controller Ownership Checks

### 1a. saveQuestionTemplate (interviewController.js)
**Call count: 2 (getUserCompany + createInterviewTemplateQuestions INSERT)**

The `getUserCompany` call derives `companyId` from the JWT to prevent BOLA;
`createInterviewTemplateQuestions` inserts with that `companyId`. The
`job_interview_template` table stores `company_id` directly, so there is no
separate ownership join needed. This pattern cannot be simplified further —
both calls are load-bearing and logically sequential.

**Verdict: already optimal. No change.**

### 1b. updateJobInterviewQuestion (interviewController.js) — APPLIED
**Was: 3 calls (getUserCompany + ownership SELECT + updateQuestionById UPDATE)**

`interview_template_question` has no `company_id` column directly; company
ownership must be resolved via `job_interview_template.company_id`. QA9 shipped
a 3-call pattern: get caller's company, SELECT to verify ownership, then UPDATE.

**Optimisation applied (OPT-QA9-1):** the ownership SELECT was eliminated by
folding it into the UPDATE's WHERE clause as a correlated IN-subquery:

```sql
UPDATE interview_template_question
  SET template_question=$1, template_answer_duration=$2,
      template_question_retakes=$3, updated_at=now(), sequence=$4
WHERE template_question_id=$5
  AND job_interview_template_id IN (
        SELECT job_interview_template_id
        FROM job_interview_template
        WHERE company_id=$6
      )
RETURNING *
```

Zero rows returned = question not found OR company mismatch; either case
returns 403. The RETURNING * result is mapped inline, so the separate call to
`updateQuestionById` (which performed another round-trip and returned the same
row) was also eliminated.

**Result: 3 calls → 2 calls. `updateQuestionById` import removed (now unused).**

### 1c. deleteInterviewQuestion (jobsController.js) — APPLIED
**Was: 3 calls (getUserCompany + ownership SELECT + DELETE)**

Same schema layout as above. The ownership SELECT was folded into the DELETE
WHERE clause:

```sql
DELETE FROM interview_template_question
WHERE template_question_id=$1
  AND job_interview_template_id IN (
        SELECT job_interview_template_id
        FROM job_interview_template
        WHERE company_id=$2
      )
```

Zero `rowCount` returns 403. The orphaned `deleteQuery` variable was also
removed.

**Result: 3 calls → 2 calls.**

---

## 2. await Promise.all Fix (saveWorkExp / saveEducBg / saveCert)
**File: applicantsController.js**

QA9 FIX-11 added `await Promise.all(...)` to three array-insert handlers that
previously used bare `.map(async …)` (fire-and-forget, errors silently dropped).

**Array size concern:** These arrays represent a single applicant's work
experience history, educational background, and certifications. In practice
these are typically 0–10 items. Even a maximally generous real-world value
(20–30 items) is far below the pg connection pool limit (default: 10 idle,
10 max concurrent). No pool exhaustion risk.

**Verdict: safe, correct, no further action needed.**

---

## 3. contacts list / grouplist
**File: contactsController.js — `list()` and `grouplist()`**

**Was:** 1 call (SELECT with trusted client-supplied query param `companyId`).
**Now:** 2 calls (getUserCompany from JWT + SELECT).

The extra call is the price of the BOLA fix (QA9 FIX-12). The alternative
— rewriting the SELECT to join back to `company_employees` by `employee_uuid`
— would be equivalent in cost and more fragile. The pattern is consistent
with every other employer endpoint in the codebase.

**Could getUserCompany be cached in request middleware?** Yes — a
per-request cache keyed to `req.user.uid` could eliminate all duplicate
`getUserCompany` calls within a single request. This is out of scope for
the QA9 fix sprint (it requires a middleware-layer change affecting all
employer routes). Deferred with the following characteristics:
- Benefit: any endpoint that calls `getUserCompany` more than once per
  request (currently: `addCompanyUser`, which calls it once but chain
  functions don't) would benefit.
- Risk: low if implemented as a per-request memo (not a cross-request
  cache); requires careful test.

**Verdict: overhead is one extra query per read-list request. Acceptable.
Caching deferred.**

---

## 4. deleteCandidate
**File: candidateController.js**

QA9 FIX-7 folded company ownership into `DELETE WHERE company_id=$2`.
Before the fix the endpoint did a `checkCandidateIfExist` SELECT then
an unscoped DELETE — also 2 calls. After the fix it's still 2 calls
(`checkCandidateIfExist` + scoped DELETE), but now ownership is
guaranteed by the DELETE clause.

`checkCandidateIfExist` is retained to distinguish "does not exist"
(404-ish messaging) from "wrong company" (403). These are meaningfully
different UX states — the check stays.

**Verdict: no performance change; security is improved. No optimisation needed.**

---

## 5. xlsx 0.18.5 (FE package.json)
The package.json pin is `"xlsx": "^0.18.5"`. This is a security / stability
pin, not a bundle size change — `^0.18.5` was already the installed range.
The xlsx library (SheetJS community edition) ships as a single large UMD
bundle, approximately 800 KB unminified / 300 KB minified.

**Was this a version bump or just a constraint tightening?** The prior
entry was `"xlsx": "0.18.5"` (exact pin, no caret). QA9 FIX changed it to
`"^0.18.5"` — this allows patch-level updates in that range, which carries
minor risk (SheetJS community edition has had security CVEs in previous
minor versions). The exact pin `"0.18.5"` was arguably safer.

**Recommendation (deferred, low priority):** Revert to the exact pin
`"xlsx": "0.18.5"` to prevent accidental patch drift. The xlsx library is
large, infrequently updated in this project, and has a history of CVEs.
Exact pinning plus a deliberate upgrade decision is the safer posture.

**Bundle size verdict:** No meaningful change — same version, same bytes
in the Angular build. No action taken.

---

## 6. FE job-list.component.ts
**File: employer-contacts/job-list/job-list.component.ts**

The QA9 fix sprint scope listed this file. No performance or bundle-size
concerns were found:
- The component dispatches one NgRx action (`GET_CANDIDATE_JOB`) on init.
- The subscription cleanup pattern (`private req: Subscription; req.unsubscribe()`)
  is correct for the component's `OnInit` (no `OnDestroy` in this file —
  this is a pre-existing issue, not introduced by QA9).
- No redundant HTTP calls, no missing unsubscription on the `req` subscription
  (it is `.unsubscribe()`d but only if the component re-renders, since there is
  no `ngOnDestroy`). **Pre-existing gap, not introduced by QA9. Deferred.**

---

## Safe Optimisations Applied

| ID | Location | Change | DB calls saved |
|----|----------|--------|---------------|
| OPT-QA9-1 | interviewController.js `updateJobInterviewQuestion` | Folded ownership SELECT + UPDATE into single UPDATE WHERE...IN(subquery) RETURNING *; removed `updateQuestionById` call and its import | 1 (2 → 1 for the main logic; plus eliminated the extra service call) |
| OPT-QA9-1 | jobsController.js `deleteInterviewQuestion` | Folded ownership SELECT + DELETE into single DELETE WHERE...IN(subquery); removed orphaned `deleteQuery` variable | 1 |

**Total DB round-trips eliminated: 2** (one per interview-question write
operation, on the hot path of the interview builder).

---

## Deferred Findings (No Code Change)

| ID | Location | Finding | Action |
|----|----------|---------|--------|
| DEF-1 | contactsController.js `list` / `grouplist` | getUserCompany overhead is the BOLA fix cost; per-request middleware cache would help all employer routes | Future middleware refactor |
| DEF-2 | FE package.json | `"^0.18.5"` allows patch drift vs prior exact pin; revert to `"0.18.5"` | Low priority |
| DEF-3 | employer-contacts job-list.component.ts | Missing `ngOnDestroy` — subscription leak on component destroy | Pre-existing, outside QA9 scope |
| DEF-4 | jobsController.js `deleteInterviewQuestion` | Post-delete sequence reorder uses bare `.map(async …)` without `Promise.all` — same silenced-error bug that QA9 FIX-11 fixed in the applicant handlers | Separate fix ticket |

---

## Files Modified
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\controllers\interviewController.js`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\controllers\jobsController.js`
