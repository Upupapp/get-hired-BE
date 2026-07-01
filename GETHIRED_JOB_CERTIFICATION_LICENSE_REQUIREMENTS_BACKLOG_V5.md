# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — BACKLOG V5
**Date:** 2026-07-01

---

## Priority: P1 (High Value, Next Sprint)

| ID | Item | Source |
|---|---|---|
| CERT-P1-01 | Add BE maxLength validation (200) for `name` and `issuingAuthority` in `saveCertificationRequirements()` | SECURITY_PRIVACY_QA_V5 |
| CERT-P1-02 | Add BE max-rows cap: if `certificationRequirements.length > 10`, reject with 422 | SECURITY_PRIVACY_QA_V5 |
| CERT-P1-03 | Write automated tests: public API field exposure, BOLA, blank name filter, full replacement, type enum validation | TEST_LOG_V5 |
| CERT-P1-04 | Autosave race condition guard: add `formInitialized: boolean` flag; autosave fires only after flag is set | DRAFT_JOB_POSTING_OS_INTEGRATION_V5, SAVE_UPDATE_SEMANTICS_V5 |

---

## Priority: P2 (Valuable, Later Sprint)

| ID | Item | Source |
|---|---|---|
| CERT-P2-01 | Accessibility: Remove button (×) needs `aria-label="Remove [name]"` | ACCESSIBILITY_QA_V5 |
| CERT-P2-02 | Accessibility: Focus management after row add (focus moves to new name field) | ACCESSIBILITY_QA_V5 |
| CERT-P2-03 | Accessibility: Focus management after row remove (focus moves to Add button) | ACCESSIBILITY_QA_V5 |
| CERT-P2-04 | Accessibility: Error message `aria-describedby` link to name field | ACCESSIBILITY_QA_V5 |
| CERT-P2-05 | Mobile: Remove button (×) touch target padded to 44×44px | MOBILE_QA_V5 |
| CERT-P2-06 | Mobile: Type/Importance dropdowns stack vertically on `sm` breakpoint | MOBILE_QA_V5 |
| CERT-P2-07 | Mobile: Importance badge overflow handling at 320px | MOBILE_QA_V5 |
| CERT-P2-08 | Performance: Batch-load certificationRequirements for job list endpoints (avoid N+1 at scale) | PERFORMANCE_QA_V5 |
| CERT-P2-09 | i18n: Add missing i18n keys for cert section (list in PUBLIC_APPLICANT_DISPLAY_V5) | PUBLIC_APPLICANT_DISPLAY_V5 |
| CERT-P2-10 | Applicant application notice: "This job lists required credentials. The employer may ask for proof..." (with fair-hiring caveat) | PUBLIC_APPLICANT_DISPLAY_V5, COPY_CLAIMS_QA_V5 |
| CERT-P2-11 | Publish checklist item: "Optional: Certifications & Licenses" label in publish step UI | EMPLOYER_FORM_V5 |
| CERT-P2-12 | FE validation gap: warn on partially filled row (name set but type default; or vice versa) before publish | EMPLOYER_FORM_V5 |
| CERT-P2-13 | Partially filled row warning in FE (row with name but no type shows amber border) | EMPLOYER_FORM_V5 |

---

## Priority: P3 (Deferred / V2)

| ID | Item | Source |
|---|---|---|
| CERT-P3-01 | JobPosting JSON-LD: include certificationRequirements in `description` or `qualifications` property once base JSON-LD is implemented | JOBPOSTING_SCHEMA_V5 |
| CERT-P3-02 | MATCH V2: if/when GetHired implements credential matching, use canonicalKey for normalization; DO NOT expose to public in V1 | REFERENCE_LIBRARY_V5 |
| CERT-P3-03 | Industry-specific credential preset picker (e.g. Healthcare → common PRC licenses auto-suggested) | EMPLOYER_FORM_V5 |
| CERT-P3-04 | Canonical key normalization service (employer types "PRC" → mapped to `prc_license_ph`) | REFERENCE_LIBRARY_V5 |
| CERT-P3-05 | Employer analytics: "Which credentials do applicants list in their profiles for this job?" (after PROFILE data is richer) | — |
| CERT-P3-06 | V2 MATCH integration with explicit fair-hiring guardrails: MATCH evidence only, never auto-reject | VISIBILITY_RULES_V5 |

---

## Out of Scope (V1 Absolute Hard Limits)

Per the command's absolute DO-NOT list — these must NEVER be implemented under this feature:

- ❌ MATCH score modification or `certificationRequirementFactor()`
- ❌ Applicant credential auto-matching or auto-scoring
- ❌ Auto-reject / auto-filter / downrank applicants based on credentials
- ❌ "Verified by GetHired" or any fake verification badge
- ❌ Blocking the Apply button based on credentials
- ❌ Comparing applicant certificates from profiles to job requirements

---

## Running Backlog Count

| Priority | Items |
|---|---|
| P1 | 4 |
| P2 | 13 |
| P3 | 6 |
| Out of Scope (hard) | 6 |
