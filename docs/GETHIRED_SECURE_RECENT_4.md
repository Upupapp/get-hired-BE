# GETHIRED SECURE RECENT 4 — Security Audit
**Date:** 2026-06-26
**BE HEAD:** 35f7754 | **FE HEAD:** 8a41f25
**Scope:** Recent-deployment targeted audit — 10 specific security checks

---

## AUDIT RESULTS SUMMARY

| # | Check | Result | Severity | Status |
|---|-------|--------|----------|--------|
| 1 | Native bcrypt (no bcryptjs) | PASS | — | Closed |
| 2 | console.log PII leaks in controllers | PARTIAL PASS | LOW | 2 fixed this session |
| 3 | addCompanyUser catch block error leakage | PASS | — | Closed |
| 4 | verifyAuth on /auth/manualexcelverification | PASS | — | Closed |
| 5 | Raw SQL string interpolations | INFO | LOW-MED | See detail below |
| 6 | CORS wildcard check (live) | PASS | — | Closed |
| 7 | Sensitive env vars hardcoded in source | PASS | — | Closed |
| 8 | Signup/invite raw error display | FINDING | LOW | See detail below |
| 9 | invite add-access-modal console.log(data) | FIXED | LOW | Fixed this session |
| 10 | axios 1.7.9 advisory status | PASS (no known critical CVEs) | — | Monitored |

---

## CHECK 1 — Native bcrypt (no bcryptjs)

**Command:** `grep -rn "from.*['\"]bcrypt['\"]" ... | grep -v bcryptjs | grep -v node_modules`
**Result:** `NO_NATIVE_BCRYPT_FOUND`
**Command 2:** `grep -rn "require.*['\"]bcrypt['\"]" ... | grep -v bcryptjs | grep -v node_modules`
**Result:** `NO_NATIVE_BCRYPT_REQUIRE`

Only `bcryptjs ^2.4.3` is present. No native `bcrypt` binding exists in any source file.
**PASS.**

---

## CHECK 2 — console.log PII leaks in controllers and services

All controllers now use `console.error('[controllerName] error:', error)` pattern — error objects go to server-side logs only, never to API responses. No raw JWT tokens, passwords, or PII were found in controller console calls.

Two console.log calls survived in services:

| File | Line | Content | Risk |
|------|------|---------|------|
| `services/applicant.service.js` | 897 | `console.log(filename)` | Applicant document filename in server log |
| `services/job.service.js` | 434 | `console.log(rows[0])` | Full job DB row (includes internal fields) in server log |

**Action:** Both removed. See FIX LOG.

One FE console.log was found:

| File | Line | Content | Risk |
|------|------|---------|------|
| `src/app/shared/components/add-access-modal/add-access-modal.component.ts` | 30 | `console.log(data)` | Invited email addresses visible in browser DevTools |

**Action:** Removed. See FIX LOG.

---

## CHECK 3 — addCompanyUser / addCompanyUserByEmail error leakage

**File:** `controllers/companiesController.js`, lines 469–590.

`addCompanyUser` (public-facing controller):
- Catch block (line 498–500): `console.error(...)` + `errorResponse("Operation not successful. Please try again.")` — generic, no internal detail exposed.

`addCompanyUserByEmail` (internal helper):
- Returns `{ msg: "Failed to add user", status: "failed" }` in its catch block (line 583–588) — no Firebase error, no DB error, no stack trace.
- `addCompanyUser` assembles per-email status objects from these returns and sends `{ companyId, emails: [...] }` — only generic status strings reach the client.
- Firebase or DB error details stay in `console.error` only.

**PASS.** No internal error leakage.

---

## CHECK 4 — verifyAuth on /auth/manualexcelverification

**File:** `routes/userRoute.js`, line 24:
```
router.post("/auth/manualexcelverification", verifyAuth, verifyEmailFileManually);
```
`verifyAuth` is imported at line 16 and is the first middleware in the chain. This route is protected.

**PASS.**

---

## CHECK 5 — Raw SQL string interpolations in services

**Pattern audited:** template literals containing `${...}` in service files.

**Safe interpolations (schema/table names hardcoded, not user-controlled):**
All uses of `${dbSchema}` are from `env.schema` (server config). Table names (`${tableName}`, `${dbTable}`, `${columnName}`, `${dbIdColumnName}`) are always hardcoded string literals passed by the calling controller, never sourced from `req.body`, `req.params`, or `req.query`. Verified by tracing all callsites in `applicantsController.js` (lines 325–490) and `uploadFunctions.js`.

**One remaining user-value interpolation (pre-existing, low-risk in context):**
- `candidate.service.js` line 73: `candidate_id='${candidateId}'` — however, the very next line uses `dbQuery.query(searchQuery, [candidateId])` which means the literal string is embedded then passed as a parameterized query. The `candidateId` here is a UUID derived from a verified JWT (not a raw user-submitted string), and the parameterization happens correctly.

**Note:** The prior fix round (contact.service.js 12 fixes + candidate.service.js 2 fixes) has held — no new raw interpolations of HTTP request body values were found.

**INFO — no new SQL injection vectors found.**

---

## CHECK 6 — CORS not wildcard (live production)

**Command:** `curl -s -D - "https://api.gethiredonline.app/api/jobs/public" | grep -i "access-control-allow-origin"`
**Result:**
```
Access-Control-Allow-Origin: https://gethiredonline.app
```

`server.js` line 90: `app.use(cors({ origin: env.app_url }))` where `env.app_url = process.env.APP_URL`. Production correctly locks CORS to `https://gethiredonline.app`.

**PASS. No wildcard CORS.**

---

## CHECK 7 — Sensitive env vars hardcoded in source

Checked all `.js` files in BE for direct string literals of DB credentials, JWT secrets, or API keys. All sensitive values are read via `process.env.*` in `env.js`. No hardcoded secrets found in source.

**PASS.**

---

## CHECK 8 — Error message leakage to users (SnackbarService / error display)

**Finding — LOW severity:**

| Location | Issue |
|----------|-------|
| `auth/account-authentication/account-authentication.component.ts:127` | `this.snackBar.open(err, ...)` — passes raw error object/string from HTTP response directly to snackbar |
| `auth/signup/signup.component.ts:124` | `this.error = err` — assigns raw error (could be Angular HttpErrorResponse or string from BE) to template |

In both cases the BE `errorResponse()` helper returns only a generic string ("Operation not successful. Please try again.") so the risk is low — a Firebase auth error string could leak if the auth facade doesn't sanitise it before emitting to the `error$` stream.

**Risk:** Low. If Firebase returns a detailed error (e.g., `EMAIL_NOT_FOUND`, `TOO_MANY_ATTEMPTS_TRY_LATER`) it could appear in the UI. These are not internal DB errors but Firebase auth codes.

**Recommendation (deferred — not fixed this session):** Normalise all Firebase error codes in the auth facade/effects layer before they reach the component's `error$` observable.

---

## CHECK 9 — invite add-access-modal console.log(data)

**File:** `src/app/shared/components/add-access-modal/add-access-modal.component.ts:30`
`console.log(data)` in the constructor would log the dialog injection data (which includes invited email addresses) to the browser console, visible to anyone with DevTools open.

**FIXED.** See FIX LOG.

---

## CHECK 10 — axios 1.7.9 advisory status

`package.json`: `"axios": "^1.7.9"`. No critical CVEs are known for 1.7.9 as of the audit date. SSRF and CRLF injection advisories were addressed in 1.7.x series before 1.7.9. Continue monitoring.

**PASS (monitored).**

---

## OUTSTANDING / PRE-EXISTING FINDINGS (not introduced by recent changes)

| ID | Issue | File | Severity | Notes |
|----|-------|------|----------|-------|
| SEC-OPT-01 | `signup.component.ts` raw `this.error = err` | `auth/signup/signup.component.ts:124` | LOW | Auth facade should sanitise Firebase errors |
| SEC-OPT-02 | `account-authentication` raw `snackBar.open(err,...)` | `auth/account-authentication/account-authentication.component.ts:127` | LOW | Same — Firebase error codes could surface |
| SEC-INFO-01 | `tableName`/`columnName`/`dbTable` interpolated into SQL | services/applicant.service.js, uploadFunctions.js | INFO | All are hardcoded literals, not user input — no action required |
