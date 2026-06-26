# GetHired — Decision Log RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Decision log in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**Purpose:** Track product, architecture, and design decisions; record what was decided, by whom, when, and why

---

## Decisions Made This Session

### DEC-R3-01 — Firebase Credential Strategy: env-base64 Chain

**Status: DECIDED**
**Date:** 2026-06-26
**Decision:** Use `FIREBASE_SERVICE_ACCOUNT_BASE64` env var (base64-encoded JSON) as the primary credential source on production. Keep the local-file fallback only for development.

**Rationale:**
- Eliminates the need to SCP the raw JSON key file to each production server
- Secret is stored in Linode `.env` (not in repo, not in PM2 config, not in deployment script)
- The old key leaked to git history was auto-revoked by Google; env-based chain prevents recurrence
- ADC (Application Default Credentials) path kept as fallback for potential future GCP/Cloud Run migration

**Resolution chain in `middleware/firebaseApp.js`:**
1. `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 JSON) — production
2. `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON string) — alternative
3. Application Default Credentials — GCP/Cloud Run path
4. Local file `jobhunt-serviceAccountKey.json` — development only

**Owner:** Paul | **Implemented:** This session

---

### DEC-R3-02 — ESM Migration: Interim Lint Guard vs Full Migration

**Status: DECIDED (interim) | PENDING (full migration)**
**Date:** 2026-06-26
**Decision:** Ship ESLint rule blocking `?.`/`??` in BE source as interim guard (Sprint 1). Full native ESM migration is planned but not committed to a timeline.

**Rationale:**
- Full migration from `esm` v3.2.25 to native Node ESM requires touching every `require()` / `module.exports` in the codebase (estimated 50-100+ occurrences)
- The immediate risk is that the NEXT developer who adds `?.` or `??` silently breaks production
- An ESLint rule is low-effort, high-effectiveness protection that can ship this sprint
- The full migration is the correct long-term answer but carries regression risk that requires a dedicated test sprint

**Options considered:**
- (A) ESLint rule only — chosen as interim
- (B) Upgrade Node 14 → 16+ (enables optional chaining without Acorn) — viable but involves Node upgrade risk
- (C) Full native ESM migration — correct long-term; deferred

**Owner:** BE dev | **Interim:** Sprint 1 | **Full migration:** Future sprint

---

### DEC-R3-03 — PM2 Entry Point: ecosystem.config.js

**Status: DECIDED**
**Date:** 2026-06-26
**Decision:** Create and commit `ecosystem.config.js` encoding `start.js` (not `server.js`) as the PM2 entry point. All future PM2 operations to use `pm2 start ecosystem.config.js` / `pm2 reload ecosystem.config.js`.

**Rationale:**
- `server.js` is the Express app module; `start.js` is the ESM loader shim that makes `server.js` runnable on Node 14
- Starting `server.js` directly causes `ERR_MODULE_NOT_FOUND` or ES module parse errors
- Committing the correct entry point eliminates the knowledge dependency on a specific team member
- PM2 process list is lost on server reboot without `pm2 save && pm2 startup` — ecosystem file makes recovery safe

**Owner:** BE dev / Paul | **Target:** Sprint 1

---

### DEC-R3-04 — PayMongo Webhook: Verify Before Declaring Launch-Ready

**Status: DECIDED — pending verification**
**Date:** 2026-06-26
**Decision:** Do not declare public launch until `PAYMONGO_WEBHOOK_SECRET` is confirmed present and non-empty in Linode production `.env`.

**Rationale:**
- The HMAC verification code is correct and shipped (commit 97cd657)
- If the env var is missing, `verifyPaymongoSignature()` returns false → all webhooks rejected 400 → payment events will not process
- This is a 5-minute verification, not a code change — it should be done immediately before any public launch announcement
- The consequence of proceeding without verification: subscription activations and payment confirmations silently fail; employers may believe they have active subscriptions when payment was not confirmed

**Owner:** Paul | **Due:** Immediately before public launch

---

## Carried Decisions from V5

### DEC-V5-01 — OG Image Design Direction (RESOLVED)

**Status: RESOLVED**
**Decision:** OG image created as 1200×630px branded PNG at `src/assets/brand/gethired-og-default.png`. Specific design details per Paul's implementation.
**Original options:** (A) coral background, (B) dark background, (C) photo with overlay
**Closed:** This session

---

### DEC-V5-02 — CSV Import Row Limit

**Status: PENDING**
**Decision needed:** What is the right CSV batch size limit?
**Recommendation:** 50 rows (safe without pool fixes; revisit after p-limit is installed)
**Options:**
- 20-30 rows: Maximum pool safety; more annoying UX for large-volume employers
- 50 rows: Reasonable UX; safe with current pool max=10
- 100+ rows: Requires p-limit in place first

**Owner:** Paul | **Blocking:** EXEC-PACK-CSV-CAP

---

### DEC-V5-03 — Employer Info Page CTAs: Crawlable Links

**Status: PENDING**
**Decision needed:** Convert employer info page `(click)="router.navigate()"` CTAs to `<a routerLink>` elements?
**Recommendation:** Yes — same pattern applied to job-seeker portal (commit 94e4d39); low risk; SEO benefit
**Owner:** Paul | **Blocking:** P2-HERO-CTA

---

### DEC-V5-05 — Programmatic SEO Landing Pages (DEFERRED)

**Status: DEFERRED**
**Decision:** Do not build city/category landing pages until 5+ active unique jobs exist per page. Stub pages with thin content trigger Google penalties.
**Owner:** Paul | **Review trigger:** When job volume reaches threshold

---

### DEC-V5-06 — Admin Pages Data Model

**Status: PENDING**
**Decision needed:** What data should admin company reports show?
**Options:**
- (A) Company-level: job count, application count, hire rate
- (B) Platform-wide aggregate: total jobs, total applicants, conversion funnel
- (C) Financial: subscription status, payment history per company
**Owner:** Paul | **Blocking:** FEAT-ADMIN-PAGES

---

## Pending Decisions (New This Session)

### DEC-R3-05 — Dependabot Critical CVEs: Upgrade vs Document

**Status: PENDING**
**Decision needed:** For each of the 6 critical Dependabot CVEs, decide: upgrade immediately, or document that the vulnerable path is not reachable in GetHired.
**Recommendation:** Run `npm audit` to get the list; evaluate each CVE individually; upgrade where the vulnerable function is in GetHired's call graph.
**Owner:** BE dev + Paul | **Due:** Sprint 2

---

### DEC-R3-06 — Full ESM Migration Timeline

**Status: PENDING**
**Decision needed:** When to schedule the full `esm` → native Node ESM migration.
**Options:**
- (A) Couple with Node upgrade (14 → 18 LTS) — do both together; lower risk than two separate migrations
- (B) Migrate ESM first on Node 14, then upgrade Node separately
- (C) Defer indefinitely, maintain ESLint guard
**Recommendation:** Option A — plan a "Node upgrade + ESM migration" sprint after public launch is stable
**Owner:** BE dev + Paul | **Blocking:** Long-term BE maintainability
