# Completion Model Log

## Profile Completeness Signals (visual feedback for employer)

### Current Implementation
The existing form shows a save button and success dialog. No percentage-based completion score implemented in this version.

### Available Completeness Signals (using existing fields)
An employer could be considered "complete" when they have:

| Field | Weight | Available Now |
|-------|--------|---------------|
| Company Name | Required | Yes |
| Company Email | Required | Yes |
| Company Logo | Recommended | Yes |
| Company Description | Recommended | Yes (`company_details`) |
| Industry | Recommended | Yes |
| Work Setup | Recommended | Yes (`work_setup_id`) |
| Number of Employees | Optional | Yes |
| Address | Optional | Yes |
| Contact Number | Optional | Yes |

### Backlog: Completion Score Widget
A completion percentage (e.g., "Profile 60% complete") would use the above fields.
Implementation would require:
1. Subscribing to `company$` in `EmployerCompanyComponent`
2. Computing score as: filled_recommended_fields / total_recommended_fields * 100
3. Displaying as a progress bar in the subtab workspace header

This is NOT implemented in this version — considered a follow-up enhancement.

## Tab-Level Completeness
- Profile tab: complete if `companyName` + `companyEmail` + `companyDetails` + `company_logo` all set
- Brand tab: always shows some content (reads from Profile data); "Recommended" badges guide completion
- Benefits tab: partially complete if `work_setup_id` set; otherwise nudges to Profile tab

## No Fake Completion Claims
We never show "Profile verified" or "100% complete" unless all required + recommended fields are truly filled.
