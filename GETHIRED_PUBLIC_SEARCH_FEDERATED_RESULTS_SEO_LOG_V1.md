# GETHIRED: Federated Search — SEO Log V1

## Page Meta (SeoService)

Search results pages are set to `robots: noindex, follow` — correct for dynamic search pages that should not be indexed.

Title pattern:
- With query: `"${q}" Jobs & Companies in the Philippines | GetHired Online`
- Without query: `Job Search Results | GetHired Online`

Description pattern:
- With query: `Find "${q}" jobs and companies in the Philippines on GetHired Online. Filter by location, work setup, and job type.`

## Canonical

All search result pages point canonical to `https://gethiredonline.app/jobs` — prevents duplicate content from paginated/filtered variations.

## Tab Switching & URL

Tab state is encoded in URL (`?type=companies`). Each tab state produces a distinct, shareable URL. This allows social/PR sharing of specific tab states.

## Company Spotlight & SEO

The spotlight card is rendered in Angular (client-side only). It does not affect SSR/crawler-visible content. The spotlight company's profile page (`/companies/:slug`) is the canonical SEO target.

## Structured Data

Not added in this add-on for company search cards. The existing `SearchAction` structured data on the home/browse pages covers the search entry point. Company-specific structured data (`Organization`, `JobPosting`) remains on company profile pages.

## Open Graph

Not modified — search result pages do not have meaningful OG images. The home page OG remains unchanged.
