# GetHired — Privacy & Data Protection Audit (SECURE 3)
**Date:** 2026-06-26

---

## 1. PII Classification

| Data type | Location | Sensitivity | Current protection |
|---|---|---|---|
| Email addresses | `users`, `candidates`, `contact` tables | HIGH | Auth-gated; not logged |
| Full names | `users`, `candidates`, `applicants_profile` | HIGH | Auth-gated; not logged |
| Phone numbers | `candidates`, `contact`, `transaction_table` | HIGH | Auth-gated; not logged (webhook PII fix applied) |
| Billing info (name/email/phone) | `transaction_table` | HIGH | Auth-gated; PII log fix applied |
| CV/resume files | Firebase Storage | HIGH | Auth-gated upload; storage path not publicly guessable |
| Profile photos | Firebase Storage | MEDIUM | Auth-gated upload |
| Job applications | `job_applicants` | MEDIUM | verifyAuth + company ownership |
| Payment details | `transaction_table`, `cart_table` | HIGH | Auth-gated; HMAC webhook |
| Firebase UIDs | Internal use | MEDIUM | Redacted in security logs (SEC-01/SEC-02) |

---

## 2. Data Access Minimization

### SELECT * Patterns (potential over-disclosure)

Several queries use `SELECT *`:
- `cvController.js`: `SELECT * from ${dbSchema}.cv where user_id = $1`
- `subscriptionController.js`: `SELECT * FROM ${dbSchema}."subscription"`
- Multiple other locations

**Risk:** `SELECT *` returns all columns, including any future columns added to tables that may contain sensitive data. Specific column lists are better practice.

**Severity: LOW** — current schema columns are known; risk is future schema changes adding sensitive columns without updating queries.

---

## 3. PII in Logs

**Status after NOTIFY-P2 and QA11 fixes:**

| Location | Was logging PII? | Fixed? | Current state |
|---|---|---|---|
| `paymentController.js` webhook | Yes (billing name/email/phone) | Yes | Logs only event type + ID |
| `paymentController.js` payment.paid | Yes (`console.log(webHookPaid)`) | Yes | Logs only ID |
| `applicantsController.js` | Logs redacted UID on security events | N/A | PASS — redaction applied |
| `jobsController.js` | No PII logged | N/A | PASS |
| `contactsController.js` multipleContact | No PII in new NOTIFY-P2 log | N/A | PASS |
| `candidateController.js` multipleCandidate | No PII in new NOTIFY-P2 log | N/A | PASS |
| `candidateController.js` candidateList | `console.log(dbResponse)` still present | Not fixed | LOW — server-side only |

---

## 4. Data Retention

No explicit data retention policies found in code. The `archive` pattern (status change rather than DELETE) is used for accounts. No automated purge of:
- Old CV files in Firebase Storage
- Expired job listings
- Old transaction records

**Status: POLICY GAP** — no code changes required now, but data retention policies should be documented.

---

## 5. Right to Delete

`PUT /auth/archive` → `deleteAccountById` in `userController.js`:
- Verifies auth (correct)
- Deletes from `user_credentials` via parameterized query
- Firebase user deletion via `deleteUserAccountInFirebaseById()`
- Does NOT delete: applicant profiles, uploaded files, application records, CVs

**Status: PARTIAL** — account credentials deleted, but associated data remains. Full GDPR right-to-erasure would require cascading deletes or anonymization across all PII-containing tables.

---

## 6. Data at Rest

- **PostgreSQL (Supabase):** Encryption at rest handled by Supabase. Assumed enabled.
- **Firebase Storage:** Encrypted at rest by Google Cloud. Standard.
- **Production `.env`:** Plaintext on Linode filesystem. File permissions must be 600 (see P1-2).

---

## 7. Data in Transit

- API calls: HTTPS (assumed; production `app_url` is `https://`)
- DB connection: PostgreSQL over TLS (Supabase default)
- Firebase calls: HTTPS
- SendGrid API: HTTPS

---

## Summary

| Area | Status | Notes |
|---|---|---|
| PII in logs | MOSTLY CLEAN | One remaining `console.log(dbResponse)` in candidateList |
| Auth gates on PII data | PASS | All PII-containing endpoints require auth |
| Cross-tenant PII isolation | PASS | Company-scoping enforced |
| Data minimization (SELECT *) | LOW GAP | Multiple SELECT * queries |
| Right to delete | PARTIAL | Credentials deleted; associated data retained |
| Data at rest encryption | ASSUMED PASS | Supabase + Firebase handle this |
| Data retention policy | GAP — no policy defined | Documentation needed |
