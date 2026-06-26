# NOTIFY-P1 Webhook Logging & Monitoring Log
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_LOGGING_MONITORING_LOG_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Log Events Added

All logs use `console.log` / `console.warn` / `console.error` for PM2 compatibility. No PII or secrets logged.

### paymentController.js

| Event | Level | Label | Contains |
|-------|-------|-------|---------|
| Webhook received | log | PAYMONGO_WEBHOOK_RECEIVED | eventType, providerObjectId (no payload, no raw body, no secrets) |
| Signature invalid | warn | PAYMONGO_WEBHOOK_SIGNATURE_INVALID | Rejected message only (no signature value, no secret) |
| Duplicate ignored (ledger) | log | PAYMONGO_WEBHOOK_DUPLICATE_IGNORED | eventId (masked: first 8 chars), eventType |
| Transaction inserted | log | PAYMONGO_TRANSACTION_UPSERT_INSERTED | transactionId (PayMongo ID, not personal) |
| Transaction duplicate | log | PAYMONGO_TRANSACTION_UPSERT_DUPLICATE | transactionId |
| Subscription transition | log | PAYMONGO_SUBSCRIPTION_STATE_TRANSITIONED | companyId, subscriptionId |
| Subscription duplicate no-op | log | PAYMONGO_SUBSCRIPTION_DUPLICATE_NOOP | In subscriptionController.js |
| payment.paid processed | log | PAYMONGO_WEBHOOK_PROCESSED payment.paid | eventType |
| payment.failed processed | log | PAYMONGO_WEBHOOK_PROCESSED payment.failed | eventType |
| Unknown event ignored | log | PAYMONGO_WEBHOOK_IGNORED_UNSUPPORTED_TYPE | webhookEvent string |
| Processing failed | error | PAYMONGO_WEBHOOK_PROCESSING_FAILED | error.code, first 80 chars of message (no payload, no keys) |
| Ledger table missing | warn | [paymentController] payment_webhook_events table not migrated | Migration instructions |
| Ledger error (non-blocking) | warn | [paymentController] Webhook event ledger error | error.code, first 80 chars of message |

### subscriptionController.js

| Event | Level | Label | Contains |
|-------|-------|-------|---------|
| Subscription already activated | log | PAYMONGO_SUBSCRIPTION_DUPLICATE_NOOP | Message only |
| Subscription existence check error | warn | createCompanySubscription existence check error | error.code |

---

## Not Logged (Security Constraints)

| Item | Why |
|------|-----|
| Raw webhook payload | Could contain cardholder PII |
| `paymongo-signature` header value | Secret — must never appear in logs |
| `PAYMONGO_WEBHOOK_SECRET` value | Secret |
| Raw body (Buffer/string) | Used only for HMAC — destroyed after comparison |
| `req.body.data.attributes.data.attributes.email` | PII — billing email |
| `req.body.data.attributes.data.attributes.name` | PII — billing name |
| `req.body.data.attributes.data.attributes.phone` | PII — billing phone |
| PayMongo API key | Secret |

---

## Monitoring Recommendations

### PM2 logs (current)

```bash
# From Linode:
pm2 logs gethired --lines 200 --nostream
# Or tail in real-time:
pm2 logs gethired
```

Filter for payment events:
```bash
ssh root@139.162.11.242 "pm2 logs gethired --nostream | grep PAYMONGO"
```

### Key metrics to watch

| Signal | How | Alert threshold |
|--------|-----|----------------|
| Webhook 500s | PM2 logs: PAYMONGO_WEBHOOK_PROCESSING_FAILED | Any |
| Duplicate events | PM2 logs: PAYMONGO_WEBHOOK_DUPLICATE_IGNORED | >5/hour for same eventId |
| Signature rejections | PM2 logs: PAYMONGO_WEBHOOK_SIGNATURE_INVALID | Any |
| Ledger table missing | PM2 logs: payment_webhook_events table not migrated | Present = migration pending |
| Subscription transition | PM2 logs: PAYMONGO_SUBSCRIPTION_STATE_TRANSITIONED | Confirm once per payment |

### PayMongo Dashboard

PayMongo dashboard → Webhooks → webhook endpoint → Delivery logs:
- Shows every delivery attempt with status code returned
- POST-patch: all retries should now return 200 instead of 500
- If still seeing 500s after patch: check PM2 logs for PAYMONGO_WEBHOOK_PROCESSING_FAILED

### Supabase DB query for reconciliation

```sql
-- payment_webhook_events status summary (after migration):
SELECT status, COUNT(*) FROM gethired.payment_webhook_events GROUP BY status;

-- Unprocessed events (potential gaps):
SELECT * FROM gethired.payment_webhook_events
WHERE status IN ('processing', 'failed', 'needs_reconciliation')
ORDER BY received_at DESC;
```

---

## Alerting Gaps (Not Addressed in NOTIFY-P1)

| Gap | Priority | Notes |
|-----|----------|-------|
| No Slack/email alert for PAYMONGO_WEBHOOK_PROCESSING_FAILED | P2 | Manual monitoring via PM2 logs for now |
| No alert for failed/needs_reconciliation rows in ledger | P2 | Query above as interim |
| No PM2 log rotation config beyond default | P3 | PM2 default: 10 files × 10MB per file |
| No structured log format (JSON) | P3 | String logs today — harder to grep/filter |
