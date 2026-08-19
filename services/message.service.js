import dbQuery from "../db/dbQuery";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { getJobCompanyId } from "./job.service";
import { getUserCompany } from "../controllers/companiesController";
import { getAccessContext, canAccessJob, sqlJobScopeFilter } from "./accessControl.service";

const dbSchema = env.schema;

/**
 * GH-EMP-B04 -- Employer Portal v3 messaging foundation.
 *
 * Authorization model: a thread is scoped to (job_id, company_id,
 * applicant_uid). Role is never trusted from the request -- `req.user` is
 * the raw decoded Firebase token and carries no role claim (confirmed: no
 * existing controller in this codebase reads `req.user.role`, role lives
 * in user_credentials and is resolved via getUserCompany()). Every
 * function here derives "is this caller an employer" itself, from
 * getUserCompany(callerUid) returning a real company or not -- the same
 * signal getAllApplicantOfJob already relies on, reused not reinvented.
 */

const resolveCallerCompany = async (callerUid) => {
  const company = await getUserCompany(callerUid);
  // getUserCompany returns [] (an array) when no company_employees row
  // exists, or a company object when one does -- checked defensively
  // since both shapes are real possibilities from that function.
  return company && !Array.isArray(company) ? company : null;
};

const assertEmployerOwnsThreadsJob = async (employerCompanyId, jobId, ctx) => {
  const jobCompanyId = await getJobCompanyId(jobId);
  if (!jobCompanyId || employerCompanyId !== jobCompanyId) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
  // SECURITY FIX (zero-scope/null-context remediation): was
  // `ctx && !canAccessJob(...)` -- a null ctx (suspended member, or one
  // whose team_role_id hasn't been backfilled yet) short-circuited this
  // check entirely instead of denying, allowing thread creation for any
  // job in the caller's company regardless of job-level scope. Matches
  // the already-correct unconditional pattern this same file already
  // uses in loadAuthorizedThread() below.
  if (!canAccessJob(ctx, jobId)) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
};

/**
 * Finds the existing thread for (jobId, applicantUid) or creates one.
 * `callerUid` is always `req.user.uid` -- never a body-supplied id.
 * If the caller is recognized as an employer (via getUserCompany), they
 * must own the job and may open a thread with any applicant. If not
 * recognized as an employer, the caller may only open a thread for
 * themself as the applicant (applicantUid is ignored/overridden).
 */
const findOrCreateThread = async (jobId, applicantUid, callerUid) => {
  const callerCompany = await resolveCallerCompany(callerUid);
  let resolvedApplicantUid = applicantUid;

  if (callerCompany) {
    const ctx = await getAccessContext(callerUid);
    await assertEmployerOwnsThreadsJob(callerCompany.companyId, jobId, ctx);
  } else {
    // Not an employer -- can only open a thread as themself.
    resolvedApplicantUid = callerUid;
  }

  const existing = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.message_threads WHERE job_id = $1 AND applicant_uid = $2 LIMIT 1;`,
    [jobId, resolvedApplicantUid]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const companyId = callerCompany ? callerCompany.companyId : await getJobCompanyId(jobId);
  const threadId = idGenerator(8, "THREAD");
  const inserted = await dbQuery.query(
    `INSERT INTO ${dbSchema}.message_threads (id, job_id, company_id, applicant_uid)
     VALUES ($1, $2, $3, $4) RETURNING *;`,
    [threadId, jobId, companyId, resolvedApplicantUid]
  );
  return inserted.rows[0];
};

/** Loads a thread by id and asserts the caller may access it -- the
 * single chokepoint every read/write below goes through, so there is
 * exactly one place this check can be wrong, not one per function. */
const loadAuthorizedThread = async (threadId, callerUid) => {
  const { rows } = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.message_threads WHERE id = $1 LIMIT 1;`,
    [threadId]
  );
  const thread = rows[0];
  if (!thread) {
    const err = new Error("THREAD_NOT_FOUND");
    err.code = "THREAD_NOT_FOUND";
    throw err;
  }

  const callerCompany = await resolveCallerCompany(callerUid);
  if (callerCompany) {
    if (callerCompany.companyId !== thread.company_id) {
      const err = new Error("FORBIDDEN");
      err.code = "FORBIDDEN";
      throw err;
    }
    const ctx = await getAccessContext(callerUid);
    if (!canAccessJob(ctx, thread.job_id)) {
      const err = new Error("FORBIDDEN");
      err.code = "FORBIDDEN";
      throw err;
    }
  } else if (callerUid !== thread.applicant_uid) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }

  return { thread, callerIsEmployer: !!callerCompany };
};

const listMessages = async (threadId, callerUid) => {
  await loadAuthorizedThread(threadId, callerUid);
  const { rows } = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.messages WHERE thread_id = $1 ORDER BY created_at ASC;`,
    [threadId]
  );
  return rows;
};

// SECURE finding (post-deploy SWEEP, after "Reply to employers"/"Message
// applicants" went live on the public marketing pages): the messages table
// column is `varchar NOT NULL` with no length cap, and this function had
// none either -- an unbounded body could bloat storage or break UI
// rendering. No rate-limiting middleware exists anywhere in this codebase
// (confirmed repo-wide, not specific to messaging) -- adding one would mean
// a new dependency, a separate decision, not bundled into this fix. This
// length cap is a real, dependency-free, immediately-actionable guard.
const MAX_MESSAGE_BODY_LENGTH = 4000;

const sendMessage = async (threadId, callerUid, body) => {
  if (!body || !body.trim()) {
    const err = new Error("MESSAGE_BODY_REQUIRED");
    err.code = "MESSAGE_BODY_REQUIRED";
    throw err;
  }

  const trimmedBody = body.trim();
  if (trimmedBody.length > MAX_MESSAGE_BODY_LENGTH) {
    const err = new Error("MESSAGE_BODY_TOO_LONG");
    err.code = "MESSAGE_BODY_TOO_LONG";
    throw err;
  }

  const { callerIsEmployer } = await loadAuthorizedThread(threadId, callerUid);

  if (callerIsEmployer) {
    const ctx = await getAccessContext(callerUid);
    if (!ctx || !ctx.permissions.has("messages.send")) {
      const err = new Error("FORBIDDEN");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  const messageId = idGenerator(8, "MSG");
  const { rows } = await dbQuery.query(
    `INSERT INTO ${dbSchema}.messages (id, thread_id, sender_uid, sender_role, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
    [messageId, threadId, callerUid, callerIsEmployer ? "employer" : "applicant", trimmedBody]
  );

  await dbQuery.query(
    `UPDATE ${dbSchema}.message_threads SET updated_at = now() WHERE id = $1;`,
    [threadId]
  );

  return rows[0];
};

/**
 * B01 — Global recruiter inbox.
 * Returns all threads scoped to the caller's company, enriched with:
 *   - applicant uid (for context links)
 *   - job title (joined from jobs)
 *   - last message snippet + last sender role + last activity time
 *   - needsReply: true when the most recent message was sent by an applicant
 *     (i.e. the recruiter has not replied since then)
 *
 * Company scoping is derived server-side from the caller's own uid via
 * resolveCallerCompany() — the exact same guard used everywhere else in this
 * service. A caller without a company gets FORBIDDEN rather than an empty list
 * so they cannot probe whether threads exist.
 *
 * No is_read column exists in the schema (confirmed: messages_ddl.sql has no
 * read-state column). "Unread" is therefore NOT surfaced here. needsReply is
 * the only actionability signal that can be derived safely from real data.
 */
const listRecruiterThreads = async (callerUid) => {
  const callerCompany = await resolveCallerCompany(callerUid);
  if (!callerCompany) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
  const ctx = await getAccessContext(callerUid);
  const jobScope = sqlJobScopeFilter(ctx, "mt.job_id", 2);
  const queryParams = jobScope.param ? [callerCompany.companyId, jobScope.param] : [callerCompany.companyId];

  // Join threads -> jobs (title), messages (last message snippet).
  // The LEFT JOIN on messages lets us return threads that were just created
  // (openThread called) but have no messages yet — the recruiter still sees
  // the thread so they know the conversation was initiated.
  const { rows } = await dbQuery.query(
    `SELECT
       mt.id            AS "threadId",
       mt.applicant_uid AS "applicantUid",
       mt.job_id        AS "jobId",
       mt.updated_at    AS "lastMessageAt",
       j.job_title      AS "jobTitle",
       last_msg.body    AS "lastMessageSnippet",
       last_msg.sender_role AS "lastSenderRole",
       -- STITCH QA11 FIX F-01: users table uses firstname/lastname (no underscores)
       u.firstname      AS "applicantFirstName",
       u.lastname       AS "applicantLastName",
       uc.email         AS "applicantEmail",
       u.photo_url      AS "applicantPhotoUrl"
     FROM ${dbSchema}.message_threads mt
     LEFT JOIN ${dbSchema}.jobs j
       ON j.job_id = mt.job_id
     LEFT JOIN ${dbSchema}.users u
       ON u.uid = mt.applicant_uid
     -- STITCH QA11 FIX F-01: users.email was dropped in DDL migration;
     -- email lives in user_credentials. Join separately to get applicant email.
     LEFT JOIN ${dbSchema}.user_credentials uc
       ON uc.uid = mt.applicant_uid
     LEFT JOIN LATERAL (
       SELECT body, sender_role
       FROM   ${dbSchema}.messages
       WHERE  thread_id = mt.id
       ORDER  BY created_at DESC
       LIMIT  1
     ) last_msg ON true
     WHERE mt.company_id = $1 ${jobScope.clause}
     ORDER BY mt.updated_at DESC
     LIMIT 200;`,
    queryParams
  );

  return rows.map((row) => ({
    threadId: row.threadId,
    applicantUid: row.applicantUid,
    applicantName: row.applicantFirstName && row.applicantLastName
      ? `${row.applicantFirstName} ${row.applicantLastName}`.trim()
      : (row.applicantEmail || null),
    applicantPhotoUrl: row.applicantPhotoUrl || null,
    jobId: row.jobId,
    jobTitle: row.jobTitle || null,
    lastMessageSnippet: row.lastMessageSnippet
      ? row.lastMessageSnippet.slice(0, 120)
      : null,
    lastSenderRole: row.lastSenderRole || null,
    lastMessageAt: row.lastMessageAt,
    needsReply: row.lastSenderRole === "applicant",
  }));
};

export { findOrCreateThread, listMessages, sendMessage, loadAuthorizedThread, listRecruiterThreads };
