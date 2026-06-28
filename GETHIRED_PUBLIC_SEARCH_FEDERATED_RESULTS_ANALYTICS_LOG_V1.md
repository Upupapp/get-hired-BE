# GETHIRED: Federated Search — Analytics Log V1

## Signals Available (No New Instrumentation Required)

The federated response includes `latencyMs` on every search response — already surfaced for monitoring.

## Recommended Events to Instrument (Future)

| Event | Properties | Value |
|-------|-----------|-------|
| `search_tab_switch` | `{ from, to, q, jobCount, companyCount }` | Which tabs users prefer |
| `spotlight_shown` | `{ companySlug, q, openJobsCount }` | Spotlight trigger rate |
| `spotlight_cta_click` | `{ target: 'company'\|'jobs'\|'job_item', companySlug }` | Spotlight CTR |
| `company_card_click` | `{ target: 'company'\|'jobs', companySlug, position }` | Company card engagement |
| `search_empty_recovery_type` | `{ type: 'jobs_missing'\|'companies_missing'\|'empty', q }` | Query quality signal |
| `autocomplete_company_select` | `{ companySlug, openJobsCount, position }` | Company autocomplete CTR |

## Existing Signals (Phase 1)

- `search_submit` — already in Phase 1 autocomplete component
- `latencyMs` — per-response, useful for P50/P95 tracking

## Spotlight Trigger Rate Hypothesis

We expect spotlight to trigger on ~5-15% of All-tab searches (queries that are company names). If the rate is >30%, the scoring threshold may need raising.

## Tab Distribution Hypothesis

We expect All tab = 70-80% of searches, Jobs = 15-25%, Companies = 5%. If Companies tab > 10% consistently, it warrants a dedicated Companies browse page.
