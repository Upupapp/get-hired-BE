# GETHIRED STITCH 3 QA Checklist
_Generated: 2026-06-26_
_All items relate to seams introduced or changed in this deployment._

---

## A. SSR / SEO-V4 Seams

### A-01: Job Detail — HTTP 404 for Invalid Job IDs
- [ ] Request `GET /jobs/details/<invalid-uuid>` via SSR (not browser navigation)
- [ ] Verify HTTP response code is `404` (not `200`)
- [ ] Method: `curl -o /dev/null -w "%{http_code}" https://gethiredonline.app/jobs/details/00000000-0000-0000-0000-000000000000`
- [ ] Expected: `404`

### A-02: Job Detail — SSR <title> for Error State
- [ ] Request same invalid job URL
- [ ] Verify `<title>` in response HTML is `"Job not found | GetHired"`
- [ ] Method: `curl -s https://gethiredonline.app/jobs/details/00000000-0000-0000-0000-000000000000 | grep -o '<title>.*</title>'`

### A-03: Job Detail — noindex meta for Error State
- [ ] Same request
- [ ] Verify `<meta name="robots" content="noindex">` in response HTML

### A-04: Job Detail — Canonical Link in SSR HTML (valid job)
- [ ] Request `GET /jobs/details/<valid-job-uuid>` via SSR
- [ ] Verify `<link rel="canonical" href="https://gethiredonline.app/jobs/details/<uuid>">` is in HTML response
- [ ] This was the core SEO-V4 fix (DOCUMENT token — canonical now emitted in SSR)

### A-05: Job Detail — JSON-LD in SSR HTML (valid active job)
- [ ] Request same valid job URL
- [ ] Verify `<script id="gh-jsonld-jobposting" type="application/ld+json">` is present in HTML
- [ ] Verify JSON-LD contains `"@type": "JobPosting"`, `"title"`, `"hiringOrganization"`, `"url"`

### A-06: ngOnDestroy Subscription Cleanup
- [ ] Navigate to a valid job detail page
- [ ] Navigate away (back to job list)
- [ ] Verify no console errors about subscriptions after navigation
- [ ] Verify `<title>` resets to `"Get Hired - Hire experts or be hired for any job, any time."`
- [ ] Verify no stale `<link rel="canonical">` remains in `<head>` (inspect element)

---

## B. Firebase Credential Chain

### B-01: Server Startup Credential Log
- [ ] Check BE startup logs for `Firebase Admin: initializing via env-base64`
- [ ] Confirm no credential error at startup in production

### B-02: Malformed Credential Fast-Fail (pre-deploy check)
- [ ] In a non-production environment, set `FIREBASE_SERVICE_ACCOUNT_BASE64` to an invalid value (e.g., `ZZZ`)
- [ ] Verify BE fails to start with: `Firebase Admin: env-base64 credential failed`
- [ ] Verify it does NOT silently fall through to ADC

---

## C. Promise.allSettled — multipleContact

### C-01: All Contacts Added Successfully
- [ ] POST `/contacts/multiplecontact` with 3 new contacts
- [ ] Verify response: `{ data: { contacts: [3 items], summary: { successCount: 3, failureCount: 0, duplicateCount: 0, outcome: "all_success" } } }`

### C-02: Mixed — Some Duplicates
- [ ] POST with 2 contacts, 1 already exists
- [ ] Verify: `successCount: 1, duplicateCount: 1, outcome: "partial_success"` (note: partial_success requires failureCount > 0; if only duplicates + some success, outcome is `all_success` with duplicateCount)
- [ ] Actually: `successCount: 1, failureCount: 0, duplicateCount: 1, outcome: "all_success"` (since failureCount = 0)
- [ ] Verify `contacts` array has 1 item (the newly added one), NOT the duplicate

### C-03: All Duplicates
- [ ] POST with contacts that all already exist
- [ ] Verify: `successCount: 0, failureCount: 0, duplicateCount: N, outcome: "duplicate_only"`
- [ ] Verify `contacts` array is empty

### C-04: Empty Contacts Array
- [ ] POST with `{ contacts: [] }`
- [ ] Verify: HTTP 500 / 400 with error message "No contacts provided."

---

## D. Promise.allSettled — multipleCandidate

### D-01: All Candidates Added
- [ ] POST `/candidates/multiplecandidate` with `{ candidate: [2 items] }`
- [ ] Note: request body field is `candidate` (not `candidates`)
- [ ] Verify response has `data.candidates` array with 2 items

### D-02: Duplicate Candidates
- [ ] POST with a candidate email that already exists for this company
- [ ] Verify: `duplicateCount: 1, outcome: "duplicate_only"` (if all duplicates)

---

## E. verifyRoles (Current State — Dead Code Verification)

### E-01: No Route Uses verifyRoles
- [ ] Confirm: grep across all route files for `verifyRoles` returns no route registrations
- [ ] This is for documentation — confirms the middleware is not active

---

## F. FE Consumer Verification for New Response Shape

### F-01: Contact Import UI Displays Correct Count
- [ ] In the employer portal, navigate to the contact import feature
- [ ] Import a CSV/list of contacts (some new, some duplicate)
- [ ] Verify the UI correctly shows counts (e.g., "2 added, 1 duplicate skipped")
- [ ] Verify no JS error in console reading undefined property on the response

### F-02: Candidate Import UI Displays Correct Count
- [ ] Same as F-01 but for candidate import feature

---

## Pass/Fail Summary

| Check | Area | Priority |
|-------|------|----------|
| A-01 HTTP 404 for invalid job (SSR) | SEO | P1 |
| A-02 Title for error state (SSR) | SEO | P1 |
| A-04 Canonical link in SSR HTML | SEO | P1 |
| A-05 JSON-LD in SSR HTML | SEO | P1 |
| B-01 Server startup credential log | Firebase | P1 |
| C-01 All contacts added | Contacts | P2 |
| C-02 Mixed duplicates response | Contacts | P2 |
| C-03 All duplicates response | Contacts | P2 |
| D-01 All candidates added | Candidates | P2 |
| F-01 FE contact import UI | FE | P2 |
| F-02 FE candidate import UI | FE | P2 |
| A-06 ngOnDestroy cleanup | FE | P3 |
| A-03 noindex meta for errors | SEO | P3 |
| B-02 Fast-fail on bad credential | Firebase | P3 |
| E-01 verifyRoles is dead code | Auth | Info |
