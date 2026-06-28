# GETHIRED_SEARCH_MIGRATION_GUIDE_V1
_Generated: 2026-06-28_

## DB migration: `db/20260628_search_indexes.sql`

### Apply on production
```powershell
ssh root@139.162.11.242 "PGPASSWORD=MoveUp2026 psql -h 139.162.11.242 -U postgres -d gethired_db -f /var/www/_work/get-hired-BE/db/20260628_search_indexes.sql"
```
**Status: APPLIED 2026-06-28** — 9 CREATE INDEX + 2 ANALYZE completed successfully.

### Apply on development/staging
```bash
PGPASSWORD=<password> psql -h <host> -U postgres -d gethired_db -f db/20260628_search_indexes.sql
```

### Rollback (if needed)
```sql
DROP INDEX IF EXISTS gethired.idx_jobs_status;
DROP INDEX IF EXISTS gethired.idx_jobs_company_status;
DROP INDEX IF EXISTS gethired.idx_jobs_updated_at;
DROP INDEX IF EXISTS gethired.idx_companies_slug;
DROP INDEX IF EXISTS gethired.idx_jobs_title_lower;
DROP INDEX IF EXISTS gethired.idx_companies_name_lower;
DROP INDEX IF EXISTS gethired.idx_jobs_title_fts;
DROP INDEX IF EXISTS gethired.idx_companies_name_fts;
DROP INDEX IF EXISTS gethired.idx_jobs_city_lower;
```
Rollback is **zero-risk** — these are read indexes only. No schema changes, no column additions, no data changes. The application works without them (just slower).

### Index creation time estimate
- On 50K row table: < 5 seconds each.
- On 500K row table: ~2-5 minutes for GIN indexes.
- `CREATE INDEX` does not lock the table for reads in PostgreSQL 11+ (uses `ShareUpdateExclusiveLock` by default, allows concurrent reads and inserts, only blocks DDL operations).

## BE deployment steps
```powershell
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull origin main && pm2 restart gethired"
```

## FE deployment steps
```powershell
cd "C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE"
npm run build-dev
scp -r dist/get-hired/* root@139.162.11.242:/var/www/gethired/
```
