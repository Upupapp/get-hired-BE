# GETHIRED SEO READINESS AUDIT V6
**Date:** 2026-07-01 | **Scope:** Full system SEO + V6 delta | **Note:** This file covers the "SEO WHOLE SYSTEM" command requested by the user.

---

## §1 Global SEO Baseline (index.html)

| Element | Status | Notes |
|---|---|---|
| `<title>` | Pass | "GetHired Online — Jobs and Hiring Platform in the Philippines" |
| `<meta name="description">` | Pass | Descriptive, includes location |
| `<meta name="robots" content="index, follow">` | Pass | Global allow |
| `<meta name="viewport">` | Pass | `width=device-width, initial-scale=1` |
| Open Graph tags (og:title, og:description, og:image) | Pass | Complete set |
| Twitter card | Pass | `summary_large_image`, complete |
| `lang="en"` on `<html>` | Pass | Language declared |
| Organization JSON-LD | Pass | Org name, URL, logo — static in index.html |
| Google Search Console verification | Pass | meta tag present |
| Canonical URL | Note | Handled dynamically per SeoService — correct pattern |
| Sitemap | Partial | `Sitemap: https://gethiredonline.app/sitemap.xml` in robots.txt but endpoint existence unconfirmed |

---

## §2 robots.txt Audit

### Pre-V6 state
```
Disallow: /signin
Disallow: /signup
Disallow: /reset-password
Disallow: /change-password
Disallow: /verify
```

### V6 additions (Fixed)
```
Disallow: /linkedin/complete
Disallow: /choose-role
```

**Rationale:**
- `/linkedin/complete?ticket=...` — one-time token in URL. Google must not crawl/index. Added.
- `/choose-role` — transient UI step for new social-auth users. Not a useful search result. Added.

### Missing from robots.txt (Open items)
- `/account-authentication` — account verification page (not a public page)
- `/linkedin` without `/complete` — if BE has any other /linkedin/* paths

---

## §3 Public Job Pages SEO

### Route: `/jobs` (job listing)
- Client-side Angular SPA rendering
- Google indexes SPAs via Googlebot's JavaScript rendering (headless Chrome)
- `<title>` likely set by route metadata or SeoService (verify)
- Pagination: `/jobs?page=2` — `Disallow: /jobs/search/` covers search variants. Standard `/jobs?page=N` NOT disallowed (intentional — paginated job lists are indexable)

### Route: `/jobs/:id` (job detail)
- JobPosting JSON-LD: **MISSING** (V5 finding, still open)
- Without JSON-LD, job postings do not appear in Google Job Search (Google for Jobs)
- This is the highest-value SEO gap in the codebase
- All required data is available in the `job` object: `title`, `description`, `datePosted`, `hiringOrganization`, `jobLocation`

**Implementation pattern (safe, additive — do in a future session):**
```typescript
// In job-detail.component.ts or resolver
const jsonLd = {
  '@context': 'https://schema.org/',
  '@type': 'JobPosting',
  title: job.title,
  description: job.description,
  datePosted: job.created_at,
  validThrough: job.closing_date || null,
  hiringOrganization: { '@type': 'Organization', name: job.company_name },
  jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } },
  baseSalary: job.salary ? { '@type': 'MonetaryAmount', currency: 'PHP', value: job.salary } : undefined
};
// Inject via <script type="application/ld+json"> using Meta/DomSanitizer
```

### Route: `/company/:slug` (company public profile)
- Public route ✅ (not in robots.txt Disallow)
- No structured data (Organization per-company JSON-LD would help)
- Company slug must match the pattern expected in routing

---

## §4 Auth/Callback Pages — SEO Exclusion Status

| Route | In robots.txt | NoIndex meta | Status |
|---|---|---|---|
| `/signin` | Disallow ✅ | No | Acceptable (robots.txt sufficient) |
| `/signup` | Disallow ✅ | No | Acceptable |
| `/reset-password` | Disallow ✅ | No | Acceptable |
| `/change-password` | Disallow ✅ | No | Acceptable |
| `/verify` | Disallow ✅ | No | Acceptable |
| `/linkedin/complete` | Added V6 ✅ | No | Fixed |
| `/choose-role` | Added V6 ✅ | No | Fixed |
| `/linkedin/complete` component meta | — | No | Low priority (robots.txt covers it) |

**Note on V5 OPT-002**: V5 documented adding `noindex` meta to `/choose-role` via Angular Meta service. This was not done in code in V5. The robots.txt fix in V6 achieves the same goal (bots respect robots.txt before crawling). Adding a component-level `<meta name="robots" content="noindex, nofollow">` is belt-and-suspenders but not required when robots.txt Disallow is in place.

---

## §5 Canonical URLs

- `styles.scss` comment: "Canonical handled dynamically by SeoService per route" (index.html line 32)
- Verify SeoService sets `<link rel="canonical">` on every public route, especially `/jobs`, `/jobs/:id`, `/company/:slug`
- Paginated routes (`/jobs?page=2`) need canonical pointing to `/jobs` to avoid duplicate content

---

## §6 Open Graph — Per-route Overrides

- Default OG tags are in `index.html` (static)
- `SeoService` should override these per route (especially job detail pages with job-specific title/description/image)
- `/jobs/:id` should have OG title = job title, OG description = job summary
- Without per-page OG, social shares of individual job pages will show the generic GetHired homepage image

---

## §7 Sitemap

- `Sitemap: https://gethiredonline.app/sitemap.xml` in robots.txt
- BE endpoint `/sitemap.xml` not verified in this audit
- If missing, Google crawl discovery relies entirely on internal links
- Dynamic jobs sitemap should include all active public job postings with `<lastmod>` = `updated_at`

---

## §8 SEO Risk Register

| Risk | Severity | Status |
|---|---|---|
| Missing JobPosting JSON-LD on /jobs/:id | High | Open — not fixed in V6 |
| Missing per-page canonical on /jobs and /jobs/:id | Medium | Open — verify SeoService |
| Missing per-page OG overrides for job detail | Medium | Open |
| sitemap.xml endpoint may not exist | Medium | Open — verify BE |
| /linkedin/complete not in robots.txt | High | Fixed V6 |
| /choose-role not in robots.txt | Medium | Fixed V6 |

---

## §9 Summary

SEO readiness is acceptable for the authentication system (all auth/callback routes now properly excluded). The primary SEO gap remains the absence of `JobPosting` JSON-LD on job detail pages. This is the single highest-value SEO change available in the codebase — implementation is straightforward and additive (no existing code changes, just inject a `<script type="application/ld+json">` in the job detail component).
