# GETHIRED STITCH RECENT_4 — Integration Audit

**Scope:** 7 integration seams from the most recent deployment cycle.
**FE HEAD:** 8a41f25 | **BE HEAD:** 35f7754
**Date:** 2026-06-26

---

## Seam 1 — SnackbarService ↔ CoreModule

**File:** `get-hired-FE/src/app/core/core.module.ts`

SnackbarService is listed in `providers: [CoreService, SnackbarService, HapticService]` on line 22.
The service itself (`snackbar.service.ts`) carries `@Injectable({ providedIn: 'root' })`, meaning it is also tree-shakably injectable app-wide without depending solely on CoreModule's providers array.

**Status: PASS** — SnackbarService is provided in CoreModule and is root-scoped; no injection gap.

---

## Seam 2 — SnackbarService ↔ import-add-user.component

**File:** `get-hired-FE/src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

- Line 11: `import { SnackbarService } from '@app-core/services/snackbar.service';`
- Line 60: `private snackbarService: SnackbarService` injected via constructor.
- Usage: `snackbarService.success()` (line 99), `snackbarService.warning()` (line 105), `snackbarService.error()` (line 111), `snackbarService.info()` (line 157).
- No raw `MatSnackBar` injection visible in this component.

**Status: PASS** — Component uses SnackbarService exclusively, never raw MatSnackBar.

---

## Seam 3 — Invite response shape ↔ FE dialog

**BE** (`get-hired-BE/controllers/companiesController.js` lines 494-497):
```js
return res.status(status.success).json(successResponse({
  companyId,
  emails: userStatus,
}));
```
Where `userStatus` is an array of `{ email, status, msg }` objects.

**FE** (`import-add-user.component.ts` lines 85-87):
```ts
const emails: InviteResult[] = invite.companyUserRes.emails || [];
emails.filter((e: InviteResult) => e.status !== 'failed');
```

**FE type** (`InviteResult`, lines 14-19):
```ts
interface InviteResult {
  email: string;
  status: string;
  msg?: string;
  message?: string;
}
```

The BE emits `{ status, email, msg }`. The FE reads `.emails`, branches on `.status === 'failed'`, and tolerates both `msg` and `message` as optional. The FE filter key (`status`) exactly matches the BE field name.

**Minor note:** BE uses `msg`; FE `InviteResult` declares both `msg?` and `message?`. Only `msg` will ever be populated by the current BE — `message?` is a defensive dead-field. No functional breakage.

**Status: PASS** — Shape contract is satisfied. `emails[]` with `{email, status, msg}` is correctly consumed.

---

## Seam 4 — axios 1.7.9 ↔ PayMongo

**File:** `get-hired-BE/controllers/paymentController.js` (line 11: `const axios = require("axios").default;`)
**File:** `get-hired-BE/helpers/firebaseFunctions.js` (line 12: `import axios from 'axios';`)

Checked for deprecated usage:
- `CancelToken`: not found anywhere in BE JS files.
- `paramsSerializer` (changed in axios 1.x from object-form to function-only): not found anywhere.
- Both call sites use `axios.request(options)` with a plain config object — the stable, non-deprecated API path since axios 0.x. No breaking change.

**Version:** `package.json` pins `"axios": "^1.7.9"` — current stable 1.x series.

**Mixed import style:** `paymentController.js` uses `require("axios").default` (CJS interop) while `firebaseFunctions.js` uses `import axios from 'axios'` (ESM). Both work identically with esm@3.2.25 — the `.default` accessor is correct for CJS-compat destructure and the ESM import hits the same export. No breakage.

**Status: PASS** — No deprecated axios APIs in use.

---

## Seam 5 — bcryptjs ↔ auth services

**Single source of truth:** All password hashing and comparison is centralised in `helpers/validation.js`.

- Line 2: `import bcrypt from "bcryptjs";` — correct package.
- Exports `hashPassword` and `comparePassword`, both backed by bcryptjs.
- `controllers/userController.js` and `controllers/companiesController.js` both import from `../helpers/validation` — never from `bcrypt` directly.
- Full grep across all BE `.js` files found zero `require("bcrypt")` or `import from "bcrypt"` (without the `js` suffix) outside of `bcryptjs`.

**Status: PASS** — `bcrypt` (native) is not referenced anywhere; all auth paths go through `bcryptjs`.

---

## Seam 6 — Job.companyName ↔ template usage

**Model coverage:**
- `job/job.model.ts` line 60: `companyName?: string;` — typed optional on `Job`.
- `jobs/jobs.model.ts` line 13: `companyName: string;` — required on `BasicJob`.
- `public/services/public-job-normalizer.model.ts` line 34: `companyName: string;` — required on `NormalizedJob`.

**Template consumers and their strategy:**

| File | Access pattern | Safe? |
|---|---|---|
| `job-posts-details.component.ts:83` | `job.companyName` via `NormalizedJob` (always set, fallback `'Company'`) | Yes |
| `public-details.component.ts:41` | `(job as any).company_name \|\| (job as any).companyName \|\| 'GetHired Company'` | Yes (defensive) |
| `seo.service.ts:259` | `(job as any).company_name \|\| job.companyName \|\| (job as any).companyDetails` | Yes (defensive) |
| `public-job-normalizer.service.ts:33` | `raw.companyName ?? raw.company_name` fallback chain | Yes |

**Note:** `public-details.component.ts` and `seo.service.ts` still use `(job as any)` casts. These are not broken — the `as any` is required because the raw `Job` type (from the jobs facade) does not declare `company_name` (snake_case). The casts are a known intentional pattern for handling the API's dual-casing. No `job['companyName']` bracket-access patterns found that bypass the type system unsafely.

**Status: PASS** — All call sites either use the typed field directly via a normalizer or apply the documented `(job as any)` fallback chain. No unsafe `job['companyName']` bracket access found.

---

## Seam 7 — CORS ↔ FE API calls

**BE config:** `server.js` line 90: `app.use(cors({ origin: env.app_url }));`

**env.js production path** (when `is_staging == "false"`):
```js
app_url: process.env.APP_URL ? process.env.APP_URL : `http://localhost:4200`
```

**Live verification** (`curl -H "Origin: https://gethiredonline.app" https://api.gethiredonline.app/api/jobs`):
```
Access-Control-Allow-Origin: https://gethiredonline.app
```
The CORS header reflects the FE's production origin exactly. Additional security headers also confirmed live: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

**Defect found — env.js APP_URL_DEV conditional bug (non-blocking):**
In `env.js` lines 57-58 (jobhunt staging branch) and lines 91-92 (eucannajobs staging branch):
```js
app_url: process.env.APP_URL_DEV
  ? process.env.APP_URL    // BUG: reads APP_URL, not APP_URL_DEV
  : `http://localhost:4200`,
```
The conditional checks `APP_URL_DEV` for truthiness but then assigns `APP_URL` (the production variable) when truthy. In staging the CORS origin would incorrectly be set to the production URL (`https://gethiredonline.app`). This does not affect production (which uses the `is_staging == "false"` branch) but is a latent bug in staging deployments.

**Status: PASS (production)** — Live CORS header is correct for the production origin. Staging branch has a latent env.js bug (noted in fix log).

---

## Summary

| Seam | Result |
|---|---|
| 1. SnackbarService ↔ CoreModule | PASS |
| 2. SnackbarService ↔ import-add-user.component | PASS |
| 3. Invite response shape ↔ FE dialog | PASS |
| 4. axios 1.7.9 ↔ PayMongo | PASS |
| 5. bcryptjs ↔ auth services | PASS |
| 6. Job.companyName ↔ template usage | PASS |
| 7. CORS ↔ FE API calls | PASS (prod) / latent bug (staging) |

All 7 seams pass for the production deployment. One latent staging-only env.js bug identified.
