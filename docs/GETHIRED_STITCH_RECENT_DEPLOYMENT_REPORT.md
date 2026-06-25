# GETHIRED STITCH — Recent Deployment Report (NOTIFY-P2)
_Scoped to BE 2ff6358 / FE 1863842 (NOTIFY-P2 deployment)_
_Generated: 2026-06-26_

---

## Exec Summary

NOTIFY-P2 introduced two categories of response shape change:

- **Additive (non-breaking):** `status` field added to single-add responses for contacts and candidates.
- **Breaking:** Bulk import endpoints changed from returning a flat array to returning `{ contacts/candidates: [...], summary: {...} }`.

All three patched FE components handle the new shapes correctly. The two reducers pass the raw payload through unchanged — this is correct behavior because the components perform shape-specific logic in the subscriber. No reducer changes were needed.

No other FE components read `contactRes` or `candidateRes` from the NgRx store. The breaking shape change has no unpatched consumers.

One pre-existing non-blocking issue was found in `import-add-candidate.component.ts`: the component dispatches both a `SAVE_CANDIDATE` action and a `SAVE_CONTACT` action for a single-candidate add. This sets `contactRes` in the store even when no contact dialog is open. It has no visible user impact today but is a latent cross-contamination risk.

---

## Contract Changes Documented

### 1. POST /contacts/addcontact — Single contact add

| Field | Before | After | Breaking? |
|---|---|---|---|
| `status` | absent | `'ADDED'` or `'DUPLICATE_CONTACT'` | No (additive) |
| `message` | present | present | No change |
| `...dbResponse` (db row fields) | present on success | present on success | No change |

**FE extraction path:** `ContactService.AddContact()` maps `res.data` → dispatched as `contactRes`.
The `{ status, message }` or `{ ...dbRow, status, message }` shape lands in `state.contact.contactRes`.

**Consumer:** `import-add-contact.component.ts` reads `res.status === 'DUPLICATE_CONTACT'` in the `else` branch (when `hasSummary` is false). Correct.

---

### 2. POST /contacts/multiplecontact — Bulk contact import

| Field | Before | After | Breaking? |
|---|---|---|---|
| Root shape | `[...contacts]` (flat array) | `{ contacts: [...], summary: {...} }` | **YES** |
| `summary.totalRequested` | absent | number | new |
| `summary.successCount` | absent | number | new |
| `summary.failureCount` | absent | number | new |
| `summary.duplicateCount` | absent | number | new |
| `summary.outcome` | absent | `'all_success'` \| `'partial_success'` \| `'duplicate_only'` \| `'all_failed'` | new |

**FE extraction path:** `ContactService.AddMultipleContact()` maps `res.data` → `{ contacts: [...], summary: {...} }` dispatched as `contactRes`.

**Consumer:** `import-add-contact.component.ts` reads `res.summary` via `hasSummary` branch. Correct.

---

### 3. POST /candidates/addcandidate — Single candidate add

| Field | Before | After | Breaking? |
|---|---|---|---|
| `status` | absent | `'ADDED'` or `'DUPLICATE_CANDIDATE'` | No (additive) |
| `message` | present | present | No change |
| `...dbResponse` (db row fields) | present on success | present on success | No change |

**FE extraction path:** `CandidateService.AddCandidate()` maps `res.data` → dispatched as `candidateRes`.

**Consumer:** `import-add-candidate.component.ts` reads `res.status === 'DUPLICATE_CANDIDATE'` in `else` branch. Correct.

---

### 4. POST /candidates/multiplecandidate — Bulk candidate import

| Field | Before | After | Breaking? |
|---|---|---|---|
| Root shape | `[...candidates]` (flat array) | `{ candidates: [...], summary: {...} }` | **YES** |
| `summary.totalRequested` | absent | number | new |
| `summary.successCount` | absent | number | new |
| `summary.failureCount` | absent | number | new |
| `summary.duplicateCount` | absent | number | new |
| `summary.outcome` | absent | string | new |

**FE extraction path:** `CandidateService.AddMultipleCandidate()` maps `res.data` → `{ candidates: [...], summary: {...} }` dispatched as `candidateRes`.

**Consumer:** `import-add-candidate.component.ts` reads `res.summary` via `hasSummary` branch. Correct.

---

## Data Flow Trace — How the Bulk Shape Reaches the Component

```
POST /contacts/multiplecontact
  BE: successResponse({ contacts: addedItems, summary })
  => HTTP body: { status: "success", data: { contacts: [...], summary: {...} } }

FE ContactService.AddMultipleContact():
  .pipe(map((res: any) => <any>res.data))
  => returns { contacts: [...], summary: {...} }

contact.effect.ts saveContactMultiple:
  payload: result
  => dispatches { type: SAVE_CONTACT_MULTIPLE_SUCCESS, payload: { contacts: [...], summary: {...} } }

contact.reducer.ts case SAVE_CONTACT_MULTIPLE_SUCCESS:
  return { ...state, contactRes: action.payload, pending: false }
  => state.contact.contactRes = { contacts: [...], summary: {...} }

import-add-contact.component.ts subscriber:
  const res = onboard.contactRes;
  const hasSummary = res && res.summary;   // truthy: enters summary branch
  const { successCount, duplicateCount, failureCount } = res.summary;  // correct
```

Identical flow for candidates. Both reducers pass the payload through unchanged — this is correct. The reducer is shape-agnostic by design; shape interpretation is done in the component subscriber.

---

## Consumer Impact Analysis

### consumers of `state.contact.contactRes`

Grep result across all FE TypeScript files: **2 files** read `contactRes`.

| File | Reads contactRes? | Handles new shape? |
|---|---|---|
| `contact.reducer.ts` | stores it | n/a — pass-through |
| `import-add-contact.component.ts` | yes | YES — patched with `hasSummary` branch |

No other component in the codebase subscribes to `state.contact.contactRes`.

### consumers of `state.candidate.candidateRes`

Grep result across all FE TypeScript files: **2 files** read `candidateRes`.

| File | Reads candidateRes? | Handles new shape? |
|---|---|---|
| `candidate.reducer.ts` | stores it | n/a — pass-through |
| `import-add-candidate.component.ts` | yes | YES — patched with `hasSummary` branch |

No other component in the codebase subscribes to `state.candidate.candidateRes`.

---

## Integration Gaps Found

### GAP-1 (Non-blocking, Low severity): Spurious SAVE_CONTACT dispatch in candidate add flow

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\employer-panel\employer-contacts\candidate-list\dialogs\import-add-candidate\import-add-candidate.component.ts`

**Lines 237–244:**
```ts
this.candidateState.dispatch({
  type: CandidateActionTypes.SAVE_CANDIDATE,
  payload: data
});
this.contactState.dispatch({
  type: ContactActionTypes.SAVE_CONTACT,   // <-- spurious
  payload: data
});
```

When a single candidate is added, the component dispatches `SAVE_CONTACT` in addition to `SAVE_CANDIDATE`. This triggers `ContactService.AddContact()` via the contact effect, which will:
1. Make an additional HTTP POST to `/contacts/addcontact` with the candidate's data.
2. Set `state.contact.contactRes` to the result of that contact add.

Impact today: the contact dialog (`import-add-contact.component.ts`) is not open when `import-add-candidate.component.ts` runs, so the spurious `contactRes` write has no visible UI effect. However:
- An extra `/contacts/addcontact` request is sent on every single candidate add (double write to DB).
- The candidate is silently added to the contact table as well.
- If the contact already exists, `contactRes` is set to `{ message, status: 'DUPLICATE_CONTACT' }` — harmless today but could cause unexpected behavior if a contact dialog is open concurrently.

This is a pre-existing issue, not introduced by NOTIFY-P2. It is not fixed in this pass (no consumer is broken by it); tracked for a future cleanup sprint.

### GAP-2 (Informational): `importCandidateForm` initialized lazily in `uploadListener` — bulk candidate path partially untested

**File:** `import-add-candidate.component.ts`

`importCandidateForm` is `undefined` on init (the `formBuilder.group` call is commented out at lines 77–80). It is only initialized inside `uploadListener()` at lines 286–289 when a CSV file is uploaded. If `saveOnboardMultiple()` is called before a CSV upload (which would require a bug in the template flow), it would throw `Cannot read property 'value' of undefined`.

The template guards this via the `importCandidate` flag so it cannot happen in normal flow. This is a latent fragility, not an active bug. No fix applied.

### GAP-3 (Informational): Bulk candidate import uses field `candidate` (singular) in request body

**File:** `import-add-candidate.component.ts` line 360–361 vs `candidateController.js` line 40.

FE sends: `{ ...importCandidateForm.value, candidate: [...this.records] }` — field name `candidate` (singular).
BE destructures: `const { candidate } = req.body` — also expects `candidate` (singular).

This matches. Noted because the bulk contact import uses `contacts` (plural) in both FE and BE, so the asymmetry could cause confusion in future maintenance.

---

## Verification Matrix

| Endpoint | BE shape change | FE service maps `res.data` | Reducer pass-through | Component handles shape | Integration status |
|---|---|---|---|---|---|
| POST /contacts/addcontact | additive (status field) | yes, `res.data` | yes | yes (else branch) | SOUND |
| POST /contacts/multiplecontact | BREAKING (wrapped object) | yes, `res.data` | yes | yes (summary branch) | SOUND |
| POST /candidates/addcandidate | additive (status field) | yes, `res.data` | yes | yes (else branch) | SOUND |
| POST /candidates/multiplecandidate | BREAKING (wrapped object) | yes, `res.data` | yes | yes (summary branch) | SOUND |
| POST /company-users (invite) | unchanged BE shape | yes | yes | yes (email status loop) | SOUND |
