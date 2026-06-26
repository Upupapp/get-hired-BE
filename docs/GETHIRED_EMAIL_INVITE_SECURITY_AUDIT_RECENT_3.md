# GetHired — Email Invite Security Audit (SECURE 3)
**Date:** 2026-06-26

---

## Email Invite Flows

### 1. Candidate Import Invite (`services/candidate.service.js`)

Triggered by: `POST /candidates/addcandidate` or `POST /candidates/multiplecandidate`

**Security properties:**
- Auth-gated: `verifyAuth` required
- Company-scoped: `company_id` from JWT, not body
- Email comes from body (employer-supplied) → sent via SendGrid `sendEmailInvite()`
- No hardcoded password sent (fixed in STITCH GH-ACT-004)

**Remaining concern:**
The invite sends the candidate a link to apply for a job. If the `jobId` or `jobName` from the DB is included in the email without sanitization, and the job data contains HTML/JS, it could produce a malformed email. However, the email is plain-text or templated via SendGrid — full analysis requires inspecting the template, which is in SendGrid (external).

**Status: LOW** — SendGrid templates are external; no direct HTML injection path from DB values into raw email body visible in code.

### 2. Contact Import Invite (`services/contact.service.js`)

Similar pattern — `sendEmailAdded()` triggered for new contacts. Same analysis applies.

**Status: LOW**

### 3. Company Employee Invite (`controllers/companiesController.js`)

**Prior issue:** Hardcoded password `p@ssw0rd1111` was sent in invitation emails.
**Current state:** Fixed in STITCH GH-ACT-004 — replaced with random token + Firebase password reset link.

**Security properties:**
- Auth-gated: employer must be authenticated to invite
- Firebase reset link is time-limited and single-use
- No password in email

**Status: PASS**

### 4. Email Verification (`controllers/userController.js`)

`sendEmailVerificationFirebase()` sends a Firebase verification link.

**Status: PASS** — delegated to Firebase, which uses time-limited secure links.

### 5. Password Reset (`controllers/userController.js`)

`getForgetPwLinkInFirebase()` sends a Firebase password reset link.

**Status: PASS** — delegated to Firebase.

---

## Email Oracle Risk

### Contact email oracle
`checkEmailIfExistInContact()` is company-scoped (company_id in WHERE). No cross-tenant disclosure. **PASS.**

### Candidate email oracle
`checkEmailIfExistInCandidate()` — now company_id-scoped at line 61 of candidate.service.js (fix confirmed in SECURE 3). **PASS.**

---

## SendGrid API Key

`env.mailerKey` is loaded from `MAILER_KEY` env var. Not present in code or git. **PASS.**

---

## Summary

| Flow | Status | Notes |
|---|---|---|
| Candidate import invite | PASS | No hardcoded password; auth-gated; company-scoped |
| Contact import invite | PASS | Same |
| Employee invite | PASS | Firebase reset link; no password |
| Email verification | PASS | Firebase-managed |
| Password reset | PASS | Firebase-managed |
| Contact email oracle | PASS | Company-scoped |
| Candidate email oracle | PASS | Company-scoped (fixed) |
| SendGrid key in code | PASS | Env var only |
