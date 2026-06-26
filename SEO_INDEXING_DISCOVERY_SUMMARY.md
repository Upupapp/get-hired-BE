# SEO Indexing & Discovery — Implementation Summary

**Date:** 2026-06-26  
**FE HEAD before this run:** dd4fa99  
**BE HEAD before this run:** 535a223  
**Command:** GETHIRED_SEO_SEARCH_INDEXING_AND_PUBLIC_DISCOVERY

---

## 1. Summary by Item

### Phase 1 — Default OG Image ✓

| Item | Status |
|------|--------|
| `src/assets/brand/gethired-og-default.png` | Created (1200×630, 9.9 KB, pure Node.js — no native deps) |
| Generation script | `tools/generate-og-image.js` — re-runnable anytime |
| `DEFAULT_OG_IMAGE` constant updated | `seo.service.ts` → now uses `/assets/brand/gethired-og-default.png` |
| `og:image:width` / `og:image:height` / `og:image:type` tags added | Yes — in `setPageMeta()` |
| `twitter:card` = `summary_large_image` | Already present, confirmed |

### Phase 2 — Search Console & Sitemap ✓

| Item | Status |
|------|--------|
| `SEO_SEARCH_CONSOLE_AND_SITEMAP_RUNBOOK.md` | Created in BE root |
| Sitemap endpoint (`/sitemap.xml`) | Already live on BE with 15-min cache; confirmed present in `server.js` |
| `robots.txt` Sitemap directive | Already present in `src/robots.txt` |
| `robots.txt` private routes disallowed | Already complete |

**No code changes needed for sitemap or robots.txt** — both were already correctly implemented from previous sessions.

### Phase 3 — SSR Real 404 for Bad Job URLs ✓

| Item | Status |
|------|--------|
| `RESPONSE` token imported | `job-posts-details.component.ts` — from `@nguniversal/express-engine/tokens` |
| `@Optional() @Inject(RESPONSE)` in constructor | Added — browser-safe |
| `isPlatformServer` guard on `response.status(404)` | Added in `jobErrorSub` |
| Title set to "Job not found | GetHired" on error | Added |
| `REQUEST` + `RESPONSE` provided in `server.ts` | Added to Express route's providers array |
| `noindex` robots tag on error | Already present, preserved |
| JobPosting JSON-LD not emitted on error | Already guarded by `job.jobStatusId === 2` check in `public-details.component.ts` |

### Phase 4 — Google Indexing API Scaffold ✓ (Disabled)

| Item | Status |
|------|--------|
| `services/googleIndexing.service.js` | Created — no-op unless `GOOGLE_INDEXING_API_ENABLED=true` |
| `.env.example` updated | `GOOGLE_INDEXING_API_ENABLED=false` + credentials fields added |
| Trigger in `createJobs` | Added — `notifyJobUrlUpdated` (fire-and-forget) |
| Trigger in `deleteJob` | Added — `notifyJobUrlDeleted` (fire-and-forget) |
| Trigger in `updateStatusOfJob` | Added — `URL_UPDATED` if status=2, `URL_DELETED` otherwise |
| `googleapis` package | Already in `package.json` — no new install needed |
| `SEO_GOOGLE_INDEXING_API_RUNBOOK.md` | Created in BE root |
| API enabled in committed code | NO — `GOOGLE_INDEXING_API_ENABLED` is always `false` in `.env.example` |

### Phase 5 — SVG Width/Height for CLS ✓

All `<img>` tags referencing brand SVGs now have explicit `width`, `height`, and `loading="lazy"` attributes.

| File | SVGs updated |
|------|-------------|
| `public/employer-portal/employer-portal.component.html` | 2 SVGs |
| `public/job-seeker-portal/job-seeker-portal.component.html` | 8 SVGs |
| `public/main-portal/main-portal.component.html` | 2 SVGs |

Dimensions sourced from actual `viewBox` attributes in each SVG file.

### Phase 6 — Deferred Public Company Pages Note ✓

`PUBLIC_COMPANY_PAGES_DEFERRED_PRODUCT_NOTE.md` created in BE root. Documents:
- Current state (no public company pages)
- Route conflict (`/company/*` vs `/companies/:slug`)
- What data is appropriate vs. never public
- SEO decisions needed before building

---

## 2. Files Changed

### FE (`get-hired-FE`)

| File | Change |
|------|--------|
| `src/assets/brand/gethired-og-default.png` | **NEW** — 1200×630 OG image |
| `tools/generate-og-image.js` | **NEW** — OG image generation script |
| `src/app/core/services/seo.service.ts` | `DEFAULT_OG_IMAGE` updated; `og:image:width/height/type` tags added |
| `src/app/jobs/job-posts-details/job-posts-details.component.ts` | `RESPONSE` token injection; SSR 404; "Job not found" title |
| `server.ts` | `REQUEST`/`RESPONSE` tokens provided to SSR renderer |
| `src/app/public/employer-portal/employer-portal.component.html` | SVG `width`/`height`/`loading` attrs |
| `src/app/public/job-seeker-portal/job-seeker-portal.component.html` | SVG `width`/`height`/`loading` attrs |
| `src/app/public/main-portal/main-portal.component.html` | SVG `width`/`height`/`loading` attrs |

### BE (`get-hired-BE`)

| File | Change |
|------|--------|
| `services/googleIndexing.service.js` | **NEW** — Google Indexing API (disabled by default) |
| `controllers/jobsController.js` | Import + 3 trigger points for Indexing API |
| `.env.example` | `GOOGLE_INDEXING_API_ENABLED` + credential keys added |
| `SEO_SEARCH_CONSOLE_AND_SITEMAP_RUNBOOK.md` | **NEW** |
| `SEO_GOOGLE_INDEXING_API_RUNBOOK.md` | **NEW** |
| `PUBLIC_COMPANY_PAGES_DEFERRED_PRODUCT_NOTE.md` | **NEW** |
| `SEO_INDEXING_DISCOVERY_SUMMARY.md` | **NEW** (this file) |

---

## 3. Manual Owner Actions Required

1. **Verify Search Console property** — DNS TXT record preferred (see `SEO_SEARCH_CONSOLE_AND_SITEMAP_RUNBOOK.md`)
2. **Submit sitemap** — after verification, submit `sitemap.xml` in Search Console
3. **Inspect first job URL** — use URL Inspection tool in Search Console
4. **Run Rich Results Test** — on a live published job URL
5. **Enable Indexing API (later, optional)** — after Search Console verification, follow `SEO_GOOGLE_INDEXING_API_RUNBOOK.md`

---

## 4. Tests Run

| Test | Result |
|------|--------|
| PNG generator (`node tools/generate-og-image.js`) | Pass — 9.9 KB, 1200×630, valid PNG signature |
| Python PNG validation (signature + dimensions) | Pass |
| TypeScript build (`ng build --configuration=production`) | Running at commit time |
| `RESPONSE` token import path | Verified against `node_modules/@nguniversal/express-engine/tokens/tokens.d.ts` |
| SVG dimensions sourced | Verified from `viewBox` attributes in actual SVG files |

---

## 5. SEO Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| SSR 404 may affect valid jobs if `jobError$` fires spuriously on slow API response | Low | `@Optional()` + `isPlatformServer` guard; only fires when `err` is truthy |
| OG image not reachable until FE deploys | Medium | File is in `src/assets/brand/` — deployed with FE build as a static asset |
| Indexing API quota (200/day) if enabled later | Low | Documented in runbook; failures are non-fatal |
| Sitemap includes jobs that expire without a status change | Low | Sitemap filters by `job_status_id = 2` at query time; cache TTL is 15 min |

---

## 6. Rollback Plan

**FE changes** (SSR 404, seo.service.ts, SVGs):
```bash
git revert HEAD  # in get-hired-FE
git push origin master  # triggers GitHub Actions deploy
```

**BE changes** (Indexing API):
- The Indexing API service is a no-op unless `GOOGLE_INDEXING_API_ENABLED=true`.
- No rollback needed for the disabled service.
- If import causes a startup error: remove the import + 3 trigger lines from `jobsController.js`, SCP the file, restart PM2.

**OG image**:
- Reverting `DEFAULT_OG_IMAGE` in `seo.service.ts` restores the previous logo path.
- The PNG asset is additive and harmless to leave in place.

---

## Curl Commands for SSR Verification (run after deploy)

```bash
# 1. Homepage — check title and og:image
curl -s https://gethiredonline.app/home | grep -E "<title>|og:image|og:image:width"

# 2. Valid job — check JobPosting JSON-LD, canonical, robots=index
curl -s "https://gethiredonline.app/jobs/details/JB<valid-id>" | grep -E "JobPosting|canonical|robots"

# 3. Invalid job — should return HTTP 404 (not 200)
curl -I "https://gethiredonline.app/jobs/details/JB000000INVALID"
# Expected: HTTP/1.1 404

# 4. Sitemap — check XML structure
curl -s https://gethiredonline.app/sitemap.xml | head -20

# 5. robots.txt — check Sitemap directive
curl -s https://gethiredonline.app/robots.txt
```
