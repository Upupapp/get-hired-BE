# GETHIRED_AI_JOB_PREVIEW_PANEL_FINAL_REPORT_V1

Command: GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1
Date: 2026-07-01
FE Commit: 1b0cc0a
BE Commit: 4ec1ebf
Build: SUCCESS hash:2d5abd26f30ee3f8 — 0 TS errors

---

## Summary

Every "Start hiring" CTA on the public `/employers` page now opens an AI Job
Preview Panel instead of navigating directly to `/signup`. Anonymous visitors
can enter a job title, receive a server-generated partial preview, then sign up
or sign in to claim the full draft into their employer workspace.

---

## User Flow

```
[/employers] → Click "Start hiring"
  → AI Job Preview Panel opens (slide-in overlay)
     Step 1: Input — job title (required), location/work-setup/type (optional)
     Step 2: Loading — animated scan, "Drafting your job post…"
     Step 3: Preview — title + 45-word snippet + skills pills
               blurred locked section (visual placeholder only — no real content)
               Gate card: "Sign up to get your full job post"
               CTAs: Create free employer account / Sign in

[User clicks "Create free employer account"]
  → previewToken saved to sessionStorage('gh_ai_preview_token')
  → Navigate to /signup?role=2

[User completes signup → reaches /recruiter/*]
  → EmployerPanelComponent.ngOnInit() detects pending token
  → POST /api/recruiter/job-post-assistant/claim-preview { previewToken }
  → Backend creates job draft in DB (status=1), returns jobId
  → Navigate to /recruiter/jobs/list?claimedDraft=1
  → Token cleared from sessionStorage

[User clicks "Sign in"]
  → Same flow via /signin → employer panel claim check
```

---

## Security Constraints Enforced

| Constraint | How enforced |
|-----------|-------------|
| Full draft never exposed to anonymous browser | Only `title + snippet (≤45w) + 4 skills` returned to client |
| No full content in DOM/URL/localStorage/sessionStorage | `partialPreview` is the only browser-visible data; token is a 64-char hex reference |
| No reliance on frontend blur for security | Blurred content is a CSS placeholder of fake lines — no real data |
| No auto-publish from anonymous generation | Job created with `job_status_id = 1` (draft only) |
| company_id from JWT only | `getUserCompanyForRequest(req, uid)` — client-supplied company_id ignored |
| Never trust client draftId/previewId ownership | Token looked up in server-side store; not user-specific but single-use |
| Claim is single-use | `deletePreview(token)` called immediately after successful claim |
| Preview token has 30-min TTL | `anonPreviewStore.js` evicts expired entries passively + cleanup every 5 min |
| Rate limiting on anonymous endpoint | 5 requests/IP/15min enforced in controller (separate from global writeLimiter) |
| Publish gate not bypassed | Draft must go through existing `/job/updatejobs` + `validateJobPublishPayload` to publish |

---

## Files Created

### Backend
| File | Purpose |
|------|---------|
| `services/anonPreviewStore.js` | In-memory TTL store for anonymous drafts |
| `controllers/publicJobPreviewController.js` | `generateAnonPreview` + `claimPreview` |
| `routes/publicJobPreviewRoutes.js` | Route definitions for both endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `src/app/public/services/public-job-preview.service.ts` | HTTP service + sessionStorage token management |
| `src/app/public/employer-portal/ai-job-preview-panel/ai-job-preview-panel.component.ts` | Panel logic: input → loading → preview → error |
| `src/app/public/employer-portal/ai-job-preview-panel/ai-job-preview-panel.component.html` | Four-step panel template |
| `src/app/public/employer-portal/ai-job-preview-panel/ai-job-preview-panel.component.scss` | Brand-compliant panel styles |

## Files Modified

| File | Change |
|------|--------|
| `server.js` | Import + register `publicJobPreviewRoutes` |
| `employer-portal.component.ts` | `startHiring()` opens panel; `aiPanelOpen` state; `onAiPanelClosed()` |
| `employer-portal.component.html` | Panel component added; all CTA buttons unchanged (they already call `startHiring()`) |
| `employer-panel.component.ts` | `checkAndClaimAiPreview()` on `ngOnInit`; inject `PublicJobPreviewService` |
| `public.module.ts` | `AiJobPreviewPanelComponent` declared |

---

## API Contracts

### POST /api/public/employer/ai-preview-generate
**Auth**: None  
**Rate limit**: 5 req/IP/15min (controller-level)  
**Request**: `{ jobTitle: string, location?, workSetup?, employmentType?, industry? }`  
**Response 200**: `{ success: true, previewToken: string, partialPreview: { title, snippet, skills[] }, expiresInMinutes: 30 }`  
**Response 422**: `{ message: string }` — blocking validation error  
**Response 429**: `{ message }` — rate limit  

### POST /api/recruiter/job-post-assistant/claim-preview
**Auth**: verifyAuth (Firebase JWT)  
**Request**: `{ previewToken: string }`  
**Response 200**: `{ success: true, jobId: string, message: string }`  
**Response 400**: Missing/invalid token  
**Response 403**: No company on account  
**Response 404**: Token not found or expired  

---

## What Was NOT Changed

- Existing `startHiring()` navigation: preserved as method name; behavior changed (opens panel instead of navigating)
- All other employer portal sections: untouched
- `goToSignin()` and `browseJobs()`: untouched
- Existing Easy Job Post Assistant modal flow (for authenticated users): untouched
- Job publish validation, subscription gates, PayMongo: untouched
- `validateJobPublishPayload` middleware: untouched — claimed draft goes through normal edit/publish flow

---

## Known Limitations / Deferred

| Item | Status |
|------|--------|
| "Job draft ready" banner on job list after claim | Deferred — `?claimedDraft=1` param present but not yet wired to a UI banner |
| Company setup check before claim | Current: claim fails with 403 if no company → user just sees normal job list |
| Analytics tracking for panel open / preview generated / signup via panel | Deferred — `PublicPortalAnalyticsService` hooks not wired yet |
| anonPreviewStore → Redis (horizontal scaling) | Not needed at current scale; noted for future |
| Panel mobile bottom sheet drag-to-close | Deferred |
