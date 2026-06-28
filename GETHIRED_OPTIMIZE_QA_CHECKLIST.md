# GETHIRED_OPTIMIZE_QA_CHECKLIST.md
## QA Cycle 11 — QA Checklist

All items should be manually verified before shipping this OPTIMIZE cycle to production.

---

### Interview Hub (`/recruiter/interview`)

- [ ] Page loads with loading skeleton visible while API call is in flight
- [ ] Skeleton container is approximately 480px tall (matches real content height)
- [ ] Skeleton shimmer animation is suppressed under `prefers-reduced-motion: reduce`
- [ ] Error state with "Try again" button appears on API failure
- [ ] "Try again" correctly re-fetches data (`retry()` calls `loadHub()`)
- [ ] Empty state appears correctly when 0 applications returned
- [ ] "All applicants" filter chip shows all items
- [ ] "Video answers" filter chip shows only items where `hasVideoAnswers === true`
- [ ] "Under review" filter chip shows only items where `applicationStatusId === 3`
- [ ] Filter chip `aria-pressed` is `"true"` when active, `"false"` when inactive
- [ ] "No candidates match this filter" message appears when filter yields 0 results
- [ ] Video count badge shows correct count from `item.videoAnswerCount`
- [ ] `trackBy` prevents full DOM re-render on filter change (items are recycled)
- [ ] Card action buttons are at least 44px tall (WCAG touch target)
- [ ] Emoji icons (&#9654; in empty state and video badge, &#128188; job icon) are not announced by screen reader
- [ ] `View applicants` link navigates to `/recruiter/contacts/candidate-list/:jobId`
- [ ] `Review responses` link appears only when `item.hasVideoAnswers === true`
- [ ] `Message` link navigates to `/recruiter/messages`
- [ ] On mobile (< 600px): card headers stack vertically, action buttons go full-width
- [ ] `getInterviewHub()` backend returns `{ items: [], total: 0 }` when no applications
- [ ] Authorization: a recruiter from company A cannot see company B's applications (JWT-enforced, test with two accounts)

---

### Mobile Sidebar (`EmployerPanelComponent`)

- [ ] Hamburger button visible only on screens < 768px
- [ ] Hamburger tap opens the 280px drawer from left
- [ ] Hamburger icon animates to X when drawer is open
- [ ] `aria-expanded="true"` on button when drawer is open
- [ ] `aria-label` changes to "Close navigation menu" when open
- [ ] Focus moves to first drawer nav item (~200ms after open)
- [ ] Escape key closes drawer from any focus position
- [ ] Scrim (dark overlay) visible when drawer is open
- [ ] Tapping scrim closes drawer
- [ ] Drawer close (X) button closes drawer, focus returns to hamburger
- [ ] Drawer close button is 44×44px
- [ ] Navigating to a route closes drawer automatically
- [ ] All drawer nav links navigate correctly (Dashboard, Jobs, Candidates, Messages, Company, Subscription)
- [ ] `aria-current="page"` applied to the active route link in drawer
- [ ] Drawer hidden on desktop (≥ 768px)
- [ ] Desktop sidebar visible on desktop, hidden on mobile
- [ ] Bottom nav visible on mobile only
- [ ] Bottom nav active state highlights current route
- [ ] Billing bar appears above bottom nav on mobile

---

### Recruiter Messages (`/recruiter/messages`)

- [ ] Page loads with 5 skeleton rows during API call
- [ ] Error state with "Try again" and "Back to dashboard" buttons on failure
- [ ] Empty state with correct copy and CTAs when no threads exist
- [ ] "All" and "Needs reply" filter chips work correctly
- [ ] Filtered empty state ("No messages match this filter") appears when "Needs reply" yields 0
- [ ] Thread rows show correct applicant name (from `applicantName` if set; fallback to UID suffix)
- [ ] Thread avatar shows photo when `applicantPhotoUrl` is present; shows initial letter on broken/missing URL
- [ ] Avatar `<img>` has `width="38" height="38"` (verify in DOM inspector — prevents CLS)
- [ ] Avatar image error correctly falls back to initial span (test by setting a bad URL)
- [ ] Thread row keyboard navigation: Tab to focus row, Enter/Space to select
- [ ] Selecting a thread on desktop opens detail pane on the right
- [ ] Selecting a thread on mobile hides the list and shows the detail pane
- [ ] "Back to messages" button on mobile returns to thread list
- [ ] `app-message-thread` component renders correctly within the detail pane
- [ ] `needsReply` badge appears on threads where last message sender is "applicant"
- [ ] Filter to "Needs reply" deselects a thread if it's no longer in filtered list

---

### Rate-limiting

- [ ] Auth endpoint (POST /api/auth/signin) returns 429 after 20 requests within 15 minutes
- [ ] Sensitive endpoint (POST /api/auth/changepassword) returns 429 after 10 requests within 1 hour
- [ ] 429 responses have `RateLimit-*` headers (not `X-RateLimit-*`)
- [ ] 429 response body is `{ "message": "..." }` JSON
- [ ] Normal API calls (GET /api/interview/hub) work through the rate-limiter stack without false positives

---

### General regression checks

- [ ] Employer dashboard loads correctly
- [ ] Jobs list loads correctly
- [ ] Contacts/Candidates page loads correctly
- [ ] Sign-in flow unaffected
- [ ] No JS console errors on any employer panel route
- [ ] No broken imports or missing components in the Angular build
