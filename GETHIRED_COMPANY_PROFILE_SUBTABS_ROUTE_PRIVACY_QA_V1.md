# Route & Privacy QA — Company Profile Subtabs

## Route Guard Chain
| Route | Guards | Change |
|-------|--------|--------|
| /recruiter | AuthGuard (role: '2') | Unchanged |
| /recruiter/company/details | Inherited EmployerGuard | Unchanged |
| /recruiter/company/settings | Inherited EmployerGuard | Unchanged |

## PASS: Company Scoping
- Brand tab reads company$ from NgRx store
- Store is populated by `getUserCompany(uid)` on the backend — always scoped to the authenticated employer
- No company_id passed in request body from frontend for reads
- Employer cannot see another company's data by manipulating the UI

## PASS: No Cross-Company Data Leakage
- workSetup$: reads from `/options/setuplist` (reference data, not company-specific)
- company$: reads from `/company/usercompany` (scoped to caller's uid)
- industry$: reads from `/company/industries` (reference data)

## PASS: No Applicant Data Exposed
- Brand and Benefits tabs show ZERO applicant data
- No protected traits (gender/civil_status/date_of_birth) are accessed

## PASS: No Auth Weakening
- No guard changes
- No middleware changes
- No new unauthenticated endpoints

## PASS: No Fake Content
- Mission/values/benefits shown as "Coming soon" — not invented content
- No fake reviews, ratings, testimonials, awards
- No "Verified employer" claim

## PASS: No Payment/Subscription Change
- Subscription route: untouched
- Subscription checks in job-create flow: untouched

## PASS: Tab Navigation Security
- Subtabs are local state (number 1/2/3) — no URL exposure
- No security boundary crossed by tab switch
- `selectTab()` only sets `this.activeTab` integer

## VERDICT: All route & privacy checks pass
