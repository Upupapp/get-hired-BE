# GetHired TEST COVERAGE MATRIX — QA Cycle 11

**Date:** 2026-06-25

Legend: PASS / FAIL / WARN / SKIP / GAP

---

## Rate Limiting (RL-01)

| Test Case | Result | Notes |
|-----------|--------|-------|
| writeLimiter skip: GET returns true | PASS | |
| writeLimiter skip: HEAD returns true | PASS | |
| writeLimiter skip: OPTIONS returns true | PASS | |
| writeLimiter skip: POST returns false | PASS | |
| writeLimiter skip: PUT returns false | PASS | |
| writeLimiter skip: DELETE returns false | PASS | |
| writeLimiter skip: PATCH returns false | PASS | |
| Tier ordering: global < auth < write < sensitive < routes | PASS | Verified by character position in server.js |
| standardHeaders: true on all 4 limiters | PASS | 4/4 found |
| legacyHeaders: false on all 4 limiters | PASS | 4/4 found |
| express-rate-limit v6 named export { rateLimit } | PASS | exports.rateLimit present in dist/index.cjs |
| trust proxy enabled (needed for Linode) | PASS | app.enable("trust proxy") present |
| Tier 1 (global): 500/15min | PASS | Verified in source |
| Tier 2 (auth): 20/15min | PASS | Verified in source |
| Tier 3 (write): 100/15min, skip GET/HEAD/OPTIONS | PASS | Verified in source |
| Tier 4 (sensitive): 10/hr on changepassword/getpwresetlink/archive | PASS | Verified in source |
| Rate limit messages are JSON shape | PASS | `{ message: "..." }` format |
| Tier overlap analysis: /api/auth POST hits auth+write | PASS | Intentional defense-in-depth; auth tier is binding |
| GET /api/interview/hub hits global only | PASS | Correct (read, no auth tier) |
| POST /api/auth/changepassword hits all 4 tiers | PASS | Most restrictive (10/hr) is binding |
| Live rate limit response test (requires running server) | SKIP | No safe test environment |

---

## Interview Hub Backend (HUB-01)

| Test Case | Result | Notes |
|-----------|--------|-------|
| Route: GET /api/interview/hub exists | PASS | routes/interviewRoute.js line 30 |
| Route: verifyAuth middleware present | PASS | `router.get("/interview/hub", verifyAuth, getInterviewHub)` |
| Auth: companyId from JWT (getUserCompany) not query param | PASS | `req.user.uid` only |
| BOLA: caller company check before data access | PASS | getUserCompany returns null → 403 |
| Array/null guard on callerCompany | PASS | `Array.isArray(callerCompany) \|\| !callerCompany` |
| SQL: LEFT JOIN on job_applicant_status | PASS | 4 LEFT JOINs total |
| SQL: COALESCE(va.video_answer_count, 0) | PASS | Null-safe aggregate |
| SQL: LIMIT 200 (DoS protection) | PASS | |
| SQL: is_archived exclusion | PASS | `AND ja.is_archived IS DISTINCT FROM true` |
| SQL: parameterized query (no injection) | PASS | `[companyId]` as $1 |
| Response shape: {items[], total} | PASS | `res.json({ items, total: items.length })` |
| videoAnswerCount: parseInt with fallback 0 | PASS | |
| hasVideoAnswers: parseInt > 0 | PASS | |
| applicantName: firstName+lastName, fallback email, fallback null | PASS | |
| applicationStatus: fallback 'Unknown' | PASS | |
| Error handler: 500 JSON response | PASS | `{ message: 'Something went wrong...' }` |
| SQL execution test (requires DB) | SKIP | No safe test DB |

---

## Interview Hub Frontend (HUB-02)

| Test Case | Result | Notes |
|-----------|--------|-------|
| Component: RecruiterInterviewHubComponent exists | PASS | 4 files in recruiter-interview-hub/ |
| Service: RecruiterInterviewHubService providedIn root | PASS | |
| Service: calls GET /api/interview/hub | PASS | `${this.apiUrl}/interview/hub` |
| Service: auth via HTTP interceptor (Bearer token) | PASS | AuthInterceptor applies globally; token stored with 'Bearer ' prefix |
| Routing: /recruiter/interview → RecruiterInterviewHubComponent | PASS | Via EmployerInterviewModule lazy load |
| OnDestroy: subscription unsubscribed | PASS | `if (this.sub) this.sub.unsubscribe()` |
| Error state: retry button present | PASS | |
| Empty state: 2 action buttons | PASS | |
| Loading: skeleton with aria-busy | PASS | |
| Filters: all / has-video / review-stage | PASS | |
| getFilteredItems: has-video filter | PASS | `i.hasVideoAnswers` |
| getFilteredItems: review-stage hardcoded status 3 | WARN | Magic number — fragile if status IDs change |
| getDisplayName: triple fallback | PASS | `applicantName \|\| applicantEmail \|\| 'Applicant'` |
| trackBy on ngFor | PASS | `trackByApplicationId` |
| Emoji: aria-hidden on decorative icons | PASS | All 3 emoji instances wrapped |
| aria-label on card list | PASS | |
| role=alert on error | PASS | |
| videoAnswerCount badge: aria-label on parent span | PASS | |
| Build: no compile errors | PASS | Production build succeeded |
| ih-status--{{applicationStatusId}} class binding | WARN | CSS class depends on numeric status ID — brittle |

---

## Message Enrichment (MSG-01)

| Test Case | Result | Notes |
|-----------|--------|-------|
| listRecruiterThreads: JOINs gethired.users on uid | PASS | `LEFT JOIN ... users u ON u.uid = mt.applicant_uid` |
| applicantFirstName + applicantLastName aliased | PASS | |
| applicantPhotoUrl aliased from u.photo_url | PASS | |
| applicantName built as firstName+lastName trim | PASS | |
| applicantName falls back to email when name null | PASS | |
| applicantName falls back to null when email null | PASS | |
| applicantPhotoUrl: null coalesce | PASS | `row.applicantPhotoUrl \|\| null` |
| snippet capped at 120 chars | PASS | `.slice(0, 120)` |
| needsReply: lastSenderRole === "applicant" | PASS | |
| Thread still returned if no messages (LEFT JOIN LATERAL) | PASS | `LEFT JOIN LATERAL ... ON true` |
| All queries parameterized | PASS | |

---

## RecruiterMessages FE Null Handling (MSG-02)

| Test Case | Result | Notes |
|-----------|--------|-------|
| applicantLabel: returns applicantName when set | PASS | |
| applicantLabel: falls back to uid suffix when name null | PASS | `t.applicantUid.slice(-6).toUpperCase()` |
| applicantLabel: falls back to 'Candidate' when both null | PASS | |
| avatarInitial: returns first char of name when set | PASS | `.charAt(0).toUpperCase()` |
| avatarInitial: returns 'C' when name null | PASS | |
| Template: *ngIf on applicantPhotoUrl before img src | PASS | No null binds to src |
| Template: fallback span shows initial when no photo | PASS | `*ngIf="!t.applicantPhotoUrl"` |
| Template: img loading=lazy | PASS | |
| Template: img alt="" (decorative) | PASS | |
| Broken URL (non-null): shows broken icon | GAP | Not crashed but visible artifact; no onerror handler |
| OnDestroy: destroy$ teardown | PASS | |
| Keyboard: tabindex, Enter, Space, role=button on thread rows | PASS | |
| Space: preventDefault to prevent scroll | PASS | |

---

## Recorder Import Fix (REC-01)

| Test Case | Result | Notes |
|-----------|--------|-------|
| Import uses 'recordrtc' (lowercase) | PASS | |
| Old 'recordRtc' (camelCase) absent | PASS | |
| recordrtc@5.6.2 installed | PASS | |
| Build succeeds (no import error) | PASS | Production build clean |

---

## Mobile Sidebar (NAV-01)

| Test Case | Result | Notes |
|-----------|--------|-------|
| @HostListener('document:keydown.escape') present | PASS | Single-quote form confirmed |
| onEscape: only fires when mobileNavOpen | PASS | `if (this.mobileNavOpen)` guard |
| openMobileNav: moves focus to first drawer link (setTimeout 200ms) | PASS | |
| closeMobileNav: returns focus to hamburger button (setTimeout 50ms) | PASS | |
| closeMobileNav: early return when already closed | PASS | `if (!this.mobileNavOpen) return` |
| Router subscription: NavigationEnd filter | PASS | |
| Router subscription: closeMobileNav on navigation | PASS | |
| ngOnDestroy: routerSub.unsubscribe() | PASS | `if (this.routerSub) this.routerSub.unsubscribe()` |
| HTML: aria-controls="gh-mobile-drawer" on button | PASS | |
| HTML: [attr.aria-expanded] bound to mobileNavOpen | PASS | |
| HTML: id="gh-mobile-drawer" on nav | PASS | |
| HTML: scrim aria-hidden="true" | PASS | |
| HTML: drawer role="navigation" | PASS | |
| HTML: aria-label="Employer navigation" on drawer | PASS | |
| HTML: close button aria-label | PASS | |
| HTML: #firstDrawerLink template ref on first nav item | PASS | `#firstDrawerLink` on Dashboard link |
| HTML: #mobileMenuBtn template ref on hamburger | PASS | |
| Bottom nav: 5 items present | PASS | Dashboard, Jobs, Candidates, Messages, Company |
| Bottom nav: Messages replaces Post Job (B01 intention) | PASS | |
| Focus trap: Tab does not trap inside drawer | GAP | No focus trap — user can Tab out of drawer; OK for nav drawer pattern but not a strict modal |
| ARIA: drawer not role=dialog (correct for nav) | PASS | role=navigation used instead |
| Reduced-motion: CSS only uses color/border not transforms | NOT VERIFIED | Would need SCSS inspection |

---

## Security Checks

| Test Case | Result | Notes |
|-----------|--------|-------|
| All 4 message routes: verifyAuth | PASS | |
| All interview routes: verifyAuth | PASS | 7 routes including new hub |
| CORS: origin restriction | WARN | Wide open (cors() without options) — existing known issue |
| CORS whitelist: only localhost URLs | WARN | Existing gap; no prod domain in whitelist |
| Helmet: security headers | WARN | Not installed — existing known gap |
| JSON body 50mb: DoS risk | WARN | Existing — cv/photo upload use case |
| Rate limit in-memory store: not persistent across restarts | WARN | By design for single-server; documented in server.js |
| verifyAuth: Bearer token format | PASS | Checks startsWith('Bearer ') |
| verifyAuth: Firebase token verification | PASS | firebaseAdmin.auth().verifyIdToken() |
| 403 on expired token | PASS | auth/id-token-expired handled |

---

## Build & Static Quality

| Test Case | Result | Notes |
|-----------|--------|-------|
| ng build --configuration production | PASS | 0 errors, 2 CSS warnings (autoprefixer, pre-existing) |
| main.js size | INFO | 2.05 MB raw / 465 kB gzipped |
| employer-panel chunk (lazy) | INFO | 555 KB raw — large but pre-existing |
| EmployerInterviewModule chunk | INFO | 16.87 kB — lightweight new feature |
| BE: npm scripts (no test script) | WARN | package.json test script is placeholder echo |

---

## Summary Counts

| Category | Pass | Fail | Warn | Skip | Gap |
|----------|------|------|------|------|-----|
| Rate Limiting | 19 | 0 | 0 | 1 | 0 |
| Interview Hub BE | 15 | 0 | 0 | 1 | 0 |
| Interview Hub FE | 17 | 0 | 2 | 0 | 0 |
| Message Enrichment | 11 | 0 | 0 | 0 | 0 |
| Messages FE Null | 12 | 0 | 0 | 0 | 1 |
| Recorder Fix | 4 | 0 | 0 | 0 | 0 |
| Mobile Sidebar | 19 | 0 | 0 | 0 | 1 |
| Security | 5 | 0 | 5 | 0 | 0 |
| Build/Static | 4 | 0 | 1 | 0 | 0 |
| **TOTAL** | **106** | **0** | **8** | **2** | **2** |
