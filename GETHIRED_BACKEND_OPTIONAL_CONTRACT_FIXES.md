# GetHired Backend Optional Contract Fixes — QA Cycle 11

Generated: 2026-06-25  
These are improvements that are safe and worthwhile but NOT blocking for the current release.

---

## OPT-01 — Unify GET /api/interview/hub response envelope

**Priority:** Low  
**Effort:** 5 min  
**Risk:** Would break the FE if applied without updating `RecruiterInterviewHubService`

**Current:** `GET /api/interview/hub` returns `{ items: [...], total: N }` directly (raw JSON).  
**Standard:** All other endpoints return `{ success: true, data: <payload> }` via the `successMessage` helper.  
**Proposed change:**
```javascript
// controllers/interviewController.js — getInterviewHub
// Replace:
return res.json({ items, total: items.length })
// With:
successMessage.data = { items, total: items.length }
return res.status(status.success).send(successMessage)
```
Then update FE `RecruiterInterviewHubService.getInterviewHub()`:
```typescript
// Change return type and mapping:
return this.http.get<any>(`${this.apiUrl}/interview/hub`).pipe(
  map(res => res?.data as InterviewHubResponse)
);
```
**Note:** The current FE already handles the non-standard shape correctly. This fix only matters for consistency and future maintainability.

---

## OPT-02 — Expose applicantEmail fallback chain on interview hub

**Priority:** Low  
**Effort:** 10 min

**Current:** `applicantName` in the hub uses: `firstname + lastname` → email fallback.  
**Gap:** After FIX F-01, the email now comes from `uc.email` (user_credentials join). The mapping correctly references `r.email` for the fallback, but the SELECT aliases the column as `uc.email` without an explicit alias. This could work or fail depending on how node-postgres resolves the column name.

**Proposed fix in getInterviewHub SELECT:**
```diff
- uc.email,
+ uc.email                 AS "applicant_email",
```
And in the row mapper:
```diff
- applicantName: r.firstname && r.lastname
-   ? `${r.firstname} ${r.lastname}`.trim()
-   : (r.email || null),
- applicantEmail: r.email || null,
+ applicantName: r.firstname && r.lastname
+   ? `${r.firstname} ${r.lastname}`.trim()
+   : (r.applicant_email || null),
+ applicantEmail: r.applicant_email || null,
```

---

## OPT-03 — Add index on message_threads.updated_at

**Priority:** Low  
**Effort:** 5 min (DDL only)  
**Risk:** None (additive index)

**Reason:** `listRecruiterThreads` orders by `mt.updated_at DESC`. As thread count grows, this becomes a full table scan. Adding an index would keep the query fast at scale.

```sql
CREATE INDEX IF NOT EXISTS message_threads_updated_at_idx
  ON gethired.message_threads (company_id, updated_at DESC);
```
A composite index on `(company_id, updated_at DESC)` covers both the WHERE and ORDER BY in one scan.

---

## OPT-04 — Add LIMIT to listRecruiterThreads

**Priority:** Low  
**Effort:** 2 min

**Current:** `listRecruiterThreads` has no LIMIT — all threads for a company are returned. For a company with thousands of historical conversations, this could be slow and return a large payload.

**Proposed:** Add `LIMIT 100 OFFSET $2` with pagination support, or at minimum `LIMIT 200` (same as interview hub).

```javascript
// Short-term guard:
ORDER BY mt.updated_at DESC
LIMIT 200`
```

---

## OPT-05 — `verifyAuth` response body consistency

**Priority:** Low  
**Effort:** 10 min

**Current:** `verifyAuth` returns plain text `"Unauthorized"` or `"Token Expired. Login again."` on 403. All other 403 responses are JSON.

**Proposed:**
```javascript
// middleware/verifyAuth.js
res.status(403).json({ message: "Unauthorized. Please sign in." });
// and
res.status(403).json({ message: "Your session has expired. Please sign in again." });
```
This is purely a consistency improvement. The FE handles 403 by HTTP status code (not body), so this is safe.

---

## OPT-06 — `verifyRoles` migration: use req.user.uid

**Priority:** Medium (security hygiene, not blocking)  
**Effort:** 30–60 min (touches all routes using verifyRoles)

**Current:** `verifyRoles` reads `uid` from `req.body.uid || req.query.uid`. This means the UID used for role lookup is client-supplied.

**Proposed:** Change to use `req.user.uid` (from Firebase JWT, already validated by verifyAuth). This requires `verifyAuth` to run before `verifyRoles` on any route using both.

**Caveat:** `verifyRoles` does not appear on any of the new B01/B03/SEC-01 endpoints. Deferred to a dedicated SECURE pass.

---

## OPT-07 — Rate limit 429 FE handler

**Priority:** Low  
**Effort:** 20 min  
**File:** `src/app/core/interceptor/unauthorize.interceptor.ts`

**Proposed:**
```typescript
if (err.status === 429) {
  const retryAfter = err.headers?.get('RateLimit-Reset');
  this.snackBar.open(
    `You've made too many requests. Please wait a moment before trying again.`,
    '', { duration: 6000, panelClass: ['warning-snackbar'] }
  );
  // Do NOT redirect to signin for 429
}
```
