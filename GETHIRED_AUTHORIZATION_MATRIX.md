# GETHIRED AUTHORIZATION MATRIX — QA Cycle 11
Generated: 2026-06-25

Roles: Public (no auth) | Applicant (authenticated, no company) | Employer (authenticated, has company) | Admin

---

## User / Auth

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| POST /api/auth/signin | Y | - | - | - | Rate-limited (Tier 2) |
| POST /api/auth/signup | Y | - | - | - | Rate-limited (Tier 2) |
| POST /api/auth/logout | Y | - | - | - | No verifyAuth (by design) |
| POST /api/auth/resendverificationlink | Y | - | - | - | |
| POST /api/auth/getverificationlink | Y | - | - | - | |
| POST /api/auth/manualexcelverification | Y | - | - | - | |
| POST /api/auth/verifyemail | Y | - | - | - | |
| GET /api/auth/getpwresetlink | Y | - | - | - | Tier 4 sensitive limit |
| POST /api/auth/changepassword | Y | - | - | - | Tier 4 sensitive limit; no verifyAuth |
| GET /api/auth/getprofile | - | Y | Y | Y | verifyAuth |
| PUT /api/auth/updateprofile | - | Y | Y | Y | verifyAuth |
| PUT /api/auth/archive | - | Y | Y | Y | verifyAuth + Tier 4 |

---

## Jobs

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| GET /api/job/published | Y | Y | Y | Y | Public listing |
| GET /api/job/details | Y | Y | Y | Y | Public detail |
| GET /api/job/sharelink | Y | Y | Y | Y | Public share |
| POST /api/job/create | - | - | Y | - | verifyAuth; BOLA: companyId from JWT |
| PUT /api/job/updatejobs | - | - | Y | - | verifyAuth; BOLA: company_id in WHERE |
| GET /api/job/basiclist | - | - | Y | - | verifyAuth |
| GET /api/job/expiredlist | - | - | Y | - | verifyAuth |
| GET /api/job/categories | - | Y | Y | Y | verifyAuth |
| GET /api/job/industries | - | Y | Y | Y | verifyAuth |
| GET /api/job/badges | - | Y | Y | Y | verifyAuth |
| GET /api/job/rolelist | - | Y | Y | Y | verifyAuth |
| PUT /api/job/changestatus | - | - | Y | - | verifyAuth |
| GET /api/job/applicants | - | - | Y | - | verifyAuth + company ownership check |
| GET /api/job/applicants/signals | - | - | Y | - | verifyAuth + company ownership |
| GET /api/job/applicantdetails | - | - | Y | - | verifyAuth; BOLA: MISSING company check (P2-03) |
| DELETE /api/job/deleteinterviewquestion | - | - | Y | - | verifyAuth |
| GET /api/job/getsubscriptionrestrictions | - | - | Y | - | verifyAuth; JWT-derived companyId |
| GET /api/job/applicant/snapshot-summary | - | - | Y | - | verifyAuth + company ownership |

---

## Applicant / Application

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| POST /api/application/apply | - | Y | - | - | verifyAuth; candidateId from JWT |
| POST /api/application/create | - | Y | - | - | verifyAuth |
| PUT /api/application/updateJobs | - | Y | - | - | verifyAuth |
| DELETE /api/application/delete | - | Y | - | - | verifyAuth |
| GET /api/applicant/application/snapshot | - | Y | - | - | verifyAuth; own data only |
| GET /api/applicant/application/snapshots | - | Y | - | - | verifyAuth; batch but scoped to own apps |
| POST /api/applicant/createprofile | - | Y | - | - | verifyAuth |
| PUT /api/applicant/updateprofile | - | Y | - | - | verifyAuth |
| PUT /api/applicant/updatebasicinfo | - | Y | - | - | verifyAuth |
| GET /api/applicant/userprofile | - | Y | - | - | verifyAuth |
| GET /api/applicant/dashboard | - | Y | - | - | verifyAuth |
| GET /api/applicant/profile | - | Y | - | - | verifyAuth |
| GET /api/applicant/profile/completeness | - | Y | - | - | verifyAuth |
| POST /api/applicant/workexp | - | Y | - | - | verifyAuth |
| POST /api/applicant/educbg | - | Y | - | - | verifyAuth |
| POST /api/applicant/cert | - | Y | - | - | verifyAuth |
| POST /api/applicant/skills | - | Y | - | - | verifyAuth |
| POST /api/applicant/docs | - | Y | - | - | verifyAuth |
| PUT /api/applicant/savevideocv | - | Y | - | - | verifyAuth |

---

## Company

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| GET /api/company/details | Y | Y | Y | Y | Public; no auth |
| GET /api/company/featured | Y | Y | Y | Y | Public |
| GET /api/company/sharelink | Y | Y | Y | Y | Public |
| GET /api/company/getAllCompanies | Y | Y | Y | Y | Public; no auth |
| POST /api/company/createinitial | - | - | Y | - | verifyAuth |
| POST /api/company/createcompany | - | - | Y | - | verifyAuth |
| PUT /api/company/update | - | - | Y | - | verifyAuth + company ownership |
| GET /api/company/dashboard | - | - | Y | - | verifyAuth |
| GET /api/company/dashboard/pipeline-overview | - | - | Y | - | verifyAuth + Array.isArray guard |
| DELETE /api/company/removecompanyuser | - | - | Y | - | verifyAuth + company ownership |
| GET /api/company/industries | - | Y | Y | Y | verifyAuth |
| POST /api/company/addcompanyuser | - | - | Y | - | verifyAuth; companyId from JWT |
| GET /api/company/getallcompanyuser | - | - | Y | - | verifyAuth |
| GET /api/company/usercompany | - | Y | Y | Y | verifyAuth |
| GET /api/company/getsubscriptionrestrictions | - | - | Y | - | verifyAuth; JWT-derived |

---

## Interview

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| GET /api/interview/getlistbyuser | - | Y | Y | - | verifyAuth |
| GET /api/interview/getall | - | - | Y | - | verifyAuth + callerBelongsToCompany |
| GET /api/interview/getalltemplates | - | - | Y | - | verifyAuth + callerBelongsToCompany |
| GET /api/interview/getallrecipients | - | - | Y | - | verifyAuth + callerBelongsToCompany |
| GET /api/interview/gettemplatequestions | - | - | Y | - | verifyAuth + template company check |
| POST /api/interview/savegroupinterview | - | - | Y | - | verifyAuth; BOLA: MISSING guard (P2-02) |
| POST /api/interview/savequestiontemplate | - | - | Y | - | verifyAuth + getUserCompany guard |
| PUT /api/interview/updatejobinterview | - | - | Y | - | verifyAuth + company subquery in UPDATE |
| GET /api/interview/hub | - | - | Y | - | verifyAuth + getUserCompany guard (SECURE QA11) |

---

## Messages

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| POST /api/messages/thread | - | Y | Y | - | verifyAuth; role resolved server-side |
| GET /api/messages/thread/messages | - | Y | Y | - | verifyAuth; thread ownership verified |
| POST /api/messages/thread/send | - | Y | Y | - | verifyAuth; body 4000-char cap |
| GET /api/messages/recruiter/threads | - | - | Y | - | verifyAuth; company scoped |

---

## Payment / Subscription

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| POST /api/payment/paymongopaymentlink | - | - | Y | - | verifyAuth |
| POST /api/payment/paymongowebhook | Y | - | - | - | Intentionally public; NO sig verification (P2-01) |
| POST /api/subscription/paymentintent | - | - | Y | - | verifyAuth |
| GET /api/subscription/getallsubscription | - | - | Y | - | verifyAuth |
| GET /api/subscription/getcompanysubscriptions | - | - | Y | - | verifyAuth |

---

## Other

| Endpoint | Public | Applicant | Employer | Admin | Notes |
|----------|--------|-----------|---------|-------|-------|
| GET /api/admin/userprofile | - | Y | Y | Y | verifyAuth; NO role check (P3-03) |
| GET /api/employer/profile | - | - | Y | - | verifyAuth |
| GET /api/employer/company | - | - | Y | - | verifyAuth |
| GET /api/options/setuplist | - | Y | Y | Y | verifyAuth |
| GET /api/options/type | - | Y | Y | Y | verifyAuth |
| GET /api/options/levels | - | Y | Y | Y | verifyAuth |
| POST /api/cv-builder/upload | - | Y | - | - | verifyAuth + magic-byte check |
| POST /api/cv/add | - | Y | - | - | verifyAuth |
| PUT /api/cv/update | - | Y | - | - | verifyAuth + user_id in WHERE |
| DELETE /api/cv/delete | - | Y | - | - | verifyAuth + user_id in WHERE |
| GET /api/cv/getall | - | Y | - | - | verifyAuth |
| GET /api/cv/get | - | Y | - | - | verifyAuth + user_id check |
| Various /candidates/* | - | - | Y | - | verifyAuth + company ownership |
| Various /contacts/*, /groups/* | - | - | Y | - | verifyAuth + company ownership |
