# GetHired billing foundation integration

Integrated on 2026-09-21 from the original local GETHIRED workspace onto production base `d659f10`, in branch `codex/billing-foundation-integration`.

## Result

The existing billing domain, atomic database transaction support, provider adapter, schema migration, legacy reconciliation tool and isolated tests are now assembled with the current GetHired backend. The original uncommitted workspace remains unchanged.

`PAYMONGO_BILLING_ENABLED=false` retains the deployed checkout, webhook parsing and signup behavior. When explicitly enabled in a validated environment, existing checkout URLs route through the new authenticated billing service, the existing webhook URL consumes signed raw bytes, and checkout-status responses preserve the frontend's `checkoutIntentId`, `checkoutUrl`, and `confirmed`/`pending` contract. `business` maps to canonical `premium`. Arbitrary client prices are rejected. Billing failures never fall back to legacy charging.

A new immutable catalog version `pricing_2026_09_21` preserves published prices: Starter PHP 1,490 / 14,900, Growth PHP 3,490 / 34,900, Premium PHP 5,990 / 59,900 (monthly / annual). Existing job/user/video limits are retained. Storage limits are not invented. Historical version rows and stored renewal agreements remain unchanged. Tests use the earlier draft catalog explicitly where testing historical contracts.

New trial provisioning in the enabled path preserves the published seven-day trial but records it as unpaid. Legacy accounts marked paid without a verified billing version fail with `BILLING_AGREEMENT_REQUIRED`; they must be reconciled explicitly. No historical payments or referral rewards are fabricated.

Current deployed referral modules, owner pins, signup feed and 30-day-after-signup rule are retained. Dependency changes add only PGlite as a development/test dependency; no runtime package or production Node version is upgraded. Engagement domain modules are included as billing dependencies; no engagement email/deletion worker or new engagement routes are enabled.

## Validation

Isolated tests cover atomic payment/invoice/fulfillment, signature checks, test/live separation, server prices, duplicate events, failure recovery, reconciliation, renewals, cross-account access, raw webhook HTTP flow, refunds, referral delivery retries, connection scope, signup deadline, current catalog, legacy HTTP compatibility, unpaid trial provisioning and unmapped paid-account rejection.

Validation result: 48 applicable tests passed across the final suite and targeted rerun (32 unchanged tests plus all 16 billing-domain tests). The one fixture error found during integration was corrected; no known failing test remains.

Test command: `npm run test:billing`. For this worktree, existing local dependencies were reused through `NODE_PATH=/Users/user/Documents/ChatGPT/GETHIRED/node_modules`; no production credentials, services or customer data were used.

A local esbuild bundle of the full server and `node --check` pass. This verifies imports and syntax, not a credentialed full production boot. The existing production runtime and loader have not been changed.

## Remaining rollout work

1. Validate the additive migration sequence against an isolated production-shaped database: existing lifecycle/notification foundations, `subscription_engagement_migration.sql`, existing webhook/invoice foundations, then `paymongo_billing_migration.sql`. The domain fixtures already test the billing migration twice for repeatability, but this is not a complete production-schema rehearsal.
2. Reconcile the 16 legacy paid flags and any pending checkout links using explicit provider evidence and approved account terms. Do not infer a payment from `is_paid` or invent grandfathered agreements.
3. Confirm consistent explicit `PAYMONGO_MODE`, verified webhook bindings, worker database settings, owner payment authorization and refund secret/configuration.
4. Complete PayMongo test-mode integration with real provider test events and a sink mailbox. Domain/provider mocks passing do not certify the external callback route or dashboard configuration.
5. Release only after readiness checks pass. Keep referral payments, refunds and live-delivery flags disabled until then. Rollback must pause new checkout/delivery without discarding accepted event history; do not switch in-flight new payment attempts to the legacy handler.

No production migration, live charge, refund, email, payment enablement or LGUIDS change was performed for this integration. No GitHub Actions or Netlify build was used.
