# GETHIRED SECURE QA CHECKLIST — RECENT DEPLOYMENT

## Authentication
- [x] New endpoint /job/action-summary has verifyAuth
- [x] Token verified from Authorization header (not from body/query)
- [x] Missing/invalid token → 401/403

## Authorization
- [x] Company ID derived server-side (not from client)
- [x] Job query includes AND company_id=$2
- [x] Cross-company request → 404 (safe — no confirmation that job exists)

## SQL Injection
- [x] jobId parameterized as $1
- [x] companyId parameterized as $2
- [x] No string interpolation of user input in SQL

## PII
- [x] job_applicants table: only COUNT(*) returned
- [x] No applicant names/emails/UIDs in response
- [x] No CV/document data in response

## Frontend
- [x] No innerHTML bindings
- [x] No DomSanitizer.bypassSecurityTrust
- [x] window.open with noopener
- [x] URL from server-derived path only

## Secrets
- [x] No new hardcoded secrets
- [x] No API keys in FE code
- [x] No credentials in BE new code

## Node 14 safety
- [x] No ?. (optional chaining) in BE new code
- [x] No ?? (nullish coalescing) in BE new code
