# GETHIRED SQL INJECTION AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## Methodology
Checked all DB calls across controllers, services, and helpers for:
1. String concatenation in SQL queries (direct SQLi vector)
2. Template literal interpolation of user-supplied values (indirect SQLi)
3. Dynamic `ORDER BY` or `LIMIT` without parameterization (second-order SQLi)
4. Raw query construction from request body fields

The application uses `pg` (node-postgres) throughout. Parameterized queries use `$N` placeholders which are safe from SQLi by design.

---

## Schema Interpolation Pattern

One pattern appears throughout all queries:
```js
const dbSchema = env.schema;
`SELECT ... FROM ${dbSchema}.tableName WHERE ...`
```

`dbSchema` is loaded from `process.env.SCHEMA` at startup — it is a server-controlled value, not user input. This is **safe** — `${dbSchema}` is a deployment-time constant injected into all queries, not derived from any request. Confirmed across all 15 controllers and all service files.

---

## Per-File SQLi Check

### controllers/userController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| UPDATE users SET ... WHERE uid=$1 | uid from JWT | SAFE |
| SELECT from user_credentials WHERE email=$1 | email from request | SAFE |
| DELETE from user_credentials WHERE uid=$1 | uid from JWT | SAFE |
| INSERT into users/user_credentials | parameterized | SAFE |

### controllers/companiesController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| INSERT INTO companies ... VALUES ($1-$N) | all parameterized | SAFE |
| UPDATE companies SET ... WHERE company_id=$N | parameterized | SAFE |
| SELECT ... WHERE employee_uuid=$1 | JWT uid | SAFE |
| DELETE FROM company_employees WHERE ... AND company_id=$2 | parameterized | SAFE |

### controllers/interviewController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| SELECT ... FROM job_applicants WHERE j.company_id=$1 | JWT-derived | SAFE |
| UPDATE interview_template_question ... WHERE company_id=(subquery) | parameterized | SAFE |

### controllers/jobsController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| INSERT INTO jobs ... VALUES ($1-$20) | all parameterized | SAFE |
| UPDATE jobs ... WHERE company_id=$20 | parameterized | SAFE |
| DELETE FROM jobs WHERE job_id=$1 AND company_id=$2 | parameterized | SAFE |

### controllers/applicantsController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| INSERT INTO application | parameterized | SAFE |
| All profile inserts/updates | parameterized | SAFE |

### controllers/paymentController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| UPDATE transaction_table SET ... WHERE reference_number=$13 | all parameterized | SAFE |
| INSERT INTO transaction_table | parameterized | SAFE |
| UPDATE cart_table WHERE cart_id=$3 | parameterized | SAFE |

### controllers/cvController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| INSERT INTO cv | parameterized | SAFE |
| UPDATE cv ... WHERE cv_id=$1 AND user_id=$12 | parameterized | SAFE |
| DELETE FROM cv WHERE cv_id=$1 AND user_id=$2 | parameterized | SAFE |
| SELECT FROM cv WHERE user_id=$1 | parameterized | SAFE |

### controllers/candidateController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| DELETE WHERE candidate_id=$1 AND company_id=$2 | parameterized | SAFE |
| UPDATE WHERE company_id from getUserCompany | parameterized | SAFE |

### controllers/contactsController.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| DELETE WHERE contact_id=$1 AND company_id=$2 | parameterized | SAFE |
| DELETE WHERE group_id=$1 AND company_id=$2 | parameterized | SAFE |
| All other queries | parameterized | SAFE |

### services/message.service.js
| Query | Parameters | SQLi Risk |
|-------|-----------|----------|
| SELECT FROM message_threads WHERE id=$1 | parameterized | SAFE |
| SELECT FROM messages WHERE thread_id=$1 | parameterized | SAFE |
| INSERT INTO messages ... VALUES ($1-$5) | parameterized | SAFE |
| SELECT * ... WHERE mt.company_id=$1 | JWT-derived | SAFE |

### services/applicant.service.js, job.service.js, company.service.js
Checked via grep: all use parameterized `$N` queries. No string concatenation of user inputs found.

---

## Dynamic Query Components Check

### ORDER BY
Checked for dynamic ORDER BY clauses:
- `ORDER BY COALESCE(ja.updated_at, ja.date_applied) DESC` — static, no user input
- `ORDER BY mt.updated_at DESC` — static
- No user-controlled ORDER BY direction found. SAFE.

### LIMIT
- `LIMIT 200` in getInterviewHub — static. SAFE.
- No user-controlled LIMIT found. SAFE.

### LIKE Clauses
- Checked for `LIKE '%${variable}%'` — none found. SAFE.

---

## Overall SQLi Verdict: PASS

No SQL injection vulnerabilities found. The consistent use of parameterized queries throughout the codebase provides strong protection. The `${dbSchema}` interpolation is safe (server-controlled, not user input).

---

## Recommendations

1. **Maintain the parameterization pattern** — add a linting rule (e.g., ESLint custom rule) to detect raw string concatenation in `dbQuery.query()` calls.
2. **Add pg prepared statements for the highest-traffic queries** — optional performance/security improvement; current parameterization is already safe.
3. **Consider adding a database-level role with minimal permissions** — the DB user should only need SELECT/INSERT/UPDATE/DELETE on the app schema, not DDL rights.
