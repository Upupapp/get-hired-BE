# Internal / Complimentary access

The owner identified the single legacy Premium record as internal company use. This implementation separates plan access from evidence of payment.

The additive migration adds access_kind (default standard), operator, timestamp and reason fields. It does not grant access or alter existing accounts. An internal grant must be unpaid with no payment date, positive amount or provider reference, and requires a recorded operator and reason. No public grant endpoint exists; customer request fields cannot create a grant.

Recognized internal grants retain their assigned catalog plan and limits. Entitlement/lifecycle summaries report active access, complimentary classification and unpaid status, without a renewal deadline. Dunning does not schedule payment reminders. Both existing checkout controllers and the new billing service reject checkout for internal accounts. The legacy subscription-history invoice display omits complimentary rows rather than presenting a pending invoice.

Queries projecting access fields use to_jsonb(cs), so standard-account reads remain compatible before the additive migration. No existing customer automatically becomes complimentary.

## Validation

Production-shaped schema tests cover repeatable migration, default preservation, rejection of unaudited or paid internal grants, and recognition of a valid synthetic grant. Runtime service tests cover entitlement/lifecycle state, unpaid labeling and reminder suppression with old period dates, while ordinary unpaid accounts remain pending payment. Existing billing tests also run locally. The server bundle is syntax checked. Final run: 29 tests passed, zero failed, including internal access, billing, checkout pricing and legacy trial correction tests.

## Rollout boundary

Implemented on codex/billing-foundation-integration only. No production migration, grant, paid-flag correction for Premium, deployment or feature enablement is included in this step. The internal Premium production record still has its old paid flag until the compatible application change is deployed and an audited grant/correction is applied together. Application rollout must first incorporate current production changes.

Frontend presentation and end-to-end portal access verification remain rollout work. No claim is made that the live portal now displays the new label. Referral-program metric exclusion must be independently verified across integration feeds before treating the internal account as fully excluded from all analytics; this access change creates no referral reward or payment evidence.

LGUIDS is outside scope. GitHub Actions must stay disabled; run validation locally and deploy directly when ready.

Production reconciliation completed against 93177c8; see PRODUCTION_INTEGRATION_2026_09_21.md for preserved guards and the new immutable billing catalog version. No deployment occurred.
