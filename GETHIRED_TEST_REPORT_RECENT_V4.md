# GETHIRED TEST REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28 | **Baseline:** SWEEP RECENT V4

---

## Executive Summary

Scoped to Easy Job Post Assistant V2 deployment. FE Angular build clean (hash 20e4b47a). 
BE PM2 online. 0 automated tests written for new code — extraction service is pure functions, 
highly testable with Jest, but no test file exists yet. Contract between FE service and BE endpoints verified correct. 
Release gate: GO WITH CAUTION (no test coverage on regex/SSRF logic).

---

## Build Results

| Check | Result |
|---|---|
| FE ng build --prod | ✅ Clean — hash 20e4b47a4309d428 |
| FE TypeScript errors | ✅ None in new files |
| BE PM2 startup | ✅ "running server on port 3000" — no import errors |
| mammoth@1.12.0 load | ✅ Confirmed (no startup errors) |
| pdf-parse@1.1.1 load | ✅ Confirmed |
| Acorn constraint compliance | ✅ No ?. or ?? in new BE files |

---

## Test Coverage Matrix

| Area | Coverage | Priority | Recommended Test |
|---|---|---|---|
| extractJobTitle() | ❌ None | P1 | Jest — test 8 cases: explicit label, first-line heuristic, skip URL/apply lines |
| extractCity() | ❌ None | P1 | Jest — test PH cities array, explicit location label, no-match case |
| extractSalary() | ❌ None | P1 | Jest — PHP/₱ with range, k-suffix, single value, no match |
| extractWorkSetupHint() | ❌ None | P2 | Jest — hybrid, remote/WFH, on-site, null |
| extractJobTypeHint() | ❌ None | P2 | Jest — full-time, contract, internship, null |
| extractJobLevelHint() | ❌ None | P2 | Jest — senior, junior, executive, null |
| detectSectionHeader() | ❌ None | P2 | Jest — responsibilities/requirements/skills/niceToHave detection |
| extractBulletItems() | ❌ None | P2 | Jest — -, *, •, digits, catch-all, empty input |
| validateDocumentMagicBytes() | ❌ None | P1 | Jest — PDF %PDF, DOCX PK, DOC OLE2, RTF {\rtf, TXT always pass |
| isPrivateIp() (SSRF) | ❌ None | P1 | Jest — 10.x, 127.x, 169.254.x, 192.168.x, 172.16-31.x, ::1, public IP |
| mapTextToJobFields() | ❌ None | P1 | Jest — integration: real JD text, minimal text, empty text |
| extractTextFromUrl() | ❌ None | P1 | Jest (mocked dns+axios) — private IP block, DNS fail, content-type handling |
| EasyJobPostAssistantService | ❌ None | P2 | Angular TestBed — uploadAndExtract URL, linkAndExtract URL, in-memory state |
| EasyJobPostAssistantModalComponent | ❌ None | P2 | Angular TestBed — step navigation, file validation, fieldCount getter |
| FE-BE contract | ✅ Verified manually | P1 | Confirmed: FormData field name 'file', response shape match |
| Auth (verifyAuth on both routes) | ✅ Static scan | P0 | Confirmed in routes/easyJobPostRoutes.js |
| BOLA (companyId from JWT) | ✅ Static scan | P0 | getUserCompanyForRequest(req, uid) — token-derived |

---

## Contract Test Matrix

| Contract | FE Call | BE Endpoint | Auth | Status |
|---|---|---|---|---|
| Upload contract | http.post(form:FormData) | POST /api/recruiter/job-post-assistant/upload | Bearer JWT | ✅ Verified |
| Link contract | http.post({url:string}) | POST /api/recruiter/job-post-assistant/link | Bearer JWT | ✅ Verified |
| Response: extractedFields | AssistantExtractionResult interface | mapTextToJobFields() return shape | — | ✅ Types match |
| Error shape | err.error.message | res.status(4xx).json({message}) | — | ✅ Consistent |

---

## Security Guardrail Checks (Static)

| Check | Result |
|---|---|
| Secret file detection | ✅ None in new files |
| verifyAuth on both endpoints | ✅ Confirmed |
| Body-UID trust | ✅ None — uid from req.user only |
| SQL injection patterns | ✅ None — no SQL in extraction files |
| SSRF regex coverage | ✅ 13 patterns + 172.16/12 range |
| Magic-byte validation | ✅ Implemented |
| Rate limiting | ⚠️ Only global writeLimiter — no extraction-specific limit |

---

## Accessibility Checks

| Check | Result |
|---|---|
| Modal role="dialog" + aria-modal + aria-labelledby | ✅ |
| Close button aria-label | ✅ "Close assistant" |
| File input aria-label (sr-only) | ✅ "Upload job post file" |
| Dropzone role="button" + dynamic aria-label | ✅ |
| Error divs role="alert" | ✅ Both error displays |
| Spinner aria-label | ✅ "Extracting…" / "Importing…" |
| Icons aria-hidden="true" | ✅ All decorative SVGs |
| Option buttons aria-describedby | ✅ Connected to description spans |
| Back button label | ⚠️ Text-only "‹ Back" — functional but not ideal |
| Reduced motion (spinner) | ✅ animation:none in @media prefers-reduced-motion |
| Reduced motion (hover transform) | ⚠️ Missing on .eja-option:hover translateY(-1px) |

---

## Regression Checklist

- [ ] Company dashboard "Post a job" opens assistant modal ✅ (code verified)
- [ ] Employer panel "Post a job" opens assistant modal ✅ (code verified)
- [ ] Job list "Create Job" opens assistant modal when subscription allows ✅ (code verified)
- [ ] When subscription limit hit, SubscriptionAlertComponent still shows ✅ (isAllowed=false path preserved)
- [ ] Upload with valid PDF extracts and shows review screen
- [ ] Upload with invalid extension shows error (FE validation)
- [ ] Upload with file >10MB shows error (FE + BE validation)
- [ ] Magic-byte mismatch (renamed file) rejected by BE
- [ ] Link with private IP rejected by BE SSRF check
- [ ] Link with valid URL extracts and shows review
- [ ] "Fill in job form" → navigates to /recruiter/jobs/create?fromAssistant=1
- [ ] job-create reads extraction result on init when fromAssistant=1
- [ ] job-create shows snackbar with prefill confirmation
- [ ] job-create form defaults to draft (jobStatusId=1) ✅
- [ ] "Start from scratch" (manual) still works ✅ (goToCreateJob paths preserved)
- [ ] Job creation from existing flow not affected ✅ (getJobById path unchanged)

---

## Release Quality Gate

| Gate | Status | Evidence |
|---|---|---|
| A — Safe to redesign | ✅ Pass | No public routes modified |
| B — Safe to launch public portal redesign | ✅ Pass | Feature is employer-only |
| C — Safe to launch applicant grading | ✅ Pass | Not affected |
| D — Security launch gate | ⚠️ Pass with caution | No rate limit on upload |
| E — Accessibility/mobile gate | ⚠️ Pass with caution | Missing reduced-motion on hover |

**Overall: GO WITH CAUTION — fix rate limit (P1) and brand button (P1) before next release.**
