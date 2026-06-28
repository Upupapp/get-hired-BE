# Benefits Subtab — Implementation Log

## Approach
Benefits tab reads `company$` and `workSetup$` from NgRx store. No new API calls. Backlogged fields shown as honest "Coming soon" empty states.

## Fields Shown (from existing DB)
| Section | Source | Display |
|---------|--------|---------|
| Work Arrangement | `company.workSetupId` + `workSetup$` list | Chip showing setup name (e.g. "Remote", "Hybrid"); empty state if null |
| Team Size | `company.numberOfEmployee` | Chip showing "N employees"; empty state if 0/null |

## Fields Backlogged (not in DB)
| Section | Shown As |
|---------|----------|
| Health & Insurance | "Coming soon" empty state |
| Leave & Flexibility | "Coming soon" empty state |
| Learning & Growth | "Coming soon" empty state |

## Edit Flow
- Work Arrangement and Team Size are read-only in Benefits tab.
- Each shows an inline link button: `(click)="selectTab(1)"` → jumps to Profile tab where `workSetupId` and `numberOfEmployee` are editable.

## Copy Used
- "Benefits and culture details help candidates decide if your company is the right fit."
- "Optional" badge on all sections
- "Recommended" badge on Work Arrangement
- "Coming soon" for backlogged fields
- No invented benefits, no fake claims

## Empty State Logic
- Work Arrangement: `*ngIf="company.workSetupId"` with ng-template fallback
- Team Size: `*ngIf="company.numberOfEmployee && company.numberOfEmployee > 0"`
- Backlogged: always-shown "Coming soon" state

## Security
- No new data fetch
- `workSetup$` uses same setup list selector already used by `CompanyDetailsFormComponent`
- No protected applicant data touched

## Status: COMPLETE (2 existing fields surfaced; backlogged fields shown as honest empty states)
