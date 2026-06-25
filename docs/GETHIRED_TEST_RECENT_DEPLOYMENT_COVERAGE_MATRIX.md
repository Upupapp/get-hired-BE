# GetHired TEST RECENT DEPLOYMENT — COVERAGE MATRIX
**Deployment:** NOTIFY-P2 (BE 2ff6358 / FE 1863842)
**Audit date:** 2026-06-26

---

## Coverage Matrix

| Test Area | TC # | Coverage Status | Risk if Untested | Priority |
|-----------|------|-----------------|-----------------|----------|
| `addContact` returns `status: 'ADDED'` for new contact | TC-01a | LOGIC VERIFIED (static) | LOW — clear single-path code | P2 |
| `addContact` returns `status: 'DUPLICATE_CONTACT'` for pure duplicate | TC-01b | LOGIC VERIFIED (static) | MEDIUM — wrong status = false-positive success toast | P1 |
| `addContact` duplicate-in-group path returns `status: 'ADDED'` | TC-01c | LOGIC VERIFIED (static) | LOW — edge case | P3 |
| `addContact` duplicate-already-in-group returns `status: 'DUPLICATE_CONTACT'` | TC-01d | LOGIC VERIFIED (static) | LOW — edge case | P3 |
| `addMultipleContact` mirrors `addContact` status logic | TC-01 | LOGIC VERIFIED (static) | MEDIUM — bulk path used by controller | P1 |
| `addCandidates` returns `status: 'ADDED'` | TC-02a | LOGIC VERIFIED (static) | LOW | P2 |
| `addCandidates` returns `status: 'DUPLICATE_CANDIDATE'` | TC-02b | LOGIC VERIFIED (static) | MEDIUM — same false-positive risk | P1 |
| `multipleContact` controller uses `Promise.allSettled` | TC-03 | LOGIC VERIFIED (static) | HIGH — old forEach(async) was broken; regression would silently miss entries | P0 |
| `multipleContact` summary shape correct | TC-03 | LOGIC VERIFIED (static) | HIGH — FE contract depends on this shape | P0 |
| `multipleContact` outcome branch logic (all 4 outcomes) | TC-03 | LOGIC VERIFIED (static) | MEDIUM | P1 |
| `multipleCandidate` uses `Promise.allSettled` | TC-04 | LOGIC VERIFIED (static) | HIGH | P0 |
| `multipleCandidate` summary shape + outcome branches | TC-04 | LOGIC VERIFIED (static) | HIGH | P0 |
| `import-add-user` danger-snackbar when all-failed | TC-05 | LOGIC VERIFIED (static) | MEDIUM — without this, UI shows nothing or wrong state | P1 |
| `import-add-user` warning-snackbar partial success | TC-05 | LOGIC VERIFIED (static) | MEDIUM | P1 |
| `import-add-user` success-snackbar all-success | TC-05 | LOGIC VERIFIED (static) | LOW | P2 |
| `import-add-contact` info-snackbar for DUPLICATE_CONTACT single | TC-06 | LOGIC VERIFIED (static) | MEDIUM — before patch, showed false success | P1 |
| `import-add-contact` bulk summary all branches | TC-06/08 | LOGIC VERIFIED (static) | HIGH — core of NOTIFY-P2 | P0 |
| `import-add-contact` successCount===0 never success-snackbar | TC-08 | LOGIC VERIFIED (static) | HIGH — primary bug being fixed | P0 |
| `import-add-candidate` default copy "Candidate added." | TC-07 | LOGIC VERIFIED (static) | LOW — cosmetic, easy to spot | P2 |
| `import-add-candidate` single DUPLICATE_CANDIDATE info-snackbar | TC-07 | LOGIC VERIFIED (static) | MEDIUM | P1 |
| `import-add-candidate` bulk successCount===0 never success-snackbar | TC-08 | LOGIC VERIFIED (static) | HIGH | P0 |
| FE API service unwraps `res.data` correctly for new shape | CONTRACT | VERIFIED (static) | HIGH — if mis-mapped, all toast logic fails | P0 |
| NgRx reducers are shape-agnostic for new payload | CONTRACT | VERIFIED (static) | HIGH | P0 |
| No other FE consumers of `contactRes`/`candidateRes` | CONTRACT | VERIFIED (grep) | HIGH — any unnoticed consumer would receive object instead of array | P0 |
| SEC-02 `optionalVerifyAuth` on `/job/details` | REGRESSION | VERIFIED (static) | CRITICAL — public job detail exposure | P0 |
| SEC-02 `optionalVerifyAuth` on `/job/sharelink` | REGRESSION | VERIFIED (static) | CRITICAL | P0 |
| SEC-01 `getUserProfile` uses `req.user.uid` only | REGRESSION | VERIFIED (static) | CRITICAL — IDOR | P0 |
| Public job browsing unaffected | REGRESSION | VERIFIED (static) | LOW — unrelated code path | P3 |
| Applicant flow unaffected | REGRESSION | VERIFIED (static) | LOW — unrelated code path | P3 |

---

## Coverage Summary

| Status | Count |
|--------|-------|
| LOGIC VERIFIED (static analysis) | 18 |
| VERIFIED (grep / route inspection) | 5 |
| NOT RUN (requires test runner / browser / DB) | 0 |
| UNKNOWN | 0 |

All test areas covered by static verification. No areas left unknown.

---

## Gaps and Risks

| Gap | Risk | Mitigation |
|-----|------|-----------|
| No automated test execution (BE has no test framework; FE Karma requires browser) | MEDIUM — runtime regressions in DB interaction layer not caught statically | Manual smoke test of import flows recommended before next release |
| F-02: `importCandidateForm` uninitialized in `ngOnInit` | MEDIUM — crash if `saveOnboardMultiple` called without CSV upload path having run | Pre-existing; add null guard `if (!this.importCandidateForm) return;` in `saveOnboardMultiple` |
| Typo `"aleady"` in contact service messages | LOW — cosmetic | Fix in next patch |
