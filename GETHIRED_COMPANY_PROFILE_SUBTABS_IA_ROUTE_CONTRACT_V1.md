# IA & Route Contract — Company Profile Subtabs

## Navigation Structure

```
/recruiter  (EmployerPanelModule)
  /dashboard
  /jobs/...
  /company  → EmployerSettingsModule
    /details   → EmployerCompanyComponent  ← MODIFIED: now has 3 subtabs
    /settings  → EmployerSettingsComponent (unchanged: 3-tab: Company Details / Users / Account)
  /contacts/...
  /interview/...
  /subscription/...
  /messages
```

## Company Profile Subtabs (local, not router-based)

```
/recruiter/company/details
  [Tab 1] Company Profile   (default active)
    └── app-company-details-form (existing, unchanged)
  [Tab 2] Employer Brand
    └── Reads company$ from NgRx store (no new API call)
    └── Shows: company_details, company_logo
    └── Empty states for: mission, values, why-work-with-us, culture
  [Tab 3] Benefits & Culture
    └── Reads company$, workSetup$ from NgRx store
    └── Shows: work_setup_id (via setup list), number_of_employee
    └── Empty states for: health/insurance, leave, learning
```

## What Did NOT Change
- `/recruiter/company` route config in `employer-panel.module.ts` — untouched
- `employer-settings.module.ts` routes array — untouched
- `EmployerSettingsComponent` (the /settings path) — untouched
- All applicant routes — untouched
- All admin routes — untouched
- All public routes — untouched

## Guard Chain (unchanged)
```
AuthGuard (global, /recruiter requires auth)
  └── EmployerGuard (role === '2')
       └── InternalEmployerGuard (commented out, was optional)
```

## Subtab State
- State lives in `EmployerCompanyComponent.activeTab: number` (local, memory only)
- Default: tab 1 (Company Profile)
- State resets on component destroy (navigation away and back)
