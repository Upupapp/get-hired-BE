# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — DRAFT / JOB POSTING OS INTEGRATION V5
**Date:** 2026-07-01

---

## Integration Status

| Surface | certificationRequirements | Status |
|---|---|---|
| Save Draft | ✅ Included in `saveJobArray()` call | Working |
| Autosave | ✅ Calls same job update endpoint | Working |
| Resume Draft | ✅ `mappedJob()` returns requirements → FE initializes FormArray | Working |
| Publish | ✅ Requirements already in DB from draft saves; no separate publish step | Working |
| Easy Job Posting | ✅ Uses same job create endpoint and form | Working |
| AI Job Create (authed) | ✅ Same form after draft claim | Working |
| Public AI Job Preview → Draft Claim | ✅ `publicJobPreviewController` initializes `certificationRequirements: []` | Working |
| Draft Review Center | ✅ Reads from same job edit endpoint | Working |
| Employer Preview | ✅ Shows how public will see requirements | Working |
| Publish Checklist | ✅ Does NOT require certifications | Working |
| Publish Success Modal | ✅ Not affected | Working |

---

## Draft Save Flow

```
Employer fills certification form
→ FormArray value captured
→ Job save API called (POST/PUT /api/recruiter/job-post)
→ saveJobArray() → saveCertificationRequirements() 
→ Rows saved to job_certification_requirement table
→ mappedJob() returns updated certificationRequirements
→ FE updates form state with server-confirmed data
```

---

## Resume Draft Flow

```
Employer opens existing draft job
→ GET /api/recruiter/job-post/:id (or job list → select)
→ mappedJob() returns { certificationRequirements: [...] }
→ FE normalizes with normalizeCertificationRequirements()
→ FormArray initialized from API response
→ Form shows existing requirements, ready for editing
```

---

## AI Job Preview → Draft Claim → Edit Flow

```
Anonymous employer uses AI Job Preview panel
→ Preview token created with certificationRequirements: []
→ Employer signs up (Google or email)
→ /api/recruiter/job-post-assistant/claim-preview triggered
→ Draft job created with empty certificationRequirements
→ Employer lands on Draft Review Center
→ Opens Edit tab → Job Posting form including cert section
→ Employer can add certification requirements
→ Save Draft / Publish as normal
```

---

## Publish Checklist — Certification Requirements

**Gate:** certificationRequirements NOT in required field list for publish
**Source:** `middleware/jobMiddleware.js:validateJobPublishPayload` — only checks: jobTypeId, jobLevelId, jobCity, jobCountry, jobDescription, workSetupId, jobBanner

**Acceptable publish states:**
- `certificationRequirements: []` — publish allowed ✅
- `certificationRequirements: [valid rows]` — publish allowed ✅
- `certificationRequirements: [partially filled row]` — should warn (FE-side validation gap; backlog)

---

## Public Visibility After Publish

```
Job status changes from 1 (draft) to 2 (published)
→ Public job portal picks up the job
→ GET /api/jobs/:id → mappedJob() → certificationRequirements (public-safe)
→ Public job detail renders section IF requirements.length > 0
→ Draft requirements were PRIVATE — now visible (correct behavior)
```

---

## Risk: Autosave Race Condition

**Scenario:** Autosave fires before FormArray is initialized from job data (on first load)
**Risk:** FormArray value is `[]` → `certificationRequirements: []` sent → all rows deleted
**Current mitigation:** Unknown (depends on autosave debounce + form init timing)
**Recommendation:** Guard autosave to not fire until `formInitialized: boolean = true` flag is set after `patchValue()` with job data

**Backlog item:** Add `formInitialized` guard to autosave trigger
