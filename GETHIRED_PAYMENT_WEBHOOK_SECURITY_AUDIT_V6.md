# GETHIRED PAYMENT WEBHOOK SECURITY AUDIT — V6
**Date:** 2026-07-01

---

## Executive Summary

PayMongo webhook signature verification is NOW IMPLEMENTED in `paymentController.js`. The prior P0 finding (unverified webhook mutations) is resolved at the code level. The remaining action is an ops task: set `PAYMONGO_WEBHOOK_SECRET` in the production `.env` file.

---

## Implementation Verification

### verifyPaymongoSignature() — Code Review

```
File: controllers/paymentController.js, lines 61-97
```

| Control | Implementation | Assessment |
|---|---|---|
| Secret loaded from env | `const secret = env.paymongo_webhook_secret` | PASS |
| Fails closed if secret missing | `if (!secret) return false` | PASS |
| Signature header present check | `if (!sigHeader) return false` | PASS |
| Timestamp extraction | `parts.t` from comma-separated header | PASS |
| Replay window | Rejects requests >300 seconds old | PASS |
| Raw body used for HMAC | `req.rawBody ? req.rawBody.toString('utf8') : ...` | PASS (rawBody middleware required) |
| HMAC algorithm | SHA-256 | PASS |
| Timing-safe comparison | `crypto.timingSafeEqual()` | PASS |
| Length check before timingSafeEqual | `if (a.length !== b.length) return false` | PASS (prevents timing leak on length mismatch) |
| Signature source | Prefers `li` (live), falls back to `te` (test) | PASS |

### Idempotency Ledger

The `claimWebhookEvent` / `tryClaimEvent` / `markWebhookEventProcessed` functions implement a DB-backed idempotency ledger using the `payment_webhook_events` table. Degrades gracefully if table not yet migrated (error code 42P01 caught, warning logged).

### rawBody Middleware

The signature check requires `req.rawBody`. Verify that the Express server preserves the raw body for the webhook route (not parsed through JSON middleware before rawBody is captured). This was fixed in V5 (RAWBODY-001).

---

## Status

| Item | Status |
|---|---|
| verifyPaymongoSignature() code present | YES |
| Timing-safe comparison | YES |
| Replay protection (5-min window) | YES |
| Idempotency ledger (event dedup) | YES (degrades if table missing) |
| PAYMONGO_WEBHOOK_SECRET set in production | UNKNOWN — external ops action required (EXT-004) |
| payment_webhook_events table migrated | UNKNOWN — requires ops verification |
| Raw body preserved for webhook route | FIXED V5 |

---

## Required Action
Set `PAYMONGO_WEBHOOK_SECRET=<value from PayMongo dashboard>` in production `.env`.
Run `db/payment_webhook_events_ddl.sql` migration if not yet done.

**Overall P0 Status: RESOLVED at code level. Operationally PENDING env var.**
