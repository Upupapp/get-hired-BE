# GetHired — SECURE Fix Log (NOTIFY-P2 Recent Deployment)
**Scope:** BE 2ff6358 / FE 1863842 (NOTIFY-P2 deployment)
**Audit date:** 2026-06-26
**Total fixes applied this pass:** 0

---

## No new security fixes required

The NOTIFY-P2 deployment introduced no new P0 or P1 vulnerabilities. No code changes were required during this audit pass.

---

## Recommended Non-Blocking Fix (not applied — awaiting PR)

### REC-1: Scope `checkEmailIfExistInCandidate` to caller's company (MEDIUM)

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\services\candidate.service.js`

**Current code (lines 57-71):**
```js
const checkEmailIfExistInCandidate = async (email) => {
  // TODO (Filter by agency)
  try {
    const searchQuery = `SELECT email
            FROM ${dbSchema}.candidates
            where candidates.email = $1;`;
    const { rows } = await dbQuery.query(searchQuery, [email]);
    if (!rows || rows.length === 0) {
      return false;
    }
    return true;
  } catch {
    throw Error("Operation Failed");
  }
};
```

**Recommended fix:**
1. Change the function signature to accept `companyId` as a second parameter
2. Add `AND company_id = $2` to the WHERE clause
3. Update callers (`addCandidates` at line 21, `multipleCandidate` controller) to pass `companyId`

```js
// Recommended replacement:
const checkEmailIfExistInCandidate = async (email, companyId) => {
  try {
    const searchQuery = `SELECT email
            FROM ${dbSchema}.candidates
            WHERE candidates.email = $1 AND company_id = $2;`;
    const { rows } = await dbQuery.query(searchQuery, [email, companyId]);
    if (!rows || rows.length === 0) {
      return false;
    }
    return true;
  } catch {
    throw Error("Operation Failed");
  }
};
```

And in `addCandidates` (line 21), change:
```js
const ifExistCandidate = await checkEmailIfExistInCandidate(email);
```
to:
```js
const ifExistCandidate = await checkEmailIfExistInCandidate(email, companyId);
```

**Impact:** Eliminates the cross-company email-existence oracle for candidates. After the fix, an employer importing email X will only receive `DUPLICATE_CANDIDATE` if that email is already in their own company's candidate list.

**Blocking for release?** No. The oracle was pre-existing and the practical leak is low (existence only, no other data).

---

## Prior Session Fixes Still Holding (verified)

These fixes from prior sessions were verified still intact during this audit:

| Fix | Session | Status |
|---|---|---|
| BOLA: `getUserCompany` from JWT in `createContact` | QA8 FIX-7 | HOLDING |
| BOLA: `getUserCompany` from JWT in `multipleContact` | QA8 FIX-7 | HOLDING |
| BOLA: JWT companyId override in `contacts.map(option => ...)` | NOTIFY-P2 | HOLDING |
| Auth middleware on all contact routes | STITCH GH-ACT-011 | HOLDING |
| Auth middleware on all candidate routes | STITCH GH-ACT-011 | HOLDING |
| optionalVerifyAuth on GET /job/details | SEC-02 | HOLDING |
| optionalVerifyAuth on GET /job/sharelink | SEC-02 | HOLDING |
