# GETHIRED OPTIMIZE REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search Phase 2 + Employer Portal V4

---

## PERFORMANCE AUDIT

### BE — Federated search query performance

| Query | Concern | Mitigation |
|---|---|---|
| `searchPublicJobsRanked` | Uses `ts_rank_cd` over GIN FTS index | Index present (20260628_search_indexes.sql applied) |
| `searchPublicCompaniesRanked` | Joins companies + subquery for open_jobs_count | Acceptable at current scale; add index on `(company_id, job_status_id)` if company table grows large |
| `getCompanySpotlight` | 3 separate query paths (exact ILIKE, prefix ILIKE, FTS plainto_tsquery) | All run sequential, not parallel — acceptable since spotlight fires on All tab only |
| `Promise.all([jobs, companies, spotlight])` | All 3 run in parallel on All tab | GOOD — no sequential blocking |
| `getCompanySuggestions` | ILIKE `%lower($1)%` on company name | LEFT-anchored `LIKE lower($1) || '%'` used — index-friendly |

### FE — Bundle impact

| Metric | Value | Notes |
|---|---|---|
| Public module chunk | 330.40 kB raw | Increased from previous (new components added: SearchCompanyCard, SearchSpotlightCard) |
| Employer subscription module | 74.68 kB raw | No change |
| Employer portal | Part of public module | Employer portal V4 adds ~40KB raw (estimate) to public module |
| ChangeDetectionStrategy.OnPush | Used on SearchCompanyCard + SearchSpotlightCard | Correct, reduces change detection runs |

### FE — CLS / LCP impact

| Risk | Assessment |
|---|---|
| Spotlight card entrance animation | 0.25s `ep-spotlight-in` — within acceptable range; does not cause layout shift |
| Scroll reveal (`ep-reveal`) | Uses `opacity + translateY` — no layout shift, only visual |
| Dashboard mockup in hero | `aria-hidden` — no accessibility layout impact |
| No image lazy-load on hero mesh | Set to `loading="eager"` which is correct for hero |

---

## SAFE OPTIMIZATIONS APPLIED (this session)

1. `ChangeDetectionStrategy.OnPush` on both new card components
2. `loading="lazy"` on all non-hero images
3. `aria-hidden="true"` on all decorative SVGs
4. `role="list"` + `role="listitem"` on chips where appropriate
5. `flex: 1` equal columns on pulse stats (prevents reflows from unequal column widths)

---

## BACKLOG (not applied — not safe without testing)

| Item | Impact | Risk |
|---|---|---|
| Add `(company_id, job_status_id)` composite index in `jobs` table | Faster EXISTS subquery in company searches | Requires migration + ANALYZE |
| Debounce tab switch to 150ms to prevent rapid double-calls | Reduces redundant search requests | Low; add if user-tested as needed |
| Implement `trackBy` in `*ngFor` over job/company result lists | Reduces DOM diffing during pagination | Medium complexity |
| Preload employer portal hero SVG mesh | Reduces paint time on /employers | Low effort |

---

## VERDICT: PASS — no regressions introduced; 2 OnPush optimizations applied this deployment.
