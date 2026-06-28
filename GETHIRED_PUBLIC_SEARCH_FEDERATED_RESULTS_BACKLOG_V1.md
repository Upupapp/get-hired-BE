# GETHIRED: Federated Search — Backlog V1

## P1 — High Value, Low Risk

- [ ] **Autocomplete grouped dropdown UI** — The grouped response is already returned (`groups.jobs/companies/locations`). The `SearchAutocompleteComponent` currently iterates the flat `suggestions` array. A grouped dropdown would render section headers ("Jobs", "Companies", "Locations") for clarity. ~2h FE work.

- [ ] **Company card — employee count badge** — `number_of_employee` exists in the companies table. Show "51-200 employees" as a meta chip on the company card. ~30min.

- [ ] **Company tab pagination** — Currently using `page` param for both jobs and companies. Separate `jobPage` and `companyPage` URL params would allow independent pagination. Currently low priority as most searches have few companies.

## P2 — Medium Value

- [ ] **Event analytics** — Instrument `search_tab_switch`, `spotlight_shown`, `spotlight_cta_click`, `company_card_click` events. No analytics SDK is currently integrated. Blocked on analytics platform decision.

- [ ] **Companies browse page** — A dedicated `/companies` route with company search + filters (industry, location, company size). Currently all company discovery happens through job search. This would serve employer-brand discovery use cases.

- [ ] **Spotlight animation on re-query** — If user refines query and spotlight changes, the entrance animation re-triggers. Verify this doesn't flash awkwardly when spotlight stays the same company.

## P3 — Low Priority / Deferred

- [ ] **Saved company follows** — "Follow company" to get job alerts. Requires notification infrastructure.

- [ ] **Company verification badge** — After a real company verification process exists (e.g., SEC registration check). Not a cosmetic label.

- [ ] **Spotlight A/B test** — Test whether spotlight increases application rates for the matched company.

- [ ] **Server-side rendering** — Search results currently render client-side. SSR would improve time-to-content on slow connections. Deferred — requires Angular Universal setup.

## Won't Do

- Fake "Top Employer" or "Trending Company" labels without real backing data
- Paid/sponsored company placement in search results
- Follower counts (no follow feature exists)
- Company rating display (no review system exists)
