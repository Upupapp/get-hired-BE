# Best Practices Plan — Company Profile Subtabs

## Decision: Local Tab Component (Not Child Routes)

### Options Considered
| Option | Pros | Cons |
|--------|------|------|
| Child routes (/recruiter/company/details/profile etc.) | Bookmarkable, browser back works | Requires new router config, risk of breaking existing company route, more code |
| Query param tabs (?tab=profile) | Bookmarkable without new routes | More component complexity, ActivatedRoute subscription needed |
| **Local stepper (chosen)** | Zero route changes, matches existing employer-settings.component pattern, safest | Tab state lost on navigation (acceptable for internal workspace) |

### Why Local Stepper
- Exact same pattern already used in `EmployerSettingsComponent` — proven, familiar to devs.
- Zero changes to routing modules — cannot break existing company navigation.
- `EmployerCompanyComponent` was already a thin wrapper; replacing it is safe.
- All data loads via NgRx store (`CompanyFacade`) which already handles caching.

## Data Strategy
- **Profile tab**: delegates 100% to existing `CompanyDetailsFormComponent`. Zero form changes.
- **Brand tab**: reads `company_details` and `company_logo` from store (read-only display with edit pointer to Profile tab). Missing DB fields shown as "Coming soon" empty states.
- **Benefits tab**: reads `work_setup_id` and `number_of_employee` from store. Missing DB fields shown as "Coming soon" empty states.
- **No new BE endpoints, no migrations, no new DB columns**.

## Animation Strategy
- Tab switch: Angular `mainAnimations` `[@animate]` on panel entry (y translate + fade).
- Active tab underline: CSS `transform: scaleX()` + `transition`.
- Tab button press: CSS `:active { transform: scale(0.97) }`.
- Empty state reveal: `@keyframes cp-reveal` (opacity + translateY).
- Skeleton shimmer: `@keyframes cp-skeleton-shimmer` on loading states.
- ALL animations: `@media (prefers-reduced-motion: reduce) { animation: none; transition: none; }`.

## Copy Rules Followed
- ALLOWED used: "Company Profile", "Employer Brand", "Benefits & Culture", "Tell candidates what makes your company worth joining.", "A complete company profile helps candidates understand who is hiring.", "You can publish jobs before completing every company detail.", "Optional", "Recommended".
- FORBIDDEN avoided: No fake reviews, no "Verified employer", no "AI will write your company profile", no invented benefits.

## Preserved Completely
- All existing company form fields (CompanyDetailsFormComponent not changed)
- Job create/edit/publish (no changes)
- Interview/video questions (no changes)
- Applicant flow (no changes)
- Public job detail company display (no changes)
- Company scoping (getUserCompany guard — no changes)
- No-company dialog flow (EmployerSettingsComponent still handles this)
