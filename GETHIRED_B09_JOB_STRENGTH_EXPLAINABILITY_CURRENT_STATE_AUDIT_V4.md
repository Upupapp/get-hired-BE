# GETHIRED_B09_JOB_STRENGTH_EXPLAINABILITY_CURRENT_STATE_AUDIT_V4

Command: GETHIRED_B09_JOB_POST_STRENGTH_EXPLAINABILITY_AND_QUALITY_COACH_V4_SYSTEM_STITCH
Date: 2026-06-28

---

## Key Files

| File | Role |
|---|---|
| `src/app/job/services/job-readiness.service.ts` | Core scoring logic — pure, frontend-only |
| `src/app/job/job-create/job-create.component.ts` | Primary surface — evaluates readiness on form changes |
| `src/app/job/job-create/job-create.component.html` | Rail UI — chips, groups, tips |
| `src/app/job/job-create/job-create.component.scss` | Rail styles |
| `src/app/job/components/job-readiness-bar/job-readiness-bar.component.ts` | Bar variant (employer dashboard) |
| `src/app/job/components/job-readiness-bar/job-readiness-bar.component.html` | Bar HTML |
| `src/app/employer-panel/employer-jobs/employer-job-dashboard/employer-job-dashboard.component.ts` | Post-publish readiness widget |

---

## Pre-fix State

### Scoring (frontend-only, no backend involvement)
- Model: 4 levels `draft | basic | strong | excellent`
- `draft` = canPublish false (blockingItems.length > 0)
- `basic` = canPublish AND recommendedComplete < 3
- `strong` = canPublish AND recommendedComplete >= 3 AND < recommendedTotal
- `excellent` = canPublish AND recommendedComplete === recommendedTotal
- Required fields (9): jobTitle, jobTypeId, jobLevelId, jobCity, jobCountry, jobDescription, workSetupId, banner, companyId
- Recommended fields (7): duties, skills, requirements, companyLogo, companyOverview, interview, education

### Label issues found
- `getLevelLabel('draft')` → "Draft — required fields missing" — wordy, inconsistent
- `getLevelLabel('basic')` → "Required fields complete" — sounds like a final quality state; misleads employers into thinking publish-ready = optimised
- `getLevelLabel('strong')` → "Strong job post" — acceptable but inconsistent
- `getLevelLabel('excellent')` → "Excellent readiness" — awkward; "readiness" is the wrong noun for quality
- `job-readiness-bar.component.ts` had its OWN inline label mapping with the same problematic strings

### Single-axis model
- Only ONE chip shown in the rail: the level label
- No separation between readiness (can I publish?) and strength (how good is the post?)
- Employers reading "Required fields complete" may believe their job is fully optimised

### Improvements count
- Raw number displayed: `Recommended ({{ recommendationItems.length }})` — no label
- No "3 to Strong" or "2 to Excellent" framing

### Tooltip/info UI
- No tooltip or disclosure explaining tier meanings
- No mobile-safe "What this means" fallback

### Easy Job Posting
- `assistantPrefilled = true` is set in the TS when prefill data was used
- NO visual banner in the rail to communicate this to the recruiter

### Overclaiming copy
- Tips card (stepper 1): "A clear job title and work setup attract 3x more qualified applicants" — unsupported performance claim

### Subscription gate
- Already separate from readiness logic — no conflation found

### No-job-id fallback
- Not in the touched B09 surface — documented but not modified

### "Company successfully setup"
- Not found in touched files — documented but not modified

### Accessibility
- Chips have aria-labels: correct
- Improvements count: aria-label correct but visual label misleading (raw number)
- No color-only distinction (icon + text on all chips): good

---

## Root Cause Classification

| Issue | Classification |
|---|---|
| Single chip for both readiness and quality | Label ambiguity / publish readiness confused with post strength |
| "Required fields complete" as final destination | Publish readiness confused with post strength |
| "Excellent readiness" label | Naming inconsistency |
| Raw improvements count | Raw numeric badge lacks visual label |
| No tier explanation | Tooltip component missing / mobile explanation missing |
| Assistant banner not shown | Easy Job Posting handoff gap |
| Overclaim in tips | Overclaiming risk |

