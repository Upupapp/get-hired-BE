# GetHired SEO Recent Deployment — Release Gate
**Audit date:** 2026-06-26
**Deployment audited:** NOTIFY-P2

---

## Gate A — NOTIFY-P2: No SEO Regression

**PASS**

All three components changed by NOTIFY-P2 (`ImportAddCandidateComponent`, `ImportAddContactComponent`, `TableControlModalComponent`) live under `/recruiter/contacts/...`, which is guarded by both `AuthGuard` (requires `state=true` in localStorage) and `EmployerGuard` (requires `role=2`). Googlebot cannot reach these routes. The `styles.scss` additions (`.warning-snackbar`, `.info-snackbar`) are purely visual and have no HTML or URL surface. Zero SEO regression from NOTIFY-P2.

---

## Gate B — Mobile Block Removed / Site Indexable on Mobile

**PASS**

`app.component.ts` contains no screen-width check, viewport guard, or mobile redirect. `app.component.html` is `<router-outlet>` only. The viewport meta tag (`width=device-width, initial-scale=1`) is present in `index.html`. The `isMobileViewAllowed: false` route data annotations are present in the routing module but are not consumed by any active guard — they are dead code with no runtime effect. Google's mobile-first crawler now sees the full public site.

---

## Gate C — Public Job Pages Crawlable

**PASS with caveat**

- Route `/jobs/details/:id` is in `PublicModule` with no `canActivate` guard
- BE endpoint `GET /api/job/details` uses `optionalVerifyAuth` — serves data to anonymous requests
- Per-job title, description, canonical, robots, and Open Graph tags are set dynamically by `SeoService.setPageMeta()`
- Active jobs get `robots: index, follow`; inactive/expired jobs get `robots: noindex, nofollow`
- BreadcrumbList JSON-LD is set per job page
- JobPosting JSON-LD is injected for active jobs via `SeoService.setJobPostingJsonLd()`

**Caveat (UNKNOWN — cannot verify from local files):**
Angular Universal SSR (`server.ts`) is configured but it is unknown whether production runs the Node SSR server or serves the static SPA `index.html`. If static SPA only: crawlers see an empty shell on first HTTP response; title/meta/JSON-LD are set by JavaScript after the page renders and may not be seen by crawlers without a rendering pipeline (e.g., Rendertron, Google's WRS). This is the primary open risk.

**Action required:** Verify SSR in production: `curl -A Googlebot https://gethiredonline.app/jobs/details/{any-active-job-id}` — check raw HTML for `<title>`, `<meta name="description">`, and `<script type="application/ld+json">`.

---

## Gate D — OG / Social Sharing

**FAIL (non-blocking for search, blocks good social card quality)**

| Check | Status | Notes |
|---|---|---|
| `og:title` present in `index.html` | PASS | Set to site name |
| `og:description` present in `index.html` | PASS | Set to site description |
| `og:type` present | PASS | `website` |
| `og:url` present | PASS | `https://gethiredonline.app` |
| `og:image` present | PASS (fallback) | Points to `logo.png`, not a proper OG image |
| `gethired-og-default.png` exists | FAIL | File does not exist at `src/assets/brand/gethired-og-default.png` |
| `twitter:card` type | PASS | `summary_large_image` declared |
| OG image is 1200×630px | UNKNOWN | `logo.png` dimensions not verified; almost certainly wrong aspect ratio for social cards |
| Per-job OG image | FAIL | No per-job OG image; all job shares use the same logo fallback |

**Impact:** Social shares (LinkedIn, Facebook, Twitter, Slack) will show the GetHired logo instead of a branded preview card. This does not affect Google Search rankings. It does reduce click-through rates on shared job links.

**Remediation:** Create `src/assets/images/gethired-og-default.png` at 1200×630px. Update `index.html` `og:image`/`twitter:image` and `SeoService.DEFAULT_OG_IMAGE` to point to it.

---

## Summary Table

| Gate | Status | Blocking? |
|---|---|---|
| A — NOTIFY-P2 no SEO regression | PASS | — |
| B — Mobile block removed, mobile indexable | PASS | — |
| C — Public job pages crawlable | PASS with caveat | Verify SSR in prod |
| D — OG / social sharing | FAIL | Non-blocking for search rankings; blocks quality social cards |
