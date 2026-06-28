# GETHIRED_EMAIL_NOTIFICATION_AUDIT.md
## QA Cycle 11 — Email notification audit

---

## Scope statement

GetHired has no custom transactional email system. All email notifications
are delivered by Firebase Authentication's built-in email service. No
custom email templates, no SMTP config, no SendGrid/Mailgun/SES in the
codebase (confirmed via grep for nodemailer, sendgrid, mailgun, ses, smtp
across the BE repo — zero hits outside node_modules).

---

## Active email channels

| Trigger | Channel | Template |
|---|---|---|
| User signup — email verification | Firebase Auth | Firebase default |
| Password reset link | Firebase Auth | Firebase default |
| Password changed confirmation | Firebase Auth | Firebase default |

---

## Firebase email messages (FE copy around them)

### Account authentication component
```
Snackbar on success: "Verification link send to your email. Please verify and login again."
```
- Typo: "send" should be "sent"
- Grammar: comma after "email" could be removed
- Recommended: "Verification email sent. Please check your inbox and verify your account."

### Signin — email not verified message
```
"Please Verify Email with the link sent to your registered email address."
```
- Capitalisation: "Verify Email" → should be "verify your email"
- Length: slightly verbose
- Recommended: "Please verify your email address. Check your inbox for the verification link we sent."

---

## Gaps: no transactional emails for core workflows

| Event | Email sent? | Impact |
|---|---|---|
| Applicant submits application | NO | Applicant has no confirmation; employer has no alert |
| Employer reviews application | NO | Applicant unaware of status change |
| Message received | NO | Neither party notified of new messages |
| Interview response submitted | NO | Recruiter has no alert of new video submission |
| Subscription purchased/expired | NO | No billing confirmation |
| Application status changed | NO | Applicant not informed |

**Risk level:** HIGH for product experience; LOW for security (these are product
gaps, not data leaks). No misleading emails are being sent — the absence is
the issue.

**Constraint:** Implementing transactional email requires an email provider,
template design, and an unsubscribe mechanism. Out of scope for NOTIFY QA.
All gaps logged to GETHIRED_NOTIFY_BACKLOG.md.

---

## NOTIFY rules compliance check

- "Never send real emails" during this cycle: COMPLIANT (no email-sending code changes made)
- "No fake claims about notifications": COMPLIANT (no "You will be notified" copy added)
- Firebase emails not customized this cycle: COMPLIANT

---

## Recommended next steps (backlog only, not this cycle)

1. Choose a transactional email provider (SendGrid recommended — Node.js SDK, good
   free tier, template editor)
2. Add email for: application confirmation, status change, new message received
3. Fix the two Firebase-adjacent copy typos listed above
4. Add "Email notifications" preference toggle in applicant/recruiter settings

---

*Generated: NOTIFY QA Cycle 11*
