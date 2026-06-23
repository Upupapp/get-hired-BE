import dbQuery from "../db/dbQuery";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { getJobCompanyId } from "./job.service";
import { getUserCompany } from "../controllers/companiesController";

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

const assertEmployerOwnsThreadsJob = async (employerCompanyId, jobId) => {
  const jobCompanyId = await getJobCompanyId(jobId);
  if (!jobCompanyId || employerCompanyId !== jobCompanyId) {
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
    await assertEmployerOwnsThreadsJob(callerCompany.companyId, jobId);
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

const sendMessage = async (threadId, callerUid, body) => {
  if (!body || !body.trim()) {
    const err = new Error("MESSAGE_BODY_REQUIRED");
    err.code = "MESSAGE_BODY_REQUIRED";
    throw err;
  }

  const { callerIsEmployer } = await loadAuthorizedThread(threadId, callerUid);

  const messageId = idGenerator(8, "MSG");
  const { rows } = await dbQuery.query(
    `INSERT INTO ${dbSchema}.messages (id, thread_id, sender_uid, sender_role, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
    [messageId, threadId, callerUid, callerIsEmployer ? "employer" : "applicant", body.trim()]
  );

  await dbQuery.query(
    `UPDATE ${dbSchema}.message_threads SET updated_at = now() WHERE id = $1;`,
    [threadId]
  );

  return rows[0];
};

export { findOrCreateThread, listMessages, sendMessage, loadAuthorizedThread };
