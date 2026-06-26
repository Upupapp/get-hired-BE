# GetHired — Tech Debt Actions RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Tech debt sections in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**New this round:** ESM v3.2.25 Acorn limitation elevated to P1 tech debt

---

## Tech Debt Summary

| ID | Item | Priority | Severity | Effort | Owner |
|---|---|---|---|---|---|
| P1-ESM-ACORN | ESM v3.2.25 Acorn limitation — `?.`/`??` break production | P1 | HIGH | M-L | BE |
| P2-PM2-ECOSYSTEM | PM2 ecosystem file — entry point knowledge risk | P2 | MED | S | Ops/BE |
| P2-POOL-EXHAUSTION | DB pool exhaustion on large CSV bulk imports | P2 | MED | M | BE |
| P2-CSV-ROW-CAP | No CSV import row count cap in any import component | P2 | MED | S | FE |
| P2-CANDIDATE-SINGULAR | Bulk candidate uses `candidate` (singular) vs `contacts` (plural) | P2 | LOW | XS | BE+FE |
| P3-BCRYPT-JS | `bcrypt` → `bcryptjs` (native binary fragility on Node 14) | P3 | LOW | XS | BE |
| P3-AXIOS-1X | `axios` 0.x → 1.x | P3 | LOW | S | BE |
| P3-TOAST-EXTRACT | Duplicated toast decision logic in 3 import-add components | P3 | LOW | M | FE |
| P3-DEAD-LOG-CONTACT | Dead success state snackbar branches in list components | P3 | LOW | XS | FE |
| P3-CANDIDATE-FORM-GUARD | `importCandidateForm` uninitialized until CSV upload | P3 | LOW | XS | FE |
| P3-DEPENDABOT-114 | 114 Dependabot vulnerabilities (6 critical, 61 high) | P1/P2/P3 | VARIES | M-L | BE+FE |

---

## P1 — ESM v3.2.25 Acorn Limitation (P1-ESM-ACORN)

**Severity: HIGH — Developer trap that silently breaks production**

### Problem Description

`get-hired-BE` uses the `esm` package (v3.2.25) as an ES Module loader shim for Node 14. This version bundles Acorn 6 and Acorn 7 as its JavaScript parser. Acorn 6/7 cannot parse:
- Optional chaining: `obj?.property`
- Nullish coalescing: `value ?? fallback`
- Logical assignment: `a ??= b`

When any BE source file contains these operators, the application fails at startup with:
```
SyntaxError: Unexpected token '?'
```

This session, 3 BE files had introduced `?.` and `??` syntax and required manual reversion. There is no automated guardrail preventing recurrence.

### Migration Options

**Option A — Interim ESLint guardrail (Sprint 1, 2-4 hours)**

Install ESLint and configure a rule that blocks these operators in BE source:
```bash
cd get-hired-BE && npm install --save-dev eslint
```
Create `get-hired-BE/.eslintrc.js`:
```javascript
module.exports = {
  env: { node: true, es6: true },
  parserOptions: { ecmaVersion: 2019 },  // ES2019 = no optional chaining
  rules: {
    'no-undef': 'error',
  }
};
```
Add to `package.json` scripts:
```json
"lint": "eslint src/ --ext .js",
"prestart": "npm run lint"
```
Add to pre-commit hook (`.husky/pre-commit` or equivalent):
```bash
cd get-hired-BE && npm run lint
```
**Effect:** Developer gets an ESLint error before committing; CI fails if lint is wired. Production stays safe.

**Option B — Upgrade Node (Sprint 1-2, 1-3 days)**

Node 16+ supports optional chaining and nullish coalescing natively without Acorn. If `esm` is still needed for the import/export syntax:
- Upgrade Node to 16 LTS (minimum; 18 LTS preferred)
- Test all endpoints against Node 16 on a staging deploy
- Optional chaining becomes available immediately

**Option C — Full native ESM migration (Dedicated sprint, 1-2 weeks)**

Remove `esm` package entirely; migrate to native Node ESM:
1. Add `"type": "module"` to `get-hired-BE/package.json`
2. Replace all `require()` calls with `import`
3. Replace all `module.exports` with `export`
4. Rename any files that mix CJS and ESM syntax
5. Update `start.js` entry point
6. Test all route files, middleware, controllers, services

**Recommendation:** Ship Option A in Sprint 1 to protect the codebase immediately. Plan Option B or C for a dedicated sprint; Option B is lower risk and faster.

**Files to audit for `require()`/`module.exports` patterns:** Run `grep -r "require(" get-hired-BE/src/ | wc -l` to gauge migration scope.

---

## P2 — PM2 Ecosystem File (P2-PM2-ECOSYSTEM)

**Severity: MEDIUM — Knowledge risk; silently breaks production after PM2 process list loss**

### Problem Description

The BE has two entry-point-like files:
- `start.js` — the actual entry point; sets up the `esm` loader and then imports `server.js`
- `server.js` — the Express app; NOT a standalone entry point

If PM2 is started with `pm2 start server.js`, the `esm` loader is not initialized → `import`/`export` statements in ES module files throw `SyntaxError: Cannot use import statement` → application fails to start with `ERR_MODULE_NOT_FOUND` or parse errors.

**When this risk triggers:** Server reboot, PM2 `delete all` + restart, new team member deploying.

### Fix

Create `get-hired-BE/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'get-hired-be',
    script: './start.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    max_restarts: 10,
    min_uptime: '5s',
    watch: false,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

Commit this file. Update deploy runbook:
```powershell
# Start (first time or after delete):
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && pm2 start ecosystem.config.js && pm2 save && pm2 startup"

# Restart (code update):
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 reload ecosystem.config.js"
```

**Owner:** BE dev / Paul | **Effort:** S

---

## P2 — DB Pool Exhaustion (P2-POOL-EXHAUSTION)

**Severity: MEDIUM — Silent failure on large CSV imports; rows appear to fail even with valid data**

DB pool is `max: 10` (in `db/dbQuery.js`). The `Promise.allSettled` pattern in `multipleContact` / `multipleCandidate` fans out ALL rows concurrently — a 100-row CSV fires 100+ parallel DB queries simultaneously. With pool max at 10 and `connectionTimeoutMillis: 5000`, rows queue up and time out, appearing in the `rejected` bucket even when the data is valid.

**Fix:** Apply concurrency limiting via `p-limit`:
```bash
cd get-hired-BE && npm install p-limit
```
```javascript
// In multipleContact/multipleCandidate controllers:
import pLimit from 'p-limit';
const limit = pLimit(10);  // match pool max

const settled = await Promise.allSettled(
  contacts.map(option => limit(async () => addMultipleContact({ ...option, companyId })))
);
```

**Owner:** BE dev | **Effort:** M

---

## P2 — CSV Import Row Cap (P2-CSV-ROW-CAP)

**Severity: MEDIUM — No input validation on import size; pool exhaustion amplifier**

No guard exists in any of the 3 import components before dispatching bulk import. A malicious or careless employer can import thousands of rows.

**Fix (FE — each import component):**
```typescript
const MAX_IMPORT_ROWS = 50;
if (this.records.length > MAX_IMPORT_ROWS) {
  this.snackBar.open(
    `CSV has ${this.records.length} rows. Maximum is ${MAX_IMPORT_ROWS}. Please split your file.`,
    '', { duration: 8000, panelClass: 'danger-snackbar' }
  );
  this.records = [];
  return;
}
```
**Files:** `import-add-contact.component.ts`, `import-add-candidate.component.ts`, `import-add-user.component.ts`

---

## P3 — bcrypt → bcryptjs (P3-BCRYPT-JS)

**Severity: LOW — Fragile on Node 14 but not an active outage**

`bcrypt` requires native binary compilation via `node-gyp`. On Node 14 deploys, this can fail silently or cause `gyp ERR!` during `npm install`. `bcryptjs` is a pure JavaScript drop-in replacement with no native binaries and identical API.

**Fix:**
```bash
npm uninstall bcrypt && npm install bcryptjs
```
In any file using `bcrypt`: change `require('bcrypt')` → `require('bcryptjs')`. API is identical (`bcrypt.hash`, `bcrypt.compare` work unchanged).

---

## P3 — axios 0.x → 1.x (P3-AXIOS-1X)

**Severity: LOW — CVE exposure; breaking changes in 1.x require audit**

Known CVE in axios 0.x versions. axios 1.x has breaking changes in error handling, interceptors, and response structure. Requires careful audit before upgrade.

**Steps:**
1. `npm install axios@latest`
2. Run: `grep -r "axios\." src/ --include="*.js" | grep -v "node_modules"` — audit all usages
3. Check for `.catch` patterns that rely on 0.x error structure
4. Test all endpoints that use axios (e.g., third-party API calls, PayMongo API calls)

---

## P3 — Toast Decision Logic Duplication (P3-TOAST-EXTRACT)

**Severity: LOW — Maintenance smell; not a bug**

All 3 import-add components (`import-add-contact`, `import-add-candidate`, `import-add-user`) contain ~95% identical toast branching logic:
```typescript
if (res.summary?.outcome === 'all_succeeded') { /* success toast */ }
else if (res.summary?.outcome === 'partial') { /* warning toast */ }
else if (res.summary?.outcome === 'all_failed') { /* error toast */ }
```

**Fix:** Extract a shared utility function:
```typescript
// src/app/shared/utils/import-toast.util.ts
export function resolveImportToast(
  snackBar: MatSnackBar,
  res: BulkImportResponse,
  entityLabel: string
): void { ... }
```

---

## P3 — Other Small Tech Debt

| ID | Item | Fix |
|---|---|---|
| P3-DEAD-LOG-CONTACT | `contact-list.component.ts:102`, `candidate-list.component.ts:100` — dead subscribe to `contact.success`/`candidate.success` (never populated) | Remove dead subscribe blocks |
| P3-CANDIDATE-FORM-GUARD | `importCandidateForm` only initialized inside `uploadListener()`; `saveOnboardMultiple()` can be called before CSV upload | Initialize form at `ngOnInit` |
| P2-CANDIDATE-SINGULAR | Bulk candidate endpoint expects `{ candidate: [...] }` (singular); contact uses `{ contacts: [...] }` (plural) | Align to plural; update both BE and FE |

---

## Tech Debt Prioritization Matrix

| Priority | Item | Why Now |
|---|---|---|
| **P1 this sprint** | ESM Acorn lint rule | Prevents the next silent production break |
| **P1 this sprint** | PM2 ecosystem file | Prevents wrong entry-point restart |
| **P1 this sprint** | Rate limiting | Protects auth endpoints from brute force |
| **P2 next sprint** | Pool exhaustion + CSV cap | Prevents reliability issues at scale |
| **P3 future** | bcrypt-js, axios 1.x | Low-urgency housekeeping |
| **P3 future** | Toast extract, dead code | DX improvements |
