# GETHIRED PROFILE SKILLS TAXONOMY V6
**Date:** 2026-07-01 | **Status:** Unchanged from V5 — LinkedIn adds no skills data

---

## Current State

Skills are stored in `gethired.applicant_skills`, linked by `applicant_profile_id`. The current model:

| Aspect | Status |
|---|---|
| Schema | `applicant_skills` table with FK to `applicants_profile` |
| Entry method | Applicant self-entry via profile form |
| Taxonomy structure | Flat list (no hierarchy, no categories confirmed) |
| Normalization | None confirmed — free-text strings per skill |
| Verification | None — unverified |
| LinkedIn import | Not implemented — LinkedIn skills endorsement API not used |

---

## LinkedIn Impact on Skills

LinkedIn OIDC flow uses only `openid profile email` scope. LinkedIn skills data requires the `r_member_social` scope (deprecated/restricted) or newer permissions not available to standard apps. **GetHired does not import LinkedIn skills.** A LinkedIn user starts with 0 skills in `applicant_skills`, contributing 0 to the 15-point skills weight.

---

## Skills in the Completeness Score

- Weight: 15 points (of 100)
- Condition: `skills[].length > 0` (at least 1 skill)
- Suggestion text: "Add skills to improve your match."

The threshold is binary (any skill = full 15 points). This means a user who adds one skill immediately jumps 15 points. For LinkedIn users, this is the second-most-impactful action after completing basic info (20 points).

---

## Skills in MATCH Engine

The MATCH engine uses `skills[]` from the applicant profile as a matching signal against job requirements. Empty skills array for LinkedIn new users means:
- Zero skill-match contribution until manual entry
- Match scores will be low even for relevant jobs until skills are entered

---

## Taxonomy Improvements (Backlog)

| Item | Priority | Notes |
|---|---|---|
| Skill normalization (aliases) | P3 | "JavaScript" vs "JS" treated as different skills |
| Skill categories/taxonomy | P3 | No grouping (technical/soft/domain) |
| LinkedIn skill import (if scope available) | P2 | Requires expanded OAuth scope |
| Skill endorsement/verification signals | P3 | Future — third-party verification |
| Skill level indicators | P3 | No beginner/intermediate/expert |

---

## No Changes in V6

Skills taxonomy is unchanged. No safe fixes needed this pass.
