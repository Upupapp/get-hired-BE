# GetHired — Actions Roadmap RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Execution order in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**Context:** 9 items closed this session; P0 cleared; system upgraded to public-launch-ready conditional on PayMongo env var

---

## Roadmap Overview

| Phase | Name | Status | Effort | Unblocks |
|---|---|---|---|---|
| PHASE 0 | Final launch gate (PayMongo env var) | **IMMEDIATE** | 5 min | Public launch |
| PHASE 1 | ESM tech debt remediation | **Sprint 1** | 2-3 days | Long-term maintainability |
| PHASE 2 | Deployment hardening (PM2 ecosystem + rate limiting) | **Sprint 1-2** | 1-2 days | Ops resilience, security |
| PHASE 3 | Dependabot CVE triage + critical upgrades | **Sprint 2** | 2-4 days | Supply chain security |
| PHASE 4 | BE architectural fixes (pool exhaustion + CSV cap) | **Sprint 2** | 1-2 days | Reliability |
| PHASE 5 | FE SEO polish (SSR verify + soft-404 + company sitemap) | **Sprint 2** | 1-2 days | Search indexing |
| PHASE 6 | Accessibility sprint | **Sprint 3** | 1-2 days | WCAG compliance |
| PHASE 7 | DX / polish (bcrypt-js, axios, toast extract) | **Sprint 3** | 1 day | Maintainability |
| PHASE 8 | Deferred features | **Future** | weeks | Product growth |

---

## Phase 0 — Final Launch Gate (IMMEDIATE — today)

**Goal:** Confirm payment webhooks functional; declare public launch cleared

**Steps:**
1. Run: `ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -1"`
2. If value is present and non-empty: **PUBLIC LAUNCH IS CLEARED. No P0 or P1 code blockers remain.**
3. If missing: `ssh root@139.162.11.242 "echo 'PAYMONGO_WEBHOOK_SECRET=<your-secret>' >> /var/www/_work/get-hired-BE/.env && pm2 restart all"`
4. Smoke test: trigger a PayMongo test webhook from the dashboard; confirm BE returns 200; check PM2 logs for paymentController output

**Outcome:** Binary — either cleared for launch or 1 env-var fix needed.

---

## Phase 1 — ESM Tech Debt Remediation (Sprint 1)

**Goal:** Eliminate the developer trap where `?.` / `??` silently breaks production

**Option A (Interim — days):** Install ESLint rule + pre-commit hook blocking `?.` and `??` in BE source
- File: `.eslintrc.js` in `get-hired-BE/`
- Rule: `"no-optional-chaining": "error"`, `"no-nullish-coalescing-operator": "error"` (use `eslint-plugin-node` or custom rule)
- Add `npx eslint src/` to BE CI/pre-commit
- Effect: Developer gets an error before committing bad syntax; production stays safe

**Option B (Full migration — 1-2 weeks):** Migrate to native Node ESM
- Add `"type": "module"` to `package.json`
- Rename `start.js` → `start.mjs` or update all import/require paths
- Remove `esm` package
- Replace all `require()` with `import`; all `module.exports` with `export`
- Test against Node 14 compatibility (or upgrade Node as part of the same effort)

**Recommendation:** Ship Option A in Sprint 1 to protect the current codebase; plan Option B for a dedicated migration sprint.

**Owner:** BE dev
**Files:** `get-hired-BE/.eslintrc.js`, `.husky/pre-commit` (or equivalent)

---

## Phase 2 — Deployment Hardening (Sprint 1-2)

### 2A — PM2 Ecosystem File (P2)
**Goal:** Encode the correct entry point (`start.js`) in a committed file; prevent next person from starting `server.js` after a reboot

**Steps:**
1. Create `get-hired-BE/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'get-hired-be',
    script: './start.js',
    env: { NODE_ENV: 'production' },
    max_restarts: 10,
    watch: false
  }]
};
```
2. Update deploy runbook: `pm2 start ecosystem.config.js` (not `pm2 start server.js`)
3. On Linode: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save && pm2 startup`

**Owner:** BE dev / Paul
**Effort:** S

### 2B — Rate Limiting (P1)
See EXEC-PACK-RATE-LIMIT in GETHIRED_ACTIONS_EXECUTION_PACKS_RECENT_3.md
**Owner:** BE dev
**Effort:** M

---

## Phase 3 — Dependabot CVE Triage (Sprint 2)

**Goal:** Triage 6 critical + 61 high CVEs; upgrade packages where actual exploitability exists

**Steps:**
1. Pull full Dependabot alert list from GitHub Security tab
2. For each critical CVE: determine if the vulnerable code path is reachable in GetHired (many CVEs in transitive deps are not directly exploitable)
3. Upgrade packages where exploitable: `npm audit fix` then `npm audit fix --force` for remaining
4. Run full regression: test BE endpoints; confirm no breakage from major-version bumps
5. Split FE and BE upgrades into separate PRs for easier rollback

**Key packages likely affected:** `express` (known CVEs in older versions), file upload deps, JWT libraries
**Owner:** BE dev + FE dev
**Effort:** M (critical 6) + L (full 67)

---

## Phase 4 — BE Architectural Fixes (Sprint 2)

### 4A — Pool Exhaustion (P2)
- Install `p-limit`
- Cap `multipleContact` and `multipleCandidate` concurrency at pool max (10)
- See EXEC-PACK-POOL-EXHAUSTION

### 4B — CSV Row Cap (P2)
- Add 50-row client-side guard in all 3 import-add components
- See EXEC-PACK-CSV-CAP

**Owner:** BE dev + FE dev | **Effort combined:** M

---

## Phase 5 — FE SEO Polish (Sprint 2)

### 5A — SSR Production Verify (P2)
- Run: `curl -A "Googlebot" https://gethiredonline.app/jobs/details/<active-job-id>`
- Verify `<title>` and `<script type="application/ld+json">` appear in raw HTML (not just client-rendered)

### 5B — Company Sitemap (P2)
- Add company profile URLs to `sitemapController.js`
- Query: `SELECT id FROM companies` → map to `/jobs/company/:id`

### 5C — Employer Info Page CTAs (P2)
- Convert `(click)="router.navigate()"` → `<a routerLink>` in employer info page

### 5D — SVG CLS (P2)
- Add `width` and `height` attributes to all `<img src="*.svg">` elements in public pages

### 5E — localStorage SSR Guard (P2)
- Add `isPlatformBrowser(this.platformId)` guard to all `localStorage` calls in `PublicSearchComponent`

**Owner:** FE dev | **Effort combined:** S-M

---

## Phase 6 — Accessibility Sprint (Sprint 3)

| Item | Fix |
|---|---|
| P3-SNACKBAR-ASSERTIVE | Custom ToastComponent with `role="alert"` for error outcomes |
| P3-DIALOG-ALL-FAILED-UX | Keep invite dialog open with inline error on all-failed |
| P3-REUSABLE-TABLE-MOBILE | Add card-view fallback for mobile in reusable-table |

**Owner:** FE dev | **Effort combined:** M

---

## Phase 7 — DX / Polish (Sprint 3)

| Item | Fix |
|---|---|
| P3-BCRYPT-JS | Replace `bcrypt` with `bcryptjs` in package.json; no API change |
| P3-AXIOS-1X | Upgrade axios 0.x → 1.x; audit usage for breaking changes |
| P3-TOAST-EXTRACT | Extract shared `resolveImportToast(res, entityLabel)` utility |
| P3-DEAD-LOG-CONTACT | Remove dead subscribe branches in contact-list + candidate-list |
| P3-CANDIDATE-FORM-GUARD | Initialize `importCandidateForm` at ngOnInit, not inside uploadListener |
| P3-CANDIDATE-SINGULAR | Align bulk candidate field to plural (`candidates`) to match contact pattern |
| P3-FAILED-EMAIL-INDICATOR | Add per-item failure icon in partial-success invite list |
| P3-TOAST-TESTS | Unit tests for toast outcome logic in 3 import-add dialogs |

**Owner:** FE dev + BE dev | **Effort combined:** M

---

## Phase 8 — Deferred Features

| Feature | Blocker | Notes |
|---|---|---|
| Messages widget | No is_read column; no all-threads endpoint | P1 product value when unblocked |
| Admin pages | No route/data model | Low urgency |
| Google Indexing API | Additional OAuth setup | Now unblocked by GSC; prioritize when indexing velocity is measured |
| Programmatic SEO | Needs real job volume | Do not build until 5+ active jobs per city/category |

---

## Estimated Completion Timeline

| Phase | Estimated Duration |
|---|---|
| Phase 0 (PayMongo env var) | < 30 minutes |
| Phase 1 (ESM lint rule) | 2-4 hours |
| Phase 2 (PM2 + rate limiting) | 1-2 days |
| Phase 3 (Dependabot triage) | 2-4 days |
| Phase 4 (BE architectural) | 1-2 days |
| Phase 5 (SEO polish) | 1-2 days |
| Phase 6 (Accessibility) | 1-2 days |
| Phase 7 (DX/polish) | 1-2 days |
| Phase 8 (Features) | Weeks |
