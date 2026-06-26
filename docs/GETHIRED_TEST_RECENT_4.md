# GETHIRED TEST RECENT 4 — Test Results

**Date:** 2026-06-26
**FE HEAD:** 8a41f25
**BE HEAD:** 35f7754
**Run scope:** Recent-deployment quality gate (8 checks)

---

## Check 1 — Angular Production Build

**Command:** `node node_modules/@angular/cli/bin/ng build --configuration=production 2>&1 | tail -20`

**Result:** PASS

**Evidence:**
```
Build at: 2026-06-26T04:49:21.415Z - Hash: 67c42fc9344df025 - Time: 19359ms
```

- No compilation errors.
- 2 autoprefixer warnings in `add-contact-group.component.scss` (CSS `start` value mixed-support) — pre-existing cosmetic warnings, not blocking.
- All lazy-loaded chunks generated successfully (employer-subscription, employer-jobs, employer-interview, main-admin-panel, views-error-page, common).

---

## Check 2 — SnackbarService and HapticService

**File:** `src/app/core/services/snackbar.service.ts`
**File:** `src/app/core/services/haptic.service.ts`
**File:** `src/app/core/core.module.ts`

**Result:** PASS

**Evidence:**

SnackbarService:
- Decorated `@Injectable({ providedIn: 'root' })`.
- Injects `MatSnackBar` and `PLATFORM_ID`.
- `error()` uses `politeness: 'assertive'` — correct for screen-reader urgency.
- `success()` uses `politeness: 'polite'` — correct.
- All four methods (`success`, `error`, `warning`, `info`) guarded by `isPlatformBrowser()` — SSR safe.

HapticService:
- Decorated `@Injectable({ providedIn: 'root' })`.
- Injects `PLATFORM_ID`.
- `navigator.vibrate` call wrapped in `isPlatformBrowser` + `typeof navigator !== 'undefined'` + `try/catch` — triple-safe for SSR.
- Four haptic flavours: `success([50])`, `error([100,30,80])`, `warning([50,30,50])`, `selection([20])`.

CoreModule (`src/app/core/core.module.ts`):
- Both services explicitly listed in `providers: [CoreService, SnackbarService, HapticService]`.
- Both services imported from their correct paths.

---

## Check 3 — No bare `bcrypt` (non-js) imports in BE

**Command:**
```
grep -rn "from.*['\"']bcrypt['\"']" get-hired-BE/ --include="*.js" | grep -v bcryptjs | grep -v node_modules
```

**Result:** PASS

**Evidence:**
- Zero matches for `from "bcrypt"` or `from 'bcrypt'` after filtering out `bcryptjs`.
- Only `bcryptjs` import found in `helpers/validation.js`:
  ```js
  import bcrypt from "bcryptjs";
  ```
  This is the correct dependency (`bcryptjs ^2.4.3` in package.json).

---

## Check 4 — axios version in BE package.json

**File:** `get-hired-BE/package.json`

**Result:** PASS

**Evidence:**
```json
"axios": "^1.7.9"
```
Confirms upgrade from 0.27.2 to 1.x (specifically 1.7.9). No legacy 0.x axios present.

---

## Check 5 — Job interface has `companyName`

**File:** `src/app/job/job.model.ts`

**Result:** PASS

**Evidence:**
```ts
export interface Job {
  ...
  companyName?: string;
  companyCity?: string;
  companyCountry?: string;
  companyLogoUrl?: string;
  ...
}
```
`companyName?: string` present at line 60. Field is optional (`?`) as expected.

---

## Check 6 — Invite component: no `(company as any)` / no field-level `localStorage.getItem`

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

**Result:** PASS

**Evidence:**

- No `(company as any)` cast anywhere in the file.
- Field declaration is: `public localData: any = null;` — null initializer, not a `localStorage.getItem` call.
- `localStorage.getItem('user')` appears only inside `ngOnInit()` at line 68, correctly guarded:
  ```ts
  if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('user');
    try {
      this.localData = raw ? JSON.parse(raw) : null;
    } catch (_e) {
      this.localData = null;
    }
  }
  ```
- `saveCompanyUser()` uses `this.localData ? this.localData.companyId : undefined` — safe null guard, no `?.` operator.

---

## Check 7 — CORS on live API

**Command:**
```
curl -s -D - -H "Origin: https://gethiredonline.app" "https://api.gethiredonline.app/api/jobs/public" | grep -i "access-control"
```

**Result:** PASS

**Evidence:**
```
Access-Control-Allow-Origin: https://gethiredonline.app
```
The live API correctly reflects the requesting origin. CORS is operational for the production frontend.

---

## Check 8 — Snackbar contrast ratios

**Colors under test:**
- Success snackbar: `#1A7A4A` on white `#FFFFFF`
- Danger/error snackbar: `#C0392B` on white `#FFFFFF`

**Method:** WCAG 2.1 relative luminance formula. White luminance = 1.0.

**#1A7A4A relative luminance:**
- R: 26/255 = 0.102 → linearize: 0.102/12.92 = 0.00794 (< 0.03928)
  Actually: 0.102 > 0.04045, so (0.102 + 0.055)/1.055)^2.4 = (0.157/1.055)^2.4 = (0.1488)^2.4 ≈ 0.01445
- G: 122/255 = 0.4784 → ((0.4784+0.055)/1.055)^2.4 = (0.5334/1.055)^2.4 = (0.5056)^2.4 ≈ 0.2158
- B: 74/255 = 0.2902 → ((0.2902+0.055)/1.055)^2.4 = (0.3452/1.055)^2.4 = (0.3272)^2.4 ≈ 0.08527
- L = 0.2126×0.01445 + 0.7152×0.2158 + 0.0722×0.08527
  = 0.003069 + 0.15437 + 0.00616 = 0.16360
- Contrast vs white: (1.0 + 0.05) / (0.16360 + 0.05) = 1.05 / 0.21360 = **4.91:1**

**Result: PASS** — exceeds WCAG AA 4.5:1 threshold. Consistent with claimed 4.85:1 (minor rounding difference).

**#C0392B relative luminance:**
- R: 192/255 = 0.7529 → ((0.7529+0.055)/1.055)^2.4 = (0.8079/1.055)^2.4 = (0.7659)^2.4 ≈ 0.5512
- G: 57/255 = 0.2235 → ((0.2235+0.055)/1.055)^2.4 = (0.2785/1.055)^2.4 = (0.2640)^2.4 ≈ 0.05562
- B: 43/255 = 0.1686 → ((0.1686+0.055)/1.055)^2.4 = (0.2236/1.055)^2.4 = (0.2120)^2.4 ≈ 0.03418
- L = 0.2126×0.5512 + 0.7152×0.05562 + 0.0722×0.03418
  = 0.11718 + 0.03978 + 0.002468 = 0.15943
- Contrast vs white: (1.0 + 0.05) / (0.15943 + 0.05) = 1.05 / 0.20943 = **5.01:1**

**Result: PASS** — exceeds WCAG AA 4.5:1 threshold. Consistent with claimed 5.14:1 (minor rounding in claimed value).

---

## Additional Findings (not in original checklist)

### FINDING-1: Residual SQLi in `candidate.service.js` line 73

```js
const checkCandidateIfExist = async (candidateId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id='${candidateId}';`;
  try {
    const { rows } = await dbQuery.query(searchQuery, []);
```

The `candidateId` is **directly interpolated** into the SQL string using template literals instead of being passed as a parameterized value. The `dbQuery.query(searchQuery, [])` call passes an empty params array. This is a SQLi vector.

**All other queries in both `contact.service.js` and `candidate.service.js` use `$1`, `$2` parameterized placeholders correctly.** This is the one remaining unparameterized query.

**Severity:** HIGH — `candidateId` originates from user-controlled route params/request body.

**Fix required:**
```js
const checkCandidateIfExist = async (candidateId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id=$1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [candidateId]);
```

### FINDING-2: `?.` / `??` in FE (acceptable — only BE is constrained)

`public-search.component.ts` lines 66-68 use optional chaining (`?.`) and nullish coalescing (`??`):
```ts
this.keyword = this.jobSearch?.keyword ?? '';
this.work_setup = this.jobSearch?.work_setup ?? 'Work Setup';
```
This is TypeScript in the FE, which transpiles via Angular CLI. The constraint "never use `?.` or `??` in BE files" is not violated. No `?.` or `??` was found in any BE `.js` file (confirmed by grep — only a comment referencing the constraint was present in `controllers/jobsController.js`).

---

## Summary Table

| # | Check | Result |
|---|-------|--------|
| 1 | Angular production build | PASS |
| 2 | SnackbarService + HapticService importable, in CoreModule | PASS |
| 3 | No bare `bcrypt` (non-js) imports in BE | PASS |
| 4 | axios 1.x in BE package.json | PASS |
| 5 | Job interface has `companyName` | PASS |
| 6 | Invite component: no `(company as any)`, no field-level localStorage | PASS |
| 7 | CORS on live API | PASS |
| 8 | Snackbar contrast ratios (#1A7A4A, #C0392B vs white) | PASS |
| F1 | SQLi residual in `candidate.service.js:73` | FAIL (blocker) |
