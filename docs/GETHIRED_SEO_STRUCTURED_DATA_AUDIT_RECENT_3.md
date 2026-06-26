# GetHired SEO Structured Data Audit — RECENT_3
**Date:** 2026-06-26
**Scope:** JobPosting JSON-LD fields available vs. missing; Organization and WebSite JSON-LD; BreadcrumbList.

---

## JobPosting — Field Coverage

Schema.org `JobPosting` required fields for Google for Jobs eligibility are marked [REQUIRED]. Recommended fields are [RECOMMENDED]. Optional enhancements are [OPTIONAL].

| Field | Schema.org Required? | Status | Source in code | Notes |
|-------|---------------------|--------|----------------|-------|
| `@context` | [REQUIRED] | PRESENT | hardcoded `'https://schema.org'` | Correct |
| `@type` | [REQUIRED] | PRESENT | hardcoded `'JobPosting'` | Correct |
| `title` | [REQUIRED] | PRESENT | `job.jobTitle` | |
| `description` | [REQUIRED] | PRESENT (risk) | `this.stripHtml(job.jobDescription \|\| '')` | Empty string if `jobDescription` null — Google may reject |
| `datePosted` | [REQUIRED] | PRESENT | `this.toIso(job.createdAt)` | ISO format ✓ |
| `hiringOrganization.name` | [REQUIRED] | PRESENT | `job.company_name \|\| job.companyName \|\| job.companyDetails` | Three-level fallback |
| `hiringOrganization.@type` | [REQUIRED] | PRESENT | hardcoded `'Organization'` | |
| `jobLocation` | [REQUIRED] | PRESENT | `job.jobCity` → `addressLocality`; `addressCountry: 'PH'` hardcoded | Country always present; city conditional |
| `validThrough` | [RECOMMENDED] | CONDITIONAL | `job.expirationDate` if present | Omitted when null — correct |
| `employmentType` | [RECOMMENDED] | PRESENT | `this.mapEmploymentType(job.jobTypeName)` → always returns a value | Falls back to `'OTHER'` when type unmapped — acceptable |
| `baseSalary` | [RECOMMENDED] | CONDITIONAL | Requires `salaryMinimum && salaryMaximum && salaryCurrency` all non-null | Correctly omitted when incomplete |
| `directApply` | [RECOMMENDED] | PRESENT | hardcoded `true` | Enables "Apply on site" badge in Google for Jobs ✓ |
| `identifier` | [OPTIONAL] | PRESENT | `{ '@type': 'PropertyValue', name: 'GetHired Online', value: job.jobId }` | Helps Google deduplicate |
| `url` | [OPTIONAL] | PRESENT | `${BASE_URL}/jobs/details/${job.jobId}` | |
| `hiringOrganization.logo` | [OPTIONAL] | CONDITIONAL | `job.companyLogoUrl` if present | |
| `hiringOrganization.sameAs` | [OPTIONAL] | ABSENT | No company page URL available | Intentionally omitted — correct |
| `jobLocationType` | [OPTIONAL] | ABSENT | Not in `setJobPostingJsonLd` | Present in old `JobStructuredDataService` (now orphaned) — gap vs. old implementation |
| `applicantLocationRequirements` | [OPTIONAL] | ABSENT | Not in `setJobPostingJsonLd` | Present in old `JobStructuredDataService` (now orphaned) |
| `jobBenefits` | [OPTIONAL] | ABSENT | No reliable data field | Intentionally omitted |
| `workHours` | [OPTIONAL] | ABSENT | No data field | |
| `incentiveCompensation` | [OPTIONAL] | ABSENT | No data field | |
| `occupationalCategory` | [OPTIONAL] | ABSENT | No data field | |

---

## JobPosting Field Quality Notes

### description (RISK)
- `this.stripHtml(job.jobDescription || '')` returns `""` when `jobDescription` is null
- Google requires description to be meaningful text (not empty)
- Recommendation: add fallback `|| job.jobTitle || ''`

### employmentType mapping
The `mapEmploymentType()` function covers:
- FULL_TIME (contains "full") ✓
- PART_TIME (contains "part") ✓
- INTERN / INTERNSHIP ✓ (checked before "contract" to prevent false match)
- CONTRACTOR (contains "contract" or "freelance") ✓
- TEMPORARY (contains "temporary" or "temp") ✓
- VOLUNTEER (contains "volunteer") ✓
- OTHER (all other values) — safe fallback

Schema.org valid employmentType values: FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN, VOLUNTEER, PER_DIEM, OTHER. The mapping covers all of these.

### baseSalary rate mapping
The RATE_MAP in `setJobPostingJsonLd` maps `job.rate` strings to Schema.org `unitText`:
```
hourly/hour → HOUR
daily/day → DAY
weekly/week → WEEK
monthly/month → MONTH
annual/annually/yearly/year → YEAR
default → MONTH
```
This is correct — Schema.org valid unitText for salary period: HOUR, DAY, WEEK, MONTH, YEAR.

### jobLocationType gap (regression vs. old service)
The old `JobStructuredDataService` (now orphaned) included:
```ts
if (job.workSetup?.toLowerCase() === 'remote') {
  schema['jobLocationType'] = 'TELECOMMUTE';
  schema['applicantLocationRequirements'] = { '@type': 'Country', name: job.country };
}
```
The new `setJobPostingJsonLd` does NOT include `jobLocationType = 'TELECOMMUTE'` for remote jobs. This means remote jobs are missing the Google for Jobs "Remote" badge.

**Recommendation:** Add to `setJobPostingJsonLd`:
```ts
// workSetup field name needs confirmation against API response
if ((job.workSetup || (job as any).work_setup || '').toLowerCase() === 'remote') {
  ld.jobLocationType = 'TELECOMMUTE';
}
```
This is a medium-priority gap that could reduce remote job visibility in Google for Jobs.

---

## Organization JSON-LD — Field Coverage

Called by `MainPortalComponent.ngOnInit()` via `seoService.setOrganizationJsonLd()`.

| Field | Status | Notes |
|-------|--------|-------|
| `@context` | PRESENT | |
| `@type: Organization` | PRESENT | |
| `name` | PRESENT | "GetHired Online" |
| `url` | PRESENT | BASE_URL |
| `logo` | PRESENT | `/assets/images/logo.png` |
| `contactPoint` | PRESENT | contactType: customer support; availableLanguage: English, Filipino |
| `sameAs` | ABSENT | No verified social profiles to include |
| `address` | ABSENT | Not available |
| `foundingDate` | ABSENT | Not available |

---

## WebSite JSON-LD — Field Coverage

Called by `MainPortalComponent.ngOnInit()` via `seoService.setWebsiteJsonLd()`.

| Field | Status | Notes |
|-------|--------|-------|
| `@context` | PRESENT | |
| `@type: WebSite` | PRESENT | |
| `name` | PRESENT | "GetHired Online" |
| `url` | PRESENT | BASE_URL |
| `potentialAction (SearchAction)` | PRESENT | `/jobs/search/{search_term_string}` |
| `query-input` | PRESENT | `required name=search_term_string` |

SearchAction enables Google Sitelinks Search Box if Google validates the search URL. The search URL pattern `/jobs/search/{search_term_string}` should be verified to work (returns relevant job results for the keyword).

---

## BreadcrumbList JSON-LD — Field Coverage

Called by `PublicDetailsComponent` and `PublicListComponent`.

Job detail page breadcrumb:
- Home → https://gethiredonline.app/home
- Jobs → https://gethiredonline.app/jobs
- {job.jobTitle} → https://gethiredonline.app/jobs/details/{jobId}

Jobs list page breadcrumb:
- Home → https://gethiredonline.app/home
- Jobs → https://gethiredonline.app/jobs

Both use `position` (1-indexed), `name`, and `item` fields — fully schema.org-compliant.

---

## Summary Table

| Schema Type | Status | Google Eligible? |
|------------|--------|-----------------|
| JobPosting | PRESENT — conditional fields correctly gated | YES (with description risk) |
| Organization | PRESENT | YES |
| WebSite + SearchAction | PRESENT | YES (Sitelinks Search Box candidate) |
| BreadcrumbList | PRESENT | YES |
| Review / Rating | ABSENT | N/A — correctly omitted |
| FAQPage | ABSENT | Not applicable |

---

## Priority Actions

1. **HIGH:** Add `jobLocationType: 'TELECOMMUTE'` for remote jobs — missing Google for Jobs "Remote" badge
2. **MEDIUM:** Add description fallback: `this.stripHtml(job.jobDescription || '') || job.jobTitle || ''`
3. **LOW:** Verify `potentialAction` search URL returns meaningful results at `/jobs/search/{keyword}`
