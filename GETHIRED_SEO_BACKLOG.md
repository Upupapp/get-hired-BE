# GETHIRED SEO BACKLOG — RECENT DEPLOYMENT

## SEO-001 · Add noindex for boilerplate job descriptions
Priority: P2 | Effort: S
Files: job-posts-details.component.ts (Meta service injection)
Problem: Jobs with boilerplate guard show thin content — better to noindex them
Acceptance: <meta name="robots" content="noindex"> injected when isPrivacyBoilerplate()=true

## SEO-002 · Add JSON-LD JobPosting schema (ACT-008)
Priority: P2 | Effort: M
Files: job-posts-details.component.ts
Problem: No structured data → not eligible for Google Job Search rich results
Acceptance: Valid schema.org/JobPosting in <head>

## SEO-003 · Standardize page title format
Priority: P3 | Effort: S
Files: job-posts-details.component.ts (Title service)
Problem: Inconsistent or missing page titles on job detail pages
Acceptance: "[Job Title] at [Company Name] | GetHired Philippines"

## SEO-004 · Add meta description to job detail
Priority: P3 | Effort: S
Files: job-posts-details.component.ts (Meta service)
Problem: Missing meta description — Google uses snippet from page content instead
Acceptance: <meta name="description" content="[First 155 chars of job description]">
