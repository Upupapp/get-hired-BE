# GetHired SWEEP Fix Log — RECENT_4
**Scope:** BE `35f7754` / FE `8a41f25` and related commits
**Date:** 2026-06-26

---

## Issues Found

### FINDING-01 — LOW | Dead console.log in commented block
**File:** `get-hired-FE/src/app/public/components/banner/banner.component.ts`
**Line:** 59–70 (the `/* ... */` block)
**Description:** A `console.log(job_type)` sits inside a large block-commented region. The log does not execute at runtime. No security or correctness impact.
**Recommendation:** Remove the entire commented-out block in the next cleanup pass. It is dead unreachable code from a pre-routing-change iteration.
**Priority:** LOW (cosmetic/maintenance)
**Action required before deploy:** No

---

### FINDING-02 — LOW/MEDIUM | Null companyId passes silently to API in invite flow
**File:** `get-hired-FE/src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`
**Line:** 196–206 (`saveCompanyUser()`)
**Description:** `localData` may be `null` if the user's localStorage `user` slot is absent or corrupted. The guard at line 197 correctly returns `undefined` for `companyId` rather than throwing. However, the API call dispatches `{ companyId: undefined, emails: [...] }` with no pre-flight validation or error toast. If the BE endpoint does not validate and return a 400, the invites could silently fail or be orphaned.
**Recommendation:**
```ts
saveCompanyUser(value) {
  const companyId = this.localData ? this.localData.companyId : undefined;
  if (!companyId) {
    this.snackbarService.error('Unable to send invites: company context missing. Please reload.');
    return;
  }
  // ... dispatch
}
```
**Priority:** LOW (edge case — users should always have localData if they reached this dialog)
**Action required before deploy:** No, but recommended for next hardening pass

---

### FINDING-03 — P1 | env.js staging branches use wrong APP_URL variable
**File:** `get-hired-BE/env.js`
**Lines:** 57–59 (jobhunt branch), 91–93 (eucannajobs branch)
**Description:** Both staging switch cases read `process.env.APP_URL` when the condition checks `process.env.APP_URL_DEV`. The ternary should read from `APP_URL_DEV`:
```js
// BUG (current):
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL          // <-- wrong: always reads production URL
  : `http://localhost:4200`,

// FIX:
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL_DEV      // <-- correct
  : `http://localhost:4200`,
```
**Impact:** Staging environment only. Production (`isStaging == "false"`) is unaffected — it reads `APP_URL` directly (correct). On staging, CORS origin is the production URL, meaning the staging FE is either being blocked by CORS or the staging server is accidentally allowing the production FE origin. This is a pre-existing bug (not introduced in RECENT_4 commits).
**Priority:** P1 (staging integrity)
**Action required before deploy:** No (production not affected), but fix before next staging deployment

**Fix:**
```js
// env.js jobhunt case (line ~57-59):
app_url: process.env.APP_URL_DEV || `http://localhost:4200`,

// env.js eucannajobs case (line ~91-93):
app_url: process.env.APP_URL_EUCANNAJOBS || `http://localhost:4200`,
```

---

## Verified Clean (No Issues)

| Area | Result |
|------|--------|
| SnackbarService DI singleton correctness (post `e5abf7f` fix) | CLEAN |
| HapticService SSR guards | CLEAN |
| WCAG contrast ratios (all 5 snackbar classes) | CLEAN |
| `bcrypt` fully removed from BE source files | CLEAN |
| `axios` 1.x API compatibility in all 2 usages | CLEAN |
| CORS `app_url` production config | CLEAN |
| SQL injection — 14 parameterized query fixes | CLEAN |
| PM2 process name in deploy.yml + ecosystem.config.js | CLEAN |
| `verifyAuth` guard on `/auth/manualexcelverification` | CLEAN |
| ESM Acorn compat (`?.` removed from backfill script) | CLEAN |
| SSR localStorage guards — 4 public components | CLEAN |
| JWT/PII console.log leaks removed | CLEAN |
| OG image asset present and correctly referenced | CLEAN |
| star.svg width/height CLS fix | CLEAN |
| TELECOMMUTE JSON-LD conditional | CLEAN |
| Job.companyName interface field added | CLEAN |
| (company as any) cast removed from public-company-details | CLEAN |
| invite all-fail / partial-fail state machine | CLEAN |
| Security headers (nosniff, X-Frame-Options) — prior fix holds | CLEAN |
| Rate limiting — prior fix holds | CLEAN |
