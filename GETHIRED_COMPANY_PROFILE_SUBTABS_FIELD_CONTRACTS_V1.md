# Field Contracts — Company Profile Subtabs

## DB columns that exist (gethired.companies)
| DB Column | FE Model Field | Used In Subtab | Notes |
|-----------|---------------|----------------|-------|
| company_id | companyId | — | PK |
| company_logo | companyLogoUrl | Profile (upload), Brand (display) | Logo upload supported |
| company_name | companyName | Profile | Required |
| company_details | companyDetails | Profile (edit), Brand (read-only display) | Free text, maps to "Company Overview" in Brand tab |
| industry_id | industryId | Profile | FK to industry table |
| work_setup_id | workSetupId | Profile (edit), Benefits (read-only chip) | FK to work_setup table |
| number_of_employee | numberOfEmployee | Profile (edit), Benefits (read-only chip) | int |
| company_email | companyEmail | Profile | Required, Validators.email |
| company_city | companyCity | Profile | Part of address |
| company_contact_number | companyContactNumber | Profile | Optional |
| company_country | companyCountry | Profile | Part of address |
| company_adress (typo) | companyAddress | Profile | Address line |
| company_state | companyState | Profile | From address form |
| company_mapurl | companyMapUrl | Profile | From address form |
| company_suburb | companyTown | Profile | From address form |
| company_zip | companyZip | Profile | From address form |
| company_address_one | companyAddressOne | Profile | From address form |
| created_at | createdAt | — | Read-only |
| created_by | createdBy | — | Read-only |
| updated_at | updatedAt | — | Read-only |

## Fields NOT in DB (shown as empty states in Brand/Benefits tabs)
| Intended Field | Tab | Status |
|----------------|-----|--------|
| mission | Brand | Backlogged — no DB column |
| values | Brand | Backlogged — no DB column |
| why_work_with_us | Brand | Backlogged — no DB column |
| work_culture | Brand | Backlogged — no DB column |
| health_insurance | Benefits | Backlogged — no DB column |
| leave_flexibility | Benefits | Backlogged — no DB column |
| learning_growth | Benefits | Backlogged — no DB column |
| company_website | Profile | Backlogged — no DB column |
| company_tagline | Brand | Backlogged — no DB column |

## API Contracts (unchanged)
| Endpoint | Method | Used By | Change |
|----------|--------|---------|--------|
| /company/usercompany | GET | CompanyFacade.getCompany() | None |
| /company/update | PUT | CompanyFacade.updateCompany() | None |
| /options/setuplist | GET | CompanyFacade.getSetup() | None |
| /company/industries | GET | CompanyFacade.getIndustry() | None |

## Validation Rules (unchanged from CompanyDetailsFormComponent)
- companyEmail: required, email format
- companyName: required
- All other fields: optional
