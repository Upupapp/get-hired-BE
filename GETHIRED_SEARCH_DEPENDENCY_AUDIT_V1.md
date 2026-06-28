# GETHIRED_SEARCH_DEPENDENCY_AUDIT_V1
_Generated: 2026-06-28_

## New dependencies introduced

### Backend
**None.** The search system uses only packages already present in `package.json`:
- `express-rate-limit` — already used in `server.js` for existing rate limiters
- `pg` — existing database pool
- Firebase Admin SDK — existing `verifyAuth` / `optionalVerifyAuth`

No new npm packages were installed.

### Frontend
**None.** The search system uses only packages already present in `package.json`:
- `@angular/common/http` — `HttpClient`, `HttpParams`
- `rxjs` — `Subject`, `debounceTime`, `distinctUntilChanged`, `switchMap`, `takeUntil`
- Angular CDK A11y — already in SharedModule imports

No new npm packages were installed. Bundle size increase is purely from new component code (~12KB gzipped).

## Database extensions
**None new.** PostgreSQL FTS (`tsvector`, `tsquery`, GIN indexes) is built into PostgreSQL core — no extension required.

`pg_trgm` (for fuzzy matching) is NOT installed — it's in the Phase 2 backlog and requires a separate migration + `CREATE EXTENSION` command.

## Infrastructure
- No new servers, services, or managed services added.
- No Elasticsearch, OpenSearch, Typesense, MeiliSearch, or any external search SaaS.
- No Redis (rate-limit state is in-memory; Redis deferred to Phase 2).
- Search runs entirely on the existing Linode Node.js + PostgreSQL stack.

## Cost impact
**$0/month increase.** All computation runs on the existing Linode instance.
