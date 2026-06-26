# GetHired — Route Protection Matrix (SECURE 3)
**Date:** 2026-06-26
**Legend:** REQUIRED = verifyAuth, OPTIONAL = optionalVerifyAuth, NONE = public, ROLE = verifyRoles

---

## Route Files Audited

| File | Routes | Auth middleware | Issues |
|---|---|---|---|
| `routes/userRoute.js` | 12 routes | Mixed (see below) | /auth/manualexcelverification lacks auth |
| `routes/jobsRoute.js` | 17 routes | Mixed (verifyAuth + optionalVerifyAuth) | CLEAN |
| `routes/applicationRoute.js` | 14 routes | All verifyAuth | CLEAN |
| `routes/cvRoutes.js` | 5 routes | All verifyAuth | CLEAN (fixed STITCH) |
| `routes/candidateRoutes.js` | 7 routes | All verifyAuth | CLEAN (fixed STITCH) |
| `routes/companiesRoute.js` | Multiple | All verifyAuth | CLEAN |
| `routes/employerRoute.js` | 2 routes | All verifyAuth | CLEAN |
| `routes/adminRoute.js` | 1 route | verifyAuth | CLEAN |
| `routes/subscriptionRoute.js` | 3 routes | All verifyAuth | CLEAN (fixed STITCH) |
| `routes/paymentRoute.js` | 2 routes | 1 verifyAuth, 1 webhook | CLEAN |
| `routes/interviewRoute.js` | 9 routes | All verifyAuth | CLEAN (fixed STITCH) |
| `routes/cvBuilderRoutes.js` | 1 route | verifyAuth | CLEAN |
| `routes/messageRoutes.js` | 4 routes | All verifyAuth | CLEAN |
| `routes/optionsRoute.js` | All | Various | Need to verify |
| `routes/contactRoutes.js` | All | verifyAuth | CLEAN |

---

## Unprotected Route Audit

### Routes without auth middleware (intentionally public):
- `GET /job/published` — published jobs list (no PII, intended public)
- `GET /sitemap.xml` — sitemap (public by design)
- `GET /` — health check
- `POST /auth/signin` — login (auth not yet established)
- `POST /auth/signup` — registration (auth not yet established)
- `POST /auth/resendverificationlink` — verification resend
- `POST /auth/getverificationlink` — verification link
- `POST /auth/verifyemail` — email verification (token in body)
- `GET /auth/getpwresetlink` — password reset link (email in param)
- `POST /auth/changepassword` — password change (reset token in body)

### Routes with optionalVerifyAuth (intentionally mixed):
- `GET /job/details` — job detail (public + personalized for authenticated)
- `GET /job/sharelink` — shareable job link (public + personalized)

### Concerning route — `/auth/manualexcelverification`:
- This endpoint `verifyEmailFileManually` appears to be an admin-use-only CSV/Excel verification workflow
- It has NO auth middleware
- If it accepts and processes file uploads, it's a potential abuse vector
- **Recommendation:** Add verifyAuth + verifyRoles(['1']) or deprecate/remove

---

## Protection Completeness Score

| Category | Routes | Protected | Score |
|---|---|---|---|
| Applicant/Profile | 14 | 14 | 100% |
| Job Management | 12 | 12 | 100% |
| CV Management | 5 | 5 | 100% |
| Candidate Management | 7 | 7 | 100% |
| Interview | 9 | 9 | 100% |
| Subscription/Payment | 5 | 5 | 100% |
| Messages | 4 | 4 | 100% |
| CV Builder | 1 | 1 | 100% |
| Admin | 1 | 1 | 100% |
| Auth (public by design) | 10 | N/A | Public intentional |
| Public Job | 3 | N/A | Public intentional |
| Questionable | 1 (/auth/manualexcelverification) | 0 | FLAGGED |
