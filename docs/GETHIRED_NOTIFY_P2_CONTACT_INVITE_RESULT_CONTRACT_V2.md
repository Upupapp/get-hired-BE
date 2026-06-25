# NOTIFY-P2: Contact Invite Result Contract

**Date:** 2026-06-26

---

## Principle

HTTP 200 at the envelope level does NOT mean all items succeeded. Every invite response must carry per-item or summary-level result data that the frontend reads BEFORE deciding which toast to show.

---

## Response Contracts (post-patch)

### 1. Single contact add — `POST /contacts/createcontact`

```json
{
  "data": {
    "contact_id": "...",
    "email": "...",
    "first_name": "...",
    "status": "ADDED"
  }
}
```

Duplicate:
```json
{
  "data": {
    "message": "Contact aleady exist",
    "status": "DUPLICATE_CONTACT"
  }
}
```

### 2. Bulk contact import — `POST /contacts/multiplecontact`

```json
{
  "data": {
    "contacts": [
      { "contact_id": "...", "email": "...", "status": "ADDED" }
    ],
    "summary": {
      "totalRequested": 5,
      "successCount": 3,
      "failureCount": 1,
      "duplicateCount": 1,
      "outcome": "partial_success"
    }
  }
}
```

**Outcome values:** `all_success` | `partial_success` | `duplicate_only` | `all_failed`

### 3. Single candidate add — `POST /candidates/addcandidate`

```json
{
  "data": {
    "candidate_id": "...",
    "email": "...",
    "status": "ADDED"
  }
}
```

Duplicate:
```json
{
  "data": {
    "message": "Candidate Already Exist",
    "status": "DUPLICATE_CANDIDATE"
  }
}
```

### 4. Bulk candidate import — `POST /candidates/multiplecandidate`

```json
{
  "data": {
    "candidates": [...],
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

### 5. Company user invite — `POST /companies/addcompanyuser`

Backend unchanged — already returns structured per-email objects. Each email object:

```json
{ "email": "user@example.com", "status": "success" | "failed", "msg": "..." }
```

---

## Frontend Decision Matrix

| successCount | failureCount | duplicateCount | Toast class | Message |
|---|---|---|---|---|
| > 0 | 0 | any | `success-snackbar` | "N contacts added." |
| > 0 | > 0 | any | `warning-snackbar` | "N added. M couldn't be added." |
| 0 | 0 | > 0 | `info-snackbar` | "No new contacts. Already in list." |
| 0 | > 0 | any | `danger-snackbar` | "No contacts were added." |
| 0 | 0 | 0 | `danger-snackbar` | "No contacts were added." |

---

## Status Enum Reference

| Value | Meaning |
|---|---|
| `ADDED` | Contact/candidate was newly inserted into DB |
| `DUPLICATE_CONTACT` | Email already exists in contacts table |
| `DUPLICATE_CANDIDATE` | Email already exists in candidates table |
| `success` | Company user invite sent (existing BE field) |
| `failed` | Company user invite failed — email already registered (existing BE field) |
