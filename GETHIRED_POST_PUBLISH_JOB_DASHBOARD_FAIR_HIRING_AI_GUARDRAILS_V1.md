# GETHIRED POST-PUBLISH JOB DASHBOARD — Fair Hiring & AI Guardrails V1

Generated: 2026-06-25 | Mission: B05 WORLD_CLASS_TECHY_V1

## Forbidden Copy — Confirmed ABSENT

The following claims are FORBIDDEN by B05 and were verified absent from all new/changed files:

| Forbidden Phrase | Present? |
|-----------------|---------|
| "Guaranteed applicants" | NO |
| "AI will find the best candidates" | NO |
| "Your job is shown to all job seekers" | NO |
| "Top candidates are waiting" | NO |
| "Auto-screened applicants" | NO |
| "AI evaluates video answers" | NO |

## Allowed Copy — Used

| Phrase | Location |
|--------|----------|
| "Your job is published." | Success banner |
| "View public job" | Action card label |
| "Review applicants" | Action card + empty state button |
| "Applicants will appear here when candidates apply." | Empty state body |
| "Create another job" | Action card label |
| "Edit job post" | Action card label |
| "Back to all jobs" | Action card label |

## MATCH / JobCompatibilityService — UNCHANGED

- `JobCompatibilityService` — not imported, not called, not referenced in any changed file
- `JobApplicantsComponent.loadMatchSignals()` — unchanged
- Match signal display in applicant list — unchanged
- No MATCH claims on the dashboard (the dashboard has no applicant data)

## Applicant Data — NOT Exposed

- The dashboard makes NO calls to applicant endpoints
- No applicant names, CVs, scores, or profiles visible on the dashboard
- Cross-company data exposure: impossible (no applicant API calls at all)

## Protected Trait Scoring

- No scoring logic of any kind on the dashboard
- No demographic inference, no AI-generated rankings
- Empty state shows zero count / zero names — no inferences possible
