# GetHired — SECURE Recent Deployment Report
## NOTIFY-P2 Security Assessment
**Audit date:** 2026-06-26
**Scope:** BE 2ff6358 / FE 1863842 (NOTIFY-P2 deployment)
**Auditor:** Claude Code SECURE RECENT DEPLOYMENT pass

---

## 1. Executive Summary

The NOTIFY-P2 deployment is **security-clean with one pre-existing medium-severity concern** (candidate duplicate-check scope, see section 4.2) that was present before this deployment. No new security regressions were introduced. All BOLA guards remain intact, logging is safe, and no sensitive data is exposed through new status fields.

**Overall verdict:** GO WITH CAUTION (one pre-existing M2 finding documented; no P0 introduced by this deployment)

---

## 2. NOTIFY-P2 Changes Audited

| File | Change | Security-relevant? |
|---|---|---|
| `services/contact.service.js` | Added `status: 'ADDED' / 'DUPLICATE_CONTACT'` return field | Yes — email-oracle risk assessed (section 4) |
| `services/candidate.service.js` | Added `status: 'ADDED' / 'DUPLICATE_CANDIDATE'` return field | Yes — candidate-oracle risk assessed (section 4) |
| `controllers/contactsController.js` multipleContact | Replaced broken forEach(async) with Promise.allSettled; added console.info log | Yes — BOLA guard, logging both assessed (sections 3, 5) |
| `controllers/candidateController.js` multipleCandidate | Same pattern replacement + logging | Yes — BOLA guard, logging both assessed (sections 3, 5) |
| `get-hired-FE` import-add-user.component | Per-email status display in UI | Yes — information disclosure assessed (section 6) |

---

## 3. BOLA Protection Verification

### 3.1 multipleContact — contactsController.js (lines 38-82)

**BOLA guard: INTACT**

- `getUserCompany(req.user.uid)` runs at line 43 — JWT-derived, BEFORE any data processing
- Hard 403 return if no valid company (lines 44-46)
- `companyId` from JWT is spread LAST in `{ ...option, companyId }` at line 57, overwriting any body-supplied companyId
- `Promise.allSettled` result: only `addedItems` (ADDED status) are returned to the client (lines 60-62). Duplicate and failure counts are returned as aggregate integers only — no per-record email addresses or IDs leak through the summary object

**Verdict: PASS**

### 3.2 multipleCandidate — candidateController.js (lines 39-80)

**BOLA guard: INTACT** — identical pattern to multipleContact:

- `getUserCompany(req.user.uid)` at line 44 before any processing
- `companyId` spread-overrides body value at line 56
- Only `addedItems` returned; duplicate/failure counts are aggregate integers

**Verdict: PASS**

### 3.3 createContact — still uses JWT companyId (line 16)

**Verdict: PASS** (unchanged from prior sessions)

### 3.4 Route-level auth middleware

Both `/contacts/multiplecontact` and `/candidates/multiplecandidate` are registered with `verifyAuth` middleware in their respective route files. No unauthenticated path exists.

**Verdict: PASS**

---

## 4. Email-Existence Oracle (Information Disclosure) Analysis

### 4.1 Contact oracle — checkEmailIfExistInContact (contact.service.js lines 205-221)

SQL used:
```
SELECT email FROM {schema}.contact
WHERE contact.email = $1 AND contact.company_id = $2
```

**Scoped to the caller's own company_id.** The `companyId` passed here is the JWT-derived value from the controller. An employer submitting email X and receiving `DUPLICATE_CONTACT` learns only that **they already have email X in their own contact list** — which is correct, expected, and not a cross-company information leak.

**Verdict: ACCEPTABLE** — company-scoped duplicate check; no cross-tenant oracle risk.

### 4.2 Candidate oracle — checkEmailIfExistInCandidate (candidate.service.js lines 57-71)

SQL used:
```
SELECT email FROM {schema}.candidates
WHERE candidates.email = $1
-- NOTE: NO company_id filter
```

**This is a pre-existing global duplicate check.** The `companyId` is NOT passed to this function. An employer importing candidate X receives `DUPLICATE_CANDIDATE` if email X is in the candidates table under ANY company. This means:

- Employer A submitting email X learns email X has been imported as a candidate somewhere on the platform — even if it was Employer B's import.
- This is a **cross-company information oracle** for the candidates table.

**Severity: MEDIUM (M2)** — This was present before NOTIFY-P2. The `// TODO (Filter by agency)` comment at line 58 of candidate.service.js acknowledges it. NOTIFY-P2 made the oracle's output more visible by surfacing it as a structured `DUPLICATE_CANDIDATE` status field rather than silently failing, but did not introduce the underlying global scope.

**Note:** Practical impact is low — the signal only tells an employer "this email exists in candidates globally" (not which company, not which job, not any PII beyond the email they themselves submitted), but it is a policy violation to leak any cross-tenant existence signal.

**Recommended fix (non-blocking for release):** Pass `companyId` into `checkEmailIfExistInCandidate` and add `AND company_id = $2` to the WHERE clause. See FIX_LOG for the recommended change.

---

## 5. Logging Safety Review

### 5.1 contactsController.js multipleContact log (line 73)

```
console.info('[NOTIFY_P2_CONTACT_INVITE_MULTIPLE]', {
    endpoint: 'POST /contacts/multiplecontact',
    totalRequested,
    successCount,
    failureCount,
    duplicateCount,
    outcome
});
```

**Safe.** The logged object contains:
- `endpoint` — static string, no PII
- `totalRequested`, `successCount`, `failureCount`, `duplicateCount` — aggregate integers, no PII
- `outcome` — one of `all_success | partial_success | duplicate_only | all_failed` — no PII

No email addresses, UIDs, names, phone numbers, or other PII are logged.

**Verdict: PASS**

### 5.2 candidateController.js multipleCandidate log (line 72)

Identical structure to 5.1. Same verdict.

**Verdict: PASS**

### 5.3 Pre-existing console logs noted (non-blocking)

- `console.log(data)` in import-add-user.component.ts constructor (line 49): logs the full dialog data object to the browser console. Browser-side only, not server exposure. Low severity, cosmetic.
- `console.log(data, "company add user data")` in saveCompanyUser (line 154): logs companyId and email array to browser console. Not a server-side risk.
- `console.log(dbResponse)` in candidate.service.js line 149 inside `candidateList`: logs the full candidate list result to the server console. Pre-existing, not introduced by NOTIFY-P2. Low severity but unnecessary production log.

---

## 6. FE Component Security Review — import-add-user.component

### 6.1 What invitedUsersList exposes in the UI template

The template at lines 176-185 of the HTML renders `invitedUsersList` showing `item.email`, `item.msg`, and `item.message`. This data comes from `invite.companyUserRes.emails` — the response from `POST /company/addcompanyuser` (addCompanyUser controller). The controller returns per-email: `{ email, status, msg }` where msg is one of:

- "Email already a user."
- "Failed to Create credentials"
- "Successfully added"
- "Failed to assign User to a Company"
- "Failed to add user"

**Assessment:** The FE shows back only the emails the employer themselves submitted, plus a success/failure message for each. No cross-tenant data is exposed. No UIDs, Firebase tokens, or internal IDs are returned or displayed.

**Verdict: PASS**

### 6.2 Status leakage via per-email statuses

The `status: 'failed'` / `status: 'success'` values are visible only to the invoking employer. The "failed because already a user" case discloses that the submitted email is already registered in the system — but only to the employer who submitted that email. This is functionally necessary and scoped appropriately.

**Verdict: ACCEPTABLE**

---

## 7. Existing Security Fix Verification

| Fix | Location | Status |
|---|---|---|
| `createContact` uses `getUserCompany(req.user.uid)` | contactsController.js line 16 | PASS |
| `multipleContact` BOLA guard present in new code | contactsController.js lines 43-47 | PASS |
| `optionalVerifyAuth` on GET /job/details | jobsRoute.js line 62 | PASS |
| `optionalVerifyAuth` on GET /job/sharelink | jobsRoute.js line 63 | PASS |
| `optionalVerifyAuth.js` exists and is correct | middleware/optionalVerifyAuth.js | PASS |
| All contact routes have `verifyAuth` | contactRoutes.js | PASS |
| All candidate routes have `verifyAuth` | candidateRoutes.js | PASS |

---

## 8. Still-Open Security Items (from Prior Sessions — Unchanged by NOTIFY-P2)

| ID | Item | Severity | Status |
|---|---|---|---|
| P0-1 | PayMongo webhook HMAC verification missing | P0 | OPEN — endpoint accepts any event |
| P0-2 | Firebase service account key in git history | P0 | OPEN — requires external rotation, not fixable in code |
| P1-1 | CORS wildcard `app.use(cors())` | P1 | OPEN — awaiting domain list |
| P1-2 | `verifyAuth.js` leaks raw Firebase error messages | P1 | PARTIALLY OPEN |
| P1-3 | `createGroup`/`updateGroup` broken forEach(async) race condition | P1 (DoS risk) | OPEN — not fixed in NOTIFY-P2 |
| M2-1 | `checkEmailIfExistInCandidate` lacks company_id scope (global oracle) | MEDIUM | OPEN — pre-existing, confirmed in this audit |

---

## 9. New Findings from This Audit

| ID | Finding | Severity | Action |
|---|---|---|---|
| N-1 | `checkEmailIfExistInCandidate` is global-scoped (confirmed, pre-existing) | MEDIUM | Recommend fix; non-blocking for release |
| N-2 | `console.log(dbResponse)` in `candidateList` service logs full list server-side | LOW | Non-blocking cosmetic |
| N-3 | FE `console.log(data)` in import-add-user constructor logs dialog data to browser | LOW | Non-blocking cosmetic |

**No P0 or P1 findings were introduced by NOTIFY-P2.**
