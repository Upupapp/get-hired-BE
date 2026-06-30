# GETHIRED_AI_JOB_PREVIEW_PANEL_RELEASE_GATE_V1

Command: GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1
Status: SHIPPED — FE:1b0cc0a BE:4ec1ebf

---

## Release Gate Checklist

### Build & Code
- [x] FE build: SUCCESS hash:2d5abd26f30ee3f8 — 0 TypeScript errors
- [x] No `?.` or `??` in BE files (Node 14 safe)
- [x] No optional chaining or nullish coalescing in anonPreviewStore.js
- [x] No optional chaining or nullish coalescing in publicJobPreviewController.js
- [x] No optional chaining or nullish coalescing in publicJobPreviewRoutes.js

### Security
- [x] Full draft never returned to anonymous browser
- [x] Blurred section contains no real content (CSS placeholder only)
- [x] sessionStorage stores token only (not content)
- [x] Claim endpoint gated by verifyAuth
- [x] company_id resolved from JWT (never from request body)
- [x] Job created as draft (status=1) only — never auto-published
- [x] Publish gates (validateJobPublishPayload, subscription) unchanged
- [x] Preview token is single-use (deletePreview on claim)
- [x] Token TTL: 30 minutes (anonPreviewStore)
- [x] IP rate limiting: 5 req/IP/15min for anonymous endpoint
- [x] HTML stripped from job content before DB insert

### Deployment
- [x] FE committed: 1b0cc0a
- [x] FE pushed to GitHub
- [x] FE dist deployed to Linode /var/www/gethired/dist/get-hired/
- [x] BE committed: 4ec1ebf
- [x] BE pushed to GitHub
- [x] BE deployed to Linode /var/www/_work/get-hired-BE
- [x] PM2 restarted with --update-env
- [x] BE logs: Firebase Admin: initializing via env-base64 / running server on port 3000

### Functional Verification (to verify manually)
- [ ] Navigate to gethiredonline.app/employers
- [ ] Click "Start hiring" → AI Job Preview Panel slides in
- [ ] Enter "Marketing Manager" → click Generate → loading animation shows
- [ ] Preview appears: title in coral, snippet, skills pills, blurred section, gate card
- [ ] Click "Create free employer account" → navigates to /signup
- [ ] After signup → /recruiter/jobs/list (draft claimed, appears in list)
- [ ] Click "Sign in" flow → same claim behavior
- [ ] Panel closes on Escape key
- [ ] Panel closes on backdrop click
- [ ] Mobile: panel appears as bottom sheet

### Non-regression
- [ ] Existing "Browse public jobs" CTA → /jobs (unchanged)
- [ ] "Sign in" navbar link → /signin (unchanged)
- [ ] Authenticated employer's Easy Job Post Assistant modal (jobs/list → Post a job) → unaffected
- [ ] Job publish validation still enforces required fields
- [ ] Subscription gates still enforced on publish

---

## Known Deferred Items

| Item | Priority | Notes |
|------|----------|-------|
| "Draft claimed" success banner on job list | P3 | `?claimedDraft=1` param present; banner not wired yet |
| Analytics: panel open / preview generated / conversion | P2 | `PublicPortalAnalyticsService` hooks not wired |
| Company setup check before claim failure | P2 | 403 fails silently; user just goes to normal dashboard |
| anonPreviewStore → Redis | P4 | Only needed when horizontally scaling |
| Panel drag-to-close on mobile | P4 | UX enhancement only |
