# NOTIFY-P2: Logging & Monitoring Log

**Date:** 2026-06-26

---

## Structured logs added

### `contactsController.js` — `multipleContact`

```js
console.info('[NOTIFY_P2_CONTACT_INVITE_MULTIPLE]', {
  endpoint: 'POST /contacts/multiplecontact',
  totalRequested,
  successCount,
  failureCount,
  duplicateCount,
  outcome
});
```

Logged on every bulk contact import (200 response). Enables production monitoring of invite quality over time.

### `candidateController.js` — `multipleCandidate`

```js
console.info('[NOTIFY_P2_CANDIDATE_INVITE_MULTIPLE]', {
  endpoint: 'POST /candidates/multiplecandidate',
  totalRequested,
  successCount,
  failureCount,
  duplicateCount,
  outcome
});
```

---

## What is NOT logged

Per security constraints:
- No email addresses are logged
- No contact_id or candidate_id values are logged
- No Firebase tokens or user UIDs are logged
- No raw error stack traces exposed to client

The existing `console.error('[contactsController] error:', error)` and `console.error('[candidateController] error:', error)` are retained for unhandled exception paths.

---

## Monitoring recommendations (not implemented in this sprint)

| Signal | Recommended alert threshold |
|--------|---------------------------|
| `outcome: "all_failed"` rate > 20% of imports | Alert — possible data quality or spam issue |
| `outcome: "duplicate_only"` rate > 50% of imports | Alert — possible retry storm or stale CSV |
| `failureCount > 0` in company user invites | Info log — already partially implemented |

These would require a log aggregator (Datadog, CloudWatch, etc.) piping `console.info` output, which is outside the scope of this sprint.
