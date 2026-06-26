# GetHired — Execution Packs RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Execution packs in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**Format:** Each pack is self-contained — paste the steps and run

---

## Pack Priority Summary

| Pack | Priority | Effort | Owner | Unblocks |
|---|---|---|---|---|
| EXEC-PACK-PAYMONGO-VERIFY | P1 | 5 min | Paul | Public launch |
| EXEC-PACK-ESM-LINT | P1 | 2-4 hr | BE dev | Production safety |
| EXEC-PACK-PM2-ECOSYSTEM | P2 | 1-2 hr | BE/Ops | Deploy resilience |
| EXEC-PACK-RATE-LIMIT | P1 | 3-5 hr | BE dev | Security |
| EXEC-PACK-POOL-EXHAUSTION | P2 | 3-5 hr | BE dev | Reliability |
| EXEC-PACK-CSV-CAP | P2 | 1 hr | FE dev | Reliability |
| EXEC-PACK-DEPENDABOT-TRIAGE | P1 | 2-4 hr | BE+FE | Security |
| EXEC-PACK-SSR-VERIFY | P2 | 30 min | Paul/Ops | SEO validation |
| EXEC-PACK-LOCALSTORAGE-SSR | P2 | 1 hr | FE dev | SSR correctness |
| EXEC-PACK-SOFT-404 | P2 | 2-3 hr | FE dev | SEO |

---

## EXEC-PACK-PAYMONGO-VERIFY
**Priority: P1 | Effort: 5 minutes | Owner: Paul | Unblocks: Public launch**

Step 1 — Check if env var is set:
```powershell
ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"
```

Step 2a — If present (non-empty value shown): public launch is cleared. No further action.

Step 2b — If missing:
```powershell
ssh root@139.162.11.242 "echo 'PAYMONGO_WEBHOOK_SECRET=<your-paymongo-webhook-secret>' >> /var/www/_work/get-hired-BE/.env && pm2 restart all"
```

Step 3 — Smoke test (optional but recommended):
- Log into PayMongo dashboard
- Navigate to Webhooks → Send test event
- Check PM2 logs: `ssh root@139.162.11.242 "pm2 logs --lines 20"` — look for `[paymentController]` output with 200 status

**Verification:** BE returns 200 to PayMongo test event; no 400 rejections.

---

## EXEC-PACK-ESM-LINT
**Priority: P1 | Effort: 2-4 hours | Owner: BE dev | Unblocks: Production safety**

Goal: Add an ESLint rule that prevents `?.` and `??` in BE source files, blocking the ESM Acorn limitation developer trap.

Step 1 — Install ESLint:
```bash
cd get-hired-BE && npm install --save-dev eslint@^8
```

Step 2 — Create `.eslintrc.js` in `get-hired-BE/`:
```javascript
module.exports = {
  env: {
    node: true,
    es2019: true  // ES2019 excludes optional chaining and nullish coalescing
  },
  parserOptions: {
    ecmaVersion: 2019  // Acorn 6/7 supports up to ES2019
  },
  rules: {
    // Block syntax that Acorn 6/7 cannot parse:
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ChainExpression',
        message: 'Optional chaining (?.) is not supported by esm v3.2.25/Acorn. Use && guards instead.'
      },
      {
        selector: 'LogicalExpression[operator="??"]',
        message: 'Nullish coalescing (??) is not supported by esm v3.2.25/Acorn. Use || or explicit null checks instead.'
      }
    ]
  },
  ignorePatterns: ['node_modules/', 'dist/']
};
```

Step 3 — Add lint script to `package.json`:
```json
"scripts": {
  "lint": "eslint src/ --ext .js",
  "lint:fix": "eslint src/ --ext .js --fix"
}
```

Step 4 — Test lint:
```bash
npm run lint
# Should pass with 0 errors on the current codebase (after ESM-COMPAT-FIX was applied)
```

Step 5 — Add to pre-commit hook (optional but recommended):
```bash
# .husky/pre-commit (or equivalent pre-commit hook):
cd get-hired-BE && npm run lint
```

**Verification:** Create a test file with `const x = obj?.prop;`, run `npm run lint` → must error with the message above. Remove the test file.

---

## EXEC-PACK-PM2-ECOSYSTEM
**Priority: P2 | Effort: 1-2 hours | Owner: BE dev / Paul | Unblocks: Deploy resilience**

Step 1 — Create `get-hired-BE/ecosystem.config.js`:
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
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Step 2 — Commit and deploy:
```powershell
# In local repo:
git add ecosystem.config.js && git commit -m "ops: add PM2 ecosystem file; entry point is start.js not server.js"

# Deploy to Linode:
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull"
```

Step 3 — Register ecosystem on Linode:
```powershell
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && pm2 delete all && pm2 start ecosystem.config.js && pm2 save && pm2 startup"
```

Step 4 — Verify:
```powershell
ssh root@139.162.11.242 "pm2 list"
# Must show: get-hired-be | online | start.js (not server.js)
```

**Future deploy command (after ecosystem is registered):**
```powershell
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 reload ecosystem.config.js"
```

---

## EXEC-PACK-RATE-LIMIT
**Priority: P1 | Effort: 3-5 hours | Owner: BE dev | Unblocks: Security**

Step 1 — Install dependency:
```bash
cd get-hired-BE && npm install express-rate-limit
```

Step 2 — Create `get-hired-BE/middleware/rateLimiter.js`:
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

module.exports = { authLimiter, writeLimiter, publicReadLimiter };
```

Step 3 — Apply in auth route files:
```javascript
const { authLimiter } = require('../middleware/rateLimiter');
router.post('/signin', authLimiter, signIn);
router.post('/signup', authLimiter, signUp);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/forgot-password', authLimiter, forgotPassword);
```

Step 4 — Apply to write endpoints (contacts, candidates, job-apply):
```javascript
const { writeLimiter } = require('../middleware/rateLimiter');
router.post('/addcontact', writeLimiter, verifyAuth, addContact);
router.post('/multiplecontact', writeLimiter, verifyAuth, multipleContact);
router.post('/addcandidate', writeLimiter, verifyAuth, addCandidates);
router.post('/apply', writeLimiter, verifyAuth, applyForJob);
```

Step 5 — Apply to public read endpoints:
```javascript
const { publicReadLimiter } = require('../middleware/rateLimiter');
router.get('/published', publicReadLimiter, getPublishedJobs);
router.get('/details/:id', publicReadLimiter, optionalVerifyAuth, getJobDetails);
```

**Verification:**
```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/signin \
    -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'
done
# Requests 11-12 must return 429
```

---

## EXEC-PACK-POOL-EXHAUSTION
**Priority: P2 | Effort: 3-5 hours | Owner: BE dev | Unblocks: Reliability**

Step 1 — Install `p-limit`:
```bash
cd get-hired-BE && npm install p-limit
```

Step 2 — Apply to `multipleContact` in `controllers/contactsController.js`:
```javascript
// At top of file:
const pLimit = require('p-limit');
const limit = pLimit(10);  // match DB pool max

// Replace the current Promise.allSettled call:
const settled = await Promise.allSettled(
  contacts.map(option => limit(async () => {
    return addMultipleContact({ ...option, companyId });
  }))
);
```

Step 3 — Apply same pattern to `multipleCandidate` in `controllers/candidateController.js`.

Step 4 — Optionally raise pool max in `db/dbQuery.js`:
```javascript
// Change: max: 10
// To: max: 20  (if Supabase allows more connections on your plan)
```

**Verification:** Import a 100-row CSV → check PM2 logs for zero `connection timeout` errors → all rows land in success or duplicate (none in rejected due to timeout).

---

## EXEC-PACK-CSV-CAP
**Priority: P2 | Effort: 1 hour | Owner: FE dev | Unblocks: Reliability**

Apply to all 3 import components. Inside `uploadListener()` after `this.records = result.data`:

```typescript
// Add at the top of each import component class:
private readonly MAX_IMPORT_ROWS = 50;

// Add inside uploadListener after records are parsed:
if (this.records.length > this.MAX_IMPORT_ROWS) {
  this.snackBar.open(
    `CSV has ${this.records.length} rows. Maximum allowed is ${this.MAX_IMPORT_ROWS}. Please split your file and import in batches.`,
    '',
    { duration: 8000, panelClass: 'danger-snackbar' }
  );
  this.records = [];
  this.fileInput.nativeElement.value = '';  // reset file input
  return;
}
```

**Files:**
- `src/app/company/import-add-contact/import-add-contact.component.ts`
- `src/app/company/import-add-candidate/import-add-candidate.component.ts`
- `src/app/company/company-users/import-add-user/import-add-user.component.ts`

**Verification:** Upload a 51-row CSV → danger snackbar shows "CSV has 51 rows. Maximum allowed is 50." → import does not proceed.

---

## EXEC-PACK-DEPENDABOT-TRIAGE
**Priority: P1 | Effort: 2-4 hours | Owner: BE dev + FE dev | Unblocks: Security**

Step 1 — Navigate to GitHub → Security tab → Dependabot alerts → filter "Critical"

Step 2 — For each of the 6 critical CVEs:
- Read the CVE advisory
- Determine if the vulnerable code path is reachable in GetHired
- If YES: upgrade the package immediately
- If NO (e.g., CVE is in a sub-command not used): document reasoning and schedule upgrade

Step 3 — Run automated fix for non-breaking upgrades:
```bash
# BE:
cd get-hired-BE && npm audit fix

# FE:
cd get-hired-FE && npm audit fix
```

Step 4 — For packages requiring major version bumps (breaking changes):
```bash
npm audit fix --force  # WARNING: may break APIs — test thoroughly after
```

Step 5 — Run regression after upgrades:
- BE: all endpoint tests pass
- FE: `ng build` succeeds; app loads in browser

---

## EXEC-PACK-SSR-VERIFY
**Priority: P2 | Effort: 30 minutes | Owner: Paul / Ops | Unblocks: SEO validation**

Step 1 — Get an active job ID from production (log into app or query DB).

Step 2 — Run the Googlebot curl:
```bash
curl -A "Googlebot" "https://gethiredonline.app/jobs/details/<ACTIVE_JOB_ID>" | grep -E "<title>|application/ld\+json|og:title"
```

**Pass criteria:**
- `<title>` shows the actual job title (not "GetHired Online")
- `application/ld+json` block appears with `JobPosting` type
- `og:title` shows job title

**If failing (static rendering):** Nginx is not proxying to the SSR Node process. Fix: update nginx config to proxy `/` to `localhost:3000` (or whatever port Angular Universal runs on), and ensure the PM2 SSR process is running.

Step 3 — Also verify the OG image:
Open https://www.linkedin.com/post-inspector/ → enter `https://gethiredonline.app` → confirm preview image appears (not blank).

---

## EXEC-PACK-LOCALSTORAGE-SSR
**Priority: P2 | Effort: 1 hour | Owner: FE dev | Unblocks: SSR correctness for public search**

**File:** `src/app/jobs/public-search/public-search.component.ts`

Step 1 — Inject `PLATFORM_ID`:
```typescript
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

constructor(
  // ... existing dependencies ...
  @Inject(PLATFORM_ID) private platformId: Object
) {}
```

Step 2 — Wrap all localStorage reads and writes:
```typescript
// Replace: localStorage.getItem('key')
// With:
if (isPlatformBrowser(this.platformId)) {
  const value = localStorage.getItem('key');
  // use value
}

// Replace: localStorage.setItem('key', value)
// With:
if (isPlatformBrowser(this.platformId)) {
  localStorage.setItem('key', value);
}
```

**Verification:** Run `ng build --configuration=server` → no `ReferenceError: localStorage` in build output. Run SSR verify pack above for `/jobs` URL.
