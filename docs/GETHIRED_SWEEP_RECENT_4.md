# GetHired SWEEP — RECENT_4 Full System Audit
**Scope:** Changes since RECENT_3 through BE HEAD `35f7754` / FE HEAD `8a41f25`
**Date:** 2026-06-26
**Auditor:** Claude Code (Sonnet 4.6)

---

## 1. Executive Summary

Six change sets shipped since the last sweep. All are verified as landed. Three findings require action, one of which is a pre-existing bug surfaced during this audit. No P0 blockers in the new changes themselves; the pre-existing `env.js` staging bug is P1 (staging only, production unaffected).

---

## 2. Change Set Inventory

| Commit | Repo | What |
|--------|------|------|
| `8a41f25` | FE | SnackbarService (assertive errors), HapticService (SSR-safe), WCAG contrast fixes, invite error/partial-fail UI, `companyName` typed on Job interface, localStorage SSR crash fix in import-add-user |
| `e5abf7f` | FE | HapticService wiring into import-add-user, result-panel BEM CSS, touch targets (follow-on to `8a41f25`) |
| `35f7754` | BE | `bcrypt ^5.0.1` removed (dead dep), `axios 0.27.2 → 1.7.9` |
| `880cf39` | FE | `typeof localStorage` guards in public-list, job-board-employer-cta, public-search, public.component; JWT/PII console.log removal; OG image fallback; banner a11y |
| `9f939b2` | FE | Branded OG PNG 1200×630, star.svg CLS `width`/`height` attributes |
| `986e6da` | BE | SQL injection fixes (14 pts in contact.service.js + candidate.service.js), deploy.yml PM2 name fix, ecosystem.config.js, verifyAuth on `/auth/manualexcelverification`, ESM Acorn compat in backfill script |

---

## 3. Audit Findings by Area

### 3A. SnackbarService — FE (`8a41f25` + `e5abf7f`)

**File:** `src/app/core/services/snackbar.service.ts`
**Decorated:** `@Injectable({ providedIn: 'root' })`

The service is a clean root-provided singleton. Four methods: `success()`, `error()`, `warning()`, `info()`. Each is guarded with `isPlatformBrowser()` — no SSR crash risk. Politeness: `error()` is `assertive`, the remaining three are `polite`. This matches WCAG 2.1 SC 4.1.3 (Status Messages).

**DI Dual-Instance Risk (RESOLVED):** Commit `8a41f25` initially listed `SnackbarService` and `HapticService` in `CoreModule.providers[]`, which would have created a second module-scoped instance that shadowed the root singleton for any component nested under `CoreModule`. The immediately following commit `e5abf7f` caught this and removed both services from `providers[]`, leaving only `CoreService` there and adding an explanatory comment. **Current state is correct.** The commit message for `8a41f25` says "registered SnackbarService + HapticService" in core.module, which is technically accurate (imports added) but misleading about providers — the comment in the final file correctly explains the pattern.

**Only consumer of `SnackbarService` via injection:** `import-add-user.component.ts` (correct; `providedIn: 'root'` means any component can inject it without explicit module registration).

### 3B. HapticService — FE (`8a41f25` + `e5abf7f`)

**File:** `src/app/core/services/haptic.service.ts`
**Decorated:** `@Injectable({ providedIn: 'root' })`

Double-guarded: `isPlatformBrowser()` + `typeof navigator !== 'undefined' && navigator.vibrate` + try/catch. Belt-and-suspenders approach is appropriate given `navigator.vibrate` is absent in Safari and many desktop browsers.

Patterns: success=[50ms], error=[100, 30, 80], warning=[50, 30, 50], selection=[20ms]. No issues.

### 3C. Snackbar WCAG Contrast Tokens — FE (`8a41f25`)

**File:** `src/styles.scss`

| Class | Old BG | Old ratio | New BG | New ratio | WCAG AA |
|-------|--------|-----------|--------|-----------|---------|
| `.success-snackbar` | `#FF7062` | ~3.1:1 | `#1A7A4A` | 4.85:1 | PASS |
| `.danger-snackbar` | `#FE6F61` | ~3.1:1 | `#C0392B` | 5.14:1 | PASS |
| `.error-snackbar` | `#FE6F61` | ~3.1:1 | `#C0392B` | 5.14:1 | PASS |
| `.warning-snackbar` | `#f59e0b` | ~2.15:1 | `$color-warning-amber` (#b45309) | 5.02:1 | PASS (pre-existing fix) |
| `.warn-snackbar` | (undefined) | N/A | `$color-warning-amber` | 5.02:1 | PASS (pre-existing fix) |

Brand coral `#FE6F61` retained as left `border-left: 4px solid $color-global-red` accent on `danger-snackbar` and `error-snackbar` — decorative use (not informational text), so its low contrast is acceptable.

**FINDING-01 (LOW):** `banner.component.ts` line 59-60 contains a dead `console.log(job_type)` inside a commented-out code block (`/* ... */`). The log itself is commented out. No runtime impact. But the entire commented block is unreachable legacy code and adds noise. Recommend removal in next cleanup pass.

### 3D. Import-Add-User Invite Error State Logic — FE (`8a41f25`)

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

State machine verified against three cases:

| Case | `succeeded.length` | `failed.length` | Behaviour |
|------|--------------------|-----------------|-----------|
| All success | >0 | 0 | `showResultPanel=false`, `success()` toast, dialog auto-closes (submitting=true keeps the "done" state) |
| Partial | >0 | >0 | `showResultPanel=true`, `allFailed=false`, `warning()` toast |
| All failed | 0 | >0 | `showResultPanel=true`, `allFailed=true`, `submitting=false` (dialog stays open), `error()` toast |

Logic is sound. `retryFailed()` resets state and re-dispatches only failed emails. `copyFailedEmails()` is browser-guarded with `isPlatformBrowser()` + try/catch.

**FINDING-02 (LOW):** `saveCompanyUser()` reads `this.localData.companyId` but `localData` can be `null` if the browser localStorage slot is empty (e.g. a just-logged-in session before the key is written). The guard on line 197 is `this.localData ? this.localData.companyId : undefined`, which returns `undefined` for `companyId` — the API will receive `{ companyId: undefined, emails: [...] }`. This was present before this commit. The BE should validate companyId on the endpoint and return a 400; if it silently falls through, invites could be orphaned. Recommend adding a pre-dispatch check and early error toast.

**localStorage SSR guard:** Field initializer was moved to `ngOnInit` behind `isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined'` with JSON.parse wrapped in try/catch. Correct.

Debug `console.log` confirmed removed (no instances in the file).

### 3E. `bcrypt` Removal — BE (`35f7754`)

**Verification:** `grep -r "require.*bcrypt[^j]"` over all BE `.js` source files → 0 matches. Only bcryptjs is used:
- `helpers/validation.js`: `import bcrypt from "bcryptjs"` — `genSaltSync`, `hashSync`, `compareSync` — all standard bcryptjs API. No bcrypt-native (node-gyp) dependency. `package.json` confirms `bcryptjs ^2.4.3` only.

**PASS.** The dead `bcrypt ^5.0.1` (native C binding) is fully gone.

### 3F. `axios 0.27.2 → 1.7.9` — BE (`35f7754`)

**Two usages found:**

1. `controllers/paymentController.js:11` — `const axios = require("axios").default;` then `axios.request(options)` with a plain config object.
2. `helpers/firebaseFunctions.js:12` — `import axios from 'axios';` then `axios.request(config)` with a plain config object.

**Axios 1.x breaking changes audit:**
- `CancelToken` → `AbortController`: not used in either file.
- `paramsSerializer` signature change: not used.
- `axios.defaults` mutations: not used.
- `require("axios").default` in a CommonJS/ESM mixed context: this pattern works in axios 1.x; the `.default` export is still present for compat. No issue.
- Response data shape (`error.response.data` vs nested `error.data`): both files use `paymentLink.data.data` and `dynamicLink.data` — vanilla response access, unaffected by 1.x changes.

**PASS.** No breaking changes in current axios usage.

### 3G. CORS — BE

`server.js:90`: `app.use(cors({ origin: env.app_url }));`
`env.js:22-24`: `app_url: process.env.APP_URL ? process.env.APP_URL : 'http://localhost:4200'`

Production `.env` `APP_URL` was corrected from `web.gethiredonline.com.ph` to `gethiredonline.app` (per CORS fix noted in scope). This single-origin CORS config is correct for production.

**FINDING-03 (P1, STAGING ONLY — PRE-EXISTING BUG):** In `env.js` staging branches (the `isStaging == "true"` block), both the `jobhunt` and `eucannajobs` switch cases have a copy-paste bug:
```js
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL        // <-- should be APP_URL_DEV
  : `http://localhost:4200`,
```
When `APP_URL_DEV` is set, `app_url` is populated from `APP_URL` (production) instead of `APP_URL_DEV` (staging). This means if the staging .env has `APP_URL_DEV=https://staging.gethiredonline.app`, the CORS origin for the staging server actually uses the production URL. Net effect: the staging server either allows the production FE origin (CORS too permissive for staging) or fails to allow the staging FE origin (CORS blocks staging FE). **Production is unaffected** because production uses `isStaging == "false"` which reads `APP_URL` correctly.

### 3H. SQL Injection Fixes — BE (`986e6da`)

**`services/candidate.service.js`:** `candidateList()` — two queries that previously interpolated `'${companyId}'` now use `$1` with `[companyId]`. PII `console.log(dbResponse)` removed.

**`services/contact.service.js`:** Parameterized queries verified at lines 43-44 (group select), 63-76 (insert with 7 params). Additional queries throughout the file all use `$N` placeholders. No remaining raw user-value string interpolations detected.

**PM2 name in deploy.yml:** Changed from `pm2 restart 0` to `pm2 restart gethired`. `ecosystem.config.js` now version-controls `name: 'gethired'` and `script: './start.js'`. Correct.

**`/auth/manualexcelverification`:** `userRoute.js:24` confirms `verifyAuth` middleware is now applied. Correct.

**ESM backfill script:** `v.errors?.length` → `v.errors && v.errors.length`. Correct for Acorn 6/7.

### 3I. MOBILEVIEW V3 SSR localStorage Guards — FE (`880cf39`)

All four components verified:

- `public-list.component.ts`: `asyncLocalStorage` wrapper uses `typeof localStorage !== 'undefined'` guards. Correct.
- `job-board-employer-cta.component.ts`: `isDismissed()` and dismiss setter both use `typeof localStorage === 'undefined'` guard. Correct.
- `public-search.component.ts`: field initializers moved to `ngOnInit` behind `isPlatformBrowser`. `typeof localStorage !== 'undefined'` used in `asyncLocalStorage`. Correct.
- `public.component.ts`: `safeParseUser()` static method uses `typeof localStorage === 'undefined'` guard + try/catch. Correct.

JWT/PII `console.log` leaks removed from public components (confirmed: only benign dead-code log found in commented block in banner.component.ts).

### 3J. SEO — OG Image + star.svg CLS — FE (`9f939b2`)

`src/index.html`: OG image set to `https://gethiredonline.app/assets/brand/gethired-og-default.png` with `og:image:width=1200`, `og:image:height=630`, `og:image:type=image/png`.

File confirmed present: `src/assets/brand/gethired-og-default.png`.

`star.svg` in avatar and company-details HTML: all instances use `width="17" height="17"`. CLS fix is complete.

### 3K. SEO — TELECOMMUTE Badge + Description Fallback — FE (`7acb092`)

`seo.service.ts:271-274`: Remote jobs get `jobLocationType: 'TELECOMMUTE'` + `applicantLocationRequirements: { '@type': 'Country', name: 'Philippines' }` conditionally on `/remote/i.test(job.workSetupName)`. Description fallback confirmed at the field level (pre-existing from earlier SEO work).

---

## 4. Prior Fix Verification

| Fix | Status |
|-----|--------|
| Security headers (nosniff, X-Frame-Options) in server.js | HOLDS — lines 105-110 |
| Rate limiting (4-tier in server.js) | HOLDS — lines 44-84 |
| Magic-byte MIME spoofing check (helpers/fileSignature.js) | HOLDS — not touched by recent commits |
| Firebase credential hardening | HOLDS — not touched |
| ESM optional chaining removal in jobsController | HOLDS — no `?.` or `??` found except in comment |
| PM2 entry point start.js in ecosystem.config.js | HOLDS |

---

## 5. Outstanding Items (Not New)

- FE deploy GitHub Actions workflow still requires `LINODE_SSH_KEY`, `LINODE_HOST`, `LINODE_USER` secrets + rsync path verification (deferred from prior checkpoint).
- `env.js` staging APP_URL_DEV copy-paste bug (FINDING-03, P1, staging only).
