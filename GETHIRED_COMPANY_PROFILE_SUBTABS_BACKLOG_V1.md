# Backlog — Company Profile Subtabs

## HIGH PRIORITY

### BL-01: Brand Fields — DB Migration
Add columns to gethired.companies:
- `company_mission VARCHAR NULL`
- `company_values TEXT NULL`
- `company_why_join TEXT NULL`
- `company_culture TEXT NULL`
- `company_website VARCHAR NULL`
- `company_tagline VARCHAR(200) NULL`

Then expose in:
- `mappedCompany()` in companiesController.js
- `updateCompany` query
- Brand subtab form fields

### BL-02: Benefits Fields — DB Migration
Add to gethired.companies (or a new `company_benefits` JSON column):
- `company_benefits JSONB NULL` — flexible: stores { health, leave, learning, perks: [] }

Or separate table: `gethired.company_benefit_items (id, company_id, category, description)`

Then expose in Benefits subtab as editable sections.

### BL-03: Profile Completeness Score Widget
Add a completion progress bar to the workspace header showing:
- How many of the recommended fields are filled
- "60% complete" style indicator
- Green checkmark when all recommended fields are present

### BL-04: Public Company Profile Route Polish
Route `/companies/details?id=X` exists but may benefit from:
- Showing brand fields (mission, values) when they exist (after BL-01)
- Showing benefits section (after BL-02)

### BL-05: Unit Tests for EmployerCompanyComponent
Write Angular unit tests:
- Renders 3 tabs
- `selectTab(2)` sets `activeTab` to 2
- `onProfileUpdate()` calls `companyFacade.getCompany()`
- Brand tab shows company_details when present
- Benefits tab shows work setup chip when workSetupId set

## MEDIUM PRIORITY

### BL-06: Company Website Field
Add `company_website VARCHAR` to companies table.
Surface on Profile tab (input) and Brand tab (display with icon).

### BL-07: Subtab State Persistence
Use query params (`?tab=brand`) so refreshing the page returns to the same tab.
Requires `ActivatedRoute` + `Router.navigate` in `selectTab()`.

### BL-08: Completion Score Analytics
Instrument `company_profile_completeness` event on component load.

### BL-09: Cover Photo / Banner
Add `company_banner` column (exists in jobhunt schema, not gethired schema).
Surface in Brand tab as a banner image upload.

## LOW PRIORITY

### BL-10: Rich Text Editor for Overview
Replace plain textarea with a lightweight rich text editor (e.g. ngx-quill)
for better candidate-facing formatting.

### BL-11: Industry Display in Brand Tab
Show industry name (e.g. "Technology") as a chip in Brand tab alongside overview.
Already available via `company.companyIndustryName` from store.
