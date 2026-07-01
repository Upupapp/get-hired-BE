# GETHIRED SWEEP REPORT — Full System V6
**Scope:** FE (LinkedIn OIDC + company setup modal + sign-out fix) / BE (LinkedIn OIDC OS + cert/license DTO fix)
**Baseline:** V5 (2026-07-01, FE e828f7b / BE 76d757b)
**Date:** 2026-07-01
**Auditor:** SWEEP V6 — Senior PM + QA Lead + Angular + Express + Security + A11y + Perf + Brand auditor

---

## Executive Summary

This V6 delta covers four shipped items on top of the V5 baseline:

1. **LinkedIn OIDC login/signup** — a full server-side OAuth 2.0 + OIDC flow with stateless JWT state, single-use DB-backed tickets, Firebase custom-token bridging, auto-linking for existing accounts, and a shared `RoleClassificationComponent` now serving both Google and LinkedIn new users. This is architecturally sound and the most significant addition since Google Auth.

2. **Company setup success modal** — a branded 4-CTA modal (`EmployerCompanySetupSuccessModalComponent`) replacing the generic `UpdatedDialogComponent` after a new employer creates their first company. CTAs: Post First Job → `/recruiter/jobs/create`, Complete Profile → `/recruiter/company/settings`, View Public Profile → `/company/:slug` (new tab), Go to Dashboard → `/recruiter/dashboard`.

3. **Sign-out fix** — `employer-panel.component.ts` `logout()` now correctly navigates to `/signin` after `coreService.logout()`. Previously this navigation was missing.

4. **Cert/license API fix** — `job.service.js` `getJobCertificationRequirements()` strips `id` and `canonicalKey` from public DTO, removing internal identifiers from unauthenticated responses.

**V5 P0 status update:**
- SEC-001 (deleted_client Google OAuth) — **unchanged, user action still required** (new OAuth web client in Cloud Console)
- SEC-002 (git history secrets) — **unchanged, external action required**

**Top risks introduced in V6:**
- SEC-013 (P1): `linkedinPendingToken` carries user data in a short-lived JWT passed across BE→FE in the `role_required` response body; the JWT payload is not encrypted — email/name/liSub are readable client-side. Acceptable given 5-min TTL and HTTPS, but documented.
- SEC-014 (P2): `oauth_tickets` table has no scheduled cleanup job — stale rows accumulate unless `createAuthIdentitiesTable.js` cleanup script is re-run manually.
- SEC-015 (P2): LinkedIn `linkedinChooseRole` (`/api/auth/linkedin/choose-role`) has no per-IP or per-token rate limit — relies only on generic `writeLimiter`.
- SEC-016 (P1 design gap): In `linkedinCallback`, when `status = 'role_required'`, no identity row is inserted into `auth_identities` yet. The `linkedinChooseRole` handler tries to re-read from `auth_identities` to recover profile data, but will find nothing (because no row was inserted at callback time for new users). Profile data is recovered from `pendingPayload` fields embedded in the `linkedinPendingToken` JWT, but those fields (`email`, `firstName`, `lastName`, `photoUrl`, `name`) are NOT embedded in `makeTicketJwt()` — only `uid`, `status`, `intent`, `rt`, `rr` are. **This means `linkedinChooseRole` will have empty `email`, `firstName`, etc. for true new users**, falling back to `pendingPayload.email || ''` which will be empty. See §10 for detail.

---

## §1 Product System Map

### §1.1 User Roles (updated)
| Role | ID | Primary Experience | Auth Methods |
|---|---|---|---|
| Anonymous | - | Browse jobs, companies | None |
| Job Seeker | 3 | `/user/*` dashboard, profile, applications | Firebase email+password OR Google OIDC OR **LinkedIn OIDC** |
| Employer/Recruiter | 2 | `/recruiter/*` dashboard, jobs, applicants | Firebase email+password OR Google OIDC OR **LinkedIn OIDC** |
| Admin | 1 | `/admin/*` | Firebase email+password only (no social auth) |

### §1.2 Product Value Chain (updated)
```
Public discovery (jobs/companies)
→ Anonymous apply gate (login prompt)
→ Signup/Login (email+password OR Google OR LinkedIn)
  → [LinkedIn] BE redirect flow → LinkedIn → /linkedin/complete → exchangeTicket
  → [Google] GIS popup → exchangeGoogleToken
→ Role classification (new users without explicit intent — shared component now serves both Google + LinkedIn)
→ [NEW: LinkedIn employer] Company setup success modal (4 CTAs)
→ Profile completion (applicant: CV/skills/work-exp/education/certs/video-CV)
→ AI Job Preview (employer gate)
→ Job application (with CV/cover letter)
→ Video interview answers
→ Recruiter review (pipeline, grading, match)
→ Subscription/PayMongo billing gate
→ Interview scheduling
```

### §1.3 Auth Provider Comparison
| Capability | Email+PW | Google OIDC | LinkedIn OIDC |
|---|---|---|---|
| Flow type | Firebase direct | GIS popup → BE exchange | BE redirect → LinkedIn → BE callback → FE |
| State security | N/A | IP rate limit + JWT | JWT state (HS256, 10-min TTL) |
| Replay prevention | N/A | In-memory (resets on restart) | DB-backed JTI (cross-worker safe) |
| LinkedIn tokens to FE | N/A | N/A | Never — only Firebase ID tokens |
| Account linking | N/A | 409 email check | auth_identities table |
| Role selection | At signup | choose-role page | choose-role page (same component) |
| PKCE | N/A | N/A | Deliberately omitted (confidential client) ✅ |
| New tables needed | None | None | auth_identities, oauth_tickets |

---

## §2 Frontend Route Map (updated)

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
| `/auth/choose-role` → `/choose-role` | AuthModule | Google/LinkedIn new users | None (intentional) | High |
| `/linkedin/complete` | AuthModule | LinkedIn mid-auth | None (intentional) | High — ticket exchange |
| `/reset-password` | AuthModule | All | UnauthGuard | Low |
| `/user/dashboard` | ApplicantModule | Role 3 | AuthGuard+RoleGuard | High |
| `/user/*` | ApplicantModule | Role 3 | AuthGuard+RoleGuard | High |
| `/recruiter/dashboard` | EmployerModule | Role 2 | AuthGuard+RoleGuard | High |
| `/recruiter/*` | EmployerModule | Role 2 | AuthGuard+RoleGuard | High |
| `/admin` | AdminModule | Role 1 | AuthGuard+AdminGuard | Critical |

**Route notes:**
- `/linkedin/complete` — `LinkedInCompleteComponent` reads `?ticket=` or `?error=` from query params. On ticket: calls `POST /api/auth/linkedin/complete`, handles `authenticated` (navigate) or `role_required` (store pending state → navigate to `/choose-role`).
- `/choose-role` — `RoleClassificationComponent` now checks both `googleAuthService.hasPendingRoleClassification` AND `linkedInAuthService.hasPendingRoleClassification`; if neither, redirects to `/signin` ✅.
- The V5 route was documented as `/auth/choose-role` but actual route in `auth.module.ts` is `choose-role` (relative child path), rendering as `/choose-role`. No functional issue; documentation corrected here.

---

## §3 Backend API Map (updated)

### LinkedIn Auth (NEW — V6)
| Method | Path | Auth | Rate Limit | Risk |
|---|---|---|---|---|
| GET | `/api/auth/linkedin/start` | None | Generic globalLimiter | Medium — initiates redirect |
| GET | `/api/auth/linkedin/callback` | None (state JWT verified) | None | **High** — no dedicated rate limit |
| POST | `/api/auth/linkedin/complete` | None (ticket JWT verified) | Generic writeLimiter | High — ticket exchange |
| POST | `/api/auth/linkedin/choose-role` | None (pendingToken JWT) | Generic writeLimiter | **High** — no per-IP limit |
| DELETE | `/api/auth/linkedin/unlink` | verifyFirebaseIdToken | None | Medium |
| GET | `/api/auth/linkedin/link-status` | verifyFirebaseIdToken | None | Low |

**Feature flag:** All 6 endpoints check `LINKEDIN_AUTH_ENABLED === 'true'` first and return `503` if not. This is a clean kill-switch.

### Google Auth (V5 — unchanged)
| Method | Path | Auth | Risk |
|---|---|---|---|
| POST | `/api/auth/google/firebase-session` | None (IP rate-limited) | High |
| POST | `/api/auth/choose-role` | None (Firebase token in body) | High |

### Auth (unchanged)
| Method | Path | Auth | Risk |
|---|---|---|---|
| POST | `/api/auth/login` | None | High |
| POST | `/api/auth/signup` | None | High |
| POST | `/api/auth/verify-email` | None | Medium |
| POST | `/api/auth/resend-verification` | None | Medium |
| POST | `/api/auth/forgot-password` | None | Medium |

### Public, Applicant, Recruiter, Payment (unchanged from V5)
See V5 report §3 for full lists. One update:
- `GET /api/public/job/:id/certification-requirements` — now strips `id` + `canonicalKey` from DTO response ✅

---

## §4 Frontend-to-Backend Contract Map (updated)

### §4.1 LinkedIn Auth Contracts (NEW)

**Flow 1 — Browser redirect (no HTTP call from Angular):**
`LinkedInAuthService.startLinkedInFlow(intent, returnTo)` → `window.location.href = BE /api/auth/linkedin/start?intent=...`
- BE immediately redirects to `https://www.linkedin.com/oauth/v2/authorization`
- LinkedIn redirects to `GET /api/auth/linkedin/callback?code=...&state=...`
- BE redirects to `FE /linkedin/complete?ticket=...` or `?error=...`

**Flow 2 — Ticket exchange:**
`LinkedInCompleteComponent` → POST `/api/auth/linkedin/complete`
- Request: `{ ticket: string }` (ticket JWT from query param)
- Response authenticated: `{ success: true, status: 'authenticated', data: SessionShape }`
- Response role_required: `{ success: true, status: 'role_required', provider: 'linkedin', googleEmail, googleDisplayName, googlePhotoUrl, inferredFirstName, inferredLastName, linkedinPendingToken, returnTo, expiresInMinutes: 55 }`

  **Note:** The `role_required` response reuses Google-shaped field names (`googleEmail`, `googleDisplayName`, `googlePhotoUrl`) for LinkedIn responses. This is a copy/paste artifact from the Google flow — functionally harmless (FE reads them correctly) but naming is misleading.

**Flow 3 — Role selection:**
`LinkedInAuthService.submitRoleSelection(selectedRole)` → POST `/api/auth/linkedin/choose-role`
- Request: `{ linkedinPendingToken: string, selectedRole: 'job_seeker' | 'employer' }`
- Response: `{ success: true, status: 'authenticated', roleId: number, data: SessionShape }`

**Flow 4 — Unlink:**
`LinkedInAuthService.unlinkLinkedIn(token)` → DELETE `/api/auth/linkedin/unlink`
- Header: `Authorization: Bearer <firebaseIdToken>`
- Response: `{ success: true, message: 'LinkedIn account unlinked.' }`

**Flow 5 — Link status:**
`LinkedInAuthService.getLinkStatus(token)` → GET `/api/auth/linkedin/link-status`
- Response linked: `{ linked: true, linkedEmail, linkedName, linkedAt, lastLoginAt }`
- Response not linked: `{ linked: false }`

### §4.2 Session Shape (shared — unchanged from V5)
Same `SessionShape` used by email+password, Google, and LinkedIn auth:
```typescript
{
  id: string,           // Firebase UID (or 'li_<sha256hash>' for LinkedIn users)
  email: string,
  firstName: string,
  lastName: string,
  role: 1 | 2 | 3,
  photoUrl: string,
  token: string,        // Firebase ID token
  refreshToken: string,
  withCompany: boolean,
  companyName: string,
  companyId: string | null,
  withActiveSubscription: boolean
}
```

**LinkedIn UID note:** LinkedIn users get a deterministic pseudo-Firebase UID: `'li_' + sha256('linkedin:' + liSub).substring(0, 28)`. This means Firebase Auth has no record of this user — only Firebase custom tokens are used. Firebase Admin creates a custom token for the UID (no Firebase user record required for `createCustomToken`). This works but means LinkedIn users are invisible in the Firebase console.

### §4.3 Contract Risks
- `role_required` response uses `googleEmail`/`googleDisplayName`/`googlePhotoUrl` field names for LinkedIn data — works but confusing for future maintainers
- `linkedinPendingToken` JWT does NOT embed email/firstName/lastName/photoUrl (only uid/status/intent/rt/rr) — `linkedinChooseRole` handler tries to read these from `pendingPayload.email` etc., which will be empty for true new users (see §10 SEC-016)
- `storeSession()` in `LinkedInAuthService` is a near-identical copy of the same method in `GoogleAuthService` — duplication risk

---

## §5 Database and Data Model Map (updated)

**Schemas:** `gethired`, `jobhunt`, `eucannajobs` (multi-tenant via `env.schema`)

### New tables (V6 — LinkedIn OIDC)

**`gethired.auth_identities`**
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_uid | VARCHAR(255) | FK → user_credentials(uid) ON DELETE CASCADE |
| provider | VARCHAR(50) | 'linkedin' (extensible to 'google', 'apple', etc.) |
| provider_subject | VARCHAR(255) | LinkedIn `sub` claim |
| provider_email | VARCHAR(320) | |
| provider_email_verified | BOOLEAN | |
| provider_name | TEXT | |
| provider_picture | TEXT | |
| provider_locale | VARCHAR(64) | |
| raw_profile | JSONB | Not populated currently |
| linked_at | TIMESTAMPTZ | |
| last_login_at | TIMESTAMPTZ | Updated on each login |
| unlinked_at | TIMESTAMPTZ | Set on soft-unlink (not currently used) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE | (provider, provider_subject) | Prevents duplicate identities |

**`gethired.oauth_tickets`**
| Column | Type | Notes |
|---|---|---|
| jti | VARCHAR(64) PK | 48-char hex random |
| uid | VARCHAR(255) | Firebase UID or 'pending:linkedin:<liSub>' |
| data | JSONB | Full ticketData (email, names, status, etc.) |
| expires_at | TIMESTAMPTZ | 5 min TTL |
| used_at | TIMESTAMPTZ | NULL = unused; NOT NULL = consumed (single-use) |

**Design notes:**
- `oauth_tickets.uid` has no FK constraint (intentional — `pending:linkedin:*` UIDs don't exist in user_credentials yet)
- No index on `oauth_tickets.expires_at` — cleanup and expiry queries will do seq scans on large tables
- `auth_identities.unlinked_at` column exists but soft-unlink is not implemented — `linkedinUnlink` hard-DELETEs the row
- No scheduled job to purge expired `oauth_tickets` rows — manual re-run of `createAuthIdentitiesTable.js` required

### Existing tables (unchanged from V5)
`user_credentials`, `users`, `jobs`, `companies`, `job_applicants`, `job_applicant_status`, `subscription_packages`, `subscriptions`, `transactions`, `interview_templates`, `interview_questions`, `contacts`, `groups`, `candidates`, `messages`, `ai_job_previews`

**Still true from V5:** No `provider` column in `user_credentials` — provider is now tracked via `auth_identities` for LinkedIn users, but Google users still have no provider marker (by design — 409 email check handles duplicates).

---

## §6 Public Job Portal Current State

**Status: Ready with caution — unchanged from V5**

- `/jobs` loads job list anonymously ✅
- Job cards redesigned (V6 sticky apply panel, media V3) ✅
- `PublicJobNormalizerService` normalizes BE payloads ✅
- `JobSignalsService` — real signals only ✅
- Federated search (federated-results-v1) ✅
- Job detail page (V6 with media, sticky apply bar, hiring process timeline) ✅
- Company detail page (subtabs) ✅
- AI Job Preview Panel on `/employers` ✅
- Cert/license public DTO now strips `id` + `canonicalKey` ✅ (V6 fix)

**Gaps (unchanged from V5):**
- No JobPosting JSON-LD structured data
- No canonical URL meta tags per job detail page
- No sitemap

---

## §7 Applicant Experience Current State

**Status: Ready with caution — unchanged from V5**

- Dashboard, profile, work experience, education, skills, certs, documents: functional ✅
- Video CV upload ✅
- Application submit ✅
- LinkedIn login now available as a third path to applicant onboarding ✅ (V6)
- `ProfileQualityService`, `DocumentQualityService`, `JobCompatibilityService`, `ApplicationReadinessService`: **still unwired** — highest-value applicant UX gap (unchanged)
- CV Doctor / CVCOACH: backend services exist, FE partially built (unchanged)

---

## §8 Recruiter/Employer Current State

**Status: Good — improved in V6**

- Dashboard command center (real company name, action center, KPI, pipeline, needs-review) ✅
- Job create/edit (Easy Job Post Assistant V2, media upload V3, job strength/readiness bar) ✅
- Post-publish dashboard ✅
- Applicant review, contacts/groups/candidates ✅
- Subscription dunning ✅
- **[V6 NEW]** Company setup success modal — `EmployerCompanySetupSuccessModalComponent` opens after `promptCreateCompany()` dialog closes with result `1`. Shows:
  - Company name + "Your company is live" headline
  - 4-item checklist: "Company created ✓", "Free trial activated — 7 days full access ✓", "Post your first job ○", "Complete company profile ○"
  - Profile completeness badge (computed from 8 fields: name, email, logo, details, industry, work setup, headcount, address)
  - 4 CTAs: Post First Job → `/recruiter/jobs/create`, Complete Profile → `/recruiter/company/settings`, View Public Profile → `/company/:slug` (new tab, `noopener`), Go to Dashboard → `/recruiter/dashboard`
  - `sessionStorage.setItem('gh_company_setup_success_seen', '1')` set on open (for "don't show again" logic — though re-show suppression is not implemented in the component; the key is set but never read back to suppress)
  - Modal width: 520px, maxWidth: 96vw, `panelClass: 'gh-setup-success-dialog'`
- **[V6 NEW]** Sign-out fix: `logout()` → `this.coreService.logout(); this.router.navigate(['/signin'])` ✅ — previous version was missing the navigate call
- LinkedIn login available as a third employer onboarding path ✅
- Messages widget (dashboard): still needs `is_read` column + all-threads endpoint (unchanged)

---

## §9 Admin Current State

**Status: unchanged from V5**

- Admin panel exists, role-gated ✅
- Basic user management ✅
- No Google Auth or LinkedIn Auth path to admin (correct) ✅

---

## §10 Security and Data Safety Review

**All V5 findings carried forward.** New V6 findings:

| ID | Severity | Category | Issue |
|---|---|---|---|
| SEC-001 | **P0 LIVE** | OAuth | Google OAuth client returning `deleted_client` — Google Auth still non-functional in production. **Unchanged — user action required.** |
| SEC-002 | P0 | Secrets | Service-account JSON + SSH keys in git history — not yet purged. **Unchanged.** |
| SEC-003 | P1 | Payment | PayMongo webhook: no signature verification. **Unchanged.** |
| SEC-004 | P1 | CORS | `app.use(cors())` — no origin restriction. **Unchanged.** |
| SEC-005 | P1 | Auth | `requestUri: 'http://localhost'` in `exchangeGoogleTokenForFirebase`. **Unchanged.** |
| SEC-006 | P1 | Rate Limit | Easy Job Post extraction: no per-user rate limit. **Unchanged.** |
| SEC-007 | P1 | Secrets | Google OAuth client ID in all 3 FE environment files may be stale. **Unchanged.** |
| SEC-008 | P2 | Runtime | Node.js 14 EOL. **Unchanged.** |
| SEC-009 | P2 | Rate Limit | Google auth IP rate limit: in-memory only (resets on PM2 restart). **Unchanged.** |
| SEC-010 | P2 | Logging | Console logs emit partial UID/email. **Unchanged.** |
| SEC-011 | P3 | Provider | No `provider` column in `user_credentials` for Google users (LinkedIn uses auth_identities). **Unchanged.** |
| SEC-012 | P3 | Token | Firebase ID token in Google `role_required` response body. **Unchanged.** |
| **SEC-013** | **P1** | Token | `role_required` LinkedIn response includes `linkedinPendingToken` — a JWT signed but NOT encrypted. JWT payload carries `uid` (which includes `liSub`), `status`, `intent`, `rt`, `rr`. Email/names are NOT in this token (see SEC-016), so exposure is limited to the LinkedIn sub hash. Acceptable given 5-min TTL + HTTPS, but JWTs are base64 and readable client-side. |
| **SEC-014** | **P2** | Database | `oauth_tickets` table has no scheduled purge job. Expired rows accumulate until `createAuthIdentitiesTable.js` cleanup snippet is manually re-run. Recommend a cron or PostgreSQL scheduled job: `DELETE FROM oauth_tickets WHERE expires_at < NOW() - INTERVAL '1 hour'`. |
| **SEC-015** | **P2** | Rate Limit | `/api/auth/linkedin/callback` has no dedicated rate limit (only implicit global limit). A malformed `state` flood would repeatedly hit `verifyLinkedinState()` and return `invalid_state` redirects, but no active throttle. `/api/auth/linkedin/choose-role` is limited only by generic `writeLimiter`. |
| **SEC-016** | **P1** | Auth Bug | **Data recovery gap in `linkedinChooseRole`:** When a new LinkedIn user goes through `role_required` (no explicit intent), `linkedinCallback` stores the one-time ticket in `oauth_tickets` with full `ticketData` (email, names, liSub, etc.) and redirects. `linkedinComplete` reads and CONSUMES that ticket (marks `used_at`). It returns a `linkedinPendingToken` (new `makeTicketJwt`) containing only: `uid='pending:linkedin:<liSub>'`, `status`, `intent`, `rt`, `rr`. When `linkedinChooseRole` receives this token, it tries to recover profile data via: (1) re-reading `auth_identities` — but no row exists yet for a true new user; (2) reading `pendingPayload.email`, `.firstName`, etc. — but these fields are NOT set by `makeTicketJwt`. Result: `email` will be `''`, triggering the guard `if (!email) return res.status(400).json({ message: 'LinkedIn session data is incomplete...' })`. **This means LinkedIn new users who see the role picker CANNOT complete sign-up.** This is a P1 flow-blocking bug. Fix: embed email/firstName/lastName/liSub in the `linkedinPendingToken` payload (or store a second ticket in `oauth_tickets` for the pending state). |
| **SEC-017** | **P3** | UX/Security | `viewPublicProfile()` in the setup success modal opens `/company/:slug` with `window.open(..., 'noopener')` — correct (no `opener` access). ✅ |
| **SEC-018** | **P2** | Auth | LinkedIn UIDs are deterministic (`li_` + sha256 prefix). If an attacker learns a LinkedIn sub (possible via LinkedIn API), they can predict the GetHired UID. Low risk in practice (UID is not a secret in the app), but documented. |

**Positive security notes for LinkedIn OS:**
- Client secret never leaves the server ✅
- No LinkedIn access/refresh tokens returned to FE ✅
- PKCE omitted correctly — LinkedIn confidential clients use `client_secret` for token exchange; including `code_verifier` causes `invalid_client` error ✅
- State is a signed JWT with 10-min TTL — cross-worker safe (no shared memory needed) ✅
- Ticket is single-use (DB UPDATE with `used_at IS NULL` guard) — cross-worker safe ✅
- Nonce in state JWT for ID token replay protection ✅
- `sanitizeReturn()` ensures `returnTo` is a path-only string (no `//` open redirect, no `<>"'` XSS, max 256 chars) ✅
- Email must be verified by LinkedIn (`email_verified` claim checked) ✅
- Issuer, audience, expiry, and nonce all validated on ID token (decode-only, not full sig check; authoritative identity from userinfo call is the real source of truth) ✅

---

## §11 Build, Deployment, and Configuration Review

**FE (unchanged from V5 plus):**
- Angular 13 ✅
- `build-dev` = `ng build --configuration=staging` — staging API URL deployed to Linode (known, pre-existing)
- Google client ID in all 3 environment files (`environment.ts`, `.prod.ts`, `.staging.ts`) — still the deleted client
- `LinkedInButtonComponent` declared in `AuthModule`, used in `signin`, `signup` (not in `SharedModule` — only visible in auth flows)
- `LinkedInCompleteComponent` declared in `AuthModule` with its own route ✅
- No `LINKEDIN_AUTH_ENABLED` environment variable equivalent in FE env files — button renders regardless; if BE returns 503, user sees "LinkedIn sign-in is not currently available." error on `/linkedin/complete`
- New `auth.module.ts` imports `LinkedInCompleteComponent` and `RoleClassificationComponent` ✅

**BE (unchanged from V5 plus):**
- Node.js 14 (pinned) ⚠️
- PM2 on Linode ✅
- New env vars required for LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_AUTH_ENABLED=true`, optionally `LINKEDIN_AUTHORIZATION_ENDPOINT`, `LINKEDIN_TOKEN_ENDPOINT`, `LINKEDIN_USERINFO_ENDPOINT`
- `env.app_url` must be set to `https://gethiredonline.app` for BE→FE redirects in LinkedIn flow
- `linkedinAuthRoutes.js` must be mounted in `server.js` — **not verified in this audit; confirm `server.js` mounts the router**
- Firebase API key (`env.apiKey`) required for `customTokenToIdToken()` — same key as used by Google flow

---

## §12 UI/UX Heuristic Review (updated)

**V5 issues unchanged:**
- Google sign-in popup fails with cryptic OAuth error (Critical — unresolved)
- "Connecting to Google…" spinner shows indefinitely if GIS fails (High)
- Role classification: no back button (Medium) — now affects both Google and LinkedIn new users

**V6 changes:**
| Issue | Severity | Nielsen Heuristic |
|---|---|---|
| Company setup success modal — branded, actionable, 4 CTAs | **Improvement** ✅ | H1 (Visibility of System Status), H6 (Recognition over Recall) |
| Modal checklist hardcoded (items 3-4 always show as incomplete regardless of actual state) | Low | H1 (Visibility of System Status) |
| `gh_company_setup_success_seen` set in sessionStorage but never read back — modal could re-open on page refresh + revisit | Low | H5 (Error Prevention) |
| Sign-out now navigates to `/signin` | **Fix** ✅ | H3 (User Control & Freedom) |
| `LinkedInButtonComponent` has no loading state — button remains clickable during redirect | Low | H1 (Visibility of System Status) |
| `linkedin-complete` shows error messages in plain text with a "Try again" button (goes to `/signin`) | Acceptable | H9 |
| LinkedIn button label defaults to "Continue with LinkedIn" — clear ✅ | - | - |
| `viewPublicProfile()` opens new tab only if `companySlug` is set — silent failure if slug empty | Medium | H9 |

---

## §13 Accessibility Review (updated)

**V5 issues unchanged** (GIS button wrapper, role classification radio semantics, aria-live for Google error events).

**V6 additions:**
| Issue | Severity | WCAG |
|---|---|---|
| `LinkedInButtonComponent` — `[attr.aria-label]="label"` on button ✅ | - | 4.1.2 |
| LinkedIn SVG icon has `aria-hidden="true"` ✅ | - | 1.1.1 |
| `linkedin-complete` loading/error states need `role="status"` or `aria-live="polite"` for screen readers | Medium | 4.1.3 |
| Company setup success modal — checklist items should use `role="list"` + `role="listitem"` for semantic structure | Low | 1.3.1 |
| Modal CTAs are buttons with descriptive labels ✅ | - | 2.4.6 |
| Focus not explicitly trapped in setup success modal (relies on Angular Material dialog default focus trap) | Low | 2.4.3 |
| `RoleClassificationComponent` now handles both Google + LinkedIn — a11y issues (radio semantics) documented in V5 still apply | High | 4.1.2 |

---

## §14 Performance and SEO Review

**Unchanged from V5.** LinkedIn OIDC adds no new FE bundle weight beyond:
- `linkedin-auth.service.ts` (small, no third-party SDK)
- `linkedin-button.component.ts` (trivial)
- `linkedin-complete.component.ts` (trivial)

No GIS SDK equivalent for LinkedIn — LinkedIn auth uses a full-page redirect, not a popup. This is actually better for mobile performance than a popup flow.

BE performance impact: LinkedIn callback makes 2 external HTTP calls (token exchange + userinfo fetch) in sequence — worst case ~2-3s. No caching; acceptable for auth flows.

**SEO gaps unchanged from V5:**
- No JobPosting JSON-LD on `/jobs/:id`
- No canonical URLs per job detail
- No sitemap

---

## §15 Testing Readiness (updated)

| Area | Current Coverage | Risk |
|---|---|---|
| FE unit tests | Jasmine/Karma configured; few meaningful tests | High |
| BE tests | `tests/` folder; minimal coverage | High |
| Google Auth BE | Zero tests | Critical |
| Google Auth FE | Zero tests | High |
| **LinkedIn Auth BE** | **Zero tests** | **Critical** |
| **LinkedIn Auth FE** | **Zero tests** | **High** |
| AI Job Preview | Zero tests | High |
| Extraction service | Zero tests | High |
| Payment webhook | No tests | Critical |
| BOLA fixes | Manual verification only | Medium |
| **Setup success modal** | **Zero tests** | **Low** |
| **SEC-016 (linkedinChooseRole data gap)** | **Not caught by any test** | **Critical** |

**Priority test additions:**
1. `linkedinAuthController.js` — specifically `linkedinChooseRole` with a true new user (no `auth_identities` row) to surface SEC-016
2. `linkedinCallback` → full round-trip with mocked LinkedIn API
3. `LinkedInAuthService.handleCompleteResponse()` — authenticated and role_required branches
4. `LinkedInCompleteComponent` — error code rendering

---

## §16 Notifications, Errors, and Status Messaging (updated)

**V5 errors unchanged** (Google: 429, 409, 401, deleted_client).

**LinkedIn errors — V6 additions:**
| Error Code | User-Facing Message | Trigger |
|---|---|---|
| `not_enabled` | "LinkedIn sign-in is not currently available." | `LINKEDIN_AUTH_ENABLED !== 'true'` |
| `linkedin_denied` | "You cancelled the LinkedIn sign-in." | User cancels on LinkedIn |
| `missing_params` | "The sign-in link is incomplete. Please try again." | Missing `code` or `state` |
| `invalid_state` | "The sign-in request expired or is invalid. Please try again." | JWT expired or tampered |
| `no_access_token` | "LinkedIn did not return an access token. Please try again." | Token exchange failure |
| `invalid_issuer` | "LinkedIn token validation failed." | ID token issuer wrong |
| `invalid_audience` | "LinkedIn token validation failed." | ID token aud wrong |
| `token_expired` | "The LinkedIn sign-in timed out. Please try again." | ID token expired |
| `invalid_nonce` | "LinkedIn token replay detected. Please try again." | Nonce mismatch |
| `missing_sub` | "LinkedIn did not return a user ID." | No `sub` in userinfo |
| `missing_email` | "Your LinkedIn account must have a verified email address." | No `email` in userinfo |
| `email_not_verified` | "Please verify your LinkedIn email address first." | `email_verified` false |
| `server_error` | "Something went wrong on our end. Please try again." | Catch-all |
| `missing_ticket` | "The sign-in link is missing a ticket. Please try again." | No `?ticket=` param |
| `invalid_ticket` | "The sign-in link is expired or already used. Please try again." | JTI already consumed |

**Quality assessment:** LinkedIn error messages are specific and user-actionable — significantly better than the V5 Google error messages. The catch-all `server_error` on callback is appropriate (avoids leaking internal error detail). ✅

**Gap:** `linkedinChooseRole` error when email is empty (SEC-016) returns "LinkedIn session data is incomplete. Please sign in with LinkedIn again." — acceptable message for the user, but the underlying bug means this will trigger for ALL new users going through the role picker.

---

## §17 Brand and Positioning Review (updated)

**V5 positioning unchanged:** "A guided job-search cockpit that helps job seekers find jobs that fit, improve their profile, prepare documents, answer video questions, and apply with confidence."

**V6 brand additions:**
- LinkedIn button — branded `#0A66C2` blue fill, white LinkedIn SVG icon, no third-party markup ✅ (compare: Google uses GIS SDK button)
- Company setup success modal — branded (branded headline, checklist with ticks, 4 distinct CTAs) — significant improvement over the generic `UpdatedDialogComponent` (which was a plain Material dialog with just a message)
- "Free trial activated — 7 days full access" copy in modal establishes value immediately ✅
- Modal headline opportunity: current template not audited (`.html` file not read), but the TypeScript sets `companyName` for the headline

---

## §18 Redesign Readiness Matrix (updated)

| Area | Status | Blockers |
|---|---|---|
| Google Auth end-to-end | Needs cleanup first | New OAuth web client required (P0) |
| **LinkedIn Auth end-to-end** | **Needs bug fix first** | **SEC-016: linkedinChooseRole new-user data gap (P1)** |
| AI Job Preview | Ready | None |
| Easy Job Post V2 | Ready | Rate limit gap (P1) |
| Job Detail V6 | Ready | None |
| Job card | Ready | None |
| Federated Search | Ready with caution | Phase 2 improvements deferred |
| Company Profile | Ready | None |
| **Company setup success modal** | **Ready** | None ✅ |
| Applicant profile grading | Needs cleanup first | Services unwired |
| Video interview differentiator | Needs cleanup first | Video CV public display incomplete |
| JobPosting structured data | Blocked | No implementation |
| Messages widget | Blocked | Missing `is_read` column |

---

## §19 Risk Register (updated)

| ID | Area | Severity | Issue | Must Fix Before Launch |
|---|---|---|---|---|
| R-001 | Google Auth | P0 | `deleted_client` — Google OAuth client invalid | YES |
| R-002 | Google Auth | P1 | `requestUri: 'http://localhost'` in googleAuthController | YES |
| R-003 | Payment | P1 | No PayMongo webhook signature verification | YES |
| R-004 | CORS | P1 | Wide-open `app.use(cors())` | YES |
| R-005 | Secrets | P0 | Service-account JSON + SSH keys in git history | YES (external) |
| R-006 | Extraction | P1 | No per-user rate limit for AI extraction | Yes |
| R-007 | Auth | P2 | Google auth IP rate limit in-memory only | No |
| R-008 | Runtime | P2 | Node.js 14 EOL | No |
| R-009 | Tests | P2 | Zero automated tests for critical auth flows | No |
| R-010 | Config | P1 | `build-dev` deploys staging API URL to Linode | Investigate |
| **R-011** | **LinkedIn Auth** | **P1** | **SEC-016: `linkedinChooseRole` cannot complete sign-up for new users who see the role picker — email is empty** | **YES before enabling LinkedIn** |
| **R-012** | **LinkedIn Auth** | **P2** | `oauth_tickets` no scheduled purge | No (manual cleanup acceptable short-term) |
| **R-013** | **LinkedIn Auth** | **P2** | No dedicated rate limit on `/linkedin/callback` and `/linkedin/choose-role` | No |
| **R-014** | **LinkedIn Auth** | **P2** | `LINKEDIN_REDIRECT_URI` must exactly match the registered LinkedIn app redirect URI — misconfiguration gives a hard-to-debug `invalid_redirect_uri` error from LinkedIn | Verify before enabling |
| **R-015** | **LinkedIn Auth** | **P3** | LinkedIn button has no FE feature flag — renders even when `LINKEDIN_AUTH_ENABLED=false` on BE | Low (graceful 503 error on /linkedin/complete) |

---

## §20 Opportunity Register (updated)

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
| **O-011** | **Fix SEC-016 (linkedinChooseRole new-user data gap)** | **Critical** | **STITCH or manual fix** |
| **O-012** | **Add `oauth_tickets` index on `expires_at`** | **Low** | **STITCH** |
| **O-013** | **Add scheduled `oauth_tickets` purge (cron or pg_cron)** | **Medium** | **STITCH** |
| **O-014** | **Unify `storeSession()` into shared auth utility** (currently duplicated in GoogleAuthService and LinkedInAuthService) | **Low** | **SIMPLIFY** |
| **O-015** | **Add FE feature flag for LinkedIn button** (check env var or BE health endpoint before rendering button) | **Low** | **ACTIONS** |
| **O-016** | **Suppress company setup modal on revisit** (read `gh_company_setup_success_seen` from sessionStorage before opening) | **Low** | **ACTIONS** |
| **O-017** | **`viewPublicProfile()` — handle empty slug gracefully** (disable or hide button if `companySlug` is unset) | **Low** | **ACTIONS** |

---

## §21 Recommended Next Commands

1. **[URGENT — before enabling LinkedIn auth] Manual fix for SEC-016** — Embed `email`, `firstName`, `lastName`, `liSub` in the `linkedinPendingToken` payload passed to `linkedinChooseRole`, or store a second `oauth_tickets` entry. Without this, all new LinkedIn users who see the role picker cannot complete sign-up.

2. **SECURE** — Fix `requestUri: 'http://localhost'` in `googleAuthController.js`, PayMongo webhook signature, CORS domain restriction, add `/linkedin/callback` rate limit.

3. **STITCH** — Wire `oauth_tickets` purge job, add `expires_at` index, verify `linkedinAuthRoutes.js` is mounted in `server.js`, verify `LINKEDIN_REDIRECT_URI` matches LinkedIn app config, unify `storeSession()`.

4. **TEST** — Add tests for `linkedinAuthController.js` (especially `linkedinChooseRole` new-user path), `LinkedInAuthService`, and `LinkedInCompleteComponent`.

5. **ACTIONS** — Wire ProfileQualityService into applicant dashboard, fix setup modal slug guard, add `gh_company_setup_success_seen` suppression.

6. **NOTIFY** — Review LinkedIn error messages on `/linkedin/complete` for tone and brand consistency.

7. **MOBILEVIEW** — Verify LinkedIn button + `/linkedin/complete` on mobile (full-page redirect is generally better than popup on mobile, so this should be strong).

8. **OPTIMIZE** — Bundle review, Core Web Vitals, JobPosting JSON-LD.

9. **PROFILE** — Wire CV Doctor + applicant grading UI.

10. **SEO** — JobPosting schema + canonical URLs + sitemap.

**Enable LinkedIn Auth sequence:**
1. Fix SEC-016 (linkedinChooseRole data gap)
2. Verify `server.js` mounts `linkedinAuthRoutes`
3. Set `LINKEDIN_AUTH_ENABLED=true`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `env.app_url=https://gethiredonline.app` in production env
4. Verify LinkedIn app redirect URI matches exactly
5. Run `createAuthIdentitiesTable.js` once on production DB
6. Test full flow: existing user, new user with intent, new user without intent (role picker)

---

```
SWEEP V6 completed: yes
Report created: GETHIRED_SWEEP_REPORT_V6.md
Critical risks found: 3 (P0: deleted_client Google OAuth, P0: git history secrets, P1: LinkedIn new-user role picker data gap — SEC-016/R-011)
High risks found: 6 (P1: PayMongo webhook sig, CORS, requestUri localhost, extraction rate limit, linkedin/choose-role bug, build-dev staging URL)
New items vs V5: LinkedIn OIDC auth system (6 BE endpoints, 3 FE components, 2 DB tables, shared role picker); company setup success modal (4 CTAs); sign-out navigate fix; cert/license DTO strip
Public portal readiness: Ready with caution (unchanged from V5)
Recommended next command: Fix SEC-016 (manual) → SECURE → STITCH → TEST

Top 5 immediate concerns:
1. SEC-016/R-011 — LinkedIn new users who hit the role picker CANNOT complete sign-up (linkedinChooseRole email is empty) — fix before enabling LinkedIn auth
2. SEC-001/R-001 — Google OAuth client still returning deleted_client — Google sign-in non-functional (user must create new OAuth web client in Cloud Console)
3. R-003 — PayMongo webhook has no signature verification — payment spoofing risk
4. R-002/SEC-005 — requestUri='http://localhost' in googleAuthController.js
5. R-005/SEC-002 — Git history secrets still need purge/rotation

Top 5 best opportunities:
1. Fix SEC-016 → enabling LinkedIn auth unlocks a 3rd acquisition channel with strong trust signal
2. Wire ProfileQualityService into applicant dashboard — services ready, high user value
3. Fix Google OAuth client + requestUri → Google Auth OS fully operational
4. JobPosting JSON-LD on /jobs/:id — SEO wins, data is already available
5. Company setup success modal is live and well-built — drive post-setup activation with an email trigger (Welcome email already sent, modal now reinforces the CTAs)
```
