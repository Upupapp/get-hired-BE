# GetHired STITCH Fix Log — QA Cycle 11

Generated: 2026-06-25

---

## F-01 — Column name mismatch: firstname/lastname in users table

**Severity:** CRITICAL  
**Status:** FIXED  
**Files changed:** 2

### Problem
The production `gethired.users` table columns are `firstname` and `lastname` (no underscores). The new B01 and B03 queries both used `u.first_name` / `u.last_name` which do not exist. PostgreSQL silently returns NULL for non-existent columns in LEFT JOINs. Every `applicantName` field in both the messages inbox and the interview hub would always be null in production.

Additionally, `gethired.users.email` was dropped in a DDL migration (`ALTER TABLE gethired.users DROP COLUMN email;` in `db/complete_ddl.sql`). Email is now only on `gethired.user_credentials`. Both B01 and B03 queries referenced `u.email`, which would also be silently null.

### Fix applied

**`services/message.service.js`** (B01 — listRecruiterThreads):
- Changed `u.first_name AS "applicantFirstName"` → `u.firstname AS "applicantFirstName"`
- Changed `u.last_name AS "applicantLastName"` → `u.lastname AS "applicantLastName"`
- Changed `u.email AS "applicantEmail"` → `uc.email AS "applicantEmail"`
- Added `LEFT JOIN ${dbSchema}.user_credentials uc ON uc.uid = mt.applicant_uid` to the query

**`controllers/interviewController.js`** (B03 — getInterviewHub):
- Changed `u.first_name` → `u.firstname` in SELECT
- Changed `u.last_name` → `u.lastname` in SELECT
- Changed `u.email` → `uc.email` in SELECT
- Added `LEFT JOIN ${dbSchema}.user_credentials uc ON uc.uid = ja.candidate_id` to the query
- Changed `r.first_name` → `r.firstname` in the row mapper
- Changed `r.last_name` → `r.lastname` in the row mapper

### Verification
The fix follows the established pattern used by all other services that join `gethired.users`:
- `helpers/userDetails.js`: `u.firstname, u.lastname`
- `services/applicant.service.js`: `u.firstname, u.lastname`
- `services/candidate.service.js`: `concat(u.firstname, ' ', u.lastname)`
- `services/company.service.js`: `u.firstname, u.lastname`
- `services/contact.service.js`: `concat(u.firstname, ' ', u.lastname)`

---

## F-02 — Photo URL img fallback: broken Firebase Storage URL shows blank avatar

**Severity:** MEDIUM  
**Status:** FIXED  
**Files changed:** 1

### Problem
`recruiter-messages.component.html` rendered the applicant avatar as:
```html
<img *ngIf="t.applicantPhotoUrl" [src]="t.applicantPhotoUrl" ...>
<span *ngIf="!t.applicantPhotoUrl">{{ avatarInitial(t) }}</span>
```
When `applicantPhotoUrl` is a non-null but expired/stale Firebase Storage URL, the `<img>` is shown (condition true) but 404s silently. The fallback `<span>` is hidden. The recruiter sees a broken avatar image or empty space.

### Fix applied
**`src/app/employer-panel/recruiter-messages/recruiter-messages.component.html`**:
- Added `(error)="t['_photoError'] = true"` to the `<img>` tag
- Changed conditions: `*ngIf="t.applicantPhotoUrl && !t['_photoError']"` on img, `*ngIf="!t.applicantPhotoUrl || t['_photoError']"` on the fallback span

When the img fires an error event (404, network error, CORS failure), `_photoError` is set on the thread object and Angular re-evaluates the conditions — the img hides and the initials letter appears.

Note: `_photoError` is set on the thread object directly (property mutation on an interface object). This is acceptable for UI state since `RecruiterThreadSummary` is a plain interface object on the component. A cleaner approach would be a Map on the component, but the current fix is the minimal safe change.

---

## No-fix items (documented risks, deferred)

| ID | Issue | Decision |
|----|-------|----------|
| R-01 (residual) | Firebase Storage URL expiry: no server-side refresh mechanism | Deferred — fix F-02 covers the symptom. Backend refresh requires either signed URL regeneration endpoint or bucket policy change. |
| R-02 | 429 response has no FE handler — users see generic error | Deferred to NOTIFY pass. Low urgency given 100/15min write limit. |
| R-03 | verifyAuth 403 sends plain text, not JSON | Pre-existing. FE interceptor handles by HTTP status code, not body. |
| R-04 | `verifyRoles` reads uid from body/query, not JWT | Pre-existing, not in QA11 scope. Deferred to SECURE pass. |
| R-05 | Interview hub response shape (`{ items, total }`) vs standard `{ success, data }` envelope | FE already adapted. Deferred. If unifying, use `successMessage.data = { items, total }`. |
| R-06 | `applicantPhotoUrl` in `InterviewHubItem` interface but not rendered in hub template | Not a bug — the field is available if needed. No img rendering in hub template yet means no broken-img risk. |
