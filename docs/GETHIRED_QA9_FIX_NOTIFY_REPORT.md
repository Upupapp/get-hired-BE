# GetHired QA9 Fix Sprint — NOTIFY / Copy Audit Report

Scope: All new 403 messages added in QA9 across BE controllers, plus error propagation
and FE toast copy for the changeJobStatus flow.

---

## 1. New 403 Message Copy Review

### Established pattern

All QA7/QA8 guards already in production use the JSON shape:
```json
{ "message": "You don't have permission to do that." }
```
with HTTP 403. That is the reference pattern for this review.

### QA9 additions — file-by-file

#### applicantsController.js

| Function | 403 trigger | Message emitted |
|---|---|---|
| `createApplication` | (no 403 added — candidateId now JWT-derived, no explicit 403 guard) | n/a |
| `deleteApplication` | (same — no explicit 403, just JWT derivation) | n/a |
| `saveVideoCV` | Caller's `uid` does not own `applicantProfileId` | `"You don't have permission to do that."` |

**saveVideoCV assessment:**
- Consistent with the established pattern. Pass.
- Does not leak the victim's `applicantProfileId`, `user_id`, or any existence signal. The ownership query returns `SELECT 1` — a zero-row result is indistinguishable from a non-existent ID. Pass.
- Appropriate for applicant-facing context. Pass.

#### companiesController.js

| Function | 403 trigger | Message emitted |
|---|---|---|
| `addCompanyUser` | Caller has no company (array/null/missing `companyId`) | `"You don't have permission to do that."` |
| `removeCompanyUser` | Caller's company does not match requested `companyId` | `"You don't have permission to do that."` |

**Assessment:**
- Both consistent with the established pattern. Pass.
- `addCompanyUser`: derives `companyId` entirely from the JWT; the body-supplied emails are the only payload that reaches the operation. No company information is leaked by the 403. Pass.
- `removeCompanyUser`: the `callerCompany.companyId !== companyId` branch does not confirm whether the target company exists; an attacker learns only that their token does not authorise the action. Pass.
- Both employer-facing. Appropriate context. Pass.

#### interviewController.js

| Function | 403 trigger | Message emitted |
|---|---|---|
| `saveQuestionTemplate` | Caller has no company | `"You don't have permission to do that."` |
| `updateJobInterviewQuestion` | Caller has no company, OR question does not belong to caller's company | `"You don't have permission to do that."` |

**saveQuestionTemplate assessment:**
- Consistent with the established pattern. Pass.
- `companyId` is derived from JWT, never from the request body. No template existence information is leaked. Pass.

**updateJobInterviewQuestion assessment:**
- Two 403 branches, both emitting the same generic message. The second branch (ownerCheck) does not confirm whether the question exists for a different company — the SELECT returns zero rows whether the ID is invalid or belongs to another company. Pass.
- Employer-facing. Appropriate. Pass.

#### jobsController.js

| Function | 403 trigger | Message emitted |
|---|---|---|
| `deleteInterviewQuestion` | Caller has no company, OR question does not belong to caller's company | `"You don't have permission to do that."` |
| `getJobApplicantFitSignals` | Service throws `Error("FORBIDDEN")` | `"You don't have permission to do that."` |

**deleteInterviewQuestion assessment:**
- Two 403 branches, both generic. Same information-suppression logic as `updateJobInterviewQuestion`. Pass.

**getJobApplicantFitSignals assessment:**
- Controller catches `error.message === "FORBIDDEN"` specifically and returns a JSON 403. Any other error falls through to the generic 500 handler. Pass.
- The message does not reveal why the caller is forbidden or whether the job ID exists. Pass.

#### candidateController.js

| Function | 403 trigger | Message emitted |
|---|---|---|
| `deleteCandidate` | Caller has no company | `"You don't have permission to do that."` |
| `deleteCandidate` | `rowCount === 0` (not found OR company mismatch) | `"You don't have permission to delete this candidate."` |

**Assessment:**
- The first branch is the standard generic message. Pass.
- The second branch is action-specific: `"You don't have permission to delete this candidate."` — this is a minor deviation from the established pattern. It is still generic (no ID, no existence confirmation), and the action-specific phrasing is not a security concern. Minor stylistic inconsistency only.
- Employer-facing. Appropriate. Pass.

#### contactsController.js (list and grouplist functions)

| Function | 403 trigger | Message emitted |
|---|---|---|
| `list` | Caller has no company | `"You don't have permission to do that."` |
| `grouplist` | Caller has no company | `"You don't have permission to do that."` |

**Assessment:**
- Both consistent with the established pattern. Pass.
- `list` and `grouplist` derive `companyId` from JWT. The 403 fires when the caller has no company association, not when a specific resource is denied — no resource existence signal. Pass.
- Employer-facing. Appropriate. Pass.

---

## 2. saveVideoCV 403 — Victim Profile Protection

**Path:** `applicantsController.js` → `saveVideoCV`

When an applicant submits a `saveVideoCV` request with an `applicantProfileId` that belongs to another user, the ownership query is:
```sql
SELECT 1 FROM applicants_profile WHERE applicant_profile_id=$1 AND user_id=$2
```
Zero rows — whether the `applicantProfileId` does not exist, or exists but belongs to someone else — returns the same 403:
```json
{ "message": "You don't have permission to do that." }
```

**Verdict:** Appropriately generic. The victim's profile is not confirmed or referenced. The message is identical whether the ID is invalid or belongs to another user. No information leak. Pass.

---

## 3. Interview Template 403 — Existence Oracle Check

**Path:** `interviewController.js` → `updateJobInterviewQuestion`

When an employer tries to update a question belonging to another company's template, the ownership query is:
```sql
SELECT itq.template_question_id
FROM interview_template_question itq
JOIN job_interview_template jit ON jit.job_interview_template_id = itq.job_interview_template_id
WHERE itq.template_question_id=$1 AND jit.company_id=$2
```
Zero rows fires:
```json
{ "message": "You don't have permission to do that." }
```

**Verdict:** The message does not confirm the template or question exists. The compound JOIN + WHERE means a cross-company query and a non-existent ID both return zero rows and the same 403. No existence oracle. Pass.

`saveQuestionTemplate` has no per-template ownerCheck; it derives `companyId` from JWT and writes to the caller's company only, so no existence leak is possible there either. Pass.

---

## 4. `throw new Error('Failed to save video CV')` — Does It Reach the Client?

**Path:** `applicant.service.js` → `updateProfileSaveVideoCV` (line 567)

The service function's `catch` block re-throws:
```js
} catch (error) {
  throw error;
}
```

This propagates to the controller's `catch` block in `saveVideoCV` (`applicantsController.js`, line 525):
```js
} catch (error) {
  console.error('[applicantsController] error:', error);
  errorMessage.error = "Operation not successful. Please try again.";
  return res.status(status.error).send(errorMessage);
}
```

**Verdict:** The `Error('Failed to save video CV')` message is logged server-side via `console.error` but is **not** sent to the client. The controller replaces it with the generic `"Operation not successful. Please try again."` before responding. The service-level error message never reaches the response body. Pass.

---

## 5. jobError$ Toast Copy — changeJobStatus 403

**Flow traced:**

1. `changeJobStatus$` effect in `job.effects.ts` (line 158):
   - On 403: `body = err.error` → `payload = body.error || body.message || 'Unable to update job status. Please try again.'`
   - A BE 403 with `{ "message": "You don't have permission to do that." }` resolves `payload` to `"You don't have permission to do that."`

2. `changeJobStatusFail` reducer stores `action.payload` in `state.error`.

3. `jobError` selector: `state => state.error`

4. `job-list.component.ts` (`src/app/job/job-list/job-list.component.ts`, lines 139–148):
```ts
this.req.add(
  this.jobFacade.jobError$.pipe(takeUntil(this.unsubscribe$)).subscribe((err) => {
    if (err) {
      this.snackBar.open(err, '', {
        duration: 4000,
        panelClass: ['danger-snackbar'],
      });
    }
  })
);
```

**What the user sees:** A red snackbar reading exactly `"You don't have permission to do that."` for 4 seconds, no dismiss button.

**Is it actionable?**

Marginally. The user knows the action was rejected, but the message gives no guidance on what to do next (e.g., "Contact your company admin" or "You can only change status for your own job postings"). This is consistent with every other 403 in the codebase, and the conservative choice (no direction is better than a wrong direction). No change recommended unless a broader copy revision is planned.

**Fallback message:** If `err.error` is missing entirely (network error, unparseable body), the effect fallback `'Unable to update job status. Please try again.'` is both accurate and actionable. Pass.

---

## 6. Forbidden Content Check

All new 403 messages reviewed against the forbidden-content checklist:

| Check | Result |
|---|---|
| Fake counts or metrics | None found. Pass. |
| False urgency language | None found. Pass. |
| AI claims ("AI-powered", etc.) | None found. Pass. |
| Stack traces or internal detail | None found. Pass. |
| Table/column names exposed in user-facing copy | None found. The only table/column references are in `console.error` log lines, not response bodies. Pass. |
| IDs exposed in 403 bodies | None found. Pass. |

All new messages are clean.

---

## 7. Safe Copy Fixes Applied

### Finding 1 — Minor stylistic inconsistency (candidateController.js)

`deleteCandidate` emits `"You don't have permission to delete this candidate."` on `rowCount === 0`, differing from the established `"You don't have permission to do that."` used everywhere else.

**Risk:** None (no security or UX impact). The message is generic and correct.
**Recommendation:** Normalise to the standard phrase for consistency, but this is low priority and not a blocker.
**Action taken:** No code change applied. The deviation is documented only.

### Finding 2 — interviewController.js uses bare string `'Forbidden'` in older guards

Pre-QA9 guards in `getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId`, `getInterviewTemplateQuestions` still use `res.status(403).send('Forbidden')` (bare string, not JSON). These are out of QA9 scope but represent a response-shape inconsistency with all other 403 responses.
**Action taken:** Documented. No change made (out of scope for this sprint).

---

## Summary

| Task | Status |
|---|---|
| 1. New 403 message copy review — all files | All pass. Consistent, generic, leak-free. |
| 2. saveVideoCV 403 — victim profile protection | Pass. Generic, no existence oracle. |
| 3. Interview template 403 — existence oracle | Pass. Compound-join suppresses existence confirmation. |
| 4. `throw new Error('Failed to save video CV')` reach | Does not reach client. Controller catch replaces it with generic message. |
| 5. jobError$ toast copy | Pass. Shows BE message verbatim. Marginally actionable, consistent with codebase standard. |
| 6. Forbidden content check | All new messages clean. |
| 7. Safe copy fixes | One minor inconsistency documented (candidateController), no change applied. One pre-existing bare-string 403 pattern in interviewController noted for a future pass. |

No blocking copy issues found. No changes required to ship QA9.
