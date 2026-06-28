# Public & Applicant Display Log

## Public Company Profile
Route: `/companies/details?id=X`
Component: `PublicCompanyDetailsComponent`
Status: NOT CHANGED — no code touched, no data changed.

## Applicant Job Detail Company Display
Component: `company-snapshot.component` (in jobs module)
Status: NOT CHANGED — no code touched.

## Public Job Cards
Component: `company-card.component` (in companies module)
Status: NOT CHANGED.

## Job Detail Page (Public)
Views: `home/pages/company-details/` components
Status: NOT CHANGED.

## What Candidates See
Unchanged from pre-implementation:
- Company name, logo, industry on job cards
- Company details panel on job detail page
- Public company profile page if navigated directly

## Risk Assessment
ZERO risk — all public-facing and applicant-facing company display is in separate components
that were not modified. They all read from the same `gethired.companies` table via
unchanged API endpoints.
