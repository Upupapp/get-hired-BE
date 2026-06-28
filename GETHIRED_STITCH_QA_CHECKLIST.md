# GetHired STITCH QA Checklist — QA Cycle 11

Generated: 2026-06-25

---

## How to Use This Checklist
Run these checks against a deployed environment (or local with real DB) after applying the QA11 fixes. Each item is annotated with the expected result and the risk it guards against.

---

## Section A — Recruiter Messages Inbox (B01)

### A-01: Thread list loads for a valid recruiter
- **Action:** Log in as an employer with at least one thread; visit `/recruiter/messages`
- **Expected:** Thread list renders; loading skeleton shows then disappears
- **Pass criteria:** No "We couldn't load your messages" error panel

### A-02: Applicant name shows (not uid suffix) — tests FIX F-01
- **Action:** Open inbox for a recruiter with at least one thread where the applicant has `firstname`/`lastname` set in `gethired.users`
- **Expected:** Thread row shows "FirstName LastName" (or the email if no name), NOT "Candidate XXXXXX"
- **Fail pre-fix:** Would always show "Candidate XXXXXX" due to `first_name`/`last_name` column mismatch
- **Pass criteria:** Name is populated from the DB

### A-03: Avatar fallback initials on broken photo URL — tests FIX F-02
- **Action:** Open inbox for a thread where `applicantPhotoUrl` is a stale/non-existent URL (or manually set a bad URL in DB)
- **Expected:** Avatar shows the initials letter (e.g. "C"), not a broken image icon
- **Pass criteria:** Fallback span renders within ~2s of page load

### A-04: Filter chips — "Needs reply" filter
- **Action:** With threads present, click "Needs reply" chip
- **Expected:** Only threads with `needsReply: true` appear (lastSenderRole = 'applicant')
- **Pass criteria:** Count matches backend `needsReply` data

### A-05: Select thread — message thread detail opens
- **Action:** Click a thread row
- **Expected:** `<app-message-thread>` renders in the right pane with correct `jobId`, `applicantUid`, `otherPartyLabel`
- **Pass criteria:** Message history loads; composer is available

### A-06: Empty state — no threads
- **Action:** Log in as a recruiter with no threads
- **Expected:** "No messages yet" empty state with "Review applicants" and "View jobs" buttons
- **Pass criteria:** No error state shown (empty list is not an error)

### A-07: 403 for non-employer caller
- **Action:** Call `GET /api/messages/recruiter/threads` with an applicant JWT
- **Expected:** 403 `{ success: false, message: "You don't have access to this conversation.", code: "FORBIDDEN" }`
- **Pass criteria:** FE redirects to `/signin` (interceptor behavior on 403)

### A-08: Mobile — back to list from thread detail
- **Action:** On viewport <768px, select a thread, then click "Back to messages"
- **Expected:** Returns to thread list; `showDetail = false`; selectedThread preserved for desktop highlight
- **Pass criteria:** No navigation to a new route; list is visible

### A-09: Router subscription cleanup (B02 memory leak check)
- **Action:** Navigate away from `/recruiter/messages` then back multiple times
- **Expected:** No exponential growth in event listener count (verify via browser DevTools → Performance → Event Listeners)
- **Pass criteria:** `routerSub.unsubscribe()` fires on `ngOnDestroy`; no duplicate subscriptions

---

## Section B — Interview Hub (B03)

### B-01: Hub loads for a valid recruiter
- **Action:** Log in as employer; visit `/recruiter/interview`
- **Expected:** RecruiterInterviewHubComponent renders; not the "under construction" stub
- **Pass criteria:** Page loads with filter chips visible

### B-02: Applicant name shows — tests FIX F-01
- **Action:** Hub with applicants who have names in `gethired.users`
- **Expected:** Cards show "FirstName LastName" or email, not just "Applicant"
- **Pass criteria:** `getDisplayName()` returns a non-generic string

### B-03: Company scoping — cannot see other company's data
- **Action:** Create two companies with jobs and applicants; log in as Company A recruiter
- **Expected:** Only Company A's applicants appear
- **Pass criteria:** No Company B data visible (SQL WHERE `j.company_id = $1` enforced)

### B-04: Video filter chip
- **Action:** With some applicants having `videoAnswerCount > 0`, click "Video answers" chip
- **Expected:** Only applicants with `hasVideoAnswers: true` appear; chip shows count badge
- **Pass criteria:** Count badge matches items.length after filter

### B-05: Error state and retry
- **Action:** Take BE offline; visit hub
- **Expected:** "We couldn't load interview activity" error panel with "Try again" and "Back to dashboard"
- **Pass criteria:** No blank screen; retry button calls `loadHub()`

### B-06: Empty state
- **Action:** Log in as employer with no applicants
- **Expected:** "No interview activity yet" empty state
- **Pass criteria:** Empty state renders; action links present

### B-07: 403 for non-employer
- **Action:** Call `GET /api/interview/hub` with applicant JWT
- **Expected:** 403 `{ message: "You don't have permission to do that." }`
- **Pass criteria:** FE interceptor redirects to `/signin`

### B-08: is_archived filter
- **Action:** Archive an application (`is_archived = true`); verify it does not appear in hub
- **Expected:** Archived applications excluded (`AND ja.is_archived IS DISTINCT FROM true`)
- **Pass criteria:** Archived row absent from hub results

---

## Section C — Rate Limiting (SEC-01)

### C-01: Tier 3 write limit — normal recruiter use
- **Action:** Normal recruiter session — view threads, open one, send one message
- **Expected:** Zero 429 responses
- **Pass criteria:** Normal use (<<100 POSTs/15min) is well under the limit

### C-02: Tier 4 sensitive endpoints
- **Action:** Make 11 POST requests to `/api/auth/changepassword` within 1 hour
- **Expected:** First 10 succeed; 11th returns 429 `{ message: "Too many attempts. Please try again in an hour." }`
- **Pass criteria:** 429 on 11th request

### C-03: Tier 1 global limit — GET requests not blocked by Tier 3
- **Action:** Make 150 GET requests to any endpoint within 15 minutes (Tier 3 max is 100, but GET is skipped by Tier 3's `skip` function)
- **Expected:** None of the GET requests hit Tier 3's 429; only Tier 1 (500/15min) applies to GETs
- **Pass criteria:** GETs up to 500 succeed

### C-04: Rate limit headers present
- **Action:** Make any API request; inspect response headers
- **Expected:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers present
- **Pass criteria:** RFC 6585 headers visible (NOT legacy `X-RateLimit-*`)

### C-05: 429 FE behavior (known gap — document, don't block release)
- **Action:** Trigger a 429 from any endpoint
- **Expected (current):** Generic error state shown; no specific "rate limited" messaging
- **Pass criteria (acceptance):** App does not crash or redirect to signin; an error state of some kind is shown

---

## Section D — Mobile Sidebar (B02)

### D-01: Hamburger opens drawer
- **Action:** At mobile width (<768px); click hamburger menu button
- **Expected:** Drawer slides open; focus moves to first nav link after 200ms
- **Pass criteria:** `mobileNavOpen = true`; first link receives focus

### D-02: Escape key closes drawer
- **Action:** With drawer open, press Escape
- **Expected:** Drawer closes; focus returns to hamburger button after 50ms
- **Pass criteria:** `mobileNavOpen = false`; hamburger receives focus

### D-03: Navigation closes drawer
- **Action:** With drawer open, click any nav link
- **Expected:** NavigationEnd event fires; `closeMobileNav()` is called; drawer closes
- **Pass criteria:** Drawer not visible after route change

### D-04: Memory leak — router subscription cleanup
- **Action:** Navigate through several routes; verify no duplicate subscriptions
- **Expected:** `routerSub.unsubscribe()` fires on `ngOnDestroy`
- **Pass criteria:** Only one subscription active at a time

---

## Section E — Cross-Cutting

### E-01: Auth interceptor — Bearer token format
- **Action:** Verify requests to new endpoints include correct Authorization header
- **Expected:** `Authorization: <Firebase ID token>` (or `Bearer <token>` depending on FE localStorage format)
- **Pass criteria:** `verifyAuth` accepts the token; requests don't all 403

### E-02: Sidebar "Interviews" and "Messages" links present
- **Action:** Log in as recruiter; verify sidebar
- **Expected:** Both "Interviews" (→ `/recruiter/interview`) and "Messages" (→ `/recruiter/messages`) items visible
- **Pass criteria:** Items appear in sidebar at correct positions (after Candidates, before Company)

### E-03: Public portal unaffected
- **Action:** Visit `/jobs`, apply as a guest; verify no regressions
- **Expected:** Public job listing and details pages load normally
- **Pass criteria:** No errors on public routes
