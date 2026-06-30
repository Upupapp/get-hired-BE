# GETHIRED_AI_JOB_PREVIEW_PANEL_SECURITY_CONTRACT_V1

Command: GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1

---

## Threat Model

### Threat 1: Anonymous user extracts full generated job draft
**Attack**: Inspect DOM, network traffic, or sessionStorage to get the full draft content.
**Mitigations**:
- Network: `/api/public/employer/ai-preview-generate` only returns `{ previewToken, partialPreview: { title, snippet(≤45w), skills(≤4) } }` — full draft is not in the response body
- DOM: Panel HTML only binds to `previewTitle`, `previewSnippet`, `previewSkills` — all partial-only fields
- sessionStorage: Only `previewToken` (64-char hex) is stored — not content
- Blur: The blurred section is a CSS placeholder with no content behind it
**Residual risk**: None — full draft is exclusively server-side in `anonPreviewStore`

### Threat 2: Token replay / token theft claim
**Attack**: Intercept preview token and claim draft as different user.
**Mitigations**:
- Claim endpoint requires valid Firebase JWT (verifyAuth) — unauthenticated users cannot claim
- Token is single-use: `deletePreview(token)` runs immediately on successful claim
- Token TTL: 30 minutes — stale tokens return 404
- No user-binding on token (anonymous context, no UID to bind to) — but claim is auth-gated
**Residual risk**: If attacker steals token AND creates a GetHired employer account within 30 min AND claims before original user. Acceptable — claimed job is a draft, original user can generate a new one.

### Threat 3: IP rate limit bypass
**Attack**: Rotate IPs to generate unlimited anonymous previews (abuse AI compute).
**Mitigations**:
- 5 req/IP/15min in controller using `x-forwarded-for` or `socket.remoteAddress`
- Global `writeLimiter` (100/15min/IP) in server.js also applies
- In-memory ipRateCounts cleaned up every 30 min
**Residual risk**: Single IP limited to 5 previews/15min. Rotating IPs would need significant infrastructure.

### Threat 4: Prompt injection via jobTitle field
**Attack**: Pass malicious content in jobTitle to manipulate AI output or exfiltrate data.
**Mitigations**:
- `validateGenerationInputs()` sanitizes and validates jobTitle length/content
- `stripHtml()` called on stored roleSummary before saving to DB
- System uses template-based generation (roleTemplateLibraryV4) not open-ended LLM calls
- No external LLM API calls — generation is deterministic server-side logic
**Residual risk**: None — no LLM involved in generation.

### Threat 5: Anonymous job creation (unauthorized DB write)
**Attack**: Call claim endpoint without auth to create jobs.
**Mitigations**:
- `verifyAuth` middleware on `/api/recruiter/job-post-assistant/claim-preview`
- Returns 401 if no valid JWT
**Residual risk**: None.

### Threat 6: Client-supplied company_id to attribute draft to wrong company
**Attack**: Pass a different company_id in claim request body.
**Mitigations**:
- `getUserCompanyForRequest(req, uid)` resolves company from JWT only
- `body.companyId` is never read in the claim controller
**Residual risk**: None.

### Threat 7: Auto-publish via claim
**Attack**: Claim endpoint auto-publishes the job without employer review.
**Mitigations**:
- Job inserted with `job_status_id = 1` (draft) hardcoded in controller
- Publishing requires a separate `POST /job/updatejobs` call with `jobStatusId=2` through `validateJobPublishPayload`
**Residual risk**: None.

### Threat 8: Stored XSS via job content → DB → admin view
**Attack**: Inject HTML/JS into jobTitle or description, stored in DB, rendered in admin panel.
**Mitigations**:
- `stripHtml()` called on `roleSummary` before storing as `job_description`
- `stripAllTags()` equivalent applied to jobTitle via the generation pipeline's input sanitization
- Angular uses `{{ }}` text interpolation (not `[innerHTML]`) in all job views → auto-escaped
**Residual risk**: Low — belt-and-suspenders.

---

## Data Flow Diagram

```
Browser (anonymous)
  │
  ├─ POST /api/public/employer/ai-preview-generate
  │    { jobTitle, location, workSetup, employmentType }
  │
  ▼
Server (BE)
  ├─ IP rate check (5/15min)
  ├─ validateGenerationInputs()
  ├─ resolveHiringIntent()
  ├─ generateStructuredDraft()     ← FULL DRAFT
  ├─ anonPreviewStore.setPreview() ← stored server-side only
  └─ Response: { previewToken, partialPreview }   ← partial only

Browser stores:
  sessionStorage['gh_ai_preview_token'] = previewToken  ← token, not content

[After auth → /recruiter/*]
Browser
  ├─ POST /api/recruiter/job-post-assistant/claim-preview
  │    { previewToken }
  │    Authorization: Bearer <Firebase JWT>
  ▼
Server (BE)
  ├─ verifyAuth → uid
  ├─ anonPreviewStore.getPreview(token)  ← retrieve full draft
  ├─ getUserCompanyForRequest(req, uid)   ← company from JWT
  ├─ INSERT jobs ... job_status_id=1      ← draft only
  ├─ saveJobArray(jobId, { skills, requirements, ... })
  ├─ anonPreviewStore.deletePreview(token)  ← single-use
  └─ Response: { jobId }
```
