# GETHIRED_SEARCH_PHASE2_PLAN_V1
_Generated: 2026-06-28_

## Phase 2 scope (not yet started)

### 1. Employer-side search UI
Wire the employer job list to the new `/api/search/employer` endpoint instead of loading all jobs and filtering client-side. The BE endpoint is implemented; this is purely FE work.

**Files:** `recruiter/jobs/jobs-list.component.ts`, `recruiter/jobs/jobs-list.component.html`
**Effort:** 1 day

### 2. Fuzzy / typo tolerance
Add `pg_trgm` extension for trigram similarity. Covers common typos ("Sofware", "Nutrtion", "Adminstration").

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_jobs_title_trgm ON gethired.jobs USING GIN (job_title gin_trgm_ops);
```

Modify `searchService.searchPublicJobs()` to OR-condition: FTS match OR `similarity(j.job_title, $1) > 0.3`.
**Effort:** 4h

### 3. Search analytics events
Async event logging for zero-result tracking, popular query monitoring, CTR measurement.

```sql
CREATE TABLE gethired.search_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  query VARCHAR(200),
  filters JSONB,
  result_count INTEGER,
  uid VARCHAR(128),
  ip_hash VARCHAR(64),  -- hashed, not raw IP (privacy)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_search_events_created ON gethired.search_events (created_at DESC);
CREATE INDEX idx_search_events_query ON gethired.search_events (query) WHERE event_type = 'search_query';
```

**Effort:** 1 day

### 4. Job alerts (save-search feature)
Allow authenticated applicants to save a search query. Cron job sends email when new matching jobs are posted.

**Effort:** 3 days (schema + cron + email template)

### 5. Salary filter UI
Min/max salary range controls on the filter row. The BE parser already supports `salaryMin`/`salaryMax` params.

**Effort:** 4h

### 6. "Similar jobs" on job detail page
Call `/api/search/public?q=<job_title>` to populate a "Similar jobs" section. No new endpoint needed.

**Effort:** 2h

## Phase 2 prerequisites
- Confirm Phase 1 is stable in production (no search-related errors in pm2 logs).
- Run the smoke test checklist in GETHIRED_SEARCH_RELEASE_GATE_V1.md.
- Fix any issues from that testing before starting Phase 2.
