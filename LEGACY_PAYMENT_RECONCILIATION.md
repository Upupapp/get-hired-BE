# Legacy payment reconciliation — 2026-09-21

## Owner confirmation

The owner confirmed: “no actual paid account.” Treat the existing is_paid flags as legacy data errors, not evidence of customer payments. Do not create grandfathered paid agreements, backdated invoices, provider transactions, or referral rewards from these flags.

## Fresh read-only GetHired database check

| Subscription ID | Meaning | Records | is_paid | Positive amount_paid | Provider references |
| --- | --- | ---: | --- | ---: | ---: |
| 1 | Trial | 15 | true | 0 | 0 |
| 4 | Premium | 1 | true | 0 | 0 |

All 16 records have null plan_slug, active sub_status, and no period_end later than the time of the check (a null date is not proof of expiration). There are zero invoice records and zero webhook event records. This is database evidence plus owner confirmation, not an independent provider transaction-history audit.

## Disposition

- Confirmed actual paid customers: zero, according to the owner.
- Approved legacy paid agreements to backfill: zero.
- Trial records: the paid flag and default payment date cannot establish payment or trial eligibility. Determine original trial eligibility from account/subscription history before any expiry correction; do not restart trials automatically.
- Premium record: payment is unverified and owner says no actual payment. Its access purpose is still unknown (for example, test or complimentary). Preserve access pending classification; do not convert it into a paid agreement or silently revoke it.
- Existing financial guard remains: unmapped paid flags cannot initiate billing under the new foundation. Correcting the flags must be a deliberate, audited cleanup before enabling it, not a bypass of that guard.

## Change boundary and next action

This reconciliation performs no production updates. Existing entitlement behavior remains unchanged until a scoped correction is tested. The follow-up cleanup should snapshot affected rows, identify exact record IDs, check that no new verified payment evidence has appeared, apply explicit unpaid/access states in a transaction, and retain an audit trail. Avoid a blanket downgrade or fabricated payment history.

New trial creation in the integration branch already explicitly sets is_paid=false and payment_date=null. The timestamp compatibility fix is covered by the production-schema rehearsal. This branch is not yet deployed.

No LGUIDS tenant was accessed or changed. No GitHub Actions were used.
