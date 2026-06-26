# NOTIFY-P1 Backlog
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_BACKLOG_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Priority Definitions

- **P0** — Launch blocker / production emergency
- **P1** — Must fix before next payment volume spike
- **P2** — Should fix within sprint
- **P3** — Nice to have / tech debt

---

## P0 — Already Fixed in This Session

| ID | Item | Commit |
|----|------|--------|
| N1-P0-01 | `insertTransactionTable` ON CONFLICT fix | 0ba7414 |
| N1-P0-02 | `createCompanySubscription` idempotency guard | 0ba7414 |
| N1-P0-03 | `status` import shadow bug fixed | 0ba7414 |
| N1-P0-04 | Unknown event type returns 200, not hanging | 0ba7414 |

---

## P1 — Pending (Manual Actions)

| ID | Item | Owner | Notes |
|----|------|-------|-------|
| N1-P1-01 | Apply `db/payment_webhook_events_ddl.sql` to Supabase production | Operator | Paste into Supabase SQL editor; code degrades gracefully until then |
| N1-P1-02 | Run reconciliation queries (RECONCILIATION_SWEEP_V2) | Operator | Detect employers who paid but got no subscription |
| N1-P1-03 | Monitor PayMongo webhook delivery logs for 7 days | Operator | Confirm all retries return 200, no remaining 500s |

---

## P2 — Next Sprint

| ID | Item | File | Notes |
|----|------|------|-------|
| N1-P2-01 | Add outbound `Idempotency-Key` header to `createPaymongoLink` | `controllers/paymentController.js` | Key: `gethired:{env}:{cartId}`; prevents double payment link creation |
| N1-P2-02 | Add `withActiveSubscription` localStorage refresh after payment | FE: `employer-subscription.component.ts` | Employer returns from PayMongo but sees stale plan status until re-login |
| N1-P2-03 | Add companies_subscription unique index (after checking duplicates) | `db/payment_webhook_events_ddl.sql` Step 5 | Check for existing duplicate rows first |
| N1-P2-04 | Add `role="status"` / `aria-live` to subscription activation feedback | FE: `subscriptions.component.html` | Screen reader cannot announce plan activation |
| N1-P2-05 | Fix `<a>` invoice links to have `href` or convert to `<button>` | FE: `subscriptions.component.html` | Not keyboard-reachable |
| N1-P2-06 | Add `payment.paid` event path to call `createCompanySubscription` | `controllers/paymentController.js` | Currently subscription activation only fires on `link.payment.paid` |
| N1-P2-07 | Add Slack/email alert for PAYMONGO_WEBHOOK_PROCESSING_FAILED | `server.js` or external | Manual PM2 log monitoring is the current fallback |

---

## P3 — Tech Debt / Nice to Have

| ID | Item | Notes |
|----|------|-------|
| N1-P3-01 | Add deep payload guard before `data.attributes.data.attributes` access | Protects against unexpected PayMongo payload shape changes |
| N1-P3-02 | Structured JSON logging for payment webhook events | Makes logs grep/filter-friendly; currently string logs |
| N1-P3-03 | PM2 log rotation config | PM2 default (10 × 10MB) may be insufficient at scale |
| N1-P3-04 | Automated webhook simulation tests | Use PayMongo's test mode + ngrok to run T1–T10 scenarios |
| N1-P3-05 | Add billing history row reveal animation (FE) | Fade-in for new transaction rows in subscriptions.component |
| N1-P3-06 | Add `aria-label` to usage-limit alert icon | Accessibility gap in subscriptions.component.html |
| N1-P3-07 | Fix billing history `<div>` table to use ARIA table roles | `role="table"`, `role="row"`, `role="cell"` |
| N1-P3-08 | Add payment-pending verification skeleton shimmer (FE) | Requires backend polling endpoint for subscription state |
