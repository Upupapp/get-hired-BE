# SEO: Google Search Console & Sitemap Runbook

**Site:** https://gethiredonline.app  
**Sitemap:** https://gethiredonline.app/sitemap.xml  
**Status:** Sitemap endpoint live on BE (no auth, 15-min cache). Search Console not yet verified.

---

## 1. Verify Property in Search Console

### Preferred method: DNS TXT record (survives server migrations)

1. Go to https://search.google.com/search-console/
2. Click **Add property** → choose **Domain** (not URL-prefix)
3. Enter: `gethiredonline.app`
4. Copy the TXT record value (format: `google-site-verification=XXXX...`)
5. In your DNS provider (wherever `gethiredonline.app` is managed):
   - Type: `TXT`
   - Host/Name: `@` (root)
   - Value: the verification string from Google
   - TTL: 3600 (or default)
6. Wait 5–30 min for DNS to propagate
7. Click **Verify** in Search Console
8. Verification succeeds → you now own the property

### Alternative: HTML meta tag (easier but can break if deployed)

1. In Search Console → **URL prefix** property → enter `https://gethiredonline.app`
2. Choose **HTML tag** verification method
3. Add the meta tag to `src/index.html` in the `<head>`:
   ```html
   <meta name="google-site-verification" content="YOUR_CODE_HERE" />
   ```
4. Deploy FE (GitHub Actions auto-deploys on push to master)
5. Click **Verify** in Search Console

Note: `src/google8d5e93b3a9106865.html` already exists in the FE — this is a legacy HTML file verification artefact. The DNS TXT method is preferred because it doesn't depend on a specific file being served.

---

## 2. Submit Sitemap

After verification:

1. In Search Console → **Sitemaps** (left sidebar)
2. Enter: `sitemap.xml` (Search Console prepends the property URL)
3. Click **Submit**
4. Status should change to **Success** within a few minutes

Sitemap endpoint: `https://gethiredonline.app/sitemap.xml`
- Returns XML with all `job_status_id = 2` (published) jobs
- Includes static pages: `/home`, `/jobs`, `/job-seekers`, `/employers`
- 15-minute in-memory cache on BE (rebuilt automatically)
- Falls back to `created_at` if `updated_at` is null
- Returns HTTP 503 (not 500) on DB failure so Google retries rather than de-indexing

---

## 3. After Verification — First Steps

1. **Inspect URL**: In Search Console → URL Inspection → enter `https://gethiredonline.app/home`
   - Check: "Page is indexed" or "URL is on Google"
   - If not indexed: click **Request Indexing**

2. **Inspect a job URL**: Paste any live job URL (e.g. `https://gethiredonline.app/jobs/details/JB123456`)
   - Verify: `<title>`, description, canonical, JSON-LD (JobPosting) in the rendered HTML
   - Check: Google can see the page content (SSR renders it)

3. **Rich Results Test**: https://search.google.com/test/rich-results
   - Paste a live job URL
   - Should detect: **JobPosting** structured data
   - Should pass validation with no errors

---

## 4. Ongoing Monitoring

Check these Search Console reports weekly for the first month, then monthly:

| Report | Where to find | What to look for |
|--------|---------------|------------------|
| **Coverage** | Index → Coverage | Soft 404s, server errors, excluded URLs |
| **JobPosting enhancements** | Enhancements → Job Posting | Errors in structured data |
| **Sitemap** | Sitemaps | Submission status, URLs discovered |
| **Core Web Vitals** | Experience → Core Web Vitals | CLS regressions (SVG images now have w/h attrs) |
| **Page indexing** | Index → Pages | Not indexed / crawled but not indexed |

### Common issues to watch:

- **Soft 404**: Job detail page returned HTTP 200 with "not found" content. **Fixed in this deploy** — invalid job IDs now return HTTP 404 from SSR.
- **JobPosting errors**: Missing required fields. Check `setJobPostingJsonLd()` in `seo.service.ts` — `title`, `description`, `datePosted`, `hiringOrganization`, `jobLocation` are always emitted.
- **Excluded: Blocked by robots.txt**: Verify `/jobs/` is not blocked. `robots.txt` currently allows `/jobs/` and only blocks `/jobs/search/`.

---

## 5. Manual Owner Checklist (one-time)

- [ ] Verify Search Console property (DNS TXT preferred)
- [ ] Submit `sitemap.xml` in Search Console
- [ ] Inspect homepage URL → request indexing if not indexed
- [ ] Inspect a sample job URL → check Rich Results
- [ ] Run Rich Results Test on a live job URL
- [ ] Set up email alerts in Search Console (Settings → Email preferences)
- [ ] Return in 2 weeks to check Coverage report for soft-404s and JobPosting errors
