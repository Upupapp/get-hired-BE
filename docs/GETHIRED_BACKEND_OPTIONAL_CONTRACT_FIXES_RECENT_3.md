# GETHIRED Backend Optional Contract Fixes — STITCH 3 (Recent Deployment)
_Low-risk, backward-compatible improvements surfaced during STITCH 3 audit_
_Generated: 2026-06-26_

---

## OPT-3-01: Parameterize SQL in Legacy Contact/Candidate Query Helpers

**Priority:** HIGH (security — SQL injection via user-controlled inputs)

**Files:**
- `services/contact.service.js`
- `services/candidate.service.js`

**Current problem:** Several query helpers use string interpolation for user-controlled values. The most critical is `listOfContacts(companyId, groupName)` where `groupName` comes directly from `req.query.groupName` (user-supplied).

**Affected functions and fix pattern:**

```javascript
// contact.service.js:480 — checkGroupNameIfExist
// CURRENT (VULNERABLE):
const searchQuery = `SELECT * FROM ${dbSchema}."group" WHERE group_name='${groupName}'`;
const { rows } = await dbQuery.query(searchQuery, []);

// FIX:
const searchQuery = `SELECT * FROM ${dbSchema}."group" WHERE group_name=$1`;
const { rows } = await dbQuery.query(searchQuery, [groupName]);
```

```javascript
// contact.service.js:449 — checkIfExistInGroup
// CURRENT (VULNERABLE):
const searchQuery = `SELECT email FROM ${dbSchema}.group_list WHERE email = '${email}' and group_id='${groupId}'`;
const { rows } = await dbQuery.query(searchQuery, []);

// FIX:
const searchQuery = `SELECT email FROM ${dbSchema}.group_list WHERE email=$1 AND group_id=$2`;
const { rows } = await dbQuery.query(searchQuery, [email, groupId]);
```

```javascript
// contact.service.js:541-558 — listOfContacts
// groupName is interpolated in both parts of the UNION
// FIX: must use $1 in both parts (PostgreSQL allows repeated param references)
const searchQuery = `
  SELECT ... FROM ${dbSchema}.contact c
  WHERE NOT EXISTS(
    SELECT email FROM ${dbSchema}.group_list
    RIGHT JOIN ${dbSchema}."group" g ON g.group_id = group_list.group_id
    WHERE group_list.email = c.email AND g.group_name = $1
  ) AND c.company_id = $2
  UNION
  SELECT ... FROM ${dbSchema}.job_applicants j
  ...
  WHERE NOT EXISTS(
    SELECT email FROM ${dbSchema}.group_list
    RIGHT JOIN ${dbSchema}."group" g ON g.group_id = group_list.group_id
    WHERE group_list.email = c.email AND g.group_name = $1
  ) AND j2.company_id = $2
`;
const { rows } = await dbQuery.query(searchQuery, [groupName, companyId]);
```

**Effort:** 2-3 hours (6-8 functions)

**Risk of fix:** LOW — parameterization is a pure security fix with identical functional behavior.

**Backward-compatible:** Yes. No response shape changes.

---

## OPT-3-02: Add Logging for 404 SSR Responses

**Priority:** LOW (observability)

**File:** `server.ts` (FE repo)

**Current:** When a job renders 404 via the RESPONSE token, there is no server-side log entry indicating a 404 was sent (other than what Express may log at a lower level).

**Proposed:**
```typescript
// In job-posts-details.component.ts, after this.response.status(404):
// This would require injecting a logging service — complex for SSR.
// Simpler: add an Express-level afterRender hook or middleware log.

// In server.ts, after res.render():
server.get('*', (req, res) => {
  res.render(indexHtml, {
    req,
    providers: [...],
  }, (err, html) => {
    if (err) { return res.status(500).send('Server error'); }
    // res.statusCode may have been set to 404 by the Angular component
    res.send(html);
    // Optional: log if non-200
    if (res.statusCode !== 200) {
      console.log(`SSR: ${res.statusCode} for ${req.url}`);
    }
  });
});
```

**Effort:** 30 minutes

**Risk:** LOW. Purely additive observability.

**Note:** Angular Universal's `ngExpressEngine` callback (3-arg form) is needed to log after render. Current 2-arg form (`res.render(view, options)`) does not give access to the rendered result.

---

## OPT-3-03: Add API-Level Summary Logging for multipleContact / multipleCandidate

**Priority:** LOW (already done for NOTIFY-P2)

**Status:** Already implemented. `console.info('[NOTIFY_P2_CONTACT_INVITE_MULTIPLE]', {...summary})` and `console.info('[NOTIFY_P2_CANDIDATE_INVITE_MULTIPLE]', {...summary})` are present in both controllers.

**No action needed.**

---

## OPT-3-04: FE Consumer Update for New Response Shape

**Priority:** MEDIUM (correctness)

**Files:** FE components that call `/contacts/multiplecontact` and `/candidates/multiplecandidate`.

**Current risk:** If FE code expects a bare array response and now receives `{ contacts: [...], summary: {...} }`, the import UI may show 0 contacts imported (reading undefined as an array).

**Action needed:**
1. Search FE for calls to these endpoints
2. Update to read `response.data.contacts` / `response.data.candidates`
3. Add UI feedback using `summary.duplicateCount` and `summary.outcome`

**Backward-compatibility approach:** The normalization pattern in `GETHIRED_PAYLOAD_NORMALIZATION_GUIDE_RECENT_3.md` shows a defensive read that handles both old and new shapes — apply this pattern as a safe intermediate step.

---

## OPT-3-05: Verify clearCanonical() in ngOnDestroy Does Not Leave Stale JSON-LD

**Priority:** LOW (correctness)

**Note:** `job-posts-details.component.ts` calls `seoService.clearCanonical()` in `ngOnDestroy` but does NOT call `seoService.clearJobPostingJsonLd()`. The JSON-LD is set by the parent `PublicDetailsComponent`, so clearing it here would be wrong — but it means if the user navigates directly to the job detail URL and then away without visiting PublicDetailsComponent, the JobPosting JSON-LD may persist in `<head>`.

**Action:** Verify that `PublicDetailsComponent.ngOnDestroy` calls `seoService.clearJobPostingJsonLd()`. If so, no fix needed here. If not, this is a stale structured-data leak.

**Effort:** Read `public-details.component.ts` ngOnDestroy.
