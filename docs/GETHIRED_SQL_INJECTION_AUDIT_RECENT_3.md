# GetHired — SQL Injection Audit (SECURE 3)
**Date:** 2026-06-26

---

## Methodology

Searched all `.js` files for:
1. Template literals containing `${}` within SQL strings where the interpolated value is user-derived
2. Comparison with the DB schema string `${dbSchema}` (safe — this is an env-controlled value, not user input)
3. Any `dbQuery.query(sql, [])` pattern where `sql` contains user-controlled interpolation

---

## Safe Patterns (parameterized)

The vast majority of queries use parameterized form:
```js
dbQuery.query(`SELECT * FROM ${dbSchema}.table WHERE col=$1`, [userValue])
```
The `${dbSchema}` interpolation is safe — it's `process.env.SCHEMA`, not user input.

Controllers audited as clean:
- `controllers/applicantsController.js` — all queries parameterized
- `controllers/applicationController.js` — all queries parameterized
- `controllers/cvController.js` — all queries parameterized with `user_id=$2` ownership
- `controllers/jobsController.js` — all queries parameterized
- `controllers/companiesController.js` — all queries parameterized
- `controllers/paymentController.js` — all queries parameterized
- `controllers/interviewController.js` — all queries parameterized
- `controllers/userController.js` — all queries parameterized
- `controllers/subscriptionController.js` — all queries parameterized
- `controllers/messageController.js` — all queries parameterized
- `controllers/candidateController.js` — all queries parameterized
- `controllers/contactsController.js` — all queries parameterized

---

## Unsafe Patterns Found (string interpolation with user-derived values)

### Finding SQI-1: `services/contact.service.js`

**Location:** Multiple functions — lines ~43, ~95, ~144, ~188, ~285 (groupName interpolation)
```js
const selectQuery = `SELECT group_id FROM ${dbSchema}."group" where group_name ='${groupName}';`;
const { rows } = await dbQuery.query(selectQuery, []);
```
`groupName` originates from `req.body.groupName` in `contactsController.js`.

**Finding SQI-2: `services/contact.service.js` line ~224**
```js
const searchQuery = `SELECT * FROM ${dbSchema}.contact WHERE contact_id='${contactId}';`;
```
`contactId` originates from controller request parameters.

**Finding SQI-3: `services/contact.service.js` line ~449**
```js
const searchQuery = `SELECT email FROM ${dbSchema}.group_list WHERE email = '${email}' and group_id='${groupId}';`;
```
Both `email` and `groupId` are user-derived.

**Finding SQI-4: `services/contact.service.js` lines ~465, ~481**
```js
const searchQuery = `SELECT * FROM ${dbSchema}.group WHERE group_id='${groupId}';`;
const searchQuery = `SELECT * FROM ${dbSchema}.group WHERE group_name='${groupName}';`;
```

**Finding SQI-5: `services/candidate.service.js` line ~73**
```js
const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id='${candidateId}';`;
```

---

## Exploitability Assessment

**Auth-gated:** All these functions are called from controllers that require `verifyAuth`. An unauthenticated attacker cannot reach them directly.

**Post-auth exploitation:** A malicious **authenticated employer** can supply:
- `groupName`: `' OR '1'='1` → dumps all group names
- `email`: `' OR email LIKE '%` → enumerates all emails in group_list
- `contactId`: `' OR 1=1 --` → reads arbitrary contact records

**Severity: P2/MEDIUM** — requires authentication, but authenticated SQL injection can:
- Exfiltrate data from any table accessible to the DB user
- Potentially execute time-based blind injection to enumerate schema
- Bypass company-scoping if the injected condition removes the company_id filter

---

## Recommended Fixes

### Fix template for each pattern

**Before (unsafe):**
```js
const selectQuery = `SELECT group_id FROM ${dbSchema}."group" where group_name ='${groupName}';`;
const { rows } = await dbQuery.query(selectQuery, []);
```

**After (safe):**
```js
const selectQuery = `SELECT group_id FROM ${dbSchema}."group" WHERE group_name = $1;`;
const { rows } = await dbQuery.query(selectQuery, [groupName]);
```

Apply same pattern to all 9 unsafe locations in `contact.service.js` and 1 in `candidate.service.js`.

---

## Sitemap XML Injection

The sitemap generator uses `xmlEscape()` for job_id and date values:
```js
const xmlEscape = (str) => String(str)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");
```
This correctly prevents XML injection via malformed job_id values. **PASS.**

---

## Summary

| Location | Count | Status |
|---|---|---|
| controllers/* | 0 unsafe | CLEAN |
| services/contact.service.js | 9 unsafe locations | P2 — SQI-1 through SQI-4 |
| services/candidate.service.js | 1 unsafe location | P2 — SQI-5 |
| server.js (sitemap) | 0 unsafe (xmlEscape used) | CLEAN |
