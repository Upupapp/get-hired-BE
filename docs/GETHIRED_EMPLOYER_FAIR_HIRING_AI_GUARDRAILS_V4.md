# GETHIRED EMPLOYER FAIR HIRING AND AI GUARDRAILS V4

**Document:** 27 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference — verified via code analysis

---

## 1. Overview

This document records the fair hiring and AI guardrail status of the GetHired employer panel as of the V4 pass. All findings are based on code analysis of frontend components and backend controller patterns. No AI-based candidate evaluation was found.

---

## 2. Match Signals: Advisory Only

### Implementation

Match signals are displayed in the job applicants component template. The following guardrails are confirmed in the code:

**`matchSignalLabel` fallback:** When no real signals are available from the API, the label displayed is "Match signals unavailable". No score is fabricated or implied.

**`hasAnyMatchSignal()` guard:** This function is called before rendering the match signals disclaimer. If no signals are present (empty list), the disclaimer is suppressed. This prevents a disclaimer appearing on an empty list, which could imply signals exist when they do not.

**Disclaimer text:** The match signals section includes an explicit advisory disclaimer sourced from `matchDisclaimer` in the API response. The disclaimer makes clear that signals are advisory and not a basis for employment decisions.

### Sorting

Applicants are not sorted by match score in the current codebase. The default sort order is by `dateApplied` or the API default. Employers cannot trigger a sort-by-score that would influence the visual prominence of lower-scored applicants.

### Auto-Rejection

No auto-rejection code was found. No applicant is hidden, filtered out, or marked ineligible based on a match score. Status changes require explicit human action via a modal confirmation.

**Status: PASS**

---

## 3. Application Snapshot

The snapshot card displays:

- `completenessScore` as a percentage (advisory: reflects profile completeness, not candidate quality)
- `matchLevel` as a badge (advisory: e.g., "High match", "Low match")
- `matchDisclaimer` as sourced from the API

All three are advisory display elements. None of them trigger automated actions. The employer reads them and decides independently.

**Status: PASS**

---

## 4. Video Responses: No Automated Evaluation

### Confirmed Behavior

Video responses submitted by applicants are played back via `VideoPreviewComponent` opened by `viewCv()` from the applicant list.

The component opens a video player. No calls to any of the following APIs or services were found in connection with video response playback or processing:

- Face detection or recognition APIs
- Voice analysis APIs
- Accent classification APIs
- Emotion detection APIs
- Personality scoring APIs
- Any third-party AI assessment service

Video responses are reviewed by the human employer. The employer forms their own judgment.

### Prohibited (Current and Future)

The following are prohibited in any future implementation:

- Automated face or appearance scoring of video responses
- Automated voice pitch, tone, or accent evaluation
- Automated emotion or sentiment scoring from video
- Automated personality inference from video
- Any score derived from video content used to rank, filter, hide, or auto-reject applicants
- Any video-derived score that is presented as an objective qualification assessment

This prohibition applies regardless of whether the signal is labeled "advisory." Video-derived signals carry disproportionate risk of encoding protected-attribute discrimination and are not to be added without a full legal and ethical review.

**Status: CONFIRMED — no automated video evaluation in codebase**

---

## 5. Company Scoping

All applicant data is scoped to the authenticated employer's company. The backend uses `verifyAuth` middleware and company ownership checks in the relevant controller.

`getJobBasicListOfCompany` uses `companyId` extracted from the authenticated user (via `verifyAuth`), not from a query parameter. This prevents an employer from querying applicants for another company's jobs.

**Status: PASS**

---

## 6. Certification Requirements

### Current Implementation

Employers can add certification requirements to a job posting (v1 implementation). These are stored as structured `certificationRequirements` FormArray items with fields: `name`, `type`, `importance`, `issuingAuthority`, `expiryRequired`, `verificationRequired`.

Certifications are displayed to applicants on the job detail page and can be used by applicants to self-identify whether they hold relevant credentials.

### What Is Not Implemented (Correct)

No `certificationRequirementFactor()` function or equivalent exists in the match scoring system. Certifications are not used as a scoring input in any match signal or match level calculation in the current codebase.

This is the correct behavior. Adding certification as a match factor without careful design could inadvertently create disparate impact on protected groups (e.g., certain licenses being less accessible to candidates from specific national origins or economic backgrounds).

**Prohibited:** `certificationRequirementFactor()` — must not be added without a legal and equity review.

**Status: PASS — certification not scored**

---

## 7. Human Decision Required for Status Changes

Applicant status changes are triggered via `ApplicantActionModal` (modal confirmation component). The employer must:

1. Click a status-change action on the applicant
2. A modal appears showing the proposed status change
3. Employer must confirm

No automated or programmatic status changes are applied based on scores, signals, or system-generated recommendations.

**Status: PASS**

---

## 8. Protected Attribute Policy

No code was found in the employer panel that:

- Surfaces applicant race, gender, national origin, religion, age, disability status, or other legally protected attributes
- Uses protected attributes as a filter, sort, or scoring input
- Exposes protected attributes in any dashboard, panel, or analytics view

Employer sees: name, application completeness score (advisory), match level (advisory), applied date, status, video response, and job-specific answers.

**Status: PASS — no protected attribute exposure found**

---

## 9. Guardrails Summary Table

| Guardrail | Status | Evidence |
|---|---|---|
| Match signals: advisory only | PASS | Disclaimer in template, matchDisclaimer from API |
| matchSignalLabel fallback | PASS | "Match signals unavailable" when empty |
| hasAnyMatchSignal() guard | PASS | Suppresses disclaimer on empty list |
| No auto-rejection | PASS | No auto-reject code found |
| No applicant hidden by score | PASS | No filter-by-score logic found |
| No sort by score | PASS | Sort by dateApplied or default |
| Video responses: human review only | PASS | No video AI API calls found |
| No face/voice/emotion/accent eval | PASS | No such calls found |
| Company scoping on applicant data | PASS | companyId from verifyAuth |
| Certifications: display only, not scored | PASS | No certificationRequirementFactor() |
| Human confirmation for status changes | PASS | ApplicantActionModal required |
| No protected attribute surfacing | PASS | None found in employer views |

---

## 10. Ongoing Monitoring

These guardrails should be re-verified on every code change that touches:

- Match scoring logic
- Applicant list rendering or filtering
- Snapshot card data binding
- Any new AI or ML service integration
- Certification handling
- Video response processing

The V4 pass confirms all guardrails as of 2026-06-24.
