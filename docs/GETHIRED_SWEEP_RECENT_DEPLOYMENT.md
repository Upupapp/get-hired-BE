# GETHIRED SWEEP — RECENT DEPLOYMENT (NOTIFY-P2)

**Deployment:** BE 2ff6358 / FE 1863842  
**Date audited:** 2026-06-26  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Scope:** NOTIFY-P2 false-positive toast fixes — contact/candidate/company-user invite flows

---

## Executive Summary

**Deployment health: GREEN with two known deferred items**

NOTIFY-P2 shipped clean. All three false-positive toast bugs are confirmed fixed in the code, both repos are in sync, and the structural `forEach(async)` antipattern was correctly replaced in the two targeted bulk endpoints (`multipleContact`, `multipleCandidate`). No new P0 risks were introduced by this deployment.

**What changed:**
- BE (2ff6358): Status fields added to all contact/candidate service returns; `Promise.allSettled` replaces broken `forEach(async)` in both bulk controllers; structured `{ contacts/candidates, summary }` response shape; `console.info` logging added.
- FE (1863842): Three dialog components now read `e.status !== 'failed'` (company user) and `res.summary` / `res.status` (contact/candidate) before deciding which toast to show. Two new snackbar CSS classes added to `styles.scss`.

**What was verified:** All 8 specified files read and confirmed.

**Issues found:** 2 deferred items (carried from prior sprint, not new regressions from NOTIFY-P2). 0 new P0s introduced.

---

## §1 NOTIFY-P2 Verification

### 1.1 `controllers/contactsController.js` — multipleContact

**Status: CONFIRMED**

Lines 56-75: `Promise.allSettled` is used. Each contact maps through `addMultipleContact`. Results are partitioned by `r.value?.status === 'ADDED'` vs `'DUPLICATE_CONTACT'` vs `r.status === 'rejected'`. Summary object is built and logged. Response shape is `{ contacts: addedItems, summary }`. The old `forEach(async)` inside `new Promise()` is gone from this function.

**Note — `createGroup` / `updateGroup` still have the old pattern:** Lines 221-239 and 271-289 of the same file still use `emails.forEach(async option => { ... })` inside `new Promise()`. This was explicitly deferred in `GETHIRED_NOTIFY_P2_CONTACT_INVITE_BACKLOG_V2.md` as a P2. It is not a new regression — it pre-existed NOTIFY-P2 and was out of scope. See §4.

### 1.2 `controllers/candidateController.js` — multipleCandidate

**Status: CONFIRMED**

Lines 55-74: Identical `Promise.allSettled` pattern to the contact controller. Partitions results by `'ADDED'` vs `'DUPLICATE_CANDIDATE'` vs rejected. Logs `[NOTIFY_P2_CANDIDATE_INVITE_MULTIPLE]`. Response shape is `{ candidates: addedItems, summary }`.

### 1.3 `services/contact.service.js` — all return branches have status fields

**Status: CONFIRMED**

`addContact` function: all branches confirmed with `status: 'DUPLICATE_CONTACT'` or `status: 'ADDED'` returns:
- `ifExistContact && groupName=="" && groupId==""` → `{ message, status: 'DUPLICATE_CONTACT' }` (line 28)
- `ifExistContact && groupName==""` (check group) → DUPLICATE_CONTACT or ADDED (lines 33-38)
- `ifExistContact` with groupName set → ADDED (lines 53-60)
- New INSERT success branches → `{ ...dbResponse, message, status: 'ADDED' }` (lines 86, 91, 101, 107)

`addMultipleContact` function: same pattern confirmed throughout (lines 131, 135, 139, 154, 180, 183, 193, 197).

### 1.4 `services/candidate.service.js` — all return branches have status fields

**Status: CONFIRMED**

`addCandidates` function:
- `ifExistCandidate` true → `{ message, status: 'DUPLICATE_CANDIDATE' }` (line 26)
- Insert success → `{ ...dbResponse, message, status: 'ADDED' }` (line 51)

Only two branches exist here (duplicate check is simpler than contacts). Both covered.

### 1.5 `import-add-user.component.ts` — reads per-email status field

**Status: CONFIRMED**

Lines 63-81: Reads `invite.companyUserRes.emails`. Filters `emails.filter((e: any) => e.status !== 'failed')` to get `successCount`. Three branches: all success → `success-snackbar`; partial → `warning-snackbar`; all failed (`successCount === 0`) → `danger-snackbar`. The old `emails.length > 0` truthiness check is gone.

### 1.6 `import-add-contact.component.ts` — checks res.summary and res.status

**Status: CONFIRMED**

Lines 89-123: Reads `onboard.contactRes`. Checks `hasSummary = res && res.summary`. If summary present (bulk flow): routes to success/warning/info/danger by `successCount`/`duplicateCount`/`failureCount`. If no summary (single contact): checks `res.status === 'DUPLICATE_CONTACT'` and shows `info-snackbar`. No unconditional success toast remains.

### 1.7 `import-add-candidate.component.ts` — checks res.summary and res.status

**Status: CONFIRMED**

Lines 90-123: Identical pattern to contact component, adapted for candidate. Reads `onboard.candidateRes`. Summary branch uses `successCount`/`duplicateCount`/`failureCount`. Single-candidate branch checks `res.status === 'DUPLICATE_CANDIDATE'`. Copy correctly says "Candidate added." / "candidates added." (not "Contact added.").

### 1.8 `src/styles.scss` — warning-snackbar and info-snackbar defined

**Status: CONFIRMED**

Lines 253-262:
```scss
.warning-snackbar {
  background-color: #f59e0b;
  color: #ffffff;
}

.info-snackbar {
  background-color: #6b7280;
  color: #ffffff;
}
```

Both present, correctly commented as `NOTIFY-P2`. The existing `success-snackbar` and `danger-snackbar` classes were already defined above.

---

## §2 Regression Risk Assessment

### Risk 1 — `createGroup` / `updateGroup` still use broken `forEach(async)` [PRE-EXISTING, NOT NEW]

**Severity: P2**  
**File:** `contactsController.js` lines 221-239, 271-289  
**Description:** Both functions still use `emails.forEach(async option => { ... })` inside `new Promise()`. This can cause "headers already sent" Express errors when multiple emails fail simultaneously. This was NOT introduced by NOTIFY-P2; it was present before and explicitly deferred.  
**Impact:** Group creation/update with multiple emails could produce silent failures or Express errors under load. Not a correctness regression from this deploy — the `multipleContact` and `multipleCandidate` paths are fully fixed.

### Risk 2 — `interview.service.js` also has the broken async forEach [PRE-EXISTING]

**Severity: P2**  
**File:** `services/interview.service.js` line 278  
**Description:** `removeDuplicates.forEach(async recipient => { ... })` inside `new Promise()` for interview notification emails. Same race condition as above. Not introduced by NOTIFY-P2 but discovered during sweep.  
**Impact:** Interview notification emails could silently fail or produce double-response errors under concurrent load.

### Risk 3 — `candidates/list` FE still sends `?companyId=` query param [PRE-EXISTING]

**Severity: P2**  
**File:** `get-hired-FE/src/app/shared/services/api/candidates.service.ts` line 16  
**Description:** `getCandidateList` still uses `?companyId=${data.payload}` in the GET request. The BE `candidateController.list` function correctly derives `companyId` from JWT and ignores any caller-supplied param (QA10 FIX-4). The query param is harmless but the FE fix was not applied (contrast with `contacts.service.ts` which has the `// QA10 FIX-14` comment showing the param was removed). Not a NOTIFY-P2 regression.

### Risk 4 — `warning-snackbar` color contrast [WCAG issue, LOW SEVERITY]

**Severity: P3**  
**File:** `src/styles.scss` line 255  
**Description:** `#f59e0b` amber with white text fails WCAG AA (contrast ratio ~2.5:1 — minimum is 4.5:1 for small text). This is a known deferred item per `GETHIRED_NOTIFY_P2_CONTACT_INVITE_BACKLOG_V2.md`. The copy conveys outcome in words; color is supplementary. Not a new regression — was introduced intentionally with awareness of the limitation.

**New risks introduced by NOTIFY-P2: 0**  
All risks above pre-existed or were known/accepted deferred items.

---

## §3 Consumer Impact Check — Bulk Endpoint Response Shape Change

The `multipleContact` endpoint (`POST /contacts/multiplecontact`) changed its response from an implicit array to `{ contacts: [...], summary: {...} }`. The `multipleCandidate` endpoint changed similarly to `{ candidates: [...], summary: {...} }`.

**FE consumers checked:**

| Consumer | File | Uses bulk endpoint? | Updated? |
|---|---|---|---|
| `import-add-contact.component.ts` | `employer-contacts/contact-list/.../import-add-contact.component.ts` | Yes | Yes — reads `res.summary` |
| `import-add-candidate.component.ts` | `employer-contacts/candidate-list/.../import-add-candidate.component.ts` | Yes | Yes — reads `res.summary` |
| `ContactService.AddMultipleContact()` | `shared/services/api/contacts.service.ts` | Transport layer only | Passes raw `res.data` through — no shape assumption in service layer |
| `CandidateService.AddMultipleCandidate()` | `shared/services/api/candidates.service.ts` | Transport layer only | Passes raw `res.data` through — no shape assumption in service layer |
| `contact.effect.ts` `saveContactMultiple` | `shared/store/effects/contact.effect.ts` | Effect dispatch only | Passes result as `payload` to reducer — no shape assumption |
| `candidate.effect.ts` `saveCandidateMultiple` | `shared/store/effects/candidate.effect.ts` | Effect dispatch only | Passes result as `payload` to reducer — no shape assumption |
| `contact.reducer.ts` | `shared/store/reducers/contact.reducer.ts` | Stores in `contactRes` | Stores verbatim — no shape assumption |
| `candidate.reducer.ts` | `shared/store/reducers/candidate.reducer.ts` | Stores in `candidateRes` | Stores verbatim — no shape assumption |

**Conclusion:** No other FE consumers make shape assumptions about the bulk response. The NgRx store passes the raw `res.data` through effect → reducer → component, and the only place the shape is read is in the two updated dialog components (`import-add-contact`, `import-add-candidate`). The response shape change is fully contained.

**One note on single-add flows:** `import-add-candidate.component.ts` line 241 dispatches `ContactActionTypes.SAVE_CONTACT` in addition to `CandidateActionTypes.SAVE_CANDIDATE` for single-candidate saves. This is a pre-existing quirk — saving a candidate also triggers a contact save. The `import-add-contact.component.ts` `contactData$` subscription will fire and show a contact toast. This was not introduced by NOTIFY-P2 and the toast logic now correctly handles `status: 'ADDED'` / `'DUPLICATE_CONTACT'` so it won't false-positive, but the double-dispatch is still unexpected behavior.

---

## §4 Open P0/P1 Issues

From previous sessions, cross-checked against current code:

### Previously fixed — confirmed still fixed in code

| Fix | Controller/File | Confirmed |
|---|---|---|
| SEC-01: BOLA on GET /applicant/userprofile | `applicantsController.js` | Not re-read in this sweep; fixed in commit 9173f0f, no NOTIFY-P2 overlap |
| SEC-02: BOLA on GET /job/details uid param | `jobsController.js` | Not re-read; fixed in commit 2757af5, no NOTIFY-P2 overlap |
| SEC-07: uid spoofing in verifyRoles + logout | `userController.js` | Not re-read; fixed in commit a5ade86, no NOTIFY-P2 overlap |
| Mobile block removed from app.component.ts | `app.component.ts` | Not re-read; fixed in FE bf7f175 |
| optionalVerifyAuth on public job endpoints | routes | Not re-read; fixed in commit 76f48e8 |

**NOTIFY-P2 did not touch any security-fix files. There is no overlap risk.**

### Still open from prior sessions

| ID | Issue | Severity | Status |
|---|---|---|---|
| DEBT-01 | `createGroup` / `updateGroup` broken async forEach in `contactsController.js` | P2 | Open — deferred in NOTIFY-P2 backlog |
| DEBT-02 | `interview.service.js` broken async forEach for notification emails | P2 | Open — not previously tracked as a named item |
| DEBT-03 | `candidates/list` FE still sends `?companyId=` query param (harmless but inconsistent) | P2 | Open — BE ignores param; FE not updated |
| DEBT-04 | `warning-snackbar` fails WCAG AA color contrast | P3 | Open — known/accepted per backlog |
| DEBT-05 | `danger-snackbar` should use `aria-live="assertive"` | P3 | Open — known/accepted per backlog |
| DEBT-06 | No rate-limiting repo-wide | P1 | Open — no `express-rate-limit` found; flagged in prior sweeps, not yet implemented |
| DEBT-07 | Leaked secrets in BE git history | P1 | Open — flagged from initial discovery; not fixed (requires history rewrite + secret rotation) |

---

## §5 Risk Register

| Risk | Severity | File | Status | Recommended Next Command |
|---|---|---|---|---|
| No rate-limiting on any write endpoint | P1 | `src/index.js` / middleware (absent) | Open | SECURE (P1 blocker for launch) |
| Leaked secrets in BE git history | P1 | `.git/` history | Open | Manual: rotate secrets, then `git filter-repo` |
| `createGroup` / `updateGroup` broken async forEach | P2 | `controllers/contactsController.js` lines 221-239, 271-289 | Open (deferred) | QA (next QA pass) |
| `interview.service.js` broken async forEach | P2 | `services/interview.service.js` line 278 | Open (newly noted) | QA (next QA pass) |
| `candidates/list` FE sends unused `?companyId=` | P2 | `get-hired-FE/src/app/shared/services/api/candidates.service.ts` line 16 | Open (harmless) | STITCH |
| Single-candidate save double-dispatches SAVE_CONTACT | P2 | `import-add-candidate.component.ts` lines 241-243 | Open (pre-existing) | QA |
| `warning-snackbar` fails WCAG AA contrast | P3 | `src/styles.scss` line 255 | Open (accepted) | BRAND or accessibility sprint |
| `danger-snackbar` uses `aria-live="polite"` instead of `"assertive"` | P3 | Global snackbar config | Open (accepted) | BRAND |

---

## §6 Recommended Next Command

**SECURE** — Rate limiting is the highest remaining pre-launch P1. No `express-rate-limit` or equivalent throttle middleware exists anywhere in `get-hired-BE`. Every write endpoint (contacts, candidates, applications, auth) is vulnerable to brute-force and abuse. This is the only P1 class item with a straightforward code fix (all others are either already fixed or require external action like git history rewrite + secret rotation).

After SECURE: **QA** pass to fix the three remaining async forEach anti-patterns (`createGroup`, `updateGroup`, `interview.service.js`) and the double-dispatch quirk in `import-add-candidate.component.ts`.
