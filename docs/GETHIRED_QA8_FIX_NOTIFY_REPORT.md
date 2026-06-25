# GetHired QA8 Fix Sprint — NOTIFY / Copy Audit Report

**Date:** 2026-06-25
**Scope:** BE new 403 messages (jobsController, cvController, applicantsController, contactsController, companiesController) + FE changeJobStatus$ error surfacing.

---

## 1. BE 403 Message Copy Audit

### 1.1 Pattern Inventory

All new QA8 403 responses use `.json({ message: "..." })` — consistent with established pattern.
Messages fall into two buckets:

| Bucket | Message text | Used in |
|--------|-------------|---------|
| Generic | `"You don't have permission to do that."` | createJobs, getAllApplicantOfJob, updateStatusOfJob (caller has no company), saveWorkExp, saveEducBg, saveCert, saveSkillsArray, saveDocuments, createContact, multipleContact, createGroup, updateGroup, deleteContact (no company), deleteGroup (no company), updateCompany |
| Resource-specific | `"You don't have permission to [verb] this [resource]."` | deleteJob, updateJob, updateStatusOfJob (ownership mismatch), getCvById, updateCV, deleteCV, deleteContact (ownership mismatch), deleteGroup (ownership mismatch), updateContact, updateGroup |

### 1.2 Consistency Assessment — PASS

All new messages follow the two established forms exactly. No message deviates in casing, punctuation, or verb form. The split between generic ("do that") and resource-specific ("delete this job") is consistent and principled:

- Generic is used when the *caller has no company at all* (identity/role failure).
- Resource-specific is used when the *caller has a company but does not own the resource* (ownership failure).

This is the correct distinction. No action required.

### 1.3 Information Leak Check — PASS

No message reveals:
- Internal IDs or field values
- Whether a resource exists (zero-rows and ownership-mismatch both return the same 403 message)
- Stack traces, query details, or DB schema names
- The actual owner of a resource

The "does not exist vs. not yours" ambiguity is intentional and correct.

### 1.4 Context Appropriateness Check — PASS

- **Applicant-facing endpoints** (cvController, applicantsController sub-array saves, createProfile): messages are neutral and do not expose employer-side concepts.
- **Employer-facing endpoints** (jobsController, contactsController, companiesController): messages are neutral and do not expose applicant-side concepts.
- No message uses "applicant" or "employer" as a role label in the error text, which is appropriate — role labels in error messages can be used to probe role boundaries.

### 1.5 Forbidden Content Check — PASS

Checked all new 403 messages for:

| Forbidden item | Present? |
|----------------|----------|
| Fake counts / urgency copy | No |
| AI claims | No |
| Stack / internal details | No |
| Absolute promises ("always", "guaranteed") | No |

---

## 2. FE changeJobStatus$ Error Copy

### 2.1 What the effect produces

`job.effects.ts` lines 167–173:

```typescript
catchError((err) => {
  const body = (err && err.error) || {};
  const payload: string = body.error || body.message || 'Unable to update job status. Please try again.';
  return of(JobActions.changeJobStatusFail({ payload }))
})
```

The fallback string `'Unable to update job status. Please try again.'` is the user-facing copy when no `error` or `message` key is present in the response body.

When the BE returns a QA8-style 403:
```json
{ "message": "You don't have permission to update this job." }
```
the `body.message` branch fires and the user sees `"You don't have permission to update this job."` — correct and specific.

### 2.2 Copy quality assessment — PASS with one caveat

**Fallback string ("Unable to update job status. Please try again."):**
- Clear and actionable. No fake urgency or AI claims.
- "Please try again" is appropriate here because a network timeout or 500 (not 403) is the likely cause when the fallback fires.
- Word count is appropriate for a toast/snackbar.

**Caveat — MEDIUM:** The 403-sourced message `"You don't have permission to update this job."` is technically correct for ownership failure but may be confusing to a legitimate employer who owns the job. The most common real-world trigger for this 403 on `changeJobStatus` is the `getUserCompany` returning `[]` (no company row), which means the user's account is not linked to a company — not that they are attacking someone else's job. A slightly more helpful copy for that case would be `"You don't have permission to do that."` (the generic form already used in `updateStatusOfJob` line 376). **However**, this is a BE-side copy decision and is out of scope for a safe FE copy fix. Flagged, not changed.

### 2.3 Where the error is surfaced — GAP IDENTIFIED

The error payload lands in `state.error` via the reducer (`job.reducer.ts` lines 82–89). The `jobError$` selector (`job.selector.ts` lines 110–113) exposes this, and `jobFacade.jobError$` is wired (`job.facade.ts` line 28).

**However, `job-list.component.ts` does not subscribe to `jobError$` or any error observable.** The component subscribes to `success$` (via `afterChange`) and `loading$`, but there is no `jobError$` subscriber, no `snackBar.open(...)` call on error, and no error display in `job-list.component.html`.

This means when `changeJobStatusFail` fires from the job-list page (the only page that dispatches `changeJobStatus`), the error string is stored in NgRx state but **never shown to the user**. The job status silently fails — the user sees the loading spinner stop but gets no feedback.

**This is a pre-existing gap, not introduced in QA8.** QA8 correctly normalized the error payload; the gap is that nothing consumes it in the component.

---

## 3. Safe Copy Fixes Applied

### 3.1 No BE changes needed

All BE messages are consistent, clean, and not leaking. No changes applied.

### 3.2 FE gap — changeJobStatus$ error not displayed

**Fix applied** in `job-list.component.ts`: subscribe to `jobFacade.jobError$` and show the error message via `MatSnackBar` when it is non-null. This is a minimal, safe addition that does not touch any other component, does not change success flows, and uses the same `MatSnackBar` already imported and injected in the component.

The fix:

```typescript
// In the class body, alongside success$ and loading$ subscriptions:
error$ = this.jobFacade.jobError$
  .pipe()
  .subscribe(this.onError.bind(this));

// New method:
onError(errorMsg: string | null) {
  if (errorMsg) {
    this.snackBar.open(errorMsg, 'Dismiss', {
      duration: 5000,
      panelClass: ['danger-snackbar'],
    });
  }
}
```

This ensures that when a 403 or 500 fires on `changeJobStatus`, the user sees the message (e.g. `"You don't have permission to update this job."` or the fallback `"Unable to update job status. Please try again."`) rather than a silent failure.

---

## 4. Residual Inconsistencies (Out of QA8 Scope, Not Fixed)

These pre-existing inconsistencies were observed during the audit. They are not introduced by QA8 and are not safe to fix in this sprint without broader regression risk:

| Location | Issue |
|----------|-------|
| `companiesController.js` `removeCompanyUser` (line 457) | Still returns bare `res.status(403).send("Forbidden")` — old pre-SECURE pattern, not changed in QA8 |
| `jobsController.js` `getJobApplicantFitSignals` (line 683) | Still returns bare `res.status(403).send("Forbidden")` — pre-existing, not a QA8 endpoint |
| `subscriptionController.js` (line 135) | Still returns bare `res.status(403).send("Forbidden")` — not in QA8 scope |
| `interviewController.js` (lines 32, 48, 64, 81) | Still returns bare string `'Forbidden'` — not in QA8 scope |
| `adminController.js` (line 17) | Still returns bare string `"Forbidden"` — not in QA8 scope |

These endpoints predate the QA8 `{ message: "..." }` normalization and use the old bare-string 403 shape. The FE effect for `changeJobStatus$` now handles both shapes (`body.error || body.message || fallback`), so the job-list flow is safe. The other endpoints should be normalized in a future QA pass.

---

## 5. Summary

| Item | Status |
|------|--------|
| All new 403 messages follow established pattern | PASS |
| No resource leakage in new 403 messages | PASS |
| Forbidden content (fake counts, urgency, AI, stack) | PASS — none present |
| changeJobStatus$ fallback copy is clear and actionable | PASS |
| changeJobStatus$ error surfaced to user in job-list | GAP — error stored in state but never displayed; safe fix applied in job-list.component.ts |
| Pre-existing bare-string 403 responses (out of scope) | NOTED — 5 locations, not fixed this sprint |
