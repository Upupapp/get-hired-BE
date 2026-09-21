# Production backend integration — 2026-09-21

Merged main at 93177c80f18029168764f2ed2ac304a513fd20bb into codex/billing-foundation-integration. Read-only SSH verification confirmed this was the live GetHired backend HEAD, with a clean checkout. The integration branch previously started from d659f10.

## Preserved production changes

Ten production commits provide current subscription capacities, enforce-by-default plan guards for new employer actions, candidate-safe admission behavior, storage metering and its additive schema migration, transaction support for team operations, and catalog-backed dashboard meters. These remain in the merged branch. Both dbQuery.transaction (billing) and withTransaction (production team/storage callers) remain available.

The only textual conflict was .env.example. Both the production enforcement settings and disabled-by-default billing settings were retained. No real environment file or runtime flag was changed.

## Semantic reconciliation

The earlier billing branch default catalog had stale Starter/Growth capacities and no storage caps. Added immutable pricing_2026_09_21_v2 plan versions matching the production catalog: Starter 5 jobs / 2 users / 10 GiB / 25 video responses; Growth 15 / 5 / 50 GiB / 100; Premium 40 / 15 / 200 GiB / 400. Monthly/annual prices remain PHP 1490/14900, 3490/34900, and 5990/59900 respectively. Checkout defaults to the new version. Existing historical versions and explicitly mapped agreements are retained.

The production-schema regression now compares payment catalog prices and capacities directly with the executable production plan catalog, including the premium/business alias. This replaces the earlier integration notes' stale capacity expectations; it does not alter existing payment terms.

## Validation

- 60 relevant Node tests passed: billing, referral integration, internal complimentary access, legacy trial cleanup, checkout pricing and production subscription contracts.
- After adding the runtime catalog comparison, all 3 production-schema rehearsal tests passed again.
- Merged server bundled targeting Node 20 and passed node --check.
- No unresolved merge markers or whitespace errors.

Tests ran locally with synthetic fixtures and mocked payment providers. The newly merged Jest/database integration suites were not run; their dedicated runner and isolated PostgreSQL setup remain staging verification work. These results are not a live portal or real payment test.

## Release boundary

No deployment, production migration, account grant or runtime change performed. Billing remains disabled by default. Frontend compatibility is prepared separately on codex/internal-access-frontend (7291be34); stage both before rollout. Internal Premium's production paid flag remains unchanged until the audited grant is safely applied with compatible code.

Never use GitHub Actions. LGUIDS remains outside scope and untouched.
