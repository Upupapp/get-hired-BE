# GETHIRED ACTIONS REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, TEST V5, SECURE V5, STITCH V5, OPTIMIZE V5

---

## Executive Summary

Prioritized backlog and roadmap derived from all V5 command outputs. Organized into three tiers: (1) critical blockers that must resolve before Google Auth is live, (2) high-value product opportunities requiring 1-3 engineer-days each, (3) strategic improvements for later sprints.

---

## Baseline Reports Used
SWEEP V5, TEST V5, SECURE V5, STITCH V5, OPTIMIZE V5

---

## TIER 1 — Critical Blockers (Must Fix Before Google Auth Goes Live)

### ACT-001 — Create new OAuth 2.0 Web Client [EXTERNAL USER ACTION]
**Effort:** 10 minutes (user action only)
**Who:** Paul (Google Cloud Console access required)
**Steps:**
1. Go to console.cloud.google.com → Select project `get-hired-363107`
2. APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: "GetHired GIS Production"
5. Authorized JavaScript origins: `https://gethiredonline.app`
6. Click Create → Copy the new Client ID
7. Send Client ID to developer to update `environment.ts`, `environment.prod.ts`, `environment.staging.ts`
8. `ng build --configuration=staging` → `scp dist/` to Linode

### ACT-002 — Update environment files with new Client ID [DEVELOPER ACTION]
**Effort:** 5 minutes
**Depends on:** ACT-001
**Files:** `src/environments/environment.ts`, `environment.prod.ts`, `environment.staging.ts`
**Action:** Replace `818317489154-s5mc0m5rd06qdpj3bh1sdrfqessaca8u` with new Client ID in all 3 files, rebuild, redeploy

### ACT-003 — Deploy requestUri fix to Linode BE [DEVELOPER ACTION]
**Effort:** 5 minutes
**File:** `get-hired-BE/controllers/googleAuthController.js` — ALREADY FIXED in this session
**Action:** Deploy BE to Linode: `scp get-hired-BE/ root@139.162.11.242:/var/www/get-hired-api/ && ssh root@139.162.11.242 "cd /var/www/get-hired-api && pm2 restart all"`

---

## TIER 2 — High-Value Product Opportunities (1–3 days each)

### ACT-004 — Wire ProfileQualityService into Applicant Dashboard
**Priority:** P1 — highest-impact applicant UX gap
**Service:** `ProfileQualityService` (exists, untouched)
**Components:** `ApplicantDashboardComponent` (add quality card/progress bar)
**Value:** Shows job seekers what to complete, increases profile completion rate, drives more qualified applications
**Effort:** ~1 day (wiring only, service already built)

### ACT-005 — Add JobPosting JSON-LD to /jobs/:id
**Priority:** P1 — free SEO wins (Google Job rich results)
**Service:** Angular Meta service injection in `JobDetailComponent`
**Data already available:** `title`, `description`, `companyName`, `location`, `salary`, `createdAt`
**Effort:** ~2 hours

### ACT-006 — PayMongo Webhook Signature Verification
**Priority:** P1 — payment security, critical for production revenue integrity
**File:** `controllers/paymentController.js` (payment webhook handler)
**Implementation:** Verify `PayMongo-Signature` header against webhook secret using HMAC-SHA256
**Effort:** ~2 hours
**Ref:** PayMongo docs → Webhook Signatures → `X-PayMongo-Signature` header verification

### ACT-007 — CORS Allowlist
**Priority:** P1 — security hygiene
**File:** `server.js` line with `app.use(cors())`
**Implementation:**
```javascript
app.use(cors({
  origin: ['https://gethiredonline.app', 'https://www.gethiredonline.app', 'http://localhost:4200'],
  credentials: true
}));
```
**Effort:** 15 minutes

### ACT-008 — Add noindex to Role Classification Page
**Priority:** P2 — SEO hygiene
**File:** `role-classification.component.ts` ngOnInit
**Implementation:** `this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' })`
**Effort:** 10 minutes

### ACT-009 — Messages Widget is_read Column + All-Threads Endpoint
**Priority:** P2 — employer engagement (dashboard messages widget deferred since GH1 checkpoint)
**Migration:** Add `is_read boolean DEFAULT false` to `messages` table
**BE:** New route `GET /api/recruiter/messages/threads` — returns one latest message per (job_id, applicant_uid) pair
**FE:** Wire `DashboardMessagesWidgetComponent` to real data
**Effort:** ~1 day

### ACT-010 — Add provider column to user_credentials
**Priority:** P2 — account management clarity
**Migration:** `ALTER TABLE user_credentials ADD COLUMN provider VARCHAR(20) DEFAULT 'email'`
**Update:** `chooseRole` sets `provider = 'google'` on INSERT
**Effort:** ~1 hour (migration + controller update)

### ACT-011 — Google One Tap (FedCM)
**Priority:** P2 — conversion improvement (depends on ACT-001/002 being done first)
**File:** `google-signin-button.component.ts`
**Implementation:** Add `use_fedcm_for_prompt: true` to `google.accounts.id.initialize()` options + call `google.accounts.id.prompt()` after initialization for the One Tap overlay
**Effort:** ~2 hours

### ACT-012 — Easy Job Post Extraction Per-User Rate Limit
**Priority:** P1 — CPU-intensive extraction at risk of abuse
**File:** `routes/easyJobPostRoutes.js` or `server.js`
**Implementation:** Create a dedicated `express-rate-limit` instance (5 requests/hour per authenticated user uid, based on `req.user.uid` as key)
**Effort:** ~1 hour

---

## TIER 3 — Strategic (Future Sprints)

### ACT-013 — Git History Purge (Secrets)
**Priority:** P0 external — existing service accounts + SSH keys in git history
**Owner:** Paul (requires coordination with Firebase + Linode)
**Steps:** (1) Rotate Firebase service account → update all env vars, (2) Rotate Linode SSH keys, (3) Run `git filter-repo` or BFG on both repos, (4) Force-push both (coordinate with any collaborators), (5) Verify no secrets in new history
**Effort:** ~4 hours (multi-step coordination)

### ACT-014 — CV Doctor FE Wiring
**Priority:** P2 — applicant differentiation feature
**Status:** Services exist, FE partially built
**Effort:** ~2 days (FE wiring, upload flow, display)

### ACT-015 — Applicant Profile Grading UI
**Priority:** P2 — surfaces `ProfileQualityService` results in a rich UI
**Status:** Services exist, no UI
**Effort:** ~1 day after ACT-004

### ACT-016 — Canonical URL Meta + Sitemap.xml
**Priority:** P2 — SEO
**Effort:** ~3 hours

### ACT-017 — Node.js 14 Migration Plan
**Priority:** P2 — EOL runtime (already running)
**Blocker:** `esm` package requires Node 14 for `import` syntax. Plan: migrate to `require()` + remove `esm` dependency → can then upgrade to Node 18 LTS
**Effort:** ~1 day assessment + ~2 days migration

### ACT-018 — Automated Test Suite for Critical Paths
**Priority:** P2 — quality infrastructure
**Scope:** `googleAuthController.js` (10 test cases documented in TEST V5), `GoogleAuthService` (7 cases), `PayMongo webhook` (5 cases), BOLA regression suite
**Effort:** ~3 days

### ACT-019 — Video CV Public Display
**Priority:** P3 — applicant differentiation
**Status:** Upload works, public display incomplete
**Effort:** ~2 days

### ACT-020 — Job Seeker Match Score Wiring
**Priority:** P3 — depends on PROFILE/MATCH commands
**Status:** `JobCompatibilityService` exists, no FE display
**Effort:** ~1 day after PROFILE command

---

## Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Google Auth account-linking | Deferred | Adds complexity; 409 message guides users correctly for now |
| Google One Tap | Deferred (ACT-011) | Requires valid OAuth client first |
| Automatic profile creation on Google auth | Not done | Manual profile completion preserves data quality |
| Admin via Google auth | Never | Security requirement — admin must use email+password |
| requestUri in googleAuthController | Changed to 'https://gethiredonline.app' | Correct for Firebase REST API production use |

---

## PRFAQ Summaries

### PRFAQ-001: Google Sign-In for GetHired
**Press Release:** "GetHired launches one-click Google sign-in — job seekers and employers can now create accounts or sign in with their Google account in under 10 seconds, with automatic role selection through a clear guided screen."
**FAQ 1:** Q: Can admin accounts use Google? A: No — admin access requires email+password for security.
**FAQ 2:** Q: What if my email already exists? A: You'll see a clear message to use your password. Account linking is planned for a future release.
**FAQ 3:** Q: Is my Google data safe? A: GetHired only requests your name and email. We never access Gmail, Drive, or other Google services.

### PRFAQ-002: AI Job Preview Panel
**Press Release:** "Employers get an instant AI-generated preview of their job listing on GetHired's public portal — built from their job description before they even create an account."
**FAQ 1:** Q: Does the preview count as publishing a job? A: No — it's a preview only. Claiming it requires creating an account and going through the standard review flow.

---

## Execution Packs

### Pack A: Google Auth Go-Live (Est. 30 minutes, Paul + developer)
1. Paul: Create new OAuth web client (ACT-001)
2. Developer: Update environment files (ACT-002) + rebuild + deploy
3. Developer: Deploy BE with requestUri fix (ACT-003)
4. Manual QA: Test Google sign-in as new user + existing user on prod
5. Monitor: Check Firebase console for successful auth events

### Pack B: Security Hygiene (Est. 2 hours, developer)
1. CORS allowlist (ACT-007) — 15 min
2. PayMongo webhook sig verification (ACT-006) — 2 hours
3. Easy Job Post rate limit (ACT-012) — 1 hour

### Pack C: Applicant UX Wins (Est. 1 day, developer)
1. Wire ProfileQualityService (ACT-004)
2. Add noindex to role-classification (ACT-008)
3. JobPosting JSON-LD (ACT-005)

---

```
ACTIONS completed: yes
Baseline reports used: SWEEP V5, TEST V5, SECURE V5, STITCH V5, OPTIMIZE V5
Reports created: GETHIRED_ACTIONS_REPORT_RECENT_V5.md
Action items created: 20 (ACT-001 through ACT-020)
Tier 1 critical blockers: 3 (OAuth client, env update, requestUri deploy)
Tier 2 high-value: 9
Tier 3 strategic: 8
Execution packs created: 3 (Go-Live, Security, Applicant UX)
PRFAQs created: 2
Decision log entries: 5
Recommended next actions: Pack A (Google Auth Go-Live) first, then Pack B (Security Hygiene)
Recommended next command: NOTIFY (improve Google auth error messages)
```
