# GETHIRED_AI_JOB_PREVIEW_PANEL_API_CONTRACT_V1

Command: GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1

---

## Endpoint 1: Generate Anonymous Preview

**Method**: POST  
**Path**: `/api/public/employer/ai-preview-generate`  
**Auth**: None (anonymous)  
**Rate limit**: 5 requests/IP/15 minutes (controller-level) + global writeLimiter  

### Request Body
```json
{
  "jobTitle": "Marketing Manager",     // required, 2–120 chars
  "location": "Makati City",           // optional
  "workSetup": "On-site",              // optional: "On-site"|"Remote"|"Hybrid"
  "employmentType": "Full-time",       // optional: "Full-time"|"Part-time"|"Contract"|"Freelance"
  "industry": "Technology"             // optional
}
```

### Response 200
```json
{
  "success": true,
  "previewToken": "a1b2c3...64hexchars",
  "partialPreview": {
    "title": "Marketing Manager",
    "snippet": "We are looking for a Marketing Manager to join our team. In this role, you will...",
    "skills": ["Digital Marketing", "Campaign Management", "Analytics", "Brand Strategy"]
  },
  "expiresInMinutes": 30
}
```
Full draft is NOT included. Server-side store only.

### Response 422
```json
{ "message": "Job title is required." }
```

### Response 429
```json
{ "message": "Too many preview requests. Please try again in 15 minutes." }
```

### Response 500
```json
{ "message": "Could not generate preview. Please try again." }
```

---

## Endpoint 2: Claim Preview

**Method**: POST  
**Path**: `/api/recruiter/job-post-assistant/claim-preview`  
**Auth**: Required — Firebase JWT via `Authorization: Bearer <token>` header  
**Middleware**: `verifyAuth`  

### Request Body
```json
{
  "previewToken": "a1b2c3...64hexchars"
}
```

### Response 200
```json
{
  "success": true,
  "jobId": "JB-26-123456",
  "message": "Job draft created. Review and complete your job post before publishing."
}
```
Job is created with `job_status_id = 1` (draft). Never auto-published.  
Preview token is deleted (single-use).

### Response 400
```json
{ "message": "Missing or invalid preview token." }
```

### Response 401
```json
{ "message": "Unauthorized." }
```
(from verifyAuth middleware)

### Response 403
```json
{ "message": "No company associated with this account. Please complete your employer setup first." }
```

### Response 404
```json
{ "message": "Preview not found or expired. Please generate a new preview." }
```

### Response 500
```json
{ "message": "Could not claim preview. Please try again." }
```

---

## Frontend Service Contract

**Service**: `PublicJobPreviewService` at `src/app/public/services/public-job-preview.service.ts`

```typescript
generatePreview(inputs: AnonPreviewRequest): Observable<AnonPreviewResponse>
claimPreview(previewToken: string): Observable<ClaimPreviewResponse>
savePendingToken(token: string): void      // sessionStorage only
getPendingToken(): string | null
clearPendingToken(): void
hasPendingToken(): boolean
```

**sessionStorage key**: `gh_ai_preview_token`  
**Never stored**: draft content, job title, description, skills arrays  
**What's stored**: single 64-char hex token reference  

---

## Job Draft Schema (on claim)

```sql
INSERT INTO {schema}.jobs
  (job_id, job_title, company_id, job_description, job_duties, created_at, job_status_id)
VALUES
  ('JB-26-xxxxxx', '{title}', '{companyId}', '{roleSummary}', '{duties}', NOW(), 1)
```

Then `saveJobArray(jobId, { skills, requirements, goodToHave, ... })` called to populate associated tables.

Fields NOT set on claim (must be completed by employer before publishing):
- `industry_id`, `job_role_id`, `job_type_id`, `job_level_id`
- `work_setup_id`, `job_category_id`
- `salary_minimum`, `salary_maximum`, `rate`
- `job_banner`, `job_address`, `job_city`, `job_country`
- `expiration_date`

These missing fields are exactly what `validateJobPublishPayload` requires for publish (status=2),
ensuring the employer must complete the job before it can go live.
