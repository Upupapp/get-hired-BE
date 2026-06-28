# GETHIRED_B09_JOB_STRENGTH_TIER_EXPLAINABILITY_CONTRACT_V4

Command: GETHIRED_B09_JOB_POST_STRENGTH_EXPLAINABILITY_AND_QUALITY_COACH_V4_SYSTEM_STITCH
Date: 2026-06-28

---

## Readiness States (Axis 1 — publish gate)

| State | Chip Label | Class | Condition |
|---|---|---|---|
| Missing required | "Required fields missing" | `gh-jc-readiness-chip--missing` | `!canPublish` |
| Ready to publish | "Required fields complete" | `gh-jc-readiness-chip--ready` | `canPublish` |

## Strength States (Axis 2 — quality guidance, shown only when canPublish)

| State | Chip Label | Class | Condition |
|---|---|---|---|
| Needs improvement | "Needs improvement" | `gh-jc-strength-chip--needs-improvement` | `level === 'basic'` |
| Strong | "Strong" | `gh-jc-strength-chip--strong` | `level === 'strong'` |
| Excellent | "Excellent" | `gh-jc-strength-chip--excellent` | `level === 'excellent'` |

## Guidance Text (inline, not tooltip-only)

| Condition | Text |
|---|---|
| !canPublish | "Complete the required fields to publish. Then add recommended details to improve post strength." |
| basic, toStrong > 0 | "Ready to publish. Add {N} improvement(s) to reach Strong." |
| basic, edge case (all recs done but basic) | "Ready to publish." |
| strong | "Strong post. Add {N} improvement(s) to reach Excellent." |
| excellent | "Excellent post. Your post includes the key details candidates need." |

## Improvement Count Visual Label

| Condition | Label |
|---|---|
| basic, toStrong <= count | "{toStrong} to Strong" |
| basic, otherwise | "{N} improvement(s)" |
| strong | "{N} to Excellent" |
| excellent / count === 0 | "All recommended details added" |
| fallback | "{N} improvement(s)" |

## "What this means" Disclosure Content

**Required fields complete:** This job can be published. It does not mean the post is optimised — add recommended details to reach Strong or Excellent.
**Needs improvement:** Ready to publish, but missing recommended details that help candidates understand the role.
**Strong:** Includes required fields plus useful details such as responsibilities, qualifications, skills, or company overview.
**Excellent:** Includes most key details candidates use to decide whether to apply.
**Suggested improvements:** Not required to publish, but make the post clearer and more useful to candidates.

## Easy Job Posting Assistant Banner

When `assistantPrefilled === true`:
- Banner title: "Draft created with GetHired Assistant"
- Banner body: "Review imported details and complete any missing fields before publishing."
- Style: coral-tinted banner, `bi-stars` icon

## Pluralization Rules

- `1 improvement` (singular)
- `2 improvements` (plural)
- `1 to Strong` / `2 to Strong`
- `1 to Excellent` / `2 to Excellent`
- Never: "1 improvements" or "NaN improvements" or "undefined improvements"

## Forbidden Copy

- "Guaranteed applicants"
- "3x more qualified applicants"
- "Rank higher"
- "AI matched"
- "500,000 candidates will see this"
- "Excellent means top candidates apply"
- "Strong jobs get more applicants"

