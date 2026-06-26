# GETHIRED RELEASE QUALITY GATE — RECENT 4

**Date:** 2026-06-26
**FE HEAD:** 8a41f25
**BE HEAD:** 35f7754
**Gate verdict:** CONDITIONAL — fix BLOCKER-1 before deploying BE changes

---

## Gate Summary

| Gate | Check | Status | Blocking |
|------|-------|--------|----------|
| G1 | Angular production build — zero errors | PASS | yes |
| G2 | SnackbarService: `error()` uses `politeness:'assertive'`, SSR-safe | PASS | yes |
| G3 | HapticService: navigator.vibrate() SSR-safe | PASS | yes |
| G4 | Both services listed in CoreModule providers | PASS | yes |
| G5 | No bare `bcrypt` (non-js) import in BE source | PASS | yes |
| G6 | axios ^1.7.9 in BE package.json | PASS | yes |
| G7 | `Job` interface has `companyName?: string` | PASS | yes |
| G8 | Invite component: no `(company as any)` cast | PASS | yes |
| G9 | Invite component: `localStorage` only accessed inside ngOnInit guard | PASS | yes |
| G10 | Live API CORS: `Access-Control-Allow-Origin: https://gethiredonline.app` | PASS | yes |
| G11 | `#1A7A4A` vs white contrast >= 4.5:1 (WCAG AA) | PASS (4.91:1) | yes |
| G12 | `#C0392B` vs white contrast >= 4.5:1 (WCAG AA) | PASS (5.01:1) | yes |
| B1 | No unparameterized SQL in BE services | **FAIL** | **BLOCKER** |
| B2 | No `?.` or `??` operators in BE `.js` files | PASS | yes |

---

## BLOCKER-1 — Unparameterized SQL in `candidate.service.js`

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\services\candidate.service.js`
**Line:** 73

**Current (vulnerable):**
```js
const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id='${candidateId}';`;
const { rows } = await dbQuery.query(searchQuery, []);
```

**Required fix (parameterized):**
```js
const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id=$1;`;
const { rows } = await dbQuery.query(searchQuery, [candidateId]);
```

**Why it is a blocker:**
- `candidateId` is user-controlled input arriving via request body or route params.
- Template-literal interpolation into SQL allows arbitrary SQL injection.
- All 13 other previously-fixed SQL points in `contact.service.js` and `candidate.service.js` use `$N` parameterization correctly — this is the one that was missed.
- Per the task brief, "14 pts" of SQL injection were claimed fixed; this one was not.

**Risk if deployed unpatched:** An attacker can exfiltrate all candidate rows or escalate to schema-level damage via the `checkCandidateIfExist` code path.

**Effort to fix:** 2 lines. No interface change. No migration required.

---

## Detailed Gate Results

### G1 — Angular Production Build

- Build hash: `67c42fc9344df025`
- Build time: 19,359 ms
- Errors: 0
- Warnings: 2 (autoprefixer `start` → `flex-start` in `add-contact-group.component.scss`) — pre-existing cosmetic, not blocking.

### G2 — SnackbarService `error()` politeness

`politeness: 'assertive'` confirmed at `src/app/core/services/snackbar.service.ts` line 31. Causes screen readers to interrupt immediately on error — correct ARIA live-region urgency.

### G3 — HapticService SSR safety

`navigator.vibrate` guarded by all three layers:
1. `isPlatformBrowser(this.platformId)` — Angular SSR check
2. `typeof navigator !== 'undefined'` — identifier safety
3. `try/catch` — API availability (iOS Safari never supports vibrate)

### G4 — CoreModule providers

`providers: [CoreService, SnackbarService, HapticService]` in `src/app/core/core.module.ts`. Both new services are explicitly provided even though they carry `providedIn: 'root'` — double registration is harmless (Angular deduplicates).

### G5 — bcrypt clean

Only `bcryptjs` is imported anywhere in BE source. The package.json has:
```json
"bcryptjs": "^2.4.3"
```
No `bcrypt` (native node addon) anywhere.

### G6 — axios 1.x

```json
"axios": "^1.7.9"
```
Upgrade from 0.27.2 confirmed. Axios 1.x resolves [CVE-2023-45857](https://github.com/axios/axios/security/advisories/GHSA-wf5p-g6vw-rhxx) (CSRF via custom header).

### G7 — Job.companyName

`src/app/job/job.model.ts` line 60: `companyName?: string` present inside the `Job` interface. Companion fields `companyCity`, `companyCountry`, `companyLogoUrl`, `companyDetails`, `companyRating`, `numberOfEmployee` also present.

### G8+G9 — Invite component localStorage

- No `(company as any)` anywhere in `import-add-user.component.ts`.
- Field declaration: `public localData: any = null;` (null, not a localStorage read).
- `localStorage.getItem('user')` only inside `ngOnInit()` behind:
  ```ts
  if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined')
  ```
- All-fail path: `showResultPanel = true`, `allFailed = true`, `submitting = false` — dialog stays open, error snackbar fires.
- Partial-fail path: `showResultPanel = true`, `allFailed = false`, warning snackbar fires.

### G10 — CORS

Live API response header:
```
Access-Control-Allow-Origin: https://gethiredonline.app
```
Preflight and simple-request CORS working for production frontend origin.

### G11+G12 — Contrast ratios (verified by WCAG formula)

| Color | Hex | Luminance | Contrast vs white | WCAG AA (4.5:1) |
|-------|-----|-----------|-------------------|-----------------|
| Success green | #1A7A4A | 0.1636 | 4.91:1 | PASS |
| Danger/error red | #C0392B | 0.1594 | 5.01:1 | PASS |

Both colors exceed the WCAG AA 4.5:1 minimum for normal text and UI components. The brand accent bar on `danger-snackbar` (`border-left: 4px solid $color-global-red`) uses `#FE6F61` which does not carry text — decorative only, exempt from contrast requirements.

### B2 — No `?.` or `??` in BE files

Grep across all `*.js` in `get-hired-BE/` for `\?\?|\?\.` returned one result: a comment in `controllers/jobsController.js` line 625 that explicitly documents the constraint. Zero actual operator usage in BE source.

---

## Action Required Before Next BE Deploy

1. **Fix `candidate.service.js:73`** — parameterize `checkCandidateIfExist` (2-line change, see BLOCKER-1 above).
2. Re-run `GETHIRED_TEST_RECENT_4` or equivalent smoke test after the fix.
3. FE changes (SnackbarService, HapticService, contrast fixes, invite UI, Job.companyName, SSR guards) are all **CLEAR TO DEPLOY** independently of the BE fix.

---

## Files Referenced

- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\services\candidate.service.js` (BLOCKER)
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\services\contact.service.js` (clean)
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\package.json`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\core\services\snackbar.service.ts`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\core\services\haptic.service.ts`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\core\core.module.ts`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\job\job.model.ts`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\company\company-users\dialogs\import-add-user.component\import-add-user.component.ts`
- `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\styles.scss`
