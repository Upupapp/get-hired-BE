# PERF-01 Related Route Sweep
**GETHIRED_PERF_01_GET_USER_COMPANY_RELATED_ROUTE_SWEEP_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Routes Touched By PERF-01

All routes whose handlers were patched to use `getUserCompanyForRequest`.

### companiesController

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| GET | `/employer/company` | `getSpecificCompany` | Cache first lookup |
| GET | `/employer/dashboard` | `getDashboard` | Cache first lookup |
| GET | `/employer/dashboard-pipeline` | `getDashboardPipelineOverview` | Cache first lookup |
| POST | `/employer/company/add-user` | `addCompanyUser` | Cache first lookup |
| * | * (internal fn) | 3 other handlers | Cache first lookup |

### contactsController (11 routes)

All `/api/contacts/*` routes that required an authenticated employer context.

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| GET | `/api/contacts/list` | `getContactList` | Cache first lookup |
| POST | `/api/contacts/add` | `addContact` | Cache first lookup |
| POST | `/api/contacts/bulk-import` | `bulkImportContacts` | Cache first lookup |
| ... | (8 more) | ... | Cache first lookup |

### candidateController (5 routes)

All candidate management routes that required employer context.

### jobsController (10 routes)

All job management routes (create, update, delete, list, applicant management).

Notable: `createJobs` uses `uid` destructured from `req.user` — patched to `getUserCompanyForRequest(req, uid)`.

### interviewController (4 routes)

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| GET | `/interview/templates` | (via `callerBelongsToCompanyForRequest`) | Cache first lookup |
| POST | `/interview/template` | `saveGroupInterview` | Cache first lookup |
| POST | `/interview/question-template` | `saveQuestionTemplate` | Cache first lookup |
| GET | `/interview/template/questions` | `getInterviewTemplateQuestions` | Cache first lookup |

### applicationController (1 route)

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| GET | `/api/applications/employer` | `getJobApplicationsByEmployer` | Cache first lookup |

### employerController (2 routes)

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| GET | `/api/employer/profile` | `getEmployerProfile` | Cache first lookup |
| PUT | `/api/employer/profile` | `updateEmployerProfile` | Cache first lookup |

### subscriptionController (2 routes)

| Method | Path | Handler | Patch Impact |
|--------|------|---------|--------------|
| POST | `/api/subscription/payment-intent` | `createPaymentIntent` | Cache first lookup |
| GET | `/api/subscription/company` | `getCompanySubscriptions` | Cache first lookup |

---

## Routes NOT Touched (Correct)

| File | Route | Reason |
|------|-------|--------|
| userController | POST `/auth/login` | Uses `credentials.id` (DB PK), not Firebase UID; pre-auth |
| message.service calls | all messaging routes | Service-layer, no req in scope |
| match bridge service calls | `/api/match/*` | Service-layer, no req |
| Public routes | GET `/api/jobs/public`, etc. | No auth middleware, no getUserCompany call |

---

## Route Authorization Impact

**Zero change.** All patched routes still go through `verifyAuth` middleware. The cache operates after auth — it takes the trusted `req.user.uid` set by the middleware and uses it as the cache key.

---

## Multi-Request Performance Pattern (Employer Dashboard)

The employer dashboard loads these routes in parallel on page open:

```
GET /employer/company
GET /api/jobs/company/baselist
GET /api/contacts/list
GET /api/subscription/restrictions (or /company)
```

Each is a **separate HTTP request** → separate `req` object → separate `req.getHiredRequestCache` → **4 DB queries for same uid** (unchanged from before patch).

The PERF-01 cache eliminates DB duplicates **within** a single request. Across the 4 parallel requests above, this PERF-01 provides no benefit today (each handler calls getUserCompany once and returns). The multi-request consolidation case is documented in BACKLOG_V2.md as a future optimization (requires a consolidated employer-context endpoint or short-TTL shared cache).
