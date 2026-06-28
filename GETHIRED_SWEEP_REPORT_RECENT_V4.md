# GETHIRED SWEEP REPORT — Easy Job Post Assistant V2 (RECENT DEPLOYMENT V4)
**Scope:** BE commit b9ebeac / FE commit cbd2574 — Easy Job Post Assistant V2  
**Date:** 2026-06-28  
**Auditor:** SWEEP RECENT DEPLOYMENT

---

## Executive Summary

Easy Job Post Assistant V2 ships a complete import-to-prefill pipeline. No P0 risks found. 
Key findings: P1 brand gradient deviation in modal CTA; P1 no upload-specific rate limit; 
P2 zero automated tests for 380-line regex extraction service; P2 missing prefers-reduced-motion 
on hover transform. All security guarantees (BOLA, SSRF, magic-byte, memoryStorage, auth) verified correct.

**Deployment status:** Live on Linode (BE PM2 online 59.9MB, FE index.html 2026-06-28 10:13)

---

## New Files (BE)
- `services/easyJobPostExtractionService.js` — 538 lines, PDF/DOCX/TXT/RTF/URL extraction
- `controllers/easyJobPostController.js` — 155 lines, upload + link endpoints
- `routes/easyJobPostRoutes.js` — 33 lines, multer + verifyAuth routing

## New Files (FE)
- `easy-job-post-assistant.models.ts` — TypeScript interfaces
- `easy-job-post-assistant.service.ts` — HTTP service + in-memory state bridge
- `easy-job-post-assistant-modal.component.ts` — 4-step modal (choose/upload/link/review)
- `easy-job-post-assistant-modal.component.html` — accessible modal template
- `easy-job-post-assistant-modal.component.scss` — 456 lines, full styling

## Modified Files (FE)
- `shared.module.ts` — added EasyJobPostAssistantModalComponent to classesToInclude
- `company-dashboard.component.ts` — goToCreateJob() opens dialog
- `employer-panel.component.ts` — goToCreateJob() opens dialog
- `job-list.component.ts` — getCompanyRestrictions() opens dialog when isAllowed
- `job-create.component.ts` — applyAssistantPrefill() reads service result on init

---

## Security Verification

| Check | Result |
|---|---|
| BOLA (companyId from JWT) | ✅ Pass — getUserCompanyForRequest(req, uid) via token |
| Auth gating (verifyAuth) | ✅ Pass — both routes have verifyAuth middleware |
| No disk storage (memoryStorage) | ✅ Pass — multer.memoryStorage(), no temp files |
| Magic-byte validation | ✅ Pass — PDF/DOCX/DOC/RTF/TXT all validated |
| SSRF protection | ✅ Pass — DNS lookup + 13 private IP regex patterns + 172.16/12 range |
| Error sanitization | ✅ Pass — private network details not leaked to client |
| No SQL interaction | ✅ Pass — pure extraction, zero DB queries |
| Acorn compat (no ?. or ??) | ✅ Pass — verified all 3 new BE files |
| File size limit | ✅ Pass — 10MB in multer limits + controller check |
| URL protocol enforcement | ✅ Pass — http/https only, BE + FE both validate |
| No secret values in code | ✅ Pass |

---

## Risk Register (Scoped to This Deployment)

| ID | Severity | Finding | Fix Command |
|---|---|---|---|
| EJP-R-001 | P1 | Modal CTA uses purple gradient #7C3AED→#5B21B6, not brand coral | BRAND |
| EJP-R-002 | P1 | No extraction-specific rate limit — upload CPU-intensive | SECURE |
| EJP-R-003 | P2 | .eja-option hover transform: no prefers-reduced-motion guard | BRAND/OPTIMIZE |
| EJP-R-004 | P2 | Zero automated tests for extraction service (regex/SSRF logic) | TEST |
| EJP-R-005 | P2 | extractBulletItems catch-all clause may extract noise lines | OPTIMIZE |
| EJP-R-006 | P2 | No timeout wrapping pdf-parse/mammoth — malformed file could hang | OPTIMIZE |
| EJP-R-007 | P3 | Back button has no explicit aria-label | NOTIFY |
| EJP-R-008 | P3 | @Inject(MAT_DIALOG_DATA) data: any — weak typing | OPTIMIZE |

---

## Draft-Only Guarantee — Verified

- `applyAssistantPrefill()` calls `setFormGroup(prefillData)` — existing function
- `setFormGroup()` in job-create defaults `jobStatusId` to `1` (draft)
- No code path in assistant bypasses `validateJobPublishPayload` middleware
- Confirmed: publish requires `jobStatusId=2` explicitly set by recruiter ✅

---

## Recommended Next: BRAND (fix button gradient) → SECURE → TEST → OPTIMIZE
