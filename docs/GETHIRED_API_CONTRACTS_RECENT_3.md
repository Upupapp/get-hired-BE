# GETHIRED API CONTRACTS — STITCH 3 (Recent Deployment)
_Generated: 2026-06-26_

---

## New / Changed Endpoints in This Deployment

### POST /contacts/multiplecontact

**Auth:** `verifyAuth` (Firebase JWT required)

**Request body:**
```json
{
  "groupName": "string (may be empty string)",
  "groupId": "string (may be empty string)",
  "contacts": [
    {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "mobileNumber": "string",
      "address": "string",
      "userId": "string (optional)"
    }
  ]
}
```

**CHANGED response body (NOTIFY-P2):**
```json
{
  "status": 200,
  "data": {
    "contacts": [
      { "contact_id": "...", "first_name": "...", "email": "...", "message": "...", "status": "ADDED" }
    ],
    "summary": {
      "totalRequested": 3,
      "successCount": 2,
      "failureCount": 0,
      "duplicateCount": 1,
      "outcome": "partial_success"
    }
  }
}
```

**Previous shape (BEFORE NOTIFY-P2):** Unknown — the `forEach(async)` pattern was broken and could send multiple responses. The effective response shape was undefined for concurrent contacts.

**Outcome values:**
- `all_success` — all contacts added
- `partial_success` — some added, some failed (rejected promise)
- `duplicate_only` — no new additions, all duplicates
- `all_failed` — all rejected, no duplicates

**Contract note:** `contacts` array contains only items with `status === 'ADDED'`. Duplicates are counted in `summary.duplicateCount` but not included in `contacts`. FE consumers that expected a bare array response must update to read `response.data.contacts`.

---

### POST /candidates/multiplecandidate

**Auth:** `verifyAuth` (Firebase JWT required)

**Request body:**
```json
{
  "candidate": [
    {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "mobileNumber": "string",
      "address": "string",
      "jobId": "string",
      "userId": "string (optional)"
    }
  ]
}
```

**CHANGED response body (NOTIFY-P2):**
```json
{
  "status": 200,
  "data": {
    "candidates": [
      { "candidate_id": "...", "first_name": "...", "email": "...", "message": "...", "status": "ADDED" }
    ],
    "summary": {
      "totalRequested": 2,
      "successCount": 1,
      "failureCount": 0,
      "duplicateCount": 1,
      "outcome": "partial_success"
    }
  }
}
```

**Contract note:** Input field is `candidate` (array), not `candidates`. This matches the prior contract (the field name was not changed).

---

## Unchanged Endpoints (SSR-Related, Verified)

### GET /job/details

**Auth:** `optionalVerifyAuth` (token optional; invalid token = 401)

**Response:** Unchanged. The SSR RESPONSE token integration does not affect this endpoint — the status 404 is set on the SSR Express response object, not in the API response body.

**No contract change.**

---

## FE Integration Verification Checklist

- [ ] Find all FE call sites for `POST /contacts/multiplecontact` — verify they read `response.data.contacts` not `response.data` directly.
- [ ] Find all FE call sites for `POST /candidates/multiplecandidate` — verify they read `response.data.candidates`.
- [ ] Confirm no FE code depends on duplicate contacts appearing in the response body (they are now only counted in `summary.duplicateCount`).

---

## Stable / Unaffected Contracts

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /job/published | Unchanged | No auth, no SSR impact |
| GET /job/details | Unchanged | optionalVerifyAuth; SSR 404 is Express-layer only |
| POST /job/create | Unchanged | No NOTIFY-P2 changes |
| DELETE /contacts/deletecontact | Unchanged | No shape change |
| DELETE /candidates/deletecandidate | Unchanged | No shape change |
| PUT /contacts/updatecontact | Unchanged | No shape change |
| PUT /candidates/updatecandidate | Unchanged | No shape change |
| GET /contacts/list | Unchanged | No shape change |
| GET /candidates/list | Unchanged | No shape change |
