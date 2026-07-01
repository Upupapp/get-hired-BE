# GETHIRED DECISION LOG — V6
**Date:** 2026-07-01 | **Format:** Decision · Outcome · Rationale · Owner · Status

---

## DEC-001: Google Auth Account-Linking Strategy
**Decision:** How to handle a new Google sign-in where the email already exists in user_credentials
**Outcome:** Show 409 error with clear message ("An account with this email already exists. Please sign in with your password.") — no automatic account linking.
**Rationale:** Automatic linking introduces identity federation risks (email takeover → Google account hijack transfers session). 409 message guides users correctly without risk.
**Owner:** Paul
**Status:** DECIDED — implemented. Revisit for LinkedIn and Google One Tap flows.

---

## DEC-002: Google One Tap (FedCM) — Timing
**Decision:** When to activate Google One Tap overlay
**Outcome:** Deferred until after post-launch observation period. Must pass QA gate (QA-ACT-007) first.
**Rationale:** One Tap introduces additional FedCM API dependency. Activating before existing Google OAuth is confirmed stable in production adds risk. Gate: standard Google sign-in QA'd on Chrome/Firefox/Safari + iOS/Android for 1-2 weeks post-launch.
**Owner:** Paul
**Status:** DECIDED — deferred (GH-ACT-092)

---

## DEC-003: Admin OAuth Restriction
**Decision:** Can admin accounts use Google or LinkedIn sign-in?
**Outcome:** No — admin access requires email+password only. Google and LinkedIn auth are blocked for admin role.
**Rationale:** Admin accounts have platform-wide access. Federated identity providers add a secondary attack surface (compromised Google/LinkedIn account → admin access). Email+password with strong password policy is sufficient for the current threat model.
**Owner:** Paul
**Status:** DECIDED — implemented

---

## DEC-004: requestUri Field in googleAuthController
**Decision:** What value to use for `requestUri` in the Firebase `signInWithIdp` REST call
**Outcome:** `'https://gethiredonline.app'` (hardcoded production URL)
**Rationale:** Firebase REST API `signInWithIdp` requires `requestUri` to be an authorized domain, not `localhost` or a dev URL. Hardcoding production URL ensures the Firebase token exchange works correctly in all environments.
**Owner:** Developer
**Status:** DECIDED — deployed in BE=98b4bfb

---

## DEC-005: OG Image Design Direction
**Decision:** What should the GetHired OG social share image look like?
**Options:** (A) Coral brand background + logo + tagline | (B) Dark background + logo + CTA | (C) Job-search photo + logo overlay
**Recommendation:** Option A — brand coral (#FF7062) with logo and tagline. Most recognizable, safe for all platforms, works at 160px thumbnail.
**Owner:** Paul / Design
**Status:** OPEN — decision needed before PACK-C execution
**Blocking:** P1-OG-IMAGE

---

## DEC-006: CSV Import Row Limit
**Decision:** What is the right CSV import batch size limit?
**Options:** 20-30 (safest, most annoying) | 50 (recommended) | 100 (risky without p-limit)
**Recommendation:** 50 rows initially. Raise to 100 after p-limit concurrency limiter (TD-ACT-007) is installed and tested.
**Owner:** Paul
**Status:** OPEN — recommended 50, decision needed for PACK-D.3
**Blocking:** P2-CSV-ROW-CAP

---

## DEC-007: Employer Info Page CTAs — Crawlable Links
**Decision:** Should "Post a Job" / "Get Started" / "Learn More" CTAs on employer info page be converted to `<a routerLink>` elements?
**Recommendation:** Yes — same pattern already applied to job-seeker portal (commit 94e4d39). Low risk, SEO benefit.
**Owner:** Paul
**Status:** OPEN — low-risk recommendation; can be actioned immediately in PACK-E.4
**Blocking:** P2-HERO-CTA

---

## DEC-008: Programmatic SEO Landing Pages — Content Threshold
**Decision:** When to build "Jobs in Manila" / "Remote Jobs in Philippines" landing pages
**Outcome:** Deferred. Minimum 5+ active jobs per city/category required before building stub pages.
**Rationale:** Sub-threshold pages are thin content and risk Google penalties. Better to wait for real job volume.
**Owner:** Paul
**Status:** DECIDED — deferred until job volume threshold met
**Blocking:** FEAT-PROGRAMMATIC-SEO

---

## DEC-009: Admin Companies + Reports Pages — Data Model
**Decision:** What data should admin company reports show?
**Options:** (A) Company-level stats (job count, application count) | (B) Platform-wide aggregate (conversion funnel) | (C) Financial (subscription status, payment history)
**Recommendation:** Start with (C) Financial + (A) Company-level. Admin needs to verify payments and monitor job activity.
**Owner:** Paul
**Status:** OPEN — decision needed before FEAT-ADMIN-PAGES work begins

---

## DEC-010: Messages Widget — Data Model for is_read
**Decision:** Should `is_read` be per-message or per-thread?
**Recommendation:** Per-message (`ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false`). Thread-level unread count is derived by query. Per-message is more granular and supports future notification features.
**Owner:** Developer
**Status:** OPEN — decision needed before PACK-H begins
**Blocking:** ACT-009 / FEAT-MESSAGES-WIDGET

---

## DEC-011: LinkedIn Unlink — Account Deletion Cascade
**Decision:** What happens to a user's data when they unlink their LinkedIn account?
**Outcome:** Unlink removes the LinkedIn association (access token, LinkedIn sub) from user record. Does NOT delete the user account or their data. User can still sign in via email/password if they have a password set.
**Risk:** Users who signed up via LinkedIn only (no password) will be locked out if they unlink. Mitigation: Warn user in unlink UI if they have no email/password set; prompt to set password first.
**Owner:** Paul / Developer
**Status:** DECIDED — with password-warning mitigation (must be implemented in GH-ACT-088)

---

## DEC-012: Modal Acknowledgement Persistence — sessionStorage vs DB
**Decision:** Should company setup modal acknowledgement persist to DB or remain in sessionStorage?
**Outcome:** sessionStorage is acceptable for now (P3 upgrade). DB persistence is a should-have for cross-device UX.
**Rationale:** The company setup modal is a one-time flow. SessionStorage suffices for the majority of users. DB persistence (GH-ACT-090) adds ~3-4 hours of BE+FE work. Defer until other P2s are clear.
**Owner:** Paul
**Status:** DECIDED — sessionStorage now, DB upgrade is P3 (GH-ACT-090)

---

## DEC-013: Node.js Upgrade Path — CommonJS vs ES Modules
**Decision:** When upgrading from Node 14, use CommonJS (remove `esm`) or native ES modules?
**Recommendation:** CommonJS (`require`/`module.exports`). Rationale: BE is already majority CommonJS; mixing ESM+CJS in Node is error-prone; `esm` package only bridges the gap. Converting the few `import` files to `require` is simpler than migrating the entire BE to native ESM.
**Owner:** Developer
**Status:** DECIDED — CommonJS path (ACT-017)

---

## V5 Decisions Carried Forward (No Change)

| V5 Decision | Status |
|---|---|
| SAVE_CONTACT dispatch in candidate add — bug, not feature | CLOSED (removed 21657a5) |
| Programmatic SEO min content threshold | OPEN (DEC-008 above) |
| Admin companies + reports data model | OPEN (DEC-009 above) |
