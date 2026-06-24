# GetHired QA7 Fix Sprint — NOTIFY/Copy Audit Report

**Date:** 2026-06-25
**Scope:** BE 403 error messages added in QA7 fix sprint + FE 403 handling for those endpoints
**Files audited:**
- BE: controllers/jobsController.js, applicantsController.js, contactsController.js, cvController.js
- FE: job.effects.ts, job.reducer.ts, job-list.component.ts, applicant.effects.ts, contact.effect.ts, group.effect.ts, contact.reducer.ts, group.reducer.ts, contact-list.component.ts, contact-group.component.ts, unauthorize.interceptor.ts, cv-builder.service.ts

---

## 1. 403 Message Copy Review

### Inventory of all new 403 messages (QA7 sprint)

| Controller | Function | Trigger | Message |
|---|---|---|---|
| jobsController | updateStatusOfJob | Caller has no company record | `"You don't have permission to do that."` |
| jobsController | updateStatusOfJob | company_id mismatch on ownerCheck | `"You don't have permission to update this job."` |
| contactsController | deleteContact | Caller has no company record | `"You don't have permission to do that."` |
| contactsController | deleteContact | company_id mismatch on ownerCheck | `"You don't have permission to delete this contact."` |
| contactsController | updateContact | Caller has no company record | `"You don't have permission to do that."` |
| contactsController | updateContact | company_id mismatch on ownerCheck | `"You don't have permission to update this contact."` |
| contactsController | updateGroup | Caller has no company record | `"You don't have permission to do that."` |
| contactsController | updateGroup | company_id mismatch on ownerCheck | `"You don't have permission to update this group."` |
| contactsController | deleteGroup | Caller has no company record | `"You don't have permission to do that."` |
| contactsController | deleteGroup | company_id mismatch on ownerCheck | `"You don't have permission to delete this group."` |
| cvController | updateCV | cv_id/user_id mismatch | `"You don't have permission to update this CV."` |
| cvController | deleteCV | cv_id/user_id mismatch | `"You don't have permission to delete this CV."` |

**Pre-existing 403 messages (for baseline comparison):**
- jobsController deleteJob (no company record): `"You don't have permission to delete this job."`
- jobsController deleteJob (company mismatch): `"You don't have permission to delete this job."`
- jobsController updateJob (no company record): `"You don't have permission to update this job."`
- jobsController updateJob (zero rows returned): `"You don't have permission to update this job."`
- jobsController getAllApplicantOfJob (BOLA): bare `"Forbidden"` string (not JSON)

### Consistency analysis

**Pattern A — generic fallback when getUserCompany fails:**
`"You don't have permission to do that."`
Used in: updateStatusOfJob, deleteContact, updateContact, updateGroup, deleteGroup (all QA7)

**Pattern B — operation-specific when ownerCheck fails:**
`"You don't have permission to [verb] this [resource]."`
Used in: all specific ownerCheck failures, and the two pre-existing deleteJob paths

**Inconsistency found:** deleteJob uses Pattern B even for the no-company-record case (always `"You don't have permission to delete this job."`). The QA7 handlers split into A for the first guard and B for the second. The split makes logical sense (A = "you aren't even an employer"; B = "you're an employer but this isn't yours") but is inconsistent with the deleteJob style. Neither reveals internal architecture.

**Recommendation:** Acceptable as-is. The generic fallback for the no-company-record case is actually *safer* than the resource-specific message because it doesn't confirm the resource exists. No changes required unless a strict house style is wanted.

### Information leak check

- No message contains a table name, column name, or schema reference. PASS.
- No message confirms resource existence by phrasing like "Job #X not found" or "You don't own contact Y". PASS.
- `getAllApplicantOfJob` still returns a bare `"Forbidden"` string (non-JSON), inconsistent with every other 403 in the file. This is a pre-existing issue, not a QA7 regression, but flagged here for cleanup.

---

## 2. CV 403 Message Assessment

**Messages:**
- `"You don't have permission to update this CV."` (updateCV)
- `"You don't have permission to delete this CV."` (deleteCV)

**Context:** The CV table is applicant-owned (user_id FK). An applicant trying to update/delete another applicant's CV will hit the ownerCheck and receive one of these messages.

**Assessment: MINOR CONCERN.**

The messages confirm that a CV with the supplied `cvId` *exists* (otherwise the backend would not reach a permission check for it — it would simply not find a row, and both branches of the SELECT query conflate "not found" and "wrong owner" identically via `rows.length === 0`). Actually, examining the query:

```sql
SELECT cv_id FROM cv WHERE cv_id = $1 AND user_id = $2
```

This returns 0 rows for both "CV doesn't exist" and "CV exists but owned by someone else". The message therefore does NOT distinguish between the two cases. **No existence oracle leak.** PASS.

The messages naming "this CV" (rather than "that operation") is slightly specific but does not expose anything an attacker couldn't already know from the cvId they supplied. Acceptable.

---

## 3. Job Status Change 403

**Message when ownerCheck fails:** `"You don't have permission to update this job."`

**Assessment: PASS.**

"Update this job" is accurate for a status change operation (status is a field on the job record). It is consistent with the pre-existing updateJob 403. It does not reveal that the denial is about company ownership vs. individual user ownership. The message is employer-appropriate — only employers can change job status, and any employer landing here is making an illegitimate cross-company request.

**One structural note:** updateStatusOfJob uses a two-query pattern (separate ownerCheck SELECT, then a separate updateJobStatus call) whereas updateJob folds ownership into the WHERE clause of the UPDATE itself. The two-query pattern is slightly less atomic but not a correctness bug. The message is the same either way.

---

## 4. FE 403 Handling

### Global interceptor behaviour

`unauthorize.interceptor.ts` intercepts ALL 403s and redirects to `/signin` with the message:

> "Your session has expired. Please sign in again to continue."

**This is the dominant behaviour for every 403 on the platform.** It fires before any per-effect error handler can surface the BE message to the user.

### Per-endpoint analysis

#### 4a. Job status change (changeJobStatus$)

- Effect (`job.effects.ts` line 168): `catchError` extracts `err.error` and passes to `changeJobStatusFail({ payload: error })`
- Reducer: sets `state.error = action.payload`, `succesMsg: null`
- Component (`job-list.component.ts`): subscribes to `success$` only. `afterChange()` handles `'archived'` and `'expired'` strings. **There is no subscription to the job error state in this component.** A `changeJobStatusFail` will silently update the Redux store error field but display nothing to the user.

**BUT:** the global interceptor will catch the 403 first and redirect to `/signin`. The per-effect error handler would only fire for non-403 errors or if the interceptor were bypassed.

**Net result:** A legitimate employer who somehow triggers a cross-company 403 (e.g., stale session with wrong token, race condition) will see the session-expired snackbar and be logged out rather than the "You don't have permission to update this job." message. **The message never reaches the user.**

**Verdict:** The FE does NOT display the new BE message. However, the session-redirect behaviour is a reasonable UX for this edge case (a legit user shouldn't hit this under normal conditions). No fix required for the 403 case specifically.

#### 4b. Contact mutations (deleteContact, editContact)

- Effects: wrap error as `{ type: FAIL, payload: error }` — the full `HttpErrorResponse` is passed, not extracted
- Reducer: sets `state.error = action.payload`
- Component (`contact-list.component.ts` line 135-140): subscribes to `contact.error` and shows:

> "Something went wrong please try again later or contact your administrator"

**Verdict:** The generic snackbar fires *in addition to* (or instead of, depending on timing) the global interceptor redirect. The BE's specific 403 message is not surfaced — the FE shows its own hardcoded fallback. For 403s the interceptor takes priority and redirects.

#### 4c. Group mutations (deleteGroup, editGroup)

Identical pattern to contacts:
- Component (`contact-group.component.ts` line 143-146): shows `"Something went wrong please try again later or contact your administrator"`

**Verdict:** Same as contacts — BE message not surfaced. Acceptable given the intercept redirect.

#### 4d. Applicant profile (updateProfile, updateBasicProfileInfo)

- `applicant.effects.ts` `saveBasicProfile$` (line 16–31): catchError extracts `err.error.error` and passes to `saveApplicantBasicProfileFail({ payload: error })`
- `applicant-settings.component.ts`: subscribes to `success$` only (`afterChange` checks for `'updated'`). **No error subscription in this component.**

**Verdict:** Profile update errors are silently swallowed at the component level. Only the global interceptor redirect fires for 403s.

#### 4e. CV mutations (updateCV, deleteCV)

The FE CV builder service (`cv-builder.service.ts`) only has an `uploadCv()` method. **The FE has no calls to the updateCV or deleteCV endpoints at all.** These are either legacy/unused endpoints, or they are consumed through a different path not present in the Angular FE repo.

**Verdict:** No FE display needed — endpoints are not called from the FE.

### Summary table

| Endpoint | Global interceptor fires? | Per-component error shown? | BE message reaches user? |
|---|---|---|---|
| updateStatusOfJob | Yes — redirect + session msg | No (no error subscription) | No |
| updateContact | Yes — redirect + session msg | Yes — generic fallback (race with redirect) | No |
| deleteContact | Yes — redirect + session msg | Yes — generic fallback (race with redirect) | No |
| updateGroup | Yes — redirect + session msg | Yes — generic fallback (race with redirect) | No |
| deleteGroup | Yes — redirect + session msg | Yes — generic fallback (race with redirect) | No |
| updateProfile/updateBasicProfileInfo | Yes — redirect + session msg | No (no error subscription) | No |
| updateCV / deleteCV | N/A — no FE calls | N/A | N/A |

**No new FE changes required.** All 403s for these endpoints are security rejections of cross-resource BOLA attacks; legitimate users should never hit them. The session-redirect is adequate UX for this scenario.

---

## 5. Forbidden Content Check

Checked all new 403 messages against the forbidden-content list:

| Check | Result |
|---|---|
| Fake counts (e.g., "3 users tried this") | NONE FOUND — PASS |
| Fake urgency (e.g., "Act now", "Limited time") | NONE FOUND — PASS |
| AI claims (e.g., "Our AI detected", "Powered by ML") | NONE FOUND — PASS |
| Stack details (e.g., error stack, SQL, table names) | NONE FOUND — PASS |
| Resource IDs leaked in message body | NONE FOUND — PASS |

---

## 6. Additional Findings (Out-of-Scope, Flagged)

### F-1: Non-JSON 403 in getAllApplicantOfJob (pre-existing)

`getAllApplicantOfJob` returns `res.status(403).send("Forbidden")` — a plain string, not a JSON object. Every other 403 in the codebase uses `res.status(403).json({ message: "..." })`. The FE's `err.error.message` extraction pattern will get `undefined` for this endpoint. Pre-existing issue, not introduced in QA7.

**Recommendation:** Normalise to `res.status(403).json({ message: "You don't have permission to view these applicants." })`.

### F-2: changeJobStatusFail error extraction may fail for non-403

In `job.effects.ts` line 168, `changeJobStatus$` catchError does:
```ts
const { error } = err.error;
```
If `err.error` is null (network error, timeout) this throws a secondary JS error `"Cannot destructure property 'error' of undefined"`, swallowing the original error. The `saveJob$` effect (line 95–96) was already fixed to use a safe extraction pattern; `changeJobStatus$` was not updated to match.

**Recommendation:** Apply the same safe pattern already used in saveJob$:
```ts
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'Unable to change job status. Please try again.';
```

---

## 7. Summary

### Copy quality: PASS (with one alignment note)

All new 403 messages are:
- Clear and user-appropriate for their audience (employers and applicants)
- Free of architecture leaks, table names, column names, stack details
- Free of fake data, urgency, or AI claims
- Consistent with the established "You don't have permission to [verb] this [resource]." pattern

Minor inconsistency: the no-company-record guard uses `"You don't have permission to do that."` (generic) while pre-existing deleteJob uses the resource-specific form for the same guard. Both approaches are defensible; the generic form is marginally safer. No change required.

### FE 403 handling: ACCEPTABLE

No new BE 403 messages surface to the user — the global interceptor redirects all 403s to the sign-in page with a session-expired message. This is intentional and appropriate for BOLA-prevention checks. No FE changes required.

### Action items

| Priority | Item | File |
|---|---|---|
| Low | Normalise getAllApplicantOfJob 403 to JSON format | jobsController.js |
| Low | Apply safe error extraction to changeJobStatus$ catchError | job.effects.ts |
