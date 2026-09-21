# Internal company access rollout — 21 September 2026

Owner authorized completion of the five rollout steps, including direct deployment and the audited internal grant. GitHub Actions must remain disabled. LGUIDS is outside this release.

## Scope

Retain the existing internal company's Premium limits while identifying its access as Internal / Complimentary, unpaid, without renewal prompts or checkout. Exclude internal company registrations and purchases from Referral Bunny feeds. Recheck company classification immediately before queued payment delivery. Anonymous short-link clicks cannot be classified as company usage before identity is known.

The GetHired frontend is Cloudflare Pages project `gethired`, deployed by direct upload of a locally built artifact. The backend is Linode, `/var/www/_work/get-hired-BE`, managed by PM2 `gethired`. The older Linode frontend directory is not the current public frontend and is not part of this deployment.

## Verification

- 62 focused backend tests pass locally, covering referral eligibility, duplicate delivery, refunds, signed mocked billing, schema preservation, internal checkout denial and unpaid trial creation.
- PostgreSQL 16.15 rehearsal uses only an isolated `codex_stage_internal_20260921` database and synthetic records. Additive migrations rerun, preserve legacy fields and roll back injected failures. The audited grant reruns safely; rollback restores the exact previous subscription and company. No external provider calls.
- Frontend production build and 676 local frontend tests pass, including the latest authentication fixes merged from master.
- Local synthetic portal renders internal Premium limits with no purchase controls; ordinary trials retain the normal plan choices.
- Production browser check uses the user's existing signed-in trial account. It is a different account from the internal Premium company; do not claim the browser verified the internal identity.

## Rollout order

1. Record current backend HEAD and current Cloudflare production deployment. Create a root-only database backup and verify its archive directory.
2. Preflight application imports in an isolated release checkout using the server's runtime and existing dependency tree.
3. Apply only `db/internal_complimentary_access_migration.sql` to production. It grants nothing. Do not apply or enable the billing foundation for this release.
4. Deploy compatible backend and frontend directly. Keep billing, engagement and referral payment-delivery feature flags disabled.
5. Apply `scripts/maintenance/grant-internal-company-access.sql`. It locks/checks the exact owner-confirmed company and subscription, refuses unexpected payment/referral evidence, preserves catalog limits and stores before/after snapshots.
6. Verify live services, exact deployed frontend assets, account state, entitlements, checkout refusal, unpaid trial state and unchanged invoice counts.

## Rollback

If the grant has been applied, run `scripts/maintenance/rollback-internal-company-access.sql` before reverting application code. It refuses rollback if account data has changed since the grant. It preserves its audit record. Do not automatically restore a full database over newer records.

Return backend to recorded pre-release commit and reload PM2. Restore the recorded Cloudflare production deployment using the Pages rollback action/API. Additive internal-access columns can remain; old readers ignore them. Retain the root-only database snapshot for disaster recovery. Re-grant after rollback requires review because the previous audit remains.

## Remaining boundary

This release does not authorize provider-mode enablement, collect a real payment, or enable outgoing referral payment delivery. Synthetic signed payment tests demonstrate the implementation under test conditions, not a live PayMongo transaction.

## Completed deployment receipt

- Backend deployed commit: `53b9946fa69938367e7763b543b7b94945dbc9e8`. Both PM2 workers verified online.
- Frontend deployed commit: `cf1df109e0a82ca243fe8867a40cb37c4f229e5f`.
- Cloudflare production deployment: `2218970b-b9f2-485b-bd2f-1b4975ac5059`; only 8 new assets uploaded, 304 reused. Public-domain main/runtime hashes match the local release artifact.
- Previous Cloudflare deployment retained for rollback: `53d27e5f-1ebb-4623-a77e-5bb706ae6974`.
- Root-only backup: `/root/gethired-rollbacks/20260921-internal/gethired-before.dump`; archive directory validated. Backend and Cloudflare before-state receipts stored alongside it.
- Exactly one audited internal grant applied. Production has 16 subscriptions: 15 unpaid trials and one internal complimentary Premium; zero marked paid, zero invoices and zero referral payment rows.
- Production controller/database verification: internal account resolves correctly, Premium active, unpaid, no billing interval or expiry, limits 40 jobs / 15 users / 200 GiB / 400 video responses. Checkout returns INTERNAL_ACCOUNT_BILLING_DISABLED without creating a cart. Lifecycle copy states no payment is required.
- Chrome verifies the current signed-in trial account's subscription and billing-history screens remain accessible after deployment; trial history remains labeled Trial, not paid. The internal identity itself was verified through production controllers/database and its UI through isolated staging, not by signing Chrome into that account.
- Billing foundation migrations were not applied to production. New billing foundation, engagement and outgoing referral payment-delivery flags remain disabled. No real payment or payout performed.
- LGUIDS was not accessed or modified. GitHub Actions remained disabled; no Netlify build was invoked.
