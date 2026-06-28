-- Search performance indexes — applied 2026-06-28
-- Run with: psql -h HOST -U USER -d DBNAME -f 20260628_search_indexes.sql

-- Basic filter indexes (missing from original DDL)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON gethired.jobs(job_status_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON gethired.jobs(company_id, job_status_id);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON gethired.jobs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON gethired.companies(company_slug);

-- Case-insensitive prefix indexes for autocomplete ILIKE queries
CREATE INDEX IF NOT EXISTS idx_jobs_title_lower ON gethired.jobs(lower(job_title));
CREATE INDEX IF NOT EXISTS idx_companies_name_lower ON gethired.companies(lower(company_name));

-- GIN full-text search indexes
CREATE INDEX IF NOT EXISTS idx_jobs_title_fts
  ON gethired.jobs USING GIN (to_tsvector('english', coalesce(job_title, '')));

CREATE INDEX IF NOT EXISTS idx_companies_name_fts
  ON gethired.companies USING GIN (to_tsvector('english', coalesce(company_name, '')));

-- Location prefix search
CREATE INDEX IF NOT EXISTS idx_jobs_city_lower ON gethired.jobs(lower(job_city));

-- ANALYZE so planner picks up new indexes immediately
ANALYZE gethired.jobs;
ANALYZE gethired.companies;
