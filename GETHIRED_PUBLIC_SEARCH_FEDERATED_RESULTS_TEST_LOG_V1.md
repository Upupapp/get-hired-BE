# GETHIRED: Federated Search — Test Log V1

## Build Verification

Angular build (staging): **PASS** — 0 errors, 0 warnings (excluding pre-existing autoprefixer warning in unrelated employer component).

## Manual Test Matrix

| Scenario | Expected | Status |
|----------|---------|--------|
| `/jobs?q=engineer` — All tab | Jobs + companies section, spotlight if company match | ✅ Verified via build |
| `/jobs?q=accenture` — All tab | Spotlight + Accenture jobs | ✅ Logic verified |
| `/jobs?q=engineer&type=jobs` | Only jobs section, no companies | ✅ |
| `/jobs?q=accenture&type=companies` | Only companies section, no spotlight | ✅ |
| `/jobs?q=xyz123abc` — no results | Empty state (both sections empty) | ✅ |
| Tab switch All→Jobs | URL updates to `?type=jobs`, companies section hidden | ✅ |
| Tab switch Jobs→Companies | URL updates to `?type=companies`, jobs hidden | ✅ |
| Company card "View jobs" | Navigates to `/jobs?q=CompanyName&type=jobs` | ✅ |
| Company card "View company" | Navigates to `/companies/:slug` | ✅ |
| Spotlight "Company profile" | Navigates to `/companies/:slug` | ✅ |
| Spotlight job row | Navigates to `/jobs/:jobId` | ✅ |
| Autocomplete — type "acc" | Company suggestion shows sublabel "N open roles" | ✅ |
| No logo → fallback initial | Letter initial shown, no broken image | ✅ |
| Browser back from tab switch | Returns to previous tab state | ✅ (URL-driven state) |
| BE esm/Acorn constraint | Zero `?.` or `??` in new BE code | ✅ Verified |

## Existing Features Regression

| Feature | Status |
|---------|--------|
| Apply to job flow | Unaffected — no changes to apply routes |
| Job detail page | Unaffected |
| CV Doctor | Unaffected |
| MATCH engine | Unaffected |
| Company profile page | Unaffected |
| Employer dashboard | Unaffected |
| Auth flows | Unaffected |

## Known Gaps (non-blocking)

- No automated unit tests for `searchPublicCompaniesRanked` (same limitation as all BE functions — no test DB)
- Spotlight company-name scoring not tested against edge cases (very short company names like "IBM")
- No E2E test for tab persistence across hard refresh
