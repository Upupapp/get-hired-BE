# GETHIRED SECURE REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 + Employer Portal V4

---

## THREAT MODEL — FEDERATED SEARCH

### Attack Surfaces Added This Deployment

| Surface | Risk | Control |
|---|---|---|
| `publicSearch` — no auth required | Anon access to job + company data | EXPECTED — public endpoint; rate-limited |
| `searchPublicCompaniesRanked` — `company_slug` in response | Slug is public info | ACCEPTABLE |
| `getCompanySpotlight` — FTS query via user input | SQLi via `plainto_tsquery` | SAFE — `plainto_tsquery($1)` is parameterized |
| `getCompanySuggestions` — ILIKE pattern via user input | SQLi via pattern | SAFE — `lower($1) || '%'` is parameterized, server-side concat |
| `type=` query param | Injection via unvalidated value | SAFE — `parsePublicSearchParams` whitelists `all|jobs|companies` |
| `sort=` query param | Injection via sort field | SAFE — `ALLOWED_SORT_FIELDS` whitelist in `searchQueryParserService.js` |

### BOLA Assessment

| Endpoint | company_id source | Status |
|---|---|---|
| `publicSearch` | No company_id in request — query by keyword only | SAFE |
| `searchPublicCompaniesRanked` | No company_id in params | SAFE |
| `getCompanySpotlight` | Returns company based on query match, no user-supplied ID | SAFE |
| `getCompanySuggestions` | Returns matching companies, no user-supplied ID | SAFE |

---

## THREAT MODEL — EMPLOYER PORTAL V4

### Static marketing page — attack surface minimal

| Risk | Assessment |
|---|---|
| XSS via rendered data | No user-generated content rendered; all data is hardcoded arrays in TS — SAFE |
| Open redirect | CTAs route via Angular Router to known routes only — SAFE |
| CSRF | No forms, no mutations — N/A |
| Sensitive data exposure | No auth state, tokens, or PII rendered — SAFE |
| Fake claims creating legal risk | All claims verified as accurate, qualified where needed — SAFE |

---

## KNOWN OPEN ISSUES (pre-existing, not introduced by this deployment)

| Issue | Severity | Status |
|---|---|---|
| Secrets in GetHired BE git history | P0 | Unresolved — needs git-filter-repo |
| `nosniff` header not verified | P2 | Unverified — check nginx config |
| Video MIME spoofing (magic-byte) | P2 | Partially open — video not covered by magic-byte check |

---

## SECURE VERDICT: PASS for this deployment — no new security vulnerabilities introduced. Pre-existing P0 (git history secrets) carries over.
