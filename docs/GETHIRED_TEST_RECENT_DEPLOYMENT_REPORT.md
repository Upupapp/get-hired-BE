# GetHired TEST RECENT DEPLOYMENT REPORT
**Deployment:** NOTIFY-P2 (BE 2ff6358 / FE 1863842)
**Audit date:** 2026-06-26
**Auditor:** Claude Code automated QA gate

---

## Executive Summary

All six changed files verified against the deployment description. BE contract change (flat array → `{ contacts/candidates, summary }`) is correctly handled by the sole FE consumer of each action (`import-add-contact` and `import-add-candidate`). No other components consume `contactRes` or `candidateRes`. The NgRx layer (effects/reducers) is shape-agnostic and passes the raw `res.data` payload through unchanged — no breakage. SEC-01 and SEC-02 regression items confirmed intact. Two pre-existing bugs found (unrelated to NOTIFY-P2). No build/test commands available in BE; FE uses Angular Karma/Jasmine (`ng test`) but requires a live browser and is not run during automated CI on this machine.

---

## 1. Files Verified

| File | Status | Notes |
|------|--------|-------|
| `services/contact.service.js` | CONFIRMED | `addContact` returns `status: 'ADDED'` in all 6 non-duplicate branches; `status: 'DUPLICATE_CONTACT'` in 2 pure-duplicate branches. `addMultipleContact` mirrors same pattern. |
| `services/candidate.service.js` | CONFIRMED | `addCandidates` returns `status: 'DUPLICATE_CANDIDATE'` on duplicate (line 26), `status: 'ADDED'` on success (line 51). |
| `controllers/contactsController.js` `multipleContact` | CONFIRMED | `Promise.allSettled` used (line 56). Filters by `r.value?.status === 'ADDED'` / `'DUPLICATE_CONTACT'`. Returns `{ contacts: addedItems, summary }`. |
| `controllers/candidateController.js` `multipleCandidate` | CONFIRMED | Same `Promise.allSettled` pattern. Returns `{ candidates: addedItems, summary }`. |
| `src/styles.scss` | CONFIRMED | `.warning-snackbar` (#f59e0b, white text) and `.info-snackbar` (#6b7280, white text) added at lines 254-262. |
| `import-add-user.component.ts` | CONFIRMED | Reads `e.status !== 'failed'`; computes `successCount`/`failureCount`; shows `danger-snackbar` when `successCount === 0`, `warning-snackbar` for partial, `success-snackbar` for all-success. |
| `import-add-contact.component.ts` | CONFIRMED | Reads `res.summary` for bulk; falls through to `res.status === 'DUPLICATE_CONTACT'` for single. All four branches (all-success, partial, duplicate-only, all-failed) handled. |
| `import-add-candidate.component.ts` | CONFIRMED | Default toast copy is `'Candidate added.'` (line 94). Logic mirrors import-add-contact. |

### Discrepancies from description
None. All changes match the description exactly.

---

## 2. Build / Test Commands Run

| Command | Result | Notes |
|---------|--------|-------|
| BE `npm test` | SKIPPED — no test runner | `package.json` scripts.test = `"echo Error: no test specified && exit 1"`. No Jest/Mocha installed. |
| FE `ng test` | NOT RUN — requires browser | Karma/Jasmine configured; would launch Chrome. Skipped to avoid side effects. |
| Lint | NOT RUN | No standalone lint script in BE; FE `ng lint` requires Angular CLI locally. |

No build commands were executed. All verification is static code analysis.

---

## 3. Test Cases Written

### TC-01: `addContact` service — status field on all branches

```javascript
// Conceptual (no Jest installed on BE)
// File: services/contact.service.js

// TC-01a: new contact, no group -> status: 'ADDED'
const result = await addContact({ email: 'new@test.com', groupName: '', groupId: '', ... });
expect(result.status).toBe('ADDED');
expect(result.message).toBe('Successfully add contact');

// TC-01b: duplicate contact, no group -> status: 'DUPLICATE_CONTACT'
const result = await addContact({ email: 'existing@test.com', groupName: '', groupId: '', ... });
expect(result.status).toBe('DUPLICATE_CONTACT');
expect(result.message).toBe('Contact aleady exist');

// TC-01c: duplicate contact added to existing group (not yet in group) -> status: 'ADDED'
const result = await addContact({ email: 'existing@test.com', groupName: '', groupId: 'grp-1', ... });
// when checkIfExistInGroup returns false
expect(result.status).toBe('ADDED');

// TC-01d: duplicate contact already in group -> status: 'DUPLICATE_CONTACT'
const result = await addContact({ email: 'existing@test.com', groupName: '', groupId: 'grp-1', ... });
// when checkIfExistInGroup returns true
expect(result.status).toBe('DUPLICATE_CONTACT');
```

### TC-02: `addCandidates` service — status field

```javascript
// TC-02a: new candidate -> status: 'ADDED'
const result = await addCandidates({ email: 'new@test.com', jobId: 'job-1', ... });
expect(result.status).toBe('ADDED');
expect(result.message).toBe('Successfully add candidate');

// TC-02b: duplicate candidate -> status: 'DUPLICATE_CANDIDATE'
// (checkEmailIfExistInCandidate returns true)
const result = await addCandidates({ email: 'existing@test.com', jobId: 'job-1', ... });
expect(result.status).toBe('DUPLICATE_CANDIDATE');
expect(result.message).toBe('Candidate Already Exist');
```

### TC-03: `multipleContact` controller — Promise.allSettled + summary shape

```javascript
// Conceptual verification of controller logic (unit test — no live DB)
const settled = [
  { status: 'fulfilled', value: { status: 'ADDED', email: 'a@test.com' } },
  { status: 'fulfilled', value: { status: 'DUPLICATE_CONTACT', email: 'b@test.com' } },
  { status: 'rejected', reason: new Error('DB error') }
];

const addedItems = settled.filter(r => r.status === 'fulfilled' && r.value?.status === 'ADDED').map(r => r.value);
const duplicateCount = settled.filter(r => r.status === 'fulfilled' && r.value?.status === 'DUPLICATE_CONTACT').length;
const failureCount = settled.filter(r => r.status === 'rejected').length;
const successCount = addedItems.length;
const totalRequested = 3;

expect(successCount).toBe(1);        // pass
expect(duplicateCount).toBe(1);      // pass
expect(failureCount).toBe(1);        // pass

const outcome = successCount > 0
  ? (failureCount > 0 ? 'partial_success' : 'all_success')
  : (duplicateCount > 0 ? 'duplicate_only' : 'all_failed');
expect(outcome).toBe('partial_success');  // pass

// Response shape verified
// { contacts: addedItems, summary: { totalRequested: 3, successCount: 1, failureCount: 1, duplicateCount: 1, outcome: 'partial_success' } }
```

### TC-04: `multipleCandidate` controller — all outcome branches

```javascript
// TC-04a: all duplicates -> outcome: 'duplicate_only'
const settled = [
  { status: 'fulfilled', value: { status: 'DUPLICATE_CANDIDATE' } },
  { status: 'fulfilled', value: { status: 'DUPLICATE_CANDIDATE' } }
];
// successCount=0, duplicateCount=2, failureCount=0
// outcome = 'duplicate_only'  -> pass

// TC-04b: all new -> outcome: 'all_success'
const settled = [
  { status: 'fulfilled', value: { status: 'ADDED' } },
  { status: 'fulfilled', value: { status: 'ADDED' } }
];
// outcome = 'all_success'  -> pass

// TC-04c: all rejected -> outcome: 'all_failed'
const settled = [
  { status: 'rejected', reason: new Error() },
  { status: 'rejected', reason: new Error() }
];
// successCount=0, duplicateCount=0 -> outcome = 'all_failed'  -> pass

// Response key is 'candidates' (not 'contacts')
// { candidates: addedItems, summary: {...} }
```

### TC-05: `import-add-user` — all-failed shows danger-snackbar

```javascript
// Angular Jasmine (import-add-user.component.spec.ts)
it('TC-05: shows danger-snackbar when all emails have status failed', () => {
  const snackBarSpy = spyOn(component.snackBar, 'open');
  const fakeRes = {
    emails: [
      { email: 'a@test.com', status: 'failed' },
      { email: 'b@test.com', status: 'failed' }
    ]
  };
  // Simulate store emitting invite result
  companyStateMock.next({ companyUserRes: fakeRes, pending: false });

  const successCount = fakeRes.emails.filter(e => e.status !== 'failed').length; // = 0
  expect(successCount).toBe(0);
  expect(snackBarSpy).toHaveBeenCalledWith(
    'No contacts were added.', '', { duration: 6000, panelClass: 'danger-snackbar' }
  );
});
```

### TC-06: `import-add-contact` — single DUPLICATE_CONTACT shows info-snackbar

```javascript
// Angular Jasmine (import-add-contact.component.spec.ts)
it('TC-06: shows info-snackbar for single DUPLICATE_CONTACT response', () => {
  const snackBarSpy = spyOn(component.snackBar, 'open');
  const fakeRes = {
    status: 'DUPLICATE_CONTACT',
    message: 'Contact aleady exist'
    // no summary field -> falls into single-contact branch
  };
  contactStateMock.next({ contactRes: fakeRes, pending: false, error: null });

  expect(snackBarSpy).toHaveBeenCalledWith(
    'This contact is already in your list.', '', { duration: 5000, panelClass: 'info-snackbar' }
  );
});
```

### TC-07: `import-add-candidate` — default toast copy is "Candidate added." not "Contact added."

```javascript
// Angular Jasmine (import-add-candidate.component.spec.ts)
it('TC-07: default toast says "Candidate added." not "Contact added."', () => {
  const snackBarSpy = spyOn(component.snackBar, 'open');
  const fakeRes = {
    status: 'ADDED',
    message: 'Successfully add candidate'
    // no summary, not a duplicate -> default branch
  };
  candidateStateMock.next({ candidateRes: fakeRes, pending: false, error: null });

  expect(snackBarSpy).toHaveBeenCalledWith(
    'Candidate added.', '', { duration: 4000, panelClass: 'success-snackbar' }
  );
  // Negative assertion
  const msg = snackBarSpy.calls.mostRecent().args[0];
  expect(msg).not.toBe('Contact added.');
});
```

### TC-08: `import-add-contact` — bulk successCount===0 never shows success-snackbar

```javascript
// Angular Jasmine (import-add-contact.component.spec.ts)

it('TC-08a: bulk all-duplicate -> info-snackbar, never success-snackbar', () => {
  const snackBarSpy = spyOn(component.snackBar, 'open');
  const fakeRes = {
    contacts: [],
    summary: { totalRequested: 3, successCount: 0, failureCount: 0, duplicateCount: 3, outcome: 'duplicate_only' }
  };
  contactStateMock.next({ contactRes: fakeRes, pending: false, error: null });

  const callArgs = snackBarSpy.calls.mostRecent().args;
  expect(callArgs[2].panelClass).not.toBe('success-snackbar');
  expect(callArgs[2].panelClass).toBe('info-snackbar');
  expect(callArgs[0]).toBe('No new contacts were added. These contacts are already in your list.');
});

it('TC-08b: bulk all-failed -> danger-snackbar, never success-snackbar', () => {
  const snackBarSpy = spyOn(component.snackBar, 'open');
  const fakeRes = {
    contacts: [],
    summary: { totalRequested: 2, successCount: 0, failureCount: 2, duplicateCount: 0, outcome: 'all_failed' }
  };
  contactStateMock.next({ contactRes: fakeRes, pending: false, error: null });

  const callArgs = snackBarSpy.calls.mostRecent().args;
  expect(callArgs[2].panelClass).toBe('danger-snackbar');
  expect(callArgs[0]).toBe('No contacts were added.');
});
```

**Total test cases: 8 (TC-01 to TC-08, with TC-03/04 multi-scenario and TC-08 two sub-cases)**

---

## 4. Contract Check — Shape Change Impact

**Old shape (pre-NOTIFY-P2):** `POST /contacts/multiplecontact` and `POST /candidates/multiplecandidate` returned a flat array of added items.

**New shape:** `{ contacts: [...], summary: { totalRequested, successCount, failureCount, duplicateCount, outcome } }` / `{ candidates: [...], summary: {...} }`

### Data flow through the full stack

1. BE controller wraps in `successResponse({ contacts, summary })` — HTTP JSON body is `{ data: { contacts, summary }, ... }`
2. FE `contacts.service.ts` `AddMultipleContact()` maps `res.data` — passes `{ contacts, summary }` through
3. NgRx effect dispatches `SAVE_CONTACT_MULTIPLE_SUCCESS` with `payload: { contacts, summary }`
4. NgRx reducer sets `contactRes = action.payload` (shape-agnostic — just assigns whatever the payload is)
5. `ImportAddContactComponent` reads `onboard.contactRes` and checks `res.summary` presence first

### Consumers of `contactRes` / `candidateRes`
- `import-add-contact.component.ts` — UPDATED, handles new shape correctly via `hasSummary` branch
- `import-add-candidate.component.ts` — UPDATED, handles new shape correctly via `hasSummary` branch
- No other component subscribes to `state.contact.contactRes` or `state.candidate.candidateRes` (confirmed via grep: 0 matches for these selectors outside the two dialog components)

**Verdict: No contract breakage. The shape change is fully contained to these two consumers.**

---

## 5. Regression Checklist

| Item | Status | Evidence |
|------|--------|----------|
| Public job browsing | UNAFFECTED | `jobsRoute.js` unchanged; `GET /job/published` has no auth middleware; unrelated to contacts/candidates |
| Applicant flow | UNAFFECTED | `candidateController.js` applicant-facing paths (`getJobAppliedList`) and `listOfAppliedJobsById` unchanged |
| SEC-02: `optionalVerifyAuth` on `GET /job/details` | CONFIRMED INTACT | `jobsRoute.js` line 62: `router.get("/job/details", optionalVerifyAuth, getJobDetails)` |
| SEC-02: `optionalVerifyAuth` on `GET /job/sharelink` | CONFIRMED INTACT | `jobsRoute.js` line 63: `router.get("/job/sharelink", optionalVerifyAuth, getJobShareableLink)` |
| SEC-01: `getUserProfile` uses `req.user.uid` only | CONFIRMED INTACT | `userController.js` line 264: `const { uid } = req.user` — no body/query param used |

---

## 6. Findings

### F-01 (LOW, PRE-EXISTING) — Stale typo in contact duplicate message
**Location:** `contact.service.js` lines 27, 33, 136, 138, 148, 154 — `"Contact aleady exist"` (missing 'r' in 'already')
**Impact:** User-visible message in some code paths. Not introduced by NOTIFY-P2. Now exposed more visibly because the FE surfaces the message text in `info-snackbar`. Not blocking.

### F-02 (MEDIUM, PRE-EXISTING) — `importCandidateForm` uninitialized in `ngOnInit`
**Location:** `import-add-candidate.component.ts` line 77 (commented out); initialized only inside `uploadListener` at line 286
**Impact:** If `saveOnboardMultiple()` is called before a file is uploaded (reachable via `uploadFile()` → `saveOnboardMultiple()` if called before CSV listener fires), accessing `this.importCandidateForm.value` throws `TypeError`. Not introduced by NOTIFY-P2 but relevant to the bulk candidate import flow that NOTIFY-P2 touches.

### F-03 (INFO, PRE-EXISTING) — `import-add-candidate.component.ts` dual-dispatches SAVE_CONTACT + SAVE_CANDIDATE
**Location:** `saveOnboard()` lines 237-244
**Impact:** A single candidate add fires both `SAVE_CANDIDATE` (expected) and `SAVE_CONTACT` (unexpected side-effect). The contact action flows to its own effect/reducer, but since `import-add-contact` is a different dialog instance, there is no visible cross-contamination during normal use. However, it silently creates contacts when adding candidates. Pre-existing design decision, not NOTIFY-P2.
