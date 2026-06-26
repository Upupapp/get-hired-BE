# GetHired Backend Error Envelope Audit — NOTIFY-3

## Scope: contactsController.js, candidateController.js, seo.service.ts (OG tags)

---

## 1. contactsController.js — multipleContact endpoint

**Response envelope (success path):**
```json
{
  "data": {
    "contacts": [...],
    "summary": {
      "totalRequested": N,
      "successCount": N,
      "failureCount": N,
      "duplicateCount": N,
      "outcome": "all_success" | "partial_success" | "duplicate_only" | "all_failed"
    }
  }
}
```

**Response envelope (error path):**
- 400: `{ "error": "No contacts provided." }` — when `contacts` array is empty
- 403: `{ "message": "You don't have permission to do that." }` — BOLA guard
- 500: `{ "error": "Operation not successful. Please try again." }` — catch block

**Quality:**
- [x] Summary always present in success response
- [x] All four count fields always populated (defaulting to 0 via filter + length)
- [x] `outcome` string is always one of 4 known values
- [x] `console.error` used for server errors (not `console.log`)
- [x] `console.info` for summary logging (structured, includes endpoint name for filtering)
- [x] No `.?` or `??` operators (esm-safe)
- [x] BOLA guard derives companyId from JWT only

**Envelope consistency with FE:**  
FE reads `res.summary` from `onboard.contactRes`. The store must unwrap `data` from the API response before storing in `contactRes`. Confirmed the FE reads `summary.successCount` etc. — the mapping works as long as the store correctly unwraps the `data` key (which is the standard `successResponse()` wrapper used throughout).

---

## 2. candidateController.js — multipleCandidate endpoint

**Response envelope (success path):**
```json
{
  "data": {
    "candidates": [...],
    "summary": {
      "totalRequested": N,
      "successCount": N,
      "failureCount": N,
      "duplicateCount": N,
      "outcome": "all_success" | "partial_success" | "duplicate_only" | "all_failed"
    }
  }
}
```

Note: contacts uses `contacts` key, candidates uses `candidates` key. This is correct — the FE candidate component reads `onboard.candidateRes.summary`, not the array items key directly.

**Quality:** Same checklist as contacts — all PASS.

---

## 3. Error Envelope Consistency

The app uses two error formats:

| Pattern | Used in | Format |
|---|---|---|
| `errorResponse(msg)` | Most controllers | `{ "error": "msg" }` |
| `res.status(403).json({ message: "..." })` | BOLA guards | `{ "message": "..." }` |
| `res.status(403).send("Unauthorized")` | verifyAuth.js | Plain string |

**FE handling:** The global interceptor handles 401/403 without reading the body. Component-level error handlers typically show a generic toast without parsing the body. So the inconsistency between `error` and `message` keys does not currently cause user-facing defects.

**Risk:** If any FE component tries to surface BE error messages directly, it would need to check both `error.error.error` and `error.error.message`. This is a latent inconsistency. Not a NOTIFY-3 fix — documented for future API contract work.

---

## 4. Logging Quality

| Controller | Success log | Error log | Quality |
|---|---|---|---|
| contactsController multipleContact | `console.info('[NOTIFY_P2_CONTACT_INVITE_MULTIPLE]', { endpoint, ...summary })` | `console.error('[contactsController] error:', error)` | GOOD — structured, namespaced |
| candidateController multipleCandidate | `console.info('[NOTIFY_P2_CANDIDATE_INVITE_MULTIPLE]', { endpoint, ...summary })` | `console.error('[candidateController] error:', error)` | GOOD — structured, namespaced |
| Other contactsController methods | No success log | `console.error(...)` | Adequate |

---

## 5. `outcome` Field Completeness Check

```
successCount > 0 AND failureCount === 0  → 'all_success'      ✓
successCount > 0 AND failureCount > 0    → 'partial_success'  ✓
successCount === 0 AND duplicateCount > 0 → 'duplicate_only'  ✓
successCount === 0 AND duplicateCount === 0 → 'all_failed'    ✓
```

Edge case: What if `successCount === 0`, `duplicateCount === 0`, and `failureCount === 0`?
This happens when `contacts` array is non-empty but `Promise.allSettled` returns all entries with `status: 'fulfilled'` and `value.status` being neither 'ADDED' nor 'DUPLICATE_CONTACT'. In this case `outcome = 'all_failed'` (last branch). Technically correct behavior — these records were not added. This edge case is unlikely in practice.

**Verdict:** PASS.
