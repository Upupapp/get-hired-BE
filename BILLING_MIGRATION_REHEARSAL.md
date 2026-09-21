# Billing migration rehearsal — 2026-09-21

Validated the engagement and PayMongo billing migrations in an isolated PGlite database using schema-only DDL captured read-only from GetHired PostgreSQL 16.15. No production customer rows, credentials, or sequence values were copied. No production migration, deployment, payment, or feature-flag change was performed. LGUIDS was not accessed.

## Fixture provenance and boundaries

The fixture contains the billing tables and their foreign-key dependencies, plus the invoice event table and application-referenced invoice number sequence. Table defaults, constraints, indexes, and foreign keys are retained. The dump omitted owners, permissions, comments and security labels; psql restrict/unrestrict directives were removed and CREATE SCHEMA was prepended for isolated initialization. This is a targeted schema extract, not a full database backup. Synthetic records are generated locally by the test.

Production runs PostgreSQL 16.15 and Node 20.20.2. The rehearsal uses PGlite 0.5.8 and local Node 24.19.0. It verifies SQL compatibility and transactional behavior in that engine; it does not certify production lock duration, multi-connection concurrency, permissions, throughput, network/provider behavior or production data completeness. A PostgreSQL 16 staging rehearsal is still needed before rollout.

## Coverage

- Apply both migrations twice and compare every original column of seeded subscription, notification, webhook and invoice rows.
- Preserve 16 synthetic subscriptions with the production default paid flag and payment date, but without verified amounts or provider references. Migration creates no payment attempts, transactions, fulfillment or engagement events from those flags.
- Block checkout of an unmapped legacy paid account before any provider call.
- Inject division-by-zero before each migration commit, roll back all DDL/data changes, then successfully retry.
- Create an unpaid seven-day trial twice without duplicate rows or payment dates.
- Process a signed, mocked current-catalog Growth payment and duplicate webhook against actual schema constraints; produce one payment, invoice and fulfillment.
- Enforce amount checks, invoice foreign keys and immutable referenced payment/catalog terms.
- Rerun billing migration after payment without changing its PAID status or duplicating transactions.

Final validation: **51 tests passed, 0 failed**, including all three production-schema rehearsal tests.

## Defect fixed

Production has timestamp-without-time-zone created_at and timestamp-with-time-zone period_start columns. Trial creation reused parameter $2 without a declared type, causing PostgreSQL error 42P08. Explicit timestamptz parameter casts now allow PostgreSQL to assign each destination type. The production-schema regression test covers the failure.

The first targeted extraction omitted the independently referenced invoice sequence and invoice_events table. They were added from production schema DDL; no application workaround or invented schema was used.

## Rollout status

This branch remains disabled by default and is not deployed. Production advanced from integration base d659f10 to c72f025 during this work; reconcile that drift before deploying. The owner confirmed there are no actual paid accounts; see LEGACY_PAYMENT_RECONCILIATION.md. Legacy flags are not approved billing agreements. Explicit billing mode and webhook configuration, access disposition, and a genuine provider test-mode end-to-end test remain required.

Run locally from repository root:

```sh
node --test tests/paymongo*.test.cjs tests/subscription-checkout-pricing.test.cjs tests/referral-*.test.cjs
```

GitHub Actions must remain disabled. Do not run these tests through Actions.
