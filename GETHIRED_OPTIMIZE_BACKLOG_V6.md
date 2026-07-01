# GETHIRED OPTIMIZE BACKLOG V6
**Date:** 2026-07-01 | **Priority:** P1 (critical) → P3 (nice to have)

---

## P1 — High Value, Relatively Safe

### BACKLOG-V6-001: Add JobPosting JSON-LD to `/jobs/:id`
**Impact:** Enables Google for Jobs rich results — massive SEO uplift for job discovery
**Effort:** Medium (2-3 hours)
**Risk:** Additive only (inject `<script type="application/ld+json">` in job detail component)
**Dependency:** Job detail component path + `job` object field names

### BACKLOG-V6-002: Add `noindex` meta to `/linkedin/complete` and `/choose-role` (belt-and-suspenders)
**Impact:** Belt-and-suspenders alongside robots.txt Disallow
**Effort:** Low (30 minutes — inject Meta tag in ngOnInit)
**Risk:** None — additive

### BACKLOG-V6-003: Verify `linkedin_sub` column is indexed in users table
**Impact:** Prevents sequential scan on every LinkedIn sign-in
**Effort:** Low (check migration files, add index if missing)
**Risk:** Low (adding index on existing column, no table changes)

### BACKLOG-V6-004: Confirm `/auth/linkedin/*` routes are under `authLimiter`
**Impact:** Prevents brute-force ticket guessing attacks
**Effort:** Low (check rate limiter config in server.js)
**Risk:** None if already covered; very low if adding

---

## P2 — Medium Value

### BACKLOG-V6-005: Add per-page canonical URLs to job detail pages
**Impact:** Prevents duplicate content indexing from query string variants
**Effort:** Medium (SeoService integration per route)
**Risk:** Low — additive Meta tag

### BACKLOG-V6-006: Per-page Open Graph overrides for `/jobs/:id`
**Impact:** Social share previews show job title/description instead of generic site description
**Effort:** Medium
**Risk:** None — Meta service `updateTag` pattern already in use

### BACKLOG-V6-007: Verify and create sitemap.xml BE endpoint
**Impact:** Faster Google job discovery, especially for new postings
**Effort:** Medium (Node.js endpoint, XML generation, query for public jobs)
**Risk:** Low — new read-only endpoint

### BACKLOG-V6-008: `ChangeDetectionStrategy.OnPush` on LinkedInButtonComponent
**Impact:** Minor (component is rendered once per page, not in a list)
**Effort:** Trivial (1 line)
**Risk:** Very low — pure @Input component

### BACKLOG-V6-009: `li-complete-card` padding reduction at 320px already applied by linter
**Status:** DONE (linter applied `@media (max-width: 375px) { padding: 40px 24px }`)

---

## P3 — Nice to Have

### BACKLOG-V6-010: Rename `.gh-google-btn-row` to `.gh-social-btn-row`
**Impact:** Naming accuracy (now used for both Google and LinkedIn)
**Effort:** Low (global search-replace)
**Risk:** Low but requires checking all usages

### BACKLOG-V6-011: Add `ChangeDetectionStrategy.OnPush` to modal component
**Status:** Acceptable as-is; modal is rendered once and destroyed

### BACKLOG-V6-012: Move recordrtc to dynamic import (V5 finding, still open)
**Impact:** ~250kB initial bundle reduction
**Effort:** High (requires finding all recordrtc usages, wrapping in dynamic import)
**Risk:** Medium

### BACKLOG-V6-013: Lazy-load chart.js (V5 finding, still open)
**Impact:** ~600kB deferred
**Effort:** High
**Risk:** Medium

### BACKLOG-V6-014: Company name overflow-wrap at 320px
**Status:** DONE (linter applied `overflow-wrap: break-word; word-break: break-word`)
