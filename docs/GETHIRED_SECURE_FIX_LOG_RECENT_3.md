# GetHired — Security Fix Log (SECURE 3)
**Date:** 2026-06-26
**Scope:** Code changes made during or verified by SECURE 3 audit

---

## Code Fixes Applied This Session

### No new code fixes were required during SECURE 3.

All targeted items were verified as already correctly implemented:

| Item | Expected fix | Actual state | Action taken |
|---|---|---|---|
| Firebase credential chain | 4-strategy chain, no dynamic require | Confirmed correct in `middleware/firebaseApp.js` | Verified — no change needed |
| `.gitignore` service account patterns | Service account JSON blocked | Confirmed present | Verified — no change needed |
| `verifyRoles.js` ESM compat | `&&` form semantically equivalent | Verified equivalent | Documented — no change needed |
| `optionalVerifyAuth.js` safety | Does not bypass required auth | Confirmed — only 2 routes use it | Verified — no change needed |
| PayMongo webhook HMAC | Implementation correct | `verifyPaymongoSignature()` confirmed correct | Verified — external action needed (secret in prod) |
| CORS origin restriction | `cors({ origin: env.app_url })` | Confirmed present | Verified — external action needed (confirm APP_URL in prod) |
| `GOOGLE_INDEXING_API_ENABLED` | Disabled by default | Confirmed hard gate in service | Verified — no change needed |
| `checkEmailIfExistInCandidate` scope | company_id scoped | Confirmed `AND company_id = $2` at line 61 | Verified FIXED — M2-1 from previous register is now CLOSED |

---

## Recommended Code Fixes (Not Applied — Require Developer Action)

### FIX-R1: Parameterize string-interpolated SQL in contact service (P2)

**File:** `services/contact.service.js`
**Locations:** ~9 functions using `` `WHERE field='${variable}'` ``

**Pattern fix:**
```js
// BEFORE (unsafe — 9 locations in contact.service.js):
const selectQuery = `SELECT group_id FROM ${dbSchema}."group" where group_name ='${groupName}';`;
const { rows } = await dbQuery.query(selectQuery, []);

// AFTER (safe):
const selectQuery = `SELECT group_id FROM ${dbSchema}."group" WHERE group_name = $1;`;
const { rows } = await dbQuery.query(selectQuery, [groupName]);
```

Apply same pattern to:
- `checkContactIfExist` line ~224 (contactId)
- `checkIfExistInGroup` line ~449 (email, groupId)
- `checkGroupIfExist` line ~465 (groupId)
- `checkGroupNameIfExist` line ~481 (groupName)
- All `addContact` sub-functions that call group lookups (~43, ~95, ~144, ~188, ~285)

### FIX-R2: Parameterize string-interpolated SQL in candidate service (P2)

**File:** `services/candidate.service.js`
**Location:** `checkCandidateIfExist` line ~73

```js
// BEFORE (unsafe):
const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id='${candidateId}';`;
const { rows } = await dbQuery.query(searchQuery, []);

// AFTER (safe):
const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id = $1;`;
const { rows } = await dbQuery.query(searchQuery, [candidateId]);
```

### FIX-R3: Add company creation role check (P3)

**File:** Company route file
```js
// BEFORE:
router.post('/company/create', verifyAuth, createInitialCompany);

// AFTER:
router.post('/company/create', verifyAuth, verifyRoles(['1', '2']), createInitialCompany);
```

### FIX-R4: Add `/auth/manualexcelverification` auth guard (P2)

**File:** `routes/userRoute.js`
```js
// BEFORE:
router.post("/auth/manualexcelverification", verifyEmailFileManually);

// AFTER (admin only):
router.post("/auth/manualexcelverification", verifyAuth, verifyRoles(['1']), verifyEmailFileManually);
```

### FIX-R5: Extend check-secrets.sh with payment/email patterns (P3)

**File:** `tools/check-secrets.sh`
Add scan patterns:
```bash
scan_pattern "PayMongo secret key" "sk_live_\|sk_test_"
scan_pattern "SendGrid API key" "SG\."
scan_pattern "PostgreSQL connection string with password" "postgres://[^:]*:[^@]*@"
```

---

## Previously Applied Fixes (Verified Still Intact)

| Fix | Applied in | Status |
|---|---|---|
| BOLA companyId derivation from JWT | Multiple sessions | INTACT |
| verifyAuth on all CV/candidate/contact routes | STITCH | INTACT |
| optionalVerifyAuth for /job/details | SEC-02 | INTACT |
| IDOR block on /applicant/userprofile | SEC-01 | INTACT |
| Magic byte upload verification | SECURE pass | INTACT |
| PayMongo auth-gate on payment link endpoint | SECURE pass | INTACT |
| PII removal from payment webhook logs | QA11 | INTACT |
| X-Content-Type-Options nosniff header | QA11 | INTACT |
| X-Frame-Options: DENY | QA11 | INTACT |
| Admin role 1 excluded from self-registration | STITCH | INTACT |
| timingSafeEqual in webhook HMAC | SECURE 3 target | IMPLEMENTED CORRECTLY |
