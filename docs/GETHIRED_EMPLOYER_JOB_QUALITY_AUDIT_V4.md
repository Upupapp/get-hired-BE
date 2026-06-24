# GetHired Employer Job Quality Audit V4

**Document:** GETHIRED_EMPLOYER_JOB_QUALITY_AUDIT_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Job field completeness audit, current quality check implementation, confirmed bugs, and safe improvement recommendations. Does not add fake AI recommendations. Does not block publish for recommended fields.

---

## Table of Contents

1. [Job Fields Audit](#1-job-fields-audit)
2. [Current Quality Check Implementation](#2-current-quality-check-implementation)
3. [Confirmed Bugs](#3-confirmed-bugs)
4. [Missing Quality Indicators](#4-missing-quality-indicators)
5. [Certification Requirements v1](#5-certification-requirements-v1)
6. [Safe Improvement Recommendations](#6-safe-improvement-recommendations)
7. [Out of Scope](#7-out-of-scope)

---

## 1. Job Fields Audit

### 1.1 Required to Save (Step 2 unlock gate)

These fields must be present before the employer can advance past Step 1. A job cannot be saved in any form without these.

| Field | Form Group | Form Control | Validator |
|-------|------------|--------------|-----------|
| `jobTitle` | `initialData` | `jobTitle` | `required` |
| `jobCity` | `initialData` | `jobCity` | `required` |
| `jobCountry` | `initialData` | `jobCountry` | `required` |

**Gate:** `initialFormValid` -- computed from these three fields.

---

### 1.2 Required to Publish

These fields must be present and non-empty for `publishJobPost()` to proceed past its validation check. Missing any of them results in a snackbar listing the absent fields.

| Field | Step | Form Location | Notes |
|-------|------|---------------|-------|
| `jobTitle` | 1 | `initialData.jobTitle` | Already required for Step 2 gate |
| `jobCity` | 1 | `initialData.jobCity` | Already required for Step 2 gate |
| `jobCountry` | 1 | `initialData.jobCountry` | Already required for Step 2 gate |
| `jobTypeId` | 1 | `initialData.jobTypeId` | e.g., Full-time, Part-time, Contract |
| `jobLevelId` | 1 | `initialData.jobLevelId` | e.g., Entry, Mid, Senior |
| `jobDescription` | 1 | `initialData.jobDescription` | Free-text description |
| `workSetupId` | 1 | `initialData.workSetupId` | e.g., On-site, Remote, Hybrid |
| `bannerFile` / `jobBanner` | 1 | `initialData.bannerFile` or `jobBanner` | Job cover image; required for publish |
| `interviewQuestions` | 3 | `interviewQuestions` FormArray | Must have `length > 0` |

---

### 1.3 Recommended (Improve Job Quality, Not Required to Publish)

These fields are not required by the publish gate but increase job quality, applicant conversion, and match accuracy. The employer is not blocked from publishing without them.

| Field | Step | Form Location | Benefit |
|-------|------|---------------|---------|
| `jobAddress` | 1 | `initialData.jobAddress` | Precise location for applicants |
| `jobDuties` | 1 | `initialData.jobDuties` | Clarifies day-to-day work |
| `jobCategoryId` | 1 | `initialData.jobCategoryId` | Improves search/browse categorization |
| `badges[]` | 1 | `initialData.badges` | Highlights perks (health, equity, etc.) |
| `requirements[]` | 1 | `initialData.requirements` | Hard requirements for the role |
| `goodToHave[]` | 1 | `initialData.goodToHave` | Nice-to-have qualifications |
| `educationalBackground[]` | 1 | `initialData.educationalBackground` | Preferred education level/field |
| `certificationRequirements[]` | 1 | `initialData.certificationRequirements` | Specific license/cert requirements (v1) |
| `industryId` | 2 | Step 2 form | Industry classification |
| `jobRoleId` | 2 | Step 2 form | Role type classification |
| `skills[]` | 2 | Step 2 form | Skills taxonomy for matching |
| `tags[]` | 2 | Step 2 form | Additional search tags |
| `rate` | 2 | Step 2 form | Pay rate type (hourly, salary, etc.) |
| `salaryMinimum` | 2 | Step 2 form | Minimum salary (shown publicly if filled) |
| `salaryMaximum` | 2 | Step 2 form | Maximum salary (shown publicly if filled) |
| `salaryCurrency` | 2 | Step 2 form | Currency for salary range |

---

## 2. Current Quality Check Implementation

### 2.1 publishJobPost() validation

Located in `job-create.component.ts`, the `publishJobPost()` method performs a client-side check of all required-to-publish fields before making an API call.

**Logic summary:**

```
publishJobPost():
  missingFields = []
  if (!jobTitle) missingFields.push('Job Title')
  if (!jobCity)  missingFields.push('Job City')
  // ... (all required-to-publish fields)
  if (!interviewQuestions.length) missingFields.push('Interview Questions')

  if (missingFields.length > 0):
    snackbar("Missing: " + missingFields.join(", "), { panelClass: 'success-snackbar' })
    // BUG: wrong panel class -- see section 3
    return

  // API call proceeds
```

**Scope:** Client-side only. The backend may perform its own validation, but the primary UX gate is in the Angular component.

**Limitations:**
- Single snackbar message: all missing fields listed in one dismissable notification.
- No inline field highlighting or per-field error indicators.
- No distinction between "required" and "recommended" fields in the message.
- The message is transient -- dismisses automatically, leaving the employer without persistent guidance on what to fix.

---

## 3. Confirmed Bugs

### Bug 1: Publish-blocked snackbar uses wrong CSS class

**Location:** `job-create.component.ts`, `publishJobPost()` method, the snackbar call for missing-field errors.

**Current behavior:** When publish is blocked due to missing required fields, the snackbar is displayed with `panelClass: 'success-snackbar'`.

**Expected behavior:** The snackbar should use an error or warning class (e.g., `error-snackbar`, `warn-snackbar`, or equivalent class defined in the global snackbar theme) so that the message is visually distinguishable as a blocking error rather than a success.

**Impact:** Employers may be confused by a green/success-styled message telling them their job is missing fields. This reduces the clarity of the error state.

**Fix:** Replace `'success-snackbar'` with the appropriate error snackbar class in the `publishJobPost()` snackbar call.

---

## 4. Missing Quality Indicators

The following quality UX elements are absent from the current job posting flow.

### 4.1 No visual quality or readiness indicator

There is no completeness score, progress bar, or percentage display on the job create form or the job view page. The employer receives no signal about how complete or attractive their job post is relative to other jobs on the platform.

**Safe improvement:** Add a simple "Publish readiness" indicator based only on required-to-publish fields (binary: ready / not ready). Do not create a fake AI quality score.

### 4.2 No per-section completion chips

There are no chips, checkmarks, or visual indicators next to each form section to show which sections are complete. The stepper header shows which step is active, but does not show completion state for prior steps.

**Safe improvement:** Add completion checkmarks to stepper headers when a step's required fields are complete.

### 4.3 No "Required to publish" vs "Recommended" visual distinction

All fields in Step 1 are presented with the same visual weight. The employer cannot tell at a glance which fields are required versus recommended.

**Safe improvement:** Add "Required to publish" labels next to required fields and "Recommended" labels next to optional quality fields. Use a consistent visual indicator (e.g., a colored dot or label) rather than asterisks alone.

### 4.4 No sticky save/publish action bar

The "Save Draft" and "Publish" buttons are only visible in Step 4. Employers on earlier steps who want to save their progress must navigate to Step 4.

**Safe improvement:** Consider adding a "Save Draft" option accessible from any step via a top-bar or floating button. Do not add "Publish" to earlier steps as it would bypass the preview gate.

### 4.5 No scroll-to-fix anchors

When the publish-blocked snackbar lists missing fields, clicking a missing field name in the list does not scroll to or focus the relevant form control.

**Safe improvement:** Make missing field names in the snackbar (or in a persistent error panel) link to their respective form sections. This is particularly valuable for long Step 1 forms.

---

## 5. Certification Requirements v1

### 5.1 Current implementation status

`certificationRequirements` is implemented as a FormArray in Step 1 (`initialData` form group). It is an optional field -- it does not appear in the required-to-publish list and does not block publishing.

**Fields per entry:**
- `name` (required within the entry)
- `type` (default: `'certification'`)
- `importance` (default: `'required'`)
- `issuingAuthority` (optional)
- `expiryRequired` (boolean, optional)
- `verificationRequired` (boolean, optional)

### 5.2 Quality audit considerations

Since `certificationRequirements` is optional and recommended rather than required:
- It should be categorized in the "Recommended" section of any quality indicator UI.
- If a quality score is implemented, it should give credit for having certification requirements filled (if role-relevant) without penalizing jobs that legitimately have none.
- **Do not implement MATCH scoring for certs.** The applicant MATCH engine must not be wired to auto-reject or score applicants based on `certificationRequirements`. See GETHIRED_EMPLOYER_CERTIFICATION_LICENSE_FLOW_ADDENDUM_V4.md.

---

## 6. Safe Improvement Recommendations

All recommendations in this section are safe to implement without changing business logic or backend contracts.

| # | Recommendation | Effort | Risk | Priority |
|---|---------------|--------|------|----------|
| 1 | Fix publish-blocked snackbar CSS class from `success-snackbar` to error class | Low | Low | High |
| 2 | Add "Required to publish" and "Recommended" labels to form fields | Medium | Low | High |
| 3 | Add completion checkmarks to stepper headers | Medium | Low | Medium |
| 4 | Add persistent missing-fields panel below the publish button (instead of transient snackbar) | Medium | Low | Medium |
| 5 | Add scroll-to-fix anchors from the missing fields list | Medium | Low | Medium |
| 6 | Add "Save Draft" accessible from Steps 1-3 (not just Step 4) | Medium | Medium | Low |
| 7 | Add binary "Ready to publish" indicator in Step 4 | Low | Low | Low |

---

## 7. Out of Scope

The following are explicitly excluded from this audit and must not be implemented without a separate product decision:

- AI-generated job description suggestions
- Fake quality scores or AI readiness ratings
- Blocking publish for recommended (non-required) fields
- Automated job quality comparison against other jobs on the platform
- MATCH scoring based on `certificationRequirements`
- Any automatic applicant filtering based on job quality indicators
