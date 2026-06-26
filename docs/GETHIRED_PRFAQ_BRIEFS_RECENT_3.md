# GetHired — PR/FAQ Briefs RECENT 3
**Generated:** 2026-06-26
**Format:** Concise PR/FAQ for key deferred features and strategic decisions
**Purpose:** Help decide whether and when to build each deferred feature

---

## PR/FAQ-01 — Global Messages Inbox for Employers

### Press Release

**FOR IMMEDIATE RELEASE**

GetHired Online today launched the Global Messages Inbox, giving employers a single view of all applicant conversations across every job posting. Recruiters can now see unread messages without navigating into individual applicant profiles, respond directly from the inbox, and track all active conversations with a single glance.

Previously, employers had to navigate into each job's applicant panel to check if any applicant had replied. Messages were scattered across dozens of jobs, making it easy to miss time-sensitive applicant replies and lose candidates to faster-responding competitors.

"Now I can see all my conversations in one place the moment I log in," said a pilot employer. "I used to miss applicant replies for days. Now I respond in minutes."

### FAQs

**Q: Is this available now?**
A: No. This feature is deferred. It requires a `is_read` column in the messages DB table and a `GET /messages/all-threads` endpoint, neither of which currently exists.

**Q: What's the minimum viable version?**
A: A list of thread previews (applicant name, job title, latest message snippet, unread indicator) with click-to-open full thread. No filtering, no search — just the inbox list.

**Q: What does it unblock?**
A: Employer retention and response rate. Currently, missed messages are a silent churn driver — employers who miss applicant replies lose candidates and stop posting jobs.

**Q: Effort estimate?**
A: M-L (3-7 days including BE endpoint + FE component + unread badge in sidebar).

**Q: Priority?**
A: P1 product value — becomes the highest-priority feature once public launch is stable.

---

## PR/FAQ-02 — ESM Migration: Moving to Native Node ESM

### Press Release (internal)

**FOR INTERNAL PLANNING**

The GetHired backend will migrate from the `esm` shim (v3.2.25) to native Node ESM modules. This eliminates the Acorn 6/7 parser limitation that prevents developers from using optional chaining (`?.`) and nullish coalescing (`??`) — modern JavaScript syntax available in every major codebase since 2020.

After migration, developers can write idiomatic modern JavaScript without worrying about silent production failures. The codebase will be compatible with Node LTS versions for the foreseeable future.

### FAQs

**Q: Why can't we just use `?.` now?**
A: The `esm` package uses Acorn 6/7 to parse source files. Acorn 6/7 does not support optional chaining or nullish coalescing. Any file using these operators causes a `SyntaxError` at startup that takes production down.

**Q: What's the migration scope?**
A: All `require()` calls become `import`; all `module.exports` become `export`. Estimate: 50-100+ occurrences across controllers, services, middleware, routes. Approximately 1-2 weeks.

**Q: What's the risk?**
A: High if done hastily. `require()` and `import` have different resolution semantics. CommonJS modules are synchronous; ESM is async. Some patterns require refactoring beyond a simple search-replace.

**Q: Recommended path?**
A: (1) Ship ESLint rule blocking `?.`/`??` as interim guard. (2) Upgrade Node 14 → 18 LTS (resolves optional chaining natively with esm, buys time). (3) Plan full ESM migration as a dedicated sprint. Options (1) and (2) can ship within a week.

**Q: Why upgrade Node too?**
A: Node 14 EOL was April 2023. Running an end-of-life Node version is a security risk. Node 18 LTS (April 2025 EOL) or Node 20 LTS is the correct target. Combining the Node upgrade with ESM migration reduces the total number of deploys needed.

---

## PR/FAQ-03 — Rate Limiting

### Press Release (internal)

**FOR INTERNAL PLANNING**

GetHired Backend will add tiered rate limiting to all API endpoints, protecting user accounts from brute-force attacks and preventing service disruptions from flooding or scrapers.

After this change, login attempts are capped at 10 per 15 minutes per IP. Write operations (adding contacts, applying for jobs) are capped at 100 per 15 minutes. Public read operations (job listings, job search) are capped at 500 per 15 minutes.

### FAQs

**Q: Is this blocking public launch?**
A: It is a P1 pre-traffic item — not technically blocking launch but should ship before organic traffic arrives. An auth endpoint without rate limiting is an open invitation for credential stuffing attacks.

**Q: Can the limits be tuned post-launch?**
A: Yes. `express-rate-limit` limits are configurable; they can be adjusted based on observed traffic patterns. The defaults in the execution pack are conservative starting points.

**Q: Will this affect legitimate employers doing large bulk imports?**
A: The 100/15min write limit on individual contact/candidate endpoints is above normal single-employer usage. Bulk CSV import uses a separate bulk endpoint; the 100/15min limit applies per IP, not per employer. If a legitimate employer is blocked, the limit can be raised per-route.

**Q: Effort?**
A: M (3-5 hours including installation, configuration, and verification).

---

## PR/FAQ-04 — Programmatic SEO Landing Pages

### Press Release

**FOR FUTURE PLANNING**

GetHired Online will launch targeted landing pages for high-intent job searches: "Customer Service Jobs in Manila," "Remote Data Entry Jobs Philippines," "Accounting Jobs in Cebu." Each page shows real active job listings, driving organic search traffic from candidates who are already searching for exactly these roles.

### FAQs

**Q: Why not build these now?**
A: Google penalizes "thin content" pages — pages that exist only as filtered job lists without unique value. The penalty can hurt the entire domain's ranking, including the existing job pages that are already healthy. We should not build these until there are 5+ unique, active jobs per page.

**Q: When will we have enough jobs?**
A: Depends on employer acquisition. Monitor via Supabase job counts by city/category. The trigger should be data-driven, not calendar-driven.

**Q: What does a good programmatic SEO page look like?**
A: At minimum: a unique H1 and intro paragraph specific to the role/city (not templated), a list of real active job cards, a related-searches section, and a canonical URL. Dynamically generated but feels hand-crafted.

**Q: Effort?**
A: XL (7+ days including BE endpoint for city/category job filtering, FE dynamic page component, unique intro copy per page, sitemap integration, structured data per page).

---

## PR/FAQ-05 — Admin Reporting Dashboard

### Press Release

**FOR FUTURE PLANNING**

GetHired Online will add an admin reporting dashboard giving the platform operator visibility into employer activity, job quality, application volume, and subscription health — all in one view.

### FAQs

**Q: What data should it show?**
A: Decision pending (DEC-V5-06). Options: company-level stats (jobs posted, applications received, hire rate), platform-wide aggregates (total jobs, total applicants, conversion funnel), or financial data (subscription status, payment history per company).

**Q: Is this blocking anything?**
A: No. It is a pure internal operator tool. It does not affect any user-facing flow.

**Q: Effort?**
A: XL (7+ days). Requires data model decisions, BE aggregation queries, FE admin pages, and role-based access control to limit to admins only.

**Q: Priority?**
A: Low. Prioritize after public launch is stable and employer acquisition is underway. The metrics plan (GETHIRED_PRODUCT_METRICS_PLAN_RECENT_3.md) covers the same ground via Google Analytics + Search Console until admin pages are built.
