# GETHIRED SWEEP REPORT — Full System (Google Auth OS + All Deployed Features) V5
**Scope:** FE e828f7b / BE 76d757b — Full system including Google Auth OS, AI Job Preview Panel, Easy Job Post Assistant V2, Employer Dashboard Command Center, Job Media V3, Subscription/Dunning, Company Profile Subtabs, Post-Publish Dashboard, Job Strength/Readiness, Federated Search, Invoice Vault, Delete/Update Job hardening, and all previous work.
**Date:** 2026-07-01
**Auditor:** SWEEP V5 — Senior PM + QA Lead + Angular + Express + Security + A11y + Perf + SEO + Brand auditor

---

## Executive Summary

GetHired is a multi-role job platform (Angular 13 FE + Node/Express BE + PostgreSQL + Firebase Auth + PayMongo + SendGrid) deployed on Linode (FE) and GCP App Engine (BE — not currently active, Linode is live BE). The system is feature-rich with a solid security posture. The Google Auth OS just shipped but is experiencing an OAuth client configuration issue (deleted_client error from the Firebase auto-created web client) — this is the #1 live P0 requiring the user to create a fresh OAuth web client in Google Cloud Console.

**Top 10 risks:**
1. **[P0 LIVE]** Google OAuth client `s5mc0m5rd06qdpj3bh1sdrfqessaca8u` returning deleted_client — GIS cannot complete sign-in until user creates a new dedicated OAuth web client in Cloud Console
2. **[P1 OPEN]** PayMongo webhook has no signature verification — any actor can spoof payment success events
3. **[P1 OPEN]** CORS is fully open (`app.use(cors())`) — no origin restriction
4. **[P1 OPEN]** Service-account JSON + SSH keys in git history (known, unfixed) — rotate with git history purge
5. **[P1 OPEN]** Easy Job Post extraction endpoints lack a dedicated per-user rate limit (only generic writeLimiter)
6. **[P1 OPEN]** `requestUri: 'http://localhost'` in `exchangeGoogleTokenForFirebase` — Firebase REST API may reject this in strict mode for non-localhost origins
7. **[P2]** Node.js 14 EOL — pinned for esm compatibility
8. **[P2]** No automated tests for business-critical services (extraction, matching, billing)
9. **[P2]** FE build uses staging config for `build-dev` (`ng build --configuration=staging`) — staging API URL will be baked into the Linode deployment
10. **[P2]** Google Auth rate limit uses in-memory `ipRateCounts` — reset on server restart; PM2 restarts could allow burst auth abuse

**Top 10 must-not-break flows:**
1. Email+password login/signup (all roles — existing Firebase flow)
2. Job seeker application submit (core product value)
3. Video interview answer upload
4. PayMongo subscription/billing (production revenue)
5. Employer job post → publish
6. Recruiter applicant review
7. Google Auth → role classification → session establishment (new, needs OAuth fix)
8. AI Job Preview → claim-preview after signup
9. Easy Job Post extraction → prefill
10. Admin user management

**Top 10 redesign opportunities:**
1. Job detail page — still original design; V6 spec exists but not implemented
2. Applicant profile grading UI — services exist, completely unwired
3. Google One Tap (FedCM) — deferred pending OAuth fix
4. Federated search Phase 2 improvements
5. Messages widget (no `is_read` column, no all-threads endpoint)
6. Mobile filter drawer (search still desktop-optimized)
7. Applicant video CV public display
8. Company public profile completion score
9. Job seeker CV Doctor full wiring
10. SEO structured data (JobPosting schema) — data ready, schema not emitted

**Confidence level:** High for security/code findings. Medium for performance (no Lighthouse run). High for FE/BE contract verification.

---

## §1 Product System Map

### What GetHired Is
A multi-sided hiring platform operating in Southeast Asia (PH primary) connecting:
- **Job Seekers / Applicants** (role 3): browse jobs, upload CV, build profile, answer video interview questions, apply
- **Employers / Recruiters** (role 2): post jobs, invite company users, review applicants, conduct video interviews, manage subscriptions
- **Admins** (role 1): manage users, access admin dashboard

### §1.1 User Roles
| Role | ID | Primary Experience | Auth Method |
|---|---|---|---|
| Anonymous | - | Browse jobs, companies | None |
| Job Seeker | 3 | `/user/*` dashboard, profile, applications | Firebase email+password OR Google Auth |
| Employer/Recruiter | 2 | `/recruiter/*` dashboard, jobs, applicants | Firebase email+password OR Google Auth |
| Admin | 1 | `/admin/*` | Firebase email+password only (no Google Auth) |

### §1.2 Product Value Chain
```
Public discovery (jobs/companies) 
→ Anonymous apply gate (login prompt) 
→ Signup/Login (email+password OR Google) 
→ Role classification (Google new users) 
→ Profile completion (applicant: CV/skills/work-exp/education/certs/video-CV) 
→ AI Job Preview (employer gate) 
→ Job application (with CV/cover letter) 
→ Video interview answers 
→ Recruiter review (pipeline, grading, match) 
→ Subscription/PayMongo billing gate 
→ Interview scheduling
```

---

## §2 Frontend Route Map

| Path | Module | Role | Guard | Risk |
|---|---|---|---|---|
| `/` → `/home` | AppModule redirect | All | None | Low |
| `/home` | PublicModule | All | None | Low |
| `/jobs` | PublicModule | All | None | Critical — must stay login-free |
| `/jobs/:id` | PublicModule | All | None | Critical |
| `/companies` | PublicModule | All | None | Low |
| `/companies/:id` | PublicModule | All | None | Low |
| `/employers` | PublicModule | All | None | Low |
| `/job-seekers` | PublicModule | All | None | Low |
| `/signin` | AuthModule | All | UnauthGuard | Medium |
| `/signup` | AuthModule | All | UnauthGuard | Medium |
| `/auth/choose-role` | AuthModule | Google new users | None (intentional) | High — must guard hasPendingRoleClassification |
| `/reset-password` | AuthModule | All | UnauthGuard | Low |
| `/user/dashboard` | ApplicantModule | Role 3 | AuthGuard+RoleGuard | High |
| `/user/*` | ApplicantModule | Role 3 | AuthGuard+RoleGuard | High |
| `/recruiter/dashboard` | EmployerModule | Role 2 | AuthGuard+RoleGuard | High |
| `/recruiter/*` | EmployerModule | Role 2 | AuthGuard+RoleGuard | High |
| `/admin` | AdminModule | Role 1 | AuthGuard+AdminGuard | Critical |

**Known risks:**
- `/auth/choose-role` has no UnauthGuard intentionally (Google new users are mid-auth), but `RoleClassificationComponent` checks `hasPendingRoleClassification` in-memory — if page refreshed, state lost → redirects to `/signin` ✅
- Guards use localStorage role — UX-only, backend enforces separately ✅
- `returnURL` stored in localStorage during unauthenticated apply attempt — sanitized server-side ✅

---

## §3 Backend API Map

### Google Auth (NEW — this deployment)
| Method | Path | Auth | Risk |
|---|---|---|---|
| POST | `/api/auth/google/firebase-session` | None (IP rate-limited) | High — exchanges Google tokens |
| POST | `/api/auth/choose-role` | None (Firebase token in body, re-verified) | High — creates user accounts |

**Critical finding:** `requestUri: 'http://localhost'` in `exchangeGoogleTokenForFirebase()` — Firebase REST `signInWithIdp` accepts this in dev but may fail in production if Firebase project settings restrict localhost. **Recommend changing to `https://gethiredonline.app`.**

### Auth
| Method | Path | Auth | Risk |
|---|---|---|---|
| POST | `/api/auth/login` | None | High |
| POST | `/api/auth/signup` | None | High |
| POST | `/api/auth/verify-email` | None | Medium |
| POST | `/api/auth/resend-verification` | None | Medium |
| POST | `/api/auth/forgot-password` | None | Medium |

### Public
| Method | Path | Auth | Risk |
|---|---|---|---|
| GET | `/api/jobs` | None | Medium — pagination enforced? |
| GET | `/api/jobs/:id` | None | Medium |
| GET | `/api/companies` | None | Medium |
| GET | `/api/companies/:id` | None | Medium |
| POST | `/api/public/employer/ai-preview-generate` | None (rate-limited) | Medium |

### Applicant (all protected by `verifyAuth`)
| Method | Path | Risk |
|---|---|---|
| GET/PUT | `/api/applicant/profile` | High — owner-scoped |
| POST | `/api/applicant/apply` | High — idempotency? |
| GET/POST | `/api/cv/*` | High — CV data |
| POST | `/api/upload/*` | High — file security |

### Recruiter (protected by `verifyAuth`)
| Method | Path | Risk |
|---|---|---|
| POST/GET/PUT | `/api/recruiter/job-post*` | High — company-scoped BOLA fixed |
| GET | `/api/recruiter/job-post-assistant/claim-preview` | High — single-use token |
| PUT | `/api/recruiter/easy-job-post/*` | High — extraction |
| GET/POST | `/api/company/*` | High — company-scoped |
| GET | `/api/company/dashboard/pipeline-overview` | High — company-scoped |

### Payment/Subscription
| Method | Path | Risk |
|---|---|---|
| POST | `/api/payment/webhook` | **CRITICAL** — no signature verification |
| POST | `/api/subscription/*` | High |

---

## §4 Frontend-to-Backend Contract Map

### §4.1 Google Auth Contracts (NEW)
**FE:** `GoogleAuthService.exchangeGoogleToken(googleIdToken)` → POST `/api/auth/google/firebase-session`
- Request: `{ googleIdToken: string }`
- Response authenticated: `{ success: true, status: 'authenticated', data: SessionShape }`
- Response role_required: `{ success: true, status: 'role_required', firebaseIdToken, googleEmail, googleDisplayName, googlePhotoUrl, inferredFirstName, inferredLastName, refreshToken, expiresInMinutes }`
- Response 409: `{ message: string, errorCode: 'account_exists_different_provider' }` — FE handles this as a distinct error path ✅

**FE:** `GoogleAuthService.submitRoleSelection(selectedRole)` → POST `/api/auth/choose-role`
- Request: `{ firebaseIdToken: string, selectedRole: 'job_seeker' | 'employer' }`
- Response: `{ success: true, status: 'authenticated', roleId: number, data: SessionShape }`

**Contract risks:**
- `sessionData.role` is a number (1/2/3). FE `storeSession()` uses `switch(data.role)` — matches ✅
- `data.token` is Firebase ID token (no `Bearer` prefix from BE). FE adds `Bearer ` prefix when storing — matches ✅
- `data.withCompany` + `data.withActiveSubscription` governs recruiter routing — matches existing `loginUser` shape ✅

### §4.2 Session Shape (shared by email+password and Google auth)
```typescript
{
  id: string,       // Firebase UID
  email: string,
  firstName: string,
  lastName: string,
  role: 1 | 2 | 3,
  photoUrl: string,
  token: string,    // Firebase ID token
  refreshToken: string,
  withCompany: boolean,
  companyName: string,
  companyId: string | null,
  withActiveSubscription: boolean
}
```

---

## §5 Database and Data Model Map

**Schemas:** `gethired`, `jobhunt`, `eucannajobs` (multi-tenant via `env.schema`)

**Key tables (gethired schema):**
- `user_credentials` (uid, email, password, role, created_date)
- `users` (uid, email, firstname, lastname, photo_url)
- `jobs` (job_id, company_id, job_status_id, title, description, salary, location, work_setup, ...)
- `companies` (company_id, name, logo_url, industry, description, ...)
- `job_applicants` (application_id, job_id, applicant_uid, status_id, ...)
- `job_applicant_status` (id, name)
- `subscription_packages`, `subscriptions`, `transactions`
- `interview_templates`, `interview_questions`
- `contacts`, `groups`, `candidates`
- `messages` (message_id, job_id, applicant_uid, sender_uid, body, created_at)
- `ai_job_previews` (token, company_id, job_data JSONB, created_at, claimed_at)

**Google Auth — no new tables needed.** New Google users insert into existing `user_credentials` and `users` tables. The `password` field stores `hashPassword(uid + '_google_provider')` — distinguishable from real passwords, never used for email+password login.

**Risk:** No `provider` column in `user_credentials` — cannot distinguish Google vs. email+password users at DB level. This means the 409 EMAIL_EXISTS path (detected via Firebase REST API, not DB) is the only guard against duplicate accounts. Works correctly currently, but limits future account-linking/provider management.

---

## §6 Public Job Portal Current State

**Status: Ready with caution**

- `/jobs` loads job list anonymously ✅
- Job cards redesigned (PublicJobCardComponent, JobCardComponent with V6 sticky apply panel) ✅
- `PublicJobNormalizerService` normalizes inconsistent BE payloads ✅
- `JobSignalsService` — real signals only, no fake data ✅
- `LockedMatchTeaserComponent` — prompts login with "unlock your match grade" ✅
- Federated search (federated-results-v1) shipped ✅
- Job detail page (V6 with media, sticky apply bar, hiring process timeline) ✅
- Company detail page (subtabs for overview/jobs/benefits/brand) ✅
- AI Job Preview Panel on `/employers` page ✅

**Gaps:**
- No JobPosting structured data (JSON-LD) emitted — data ready, implementation deferred
- No canonical URL meta tags for job detail pages
- Expired job handling redirects work but SEO signals unclear

---

## §7 Applicant Experience Current State

**Status: Ready with caution**

- Dashboard, profile, work experience, education, skills, certs, documents: all functional ✅
- Video CV upload ✅
- Application submit ✅
- `ProfileQualityService`, `DocumentQualityService`, `JobCompatibilityService`, `ApplicationReadinessService`: **exist but UNWIRED into any component** — highest-value applicant UX gap
- CV Doctor / CVCOACH: backend services exist, FE partially built

---

## §8 Recruiter/Employer Current State

**Status: Good**

- Dashboard command center (real company name, action center, KPI, pipeline, needs-review) ✅
- Job create/edit (Easy Job Post Assistant V2, media upload V3, job strength/readiness bar, optional interview questions) ✅
- Post-publish dashboard (applicant pipeline handoff, per-job performance) ✅
- Applicant review, contacts/groups/candidates ✅
- Free-to-paid upgrade flow, subscription dunning ✅
- Delete job with audit logging ✅
- Company profile with subtabs ✅
- Messages (contextual per applicant/application, no inbox) ✅
- AI Job Preview Panel → claim-preview after Google signup ✅

**Gaps:**
- Messages widget on dashboard needs `is_read` column + all-threads endpoint
- Invoice PDF download requires external service

---

## §9 Admin Current State

- Admin panel exists, role-gated ✅
- Basic user management ✅
- No Google Auth path to admin (correct — admin must use email+password only) ✅

---

## §10 Security and Data Safety Review

| ID | Severity | Category | Issue |
|---|---|---|---|
| SEC-001 | **P0 LIVE** | OAuth | Google OAuth client `s5mc0m5rd06qdpj3bh1sdrfqessaca8u` returning `deleted_client` — Google Auth non-functional in production |
| SEC-002 | P0 | Secrets | Service-account JSON + SSH private keys in git history — not yet purged |
| SEC-003 | P1 | Payment | PayMongo webhook: zero signature verification — any attacker can POST fake payment success |
| SEC-004 | P1 | CORS | `app.use(cors())` — no origin restriction — any domain can call the API |
| SEC-005 | P1 | Auth | `requestUri: 'http://localhost'` in `exchangeGoogleTokenForFirebase` — should be production domain |
| SEC-006 | P1 | Rate Limit | Easy Job Post extraction: no per-user rate limit (only general writeLimiter) |
| SEC-007 | P1 | Secrets | Google OAuth client ID in all 3 environment files — current ID may be wrong/deleted |
| SEC-008 | P2 | Runtime | Node.js 14 EOL — production risk for unpatched CVEs |
| SEC-009 | P2 | Rate Limit | Google auth IP rate limit: in-memory only — resets on PM2 restart |
| SEC-010 | P2 | Logging | Console logs emit partial UID/email — acceptable for auth audit trail |
| SEC-011 | P3 | Provider | No `provider` field in `user_credentials` — account-linking limited |
| SEC-012 | P3 | Token | Firebase ID token returned to FE in `role_required` response — required for choose-role flow, acceptable (1hr expiry, re-verified BE-side) |

**Previously fixed (verified):** BOLA on employer routes, SQL injection in 8 controllers, hardcoded invite password, CV/contacts routes now behind `verifyAuth`, upload MIME magic-byte validation, message body length cap.

---

## §11 Build, Deployment, and Configuration Review

**FE:**
- Angular 13 ✅
- `build-dev` = `ng build --configuration=staging` — **staging API URL deployed to Linode production** (known, pre-existing)
- `googleClientId` in `environment.ts`, `environment.prod.ts`, `environment.staging.ts` — all updated to `818317489154-s5mc0m5rd06qdpj3bh1sdrfqessaca8u` in commit `e828f7b` but this client is returning `deleted_client`
- GIS loaded via `<script src="https://accounts.google.com/gsi/client" async defer>` in `index.html` ✅
- `GoogleSigninButtonComponent` declared in `SharedModule` (not `AuthModule`) — correct for cross-module use ✅
- APP_INITIALIZER removed from button (now reads `environment.googleClientId` directly) ✅

**BE:**
- Node.js 14 (pinned for `esm` package) ⚠️
- PM2 on Linode — `ecosystem.config.js` present ✅
- Firebase Admin: `FIREBASE_SERVICE_ACCOUNT_BASE64` env var approach ✅
- `express-rate-limit` package present ✅
- Acorn Node 14 safety: all new BE code verified (no `?.` or `??`) ✅

---

## §12 UI/UX Heuristic Review

| Issue | Severity | Nielsen Heuristic |
|---|---|---|
| Google sign-in popup opens but fails with cryptic OAuth error | Critical | H1 (Visibility of System Status) |
| "Connecting to Google…" spinner shows indefinitely if GIS fails to load | High | H9 (Help users recognize/recover from errors) |
| Role classification page has no back button | Medium | H3 (User Control & Freedom) |
| Video interview empty state: "You haven't answered any questions yet" — no guidance | Medium | H6 (Recognition over Recall) |
| Application status badges: color only, no text label fallback | High | H5 (Error Prevention) + A11y |
| Job card skills truncated at 3 with no "show more" | Low | H8 (Aesthetic & Minimalist Design) |

---

## §13 Accessibility Review

| Issue | Severity | WCAG |
|---|---|---|
| GIS button rendered by Google — accessible internally but `gh-google-btn-row` wrapper needs `role="region"` | Medium | 1.3.1 |
| `RoleClassificationComponent` role cards: ensure radio semantics (`role="radio"` + `aria-checked`) | High | 4.1.2 |
| `app-google-signin-button` error event handler — error text not in `aria-live` region | High | 4.1.3 |
| Clearfix divs: `<div class="clearfix"></div>` — mark `aria-hidden="true"` | Low | 1.3.1 |
| Signin/signup forms already have labels ✅ | - | - |
| Haptics service properly gated behind `navigator.vibrate` ✅ | - | - |

---

## §14 Performance and SEO Review

**Bundle risks:**
- `chart.js`, `jspdf`, `html2canvas`, `dom-to-image`, `exceljs` — all large; lazy-loaded adequately?
- `recordrtc` — should only load on video-recorder routes
- `ngx-org-chart`, `ngx-doc-viewer` — only used in limited employer features

**SEO:**
- `/jobs` page: readable without login ✅
- Job detail: readable without login ✅  
- `<title>` and `<meta description>` set per route? — Unknown (Angular Universal/SSR status unclear)
- JobPosting JSON-LD: data available (`title`, `description`, `hiringOrganization`, `jobLocation`, `datePosted`, `baseSalary`) — **not yet emitted**
- Sitemap: not present
- Canonical URLs: not set per-page

---

## §15 Testing Readiness

| Area | Current Coverage | Risk |
|---|---|---|
| FE unit tests | Jasmine/Karma configured; few meaningful tests | High |
| BE tests | `tests/` folder exists; minimal coverage | High |
| Google Auth BE | Zero tests for `googleAuthController.js` | Critical |
| Google Auth FE | Zero tests for `GoogleAuthService` | High |
| AI Job Preview | Zero tests for claim-preview flow | High |
| Extraction service | Zero tests for `easyJobPostExtractionService.js` | High |
| Payment webhook | No tests for webhook handler | Critical |
| BOLA fixes | Manual verification only | Medium |

---

## §16 Notifications, Errors, and Status Messaging

**Google Auth errors now handled:**
- 429: "Too many sign-in attempts. Please try again in 15 minutes." ✅
- 409: "An account with this email already exists. Please sign in with your email and password..." ✅
- 401: "Your Google session has expired. Please sign in with Google again." ✅
- `deleted_client` (OAuth error): FE shows generic "Google sign-in did not complete. Try again or use email." ⚠️ — too vague, user doesn't know it's a config issue

**Still missing:**
- Backend `helpers/status.js` shared mutable singleton risk (known, pre-existing)
- Raw `"ERROR: " + error` pattern in some older controllers

---

## §17 Brand and Product Positioning Review

**Positioning:** "A guided job-search cockpit that helps job seekers find jobs that fit, improve their profile, prepare documents, answer video questions, and apply with confidence."

**Alignment with current state:**
- Public job portal: good card design, working search/filters, video badge on interview-required jobs ✅
- Guided job-seeker cockpit: partially built (services exist, not wired) ⚠️
- Google sign-in: positions GetHired as modern/trusted (once OAuth issue resolved) ✅
- `/employers` and `/job-seekers` pages: strong visual upgrade shipped ✅

**Brand gaps:**
- "Continue with Google" button uses GIS standard design — brand-consistent enough ✅
- Role classification page: good UX (cards, recommended badge) ✅
- Easy Job Post modal CTA: fixed to coral gradient in V4 ✅

---

## §18 Redesign Readiness Matrix

| Area | Status | Blockers |
|---|---|---|
| Google Auth end-to-end | Needs cleanup first | New OAuth web client required |
| AI Job Preview | Ready | None — deployed and working |
| Easy Job Post V2 | Ready | Rate limit gap (P1) |
| Job Detail V6 | Ready | None — shipped |
| Job card | Ready | None — shipped |
| Federated Search | Ready with caution | Phase 2 improvements deferred |
| Company Profile | Ready | None — shipped |
| Applicant profile grading | Needs cleanup first | Services unwired |
| Video interview differentiator | Needs cleanup first | Video CV public display incomplete |
| JobPosting structured data | Blocked | No implementation yet |
| Messages widget | Blocked | Missing `is_read` column |

---

## §19 Risk Register

| ID | Area | Severity | Issue | Must Fix Before Launch |
|---|---|---|---|---|
| R-001 | Google Auth | P0 | `deleted_client` — OAuth web client invalid | YES |
| R-002 | Google Auth | P1 | `requestUri: 'http://localhost'` — may fail in Firebase strict mode | YES |
| R-003 | Payment | P1 | No webhook signature verification | YES (payment safety) |
| R-004 | CORS | P1 | Wide-open CORS | YES |
| R-005 | Secrets | P0 | Keys in git history | YES (external action) |
| R-006 | Extraction | P1 | No per-user rate limit for CPU-intensive extraction | Yes |
| R-007 | Auth | P1 | Google auth IP rate limit in-memory (resets on restart) | No (acceptable for now) |
| R-008 | Runtime | P2 | Node.js 14 EOL | No (migration needed, not urgent) |
| R-009 | Tests | P2 | Zero automated tests for critical new flows | No (documented) |
| R-010 | Config | P1 | `build-dev` deploys staging API URL to Linode | Investigate |

---

## §20 Opportunity Register

| ID | Opportunity | RICE Priority | Suggested Command |
|---|---|---|---|
| O-001 | Wire ProfileQualityService into applicant dashboard | High | ACTIONS |
| O-002 | JobPosting JSON-LD for /jobs/:id | High | OPTIMIZE/SEO |
| O-003 | Google One Tap after OAuth fix | High | custom impl |
| O-004 | Fix requestUri in googleAuthController | Critical | STITCH |
| O-005 | Create proper OAuth web client | Critical | Manual user action |
| O-006 | Messages widget (is_read column) | Medium | ACTIONS |
| O-007 | Sitemap.xml generation | Medium | OPTIMIZE |
| O-008 | PayMongo webhook signature | Critical | SECURE |
| O-009 | CORS restriction per-domain | High | SECURE |
| O-010 | CV Doctor FE wiring | Medium | PROFILE |

---

## §21 Recommended Next Commands

1. **SECURE** — Fix `requestUri` bug in Google auth, document OAuth client action, PayMongo webhook, CORS
2. **STITCH** — Wire `requestUri` fix, update API contracts for Google Auth OS
3. **TEST** — Add minimal tests for `googleAuthController.js` and `GoogleAuthService`
4. **ACTIONS** — Backlog wire-up of ProfileQualityService + JobPosting schema + messages widget
5. **NOTIFY** — Improve Google auth error messages (too generic on `deleted_client` / popup-dismissed)
6. **BRAND** — Role classification page button/card brand pass
7. **OPTIMIZE** — Bundle risk review (large libraries), Core Web Vitals
8. **PROFILE** — Wire CV Doctor + applicant grading UI
9. **MOBILEVIEW** — Verify Google button + role classification on mobile
10. **SEO** — JobPosting schema + canonical URLs + sitemap

**Recommended FIRST:** Have user create a new dedicated OAuth 2.0 Web Client in Google Cloud Console (Application type: Web application, Origin: `https://gethiredonline.app`) and paste the new Client ID — then update environment files and redeploy.

---

```
SWEEP completed: yes
Report created: GETHIRED_SWEEP_REPORT_RECENT_V5.md
Critical risks found: 2 (P0: deleted_client OAuth, P0: git history secrets)
High risks found: 5 (P1: webhook sig, CORS, requestUri, extraction rate limit, git history)
Public portal readiness: Ready with caution
Applicant redesign readiness: Needs cleanup first (services unwired)
Recommended next command: SECURE (requestUri fix + PayMongo + CORS)

Top 5 immediate concerns:
1. Create new OAuth web client in Cloud Console — Google sign-in non-functional
2. Fix requestUri='http://localhost' → 'https://gethiredonline.app' in googleAuthController.js
3. PayMongo webhook signature verification (P1 payment risk)
4. CORS restriction
5. Git history secrets rotation (external action required from user)

Top 5 best opportunities:
1. Wire ProfileQualityService into applicant dashboard (high user value, services ready)
2. JobPosting JSON-LD (SEO wins, data ready)
3. Google One Tap after OAuth fix (conversion improvement)
4. Messages widget (employer value, known gap)
5. CV Doctor FE wiring (applicant differentiation)
```
