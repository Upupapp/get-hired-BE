# Brand Subtab — Implementation Log

## Approach
Brand tab reads company data from NgRx store (`company$ = companyFacade.companyDetails$`). No new API call — data is already loaded when the component initialises (`ngOnInit` calls `companyFacade.getCompany()`).

## Fields Shown (from existing DB)
| Section | Source | Display |
|---------|--------|---------|
| Company Logo | `company.companyLogoUrl` | Read-only `<img>` with border/padding; edit pointer to Profile tab |
| Company Overview | `company.companyDetails` | Read-only `<p>` in styled preview box; empty state if null |

## Fields Backlogged (not in DB)
| Section | Shown As |
|---------|----------|
| Mission & Values | "Coming soon" empty state with icon |
| Why Work With Us | "Coming soon" empty state with icon |

## Copy Used
- "Tell candidates what makes your company worth joining."
- "Optional", "Recommended" badges
- "Coming soon" for backlogged fields (no fake content)
- Edit pointers use inline tab-jump buttons: `(click)="selectTab(1)"`

## Empty States
- Logo: section hidden if no logo URL (conditional `*ngIf="company.companyLogoUrl"`)
- Overview: shows reveal-animated empty state if `company.companyDetails` is null/empty
- Mission/Values, Why Work With Us: always show "Coming soon" state (honest about missing fields)

## Security
- No new data fetch — reads from existing store
- No cross-company data access (same store selector used by all existing company components)
- No fake content generated

## Status: COMPLETE (existing fields only; backlogged fields shown as honest empty states)
