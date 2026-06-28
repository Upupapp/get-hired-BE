# Test Log — Company Profile Subtabs

## Build Verification
Command: `npx ng build --configuration production`
Result: SUCCESS — 0 errors, 0 warnings from changed files.
Pre-existing warnings (not from our changes):
- `add-contact-group.component.scss` autoprefixer warnings (pre-existing, unrelated)

## Manual Test Cases (for human QA)

### TC-1: Default Tab
- Navigate to /recruiter/company/details
- Expect: "Company Profile" tab is active (underline visible)
- Expect: `app-company-details-form` renders with existing company data

### TC-2: Tab Switch — Brand
- Click "Employer Brand" tab
- Expect: Panel changes, underline moves
- Expect: Company logo (if set) is displayed
- Expect: Company description (if set) is displayed in read-only preview
- Expect: Mission & Values shows "Coming soon"
- Expect: Why Work With Us shows "Coming soon"

### TC-3: Tab Switch — Benefits
- Click "Benefits & Culture" tab
- Expect: Work arrangement chip shown (if workSetupId set)
- Expect: Team size chip shown (if numberOfEmployee > 0)
- Expect: Health/Insurance, Leave, Learning all show "Coming soon"

### TC-4: Empty Company (no details set)
- Company with no logo, no details, no work setup
- Brand tab: should show empty states for both logo and overview
- Benefits tab: should show empty states for work arrangement and team size

### TC-5: Profile Save Refreshes Brand/Benefits
- On Profile tab, update company description, save
- Switch to Brand tab
- Expect: updated description reflected (store refreshed via `onProfileUpdate()`)

### TC-6: Reduced Motion
- Enable OS reduced-motion preference
- Expect: Tab underline appears instantly (no slide)
- Expect: Panel change has no y-slide
- Expect: Empty state appears instantly

### TC-7: Keyboard Navigation
- Tab key to reach subtab nav
- Arrow keys / Tab to move between tab buttons
- Enter/Space to activate tab
- Verify focus-visible outline appears

### TC-8: No-Company State
- Employer account with no company set up
- /recruiter/company/settings triggers CompanyBasicComponent dialog (unchanged)
- /recruiter/company/details: company$ will be null → skeleton shown (acceptable)

### TC-9: Existing Flows Unaffected
- Create job: works (no job-related code touched)
- Add company user: works (company-users tab in /settings unchanged)
- Applicant applies to job: works (applicant flow untouched)
- Video answer: works (interview flow untouched)

## Unit Tests
Existing unit tests not modified. No new unit tests written in this version (backlogged).
`company.guard.spec.ts` — not modified, should still pass.
