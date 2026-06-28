# Current State Audit — Company Profile Subtabs

## Route Mapping
| URL | Module | Component |
|-----|--------|-----------|
| /recruiter/company | EmployerPanelModule | loads EmployerSettingsModule |
| /recruiter/company/details | EmployerSettingsModule | EmployerCompanyComponent |
| /recruiter/company/settings | EmployerSettingsModule | EmployerSettingsComponent (has 3-tab wizard: Company Details / Company Users / Account Settings) |

## What /recruiter/company/details rendered BEFORE this change
`EmployerCompanyComponent` was a stub that rendered `<app-company-details>`, which calls `CompanyFacade.getCompany('')` and displays a read-only banner plus a job posts list. NO editable fields, no subtabs.

## What /recruiter/company/settings rendered (unchanged)
`EmployerSettingsComponent` had its own 3-tab wizard using `app-tab-selectors`:
1. Company Details → `app-company-details-form` (full editable form)
2. Company Users → user management
3. Account Settings → personal account

## Companies Table Columns (gethired.companies)
```
company_id          varchar PK
company_logo        varchar
company_name        varchar NOT NULL
company_details     varchar (overview/description)
industry_id         int4 FK
work_setup_id       int4 FK
number_of_employee  int4
company_email       varchar
company_city        varchar
company_contact_number varchar
company_country     varchar
company_adress      varchar (typo in DDL)
created_date        timestamp
created_by          varchar FK → users.uid
```
Plus extended fields added via ALTER (not in base DDL):
```
company_state       varchar
company_mapurl      varchar
company_suburb      varchar (used as company_town in code)
company_zip         varchar
company_address_one varchar
updated_at          timestamp
```

## Fields NOT in DB (no brand/benefits schema)
- mission, values, why_work_with_us, culture — NOT PRESENT
- benefits, perks, health_insurance, leave, learning — NOT PRESENT
- company_website — NOT PRESENT (no column found)
- company_tagline — NOT PRESENT

## Existing Brand/Benefits Context
`company_details` is the only free-text candidate-facing field. `work_setup_id` covers work arrangement. `number_of_employee` covers team size. All others: not in DB.

## Logo Upload Support
YES — `uploadInStorage("Company-Logo", ...)` in companiesController.js; form has `app-file-upload` component; logo URL stored in `company_logo`.

## Tab Component
`app-tab-selectors` (shared component, `TabSelectorsComponent`) — simple stepper using numbered IDs, emits `changeStepper`. Used in `employer-settings.component`.

## No-Company Guard
`EmployerSettingsComponent` reads `companyId` from localStorage. If null → opens `CompanyBasicComponent` dialog to create initial company.

## Public Company Profile
`/companies/details?id=X` → `public-company-details` component. Separate public route. No change needed.

## Security Check
`getUserCompany(req.user.uid)` used in all write endpoints. BOLA fixes already applied. No change made.
