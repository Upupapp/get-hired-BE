# GETHIRED_JOB_READINESS_BAR_CHIPS_CONTRACT_V1

## JobReadinessService Contract

### Input: `JobReadinessInput`
| Field | Type | Used for |
|-------|------|---------|
| jobTitle | string? | Required check |
| jobTypeId | number? | Required check (mirrors publishJobPost) |
| jobLevelId | number? | Required check |
| jobCity | string? | Required check |
| jobCountry | string? | Required check |
| jobDescription | string? | Required check |
| jobDuties | string? | Recommended check |
| workSetupId | number? | Required check |
| jobBanner | string? | Required check (OR bannerFile) |
| bannerFile | any[]? | Required check (OR jobBanner) |
| companyId | string? | Required check |
| skills | any[]? | Recommended check |
| requirements | any[]? | Recommended check |
| goodToHave | any[]? | Not checked (display only) |
| educationalBackground | any[]? | Recommended check |
| certificationRequirements | any[]? | NEVER blocking (B04 extension) |
| interviewQuestions | any[]? | NEVER blocking (B04) |
| interviewTemplateId | string? | Not checked |
| companyLogoUrl | string? | Recommended check |
| companyDetails | string? | Recommended check |

### Output: `JobReadinessResult`
| Field | Type | Description |
|-------|------|-------------|
| canPublish | boolean | All required checks pass |
| readinessLevel | 'draft'\|'basic'\|'strong'\|'excellent' | Level label |
| readinessPercent | number | 0-100, (done/total)*100 |
| requiredTotal | number | Count of required checks |
| requiredComplete | number | Required checks passed |
| recommendedTotal | number | Count of recommended checks |
| recommendedComplete | number | Recommended checks passed |
| blockingItems | JobReadinessItem[] | Missing required fields |
| recommendationItems | JobReadinessItem[] | Missing recommended fields |
| completedItems | JobReadinessItem[] | Passed required + recommended |
| optionalItems | JobReadinessItem[] | Always 4 items (never blocking) |
| sectionStatuses | JobReadinessSectionStatus[] | Per-section status |
| publicDisplayWarnings | JobReadinessItem[] | Candidate-quality warnings |
| nextBestAction | JobReadinessAction? | First actionable suggestion |

### Required Checks (9 total)
1. Job title present (form-required)
2. Employment type selected (jobTypeId)
3. Job level selected (jobLevelId)
4. Job location city (jobCity)
5. Job location country (jobCountry)
6. Job description present (jobDescription)
7. Work setup selected (workSetupId)
8. Banner image (bannerFile[0] OR jobBanner)
9. Company valid (companyId)

### Recommended Checks (7 total)
1. Responsibilities (jobDuties)
2. Skills added
3. Required qualifications (requirements)
4. Company logo (companyLogoUrl)
5. Company overview (companyDetails)
6. Interview questions (never blocking — B04)
7. Educational background

### Optional Items (always shown, 4 items)
1. Video questions optional
2. Brand details optional
3. Certifications optional
4. Benefits optional

### Readiness Level Formula
- draft: canPublish === false
- basic: canPublish === true AND recommendedComplete < 3
- strong: canPublish === true AND recommendedComplete >= 3 AND < recommendedTotal
- excellent: canPublish === true AND recommendedComplete === recommendedTotal

### Percent Formula
readinessPercent = Math.min(100, Math.round((requiredComplete + recommendedComplete) / (requiredTotal + recommendedTotal) * 100))

## Component Inputs/Outputs

### JobReadinessBarComponent
- Input: `result: JobReadinessResult | null`
- No outputs
- Shows: skeleton when null, level chip + bar + sublabel + next action when loaded

### JobReadinessChipsComponent
- Input: `result: JobReadinessResult | null`
- Output: `jumpToSection: EventEmitter<string>` (emits sectionId)
- Shows: blocking chips (red) → recommended (amber) → complete (green) → optional (grey)
