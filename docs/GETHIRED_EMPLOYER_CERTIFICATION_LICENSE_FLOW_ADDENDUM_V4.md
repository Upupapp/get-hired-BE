# GetHired Employer Certification and License Flow Addendum V4

**Document:** GETHIRED_EMPLOYER_CERTIFICATION_LICENSE_FLOW_ADDENDUM_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Certification requirements v1 implementation status, employer-facing flow, data model, display locations, and hard guardrails on MATCH scoring. This addendum applies because `certificationRequirements` v1 IS present in the codebase.

---

## Table of Contents

1. [Implementation Status Summary](#1-implementation-status-summary)
2. [Certification Requirements v1 Data Model](#2-certification-requirements-v1-data-model)
3. [Employer-Facing Flow](#3-employer-facing-flow)
4. [Backend Handling](#4-backend-handling)
5. [Display Locations](#5-display-locations)
6. [What Is Not Implemented](#6-what-is-not-implemented)
7. [Copy Rules](#7-copy-rules)
8. [Hard Guardrails](#8-hard-guardrails)

---

## 1. Implementation Status Summary

| Feature | Status |
|---------|--------|
| Employer can add certification requirements to a job | Implemented (v1) |
| Data is stored per job | Implemented |
| Displayed in job view | Likely (confirm in component) |
| Displayed on public job detail | Conditional (if mapped in template) |
| Applicant MATCH scoring against certs | NOT implemented -- do not wire |
| Cert taxonomy / controlled vocabulary | NOT implemented |
| Applicant auto-reject based on certs | NOT implemented -- do not wire |
| Cert expiry tracking for applicants | NOT implemented |
| Cert verification workflow | NOT implemented |

---

## 2. Certification Requirements v1 Data Model

### 2.1 FormArray definition

Located in `job-create.component.ts`, Step 1, within the `initialData` FormGroup.

**FormArray name:** `certificationRequirements`

**Each entry is a FormGroup with the following controls:**

| Control | Type | Default Value | Required Within Entry | Description |
|---------|------|---------------|----------------------|-------------|
| `name` | string | -- | Yes | Name of the certification or license (e.g., "CPA", "AWS Solutions Architect") |
| `type` | string | `'certification'` | No | Classification. Default is `'certification'`. Could be extended to `'license'` or `'permit'` in future. |
| `importance` | string | `'required'` | No | Employer's signal of how critical this cert is. Default `'required'`. Could be `'preferred'` in future. |
| `issuingAuthority` | string | -- | No | The body that issues the credential (e.g., "PICPA", "AWS", "PRC") |
| `expiryRequired` | boolean | -- | No | Whether the employer expects the cert to be current (not expired) |
| `verificationRequired` | boolean | -- | No | Whether the employer will verify the credential independently |

### 2.2 FormArray status

- This is an optional FormArray. Zero entries is valid.
- Adding entries is not required to save a draft or to publish.
- When entries are present, `name` within each entry is required; the entry cannot be saved without a name.

---

## 3. Employer-Facing Flow

### 3.1 Adding a certification requirement

1. Employer is in Step 1 of the job create stepper (`/recruiter/jobs/create` or `/recruiter/jobs/edit?id=`).
2. Within the Step 1 form, the Certification Requirements section has an "Add requirement" button.
3. Clicking "Add requirement" appends a new FormGroup to the `certificationRequirements` FormArray.
4. The employer fills in the `name` field (required). All other fields are optional.
5. Multiple requirements can be added (one per entry).

### 3.2 Editing a certification requirement

1. Each entry in the FormArray is editable inline within Step 1.
2. The employer can modify any field in an existing entry.
3. Changes are captured in the FormArray and submitted with the rest of the job form.

### 3.3 Removing a certification requirement

1. Each entry has a remove/delete control.
2. Clicking remove calls `removeAt(index)` on the FormArray.
3. The entry is removed from the form state immediately.
4. No confirmation dialog is shown (entries are not yet persisted until the form is saved).

### 3.4 Saving and submitting

Certification requirements are submitted as part of the job form on:
- "Save Draft" (`jobStatusId=1`)
- "Publish" (`jobStatusId=2`)

The array is included in the API payload to `POST /job/create` or `PUT /job/updatejobs`.

---

## 4. Backend Handling

**Controller:** `createJobs` in the jobs backend controller.

**Processing:** The `certificationRequirements` array received in the request body is passed to `saveJobArray`. This function handles array-type job fields and persists each entry to the appropriate table.

**Data persistence:** Each certification requirement is stored as a separate record associated with the `jobId`. The exact table name should be confirmed by reviewing the backend jobs controller and migration files.

**API endpoints:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create job with certs | POST | `/job/create` |
| Update job with certs | PUT | `/job/updatejobs` |

No separate endpoint exists for certification requirements alone. They are always updated as part of the full job save.

---

## 5. Display Locations

### 5.1 Job view page (employer-facing)

**Route:** `/recruiter/jobs/view?id={jobId}`
**Component:** `EmployerJobviewComponent` -> `<app-job-view>`

Certification requirements are likely displayed in the job view page if the template maps the `certificationRequirements` field from the job data object. This should be confirmed by reviewing the `<app-job-view>` template.

**Display format (expected):** A list or table of certification requirements showing `name`, `importance`, `issuingAuthority`, and optionally `expiryRequired` and `verificationRequired`.

### 5.2 Public job detail page

**Route:** `/jobs/details/:id`
**Component:** `PublicDetailsComponent`

Certification requirements appear in the public job detail's "Fields Displayed Publicly" list (see GETHIRED_EMPLOYER_PUBLIC_JOB_DETAIL_SEO_AUDIT_V4.md). They are shown conditionally if the `certificationRequirements` array is non-empty.

**Display format (expected):** Public-facing list showing `name` and `importance` at minimum. `issuingAuthority` may be shown if present. Internal fields like `verificationRequired` may be omitted from the public view.

### 5.3 Applicant list

Certification requirements are part of the job post context but are not displayed in the applicant list table (`/recruiter/jobs/applicants?id={jobId}`). The applicant table shows applicant-level data, not job-level requirements.

### 5.4 Applicant detail panel

In the applicant detail panel (`showProfile=true`), the `app-application-preview` component may show job context including certification requirements. Confirm in the `app-application-preview` component template.

---

## 6. What Is Not Implemented

The following features are intentionally absent from v1 and must not be added without a separate product decision.

### 6.1 MATCH scoring for certification requirements

The GetHired MATCH engine scores applicant-job compatibility. In v1, `certificationRequirements` are NOT factored into MATCH scoring. No `certificationRequirementFactor()` function exists or should be called.

**Reason:** Applicant certification data is not stored in a structured way that allows reliable programmatic matching. Adding cert-based scoring without verified applicant cert data would produce inaccurate match signals.

### 6.2 Cert taxonomy / controlled vocabulary

There is no controlled list of recognized certifications. Employers type free text for `name`. This means no normalization, no deduplication, and no ability to match "CPA" against "Certified Public Accountant".

A cert taxonomy would be required before any automated matching could be reliable.

### 6.3 Applicant auto-rejection based on certs

There is no workflow that auto-rejects or hides applicants who do not list matching certifications. All applicants are visible in the applicant list regardless of whether they hold the required certs. Status changes are human-confirmed.

### 6.4 Cert expiry tracking for applicants

Applicants do not currently store certification records with expiry dates in a structured schema accessible to the match engine. The `expiryRequired` and `verificationRequired` fields on the job requirement are informational only.

### 6.5 Cert verification workflow

There is no in-platform verification workflow. An employer setting `verificationRequired=true` signals their intent, but the platform does not automate or facilitate the verification process.

---

## 7. Copy Rules

These rules govern the UI copy used for certification requirements. They prevent feature misrepresentation.

| Context | Correct Copy | Incorrect Copy (do not use) |
|---------|-------------|----------------------------|
| Add button | "Add requirement" | "Auto-match licenses" |
| Section header | "Certification requirements" | "Matched certifications" |
| Display in job view | "Required certifications" | "Applicants matched by license" |
| Importance label | "Required" or "Preferred" | "Hard filter" or "Auto-reject" |
| Public job detail | "Certifications required" | "Must hold active certification (verified)" |
| Employer tooltip | "We'll show these requirements to applicants" | "We'll automatically filter out uncertified applicants" |

---

## 8. Hard Guardrails

The following actions are prohibited in any code change touching `certificationRequirements`:

1. **Do not call `certificationRequirementFactor()`** or any equivalent function that feeds cert data into the MATCH scoring pipeline. This function must not be created or wired.

2. **Do not set applicant visibility based on cert status.** The applicant list must show all applicants regardless of cert match. No `WHERE certMatch = true` filter may be applied.

3. **Do not send automated rejection emails** to applicants whose self-reported certs do not match job requirements.

4. **Do not display a cert-match indicator** in the applicant list alongside or as part of the `matchSignalLabel` column without a separate product decision and confirmed applicant cert data pipeline.

5. **Do not add `certificationRequirements` to the publish-required fields list.** It is and must remain an optional recommended field.

6. **Do not auto-populate `issuingAuthority`** from a hardcoded list or external API without explicit product approval. The field is free text.

---

## Appendix: v1 Scope Boundary

| In scope (v1) | Out of scope (not v1) |
|---------------|----------------------|
| Employer adds cert requirements to job form | MATCH scoring against certs |
| Data stored per job | Cert taxonomy / controlled vocab |
| Displayed in job view (confirm template) | Applicant cert storage (structured) |
| Displayed in public job detail (conditional) | Cert expiry tracking |
| Free-text name, optional authority, importance flag | Automated verification workflow |
| | Auto-reject or auto-filter applicants |
