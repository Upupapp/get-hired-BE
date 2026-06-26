# NOTIFY-P1 Frontend Compatibility Log
**GETHIRED_NOTIFY_P1_PAYMONGO_FRONTEND_COMPATIBILITY_LOG_V2**
Run: 2026-06-26 | FE HEAD: 553ce0c

---

## NOTIFY-P1 Frontend Impact: NONE

NOTIFY-P1 is a backend-only patch. No FE files were modified.

---

## Payment/Subscription FE Surface Audit

### Subscription page (`subscriptions.component.html` + `subscriptions.component.ts`)

**What it shows:**
- Current plan card (from `companySubs[0]`)
- Plan usage bars (job posts, video responses, admin users)
- Billing history table (`*ngFor="let sub of companySubs | slice: 1"`)

**Data source:** `SubscriptionsService.getCompanySubscription(companyId)` → `GET /api/subscription/getcompanysubscriptions?companyId=...` → `subscriptionController.getCompanySubscriptions` → `companySubscriptions(companyId)` query on `companies_subscription`

**Duplicate row risk (pre-patch):** If `companies_subscription` had duplicate rows (from duplicate webhook deliveries), the `*ngFor` in the history section would display them all. No FE-level deduplication.

**Post-patch:** `createCompanySubscription` check-then-insert prevents duplicate rows. Existing duplicate rows (if any) are a data cleanup item (see RECONCILIATION_SWEEP_V2).

**FE response contract:** The `getCompanySubscriptions` endpoint returns all rows ordered by `created_at DESC`. Shape is unchanged. No FE change needed.

### Employer subscription page (`employer-subscription.component.ts`)

**What it shows:** Reads `withActiveSubscription` from `localStorage` — this is a cached boolean set during login, not live state.

**Issue:** This localStorage value is NOT updated by webhook processing. An employer who just paid may not see "active" subscription until they log out and back in, or until a refresh mechanism updates the value.

**NOTIFY-P1 scope:** This is a pre-existing UX gap, not introduced by this patch. Documented in backlog.

### Subscription list (`subscriptions-list.component.ts`)

Displays available plans for selection. Does not show current subscription state. No impact.

### Checkout service (`checkout.service.ts`)

Handles `/api/checkout` and `/api/cart` routes — a separate checkout flow from the PayMongo subscription flow. Not touched by NOTIFY-P1.

### Subscriptions facade / NgRx store

`SubscriptionsFacade` loads company subscriptions via NgRx effects. The data is fetched on demand. After a webhook processes a new subscription, the next FE load of `GET /api/subscription/getcompanysubscriptions` will return the updated state.

---

## Preserved FE Behaviors

| Behavior | Status |
|----------|--------|
| Subscription plan checkout flow | Preserved |
| PayMongo payment link redirect | Preserved |
| Company subscription history display | Preserved (plus: no more duplicate rows) |
| Subscription plan selection UI | Preserved |
| Auth interceptor / route guards | Preserved |
| Billing error snackbar copy | Unchanged |

---

## No FE Changes Needed

The webhook handler response shape changes (`{ received, provider, status }`) are for PayMongo only. No Angular component or service reads the webhook response directly — FE never calls the webhook endpoint.

---

## Payment Pending State Gap (Pre-Existing)

**Issue:** After a user pays via PayMongo and returns to the app, there is no "Verifying payment…" state. The `employer-subscription.component.ts` reads `withActiveSubscription` from localStorage immediately.

**Risk:** User sees old plan status until they refresh or re-login.

**NOTIFY-P1 scope:** Not introduced by this patch. Documented in frontend backlog (BACKLOG_V2). The recommended fix (polling or push notification for subscription state) is a P2 UX improvement.
