# GETHIRED PRIVACY & DATA PROTECTION AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## PII Categories in the System

| Data Type | Storage Location | Exposed To |
|-----------|-----------------|-----------|
| Applicant name (first/last) | users table | Recruiter (via applicants list, interview hub, messages) |
| Applicant email | users table | Recruiter (via applicants list, interview hub, messages — see finding below) |
| Applicant photo URL | users.photo_url | Recruiter (via interview hub, message threads) |
| Applicant phone | applicants_profile | Applicant self; employer via profile endpoints |
| Applicant CV (PDF/DOCX) | Firebase Storage | Applicant self; employer (via documents) |
| Applicant work history | applicants_profile | Applicant self; employer |
| Applicant education | applicants_profile | Applicant self; employer |
| Employer name/email | users table | Applicants via messaging |
| Company info | companies table | Public (getFeaturedCompanies, getAllCompanies) |
| Payment/billing info | transaction_table | Internal only (no endpoint exposes this) |
| PayMongo billing data | transaction_table | Internal only |
| Firebase Auth UID | everywhere | Internal use |

---

## Key Privacy Findings

### PRIV-QA11-01: applicantEmail Returned to Recruiter via Message Threads

**Endpoint:** GET /api/messages/recruiter/threads
**File:** `services/message.service.js` — `listRecruiterThreads()`

The response includes `applicantEmail` in the thread list:
```js
return rows.map((row) => ({
  ...
  applicantName: row.applicantFirstName && row.applicantLastName
    ? `${row.applicantFirstName} ${row.applicantLastName}`.trim()
    : (row.applicantEmail || null),
  applicantPhotoUrl: row.applicantPhotoUrl || null,
  ...
}))
```

Wait — reviewing the actual mapping more carefully: `applicantEmail` is used as a fallback for `applicantName` when name is null. The raw email is NOT returned as a separate field named `applicantEmail` in the final mapped object. Looking at the mapping:
- `applicantName` — shows email ONLY if first_name AND last_name are both null (fallback identifier)
- `applicantPhotoUrl` — Firebase photo URL

However, the SQL query selects `u.email AS "applicantEmail"` and the data flows through the mapping. Checking the map function: `applicantName` takes `row.applicantEmail` as fallback. The field `applicantEmail` is NOT separately returned in the final object — it's consumed only as a display name fallback.

**Assessment:** Email is NOT a standalone response field but IS used as fallback display name. If an applicant has no name set, their email appears as their "name" in the recruiter's thread list. This is a mild privacy concern — the email becomes their identity label — but is product-acceptable (the recruiter needs to identify who the thread is with).

**Verdict:** Acceptable with documentation. Consider whether a generated "Anonymous User" fallback would be better than showing email, but this is a product decision, not a security vulnerability.

### PRIV-QA11-02: Applicant Email in getInterviewHub

**Endpoint:** GET /api/interview/hub
**File:** `controllers/interviewController.js` — `getInterviewHub()`

```js
applicantEmail: r.email || null,
```

Here `applicantEmail` IS returned as a standalone field. Recruiters viewing the interview hub can see every applicant's email address directly.

**Assessment:** This is intentional — the interview hub is a recruiter tool for managing applicants who have voluntarily applied to the company's jobs. Sharing contact info with the company they applied to is standard practice. However, it should be documented as intentional PII exposure.

**Verdict:** Intentional and acceptable for the recruiting context. Document.

### PRIV-QA11-03: Firebase Photo URLs Are Public

`photo_url` values from Firebase Storage are returned to recruiters in both the interview hub and message threads. Firebase Storage URLs can be:
- **Public** (if bucket rules allow unauthenticated read) — anyone with the URL can view the photo
- **Signed** (time-limited, requires auth) — URLs expire

Firebase's default storage rules for user-uploaded profile photos are typically public (since profiles are meant to be shared). This is acceptable for a job platform where applicants expect their photo to be visible to employers.

**Verdict:** Acceptable; confirm with Firebase Console that Storage rules are intentionally public for profile photos.

---

## Data Retention

| Data | Retention policy | Status |
|------|-----------------|--------|
| Job applications | No documented retention | OPEN — no cleanup jobs |
| Messages | No documented retention | OPEN |
| Transaction records | No documented retention | OPEN |
| Archived accounts | `is_archived` flag; data retained | P3 — no hard delete |
| CV files in Storage | Orphaned on deleteCV | P3 (PRIV-QA11-04) |

### PRIV-QA11-04: Orphaned CVs in Firebase Storage
When `DELETE /api/cv/delete` is called, the DB row is deleted but the Firebase Storage file is NOT deleted. This means:
- User's personal document persists in cloud storage after they intend to delete it
- No "right to erasure" compliance path

**Recommendation:** Implement Firebase Admin SDK storage deletion in `deleteCV()`. Also add to `deleteAccountById()` — ensure all user files are purged on account deletion.

---

## Data Access Controls Summary

| Data Access Pattern | Control |
|--------------------|---------|
| Applicant reads own profile | uid from JWT == record uid |
| Employer reads applicant profile | Must own the job the applicant applied to |
| Employer reads company data | getUserCompany → companyId match |
| Public reads company/job listings | Intentionally open |
| Cross-company data access | Blocked by company ownership checks |

---

## Summary

| Finding | Severity | Status |
|---------|---------|--------|
| applicantEmail as display name fallback in threads | ACCEPT | Document as intentional |
| applicantEmail as standalone field in hub | ACCEPT | Document as intentional |
| Firebase photo URLs public | ACCEPT | Confirm at Firebase Console |
| CV orphaned in Storage on delete | P3 | OPEN |
| No documented data retention policy | P3 | OPEN |
| No hard delete on account archive | P3 | OPEN |
