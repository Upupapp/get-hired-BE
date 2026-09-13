/**
 * SubscriptionUsageService V4
 * Counts active jobs, admin users, video responses for a company.
 * All queries use server-resolved companyId — never trusts client input.
 * Node 14 / ESM safe: no ?. or ??
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { getBasicJobList } from '../controllers/jobsController';
import { getAllVideoResponsesByJobIds } from '../services/job.service';

const dbSchema = env.schema;

/**
 * Count active (published) job posts for a company.
 * job_status_id=2 = published/active (consistent with getBasicJobList status=2 filter).
 */
export async function countActiveJobPosts(companyId) {
  // A direct COUNT of the employer's live jobs (job_status_id 2), the rule
  // services/job.service.js already uses. This used to go through
  // controllers/jobsController getBasicJobList(), whose joins to the work_setup and
  // job_type lookup tables made the count fail whenever one of them was missing --
  // and a failed count makes every plan check fail OPEN, silently switching the
  // active-job limit off.
  try {
    const { rows } = await dbQuery.query(
      `SELECT COUNT(*)::int AS c FROM ${dbSchema}.jobs WHERE company_id = $1 AND job_status_id = 2;`,
      [companyId]
    );
    return { count: (rows && rows[0]) ? rows[0].c : 0, confidence: 'confirmed', source: 'jobs.status' };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countActiveJobPosts error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'jobs.status' };
  }
}

/**
 * Count the paid seats held in a company: members who are not suspended.
 * See the seat-semantics note inside the function.
 */
export async function countAdminUsers(companyId) {
  // SEAT SEMANTICS: a seat is held by every company_employees row that is NOT
  // suspended.
  //
  // BUG FIX: this used to return companyUsers(companyId).length, and companyUsers()
  // filters by company only -- so a SUSPENDED member still occupied a paid seat, and
  // an employer who suspended someone to make room still hit "limit reached". That
  // meter feeds both enforcement (checkEntitlement's admin_users) and messaging.
  //
  // companyUsers() itself is deliberately left alone: it also feeds the team list,
  // where suspended members must still appear. Only the meter changes.
  //
  //   active      -> holds a seat
  //   suspended   -> frees the seat (matches teamAccess.service getOwnerCountForCompany,
  //                  which already counts only ACTIVE owners)
  //   removed     -> the row is DELETEd by removeTeamMember, so it is simply absent
  //   NULL status -> holds a seat. `IS DISTINCT FROM`, not `= 'active'`, so a row
  //                  predating the status column is never silently treated as free;
  //                  only an explicit suspension frees a seat.
  //
  // Pending invitations live in team_invitations and are NOT counted here. Whether a
  // pending invite should reserve a seat is an open product decision.
  try {
    const { rows } = await dbQuery.query(
      `SELECT COUNT(*)::int AS c FROM ${dbSchema}.company_employees
        WHERE company_id = $1 AND status IS DISTINCT FROM 'suspended';`,
      [companyId]
    );
    return {
      count: (rows && rows[0]) ? rows[0].c : 0,
      confidence: 'confirmed',
      source: 'company_employees.not_suspended',
    };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countAdminUsers error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'company_employees.not_suspended' };
  }
}

/**
 * Count video responses submitted to jobs owned by this company.
 * Note: counting all video responses, not scoped to billing period.
 * Billing-period scoping is a backlog item (see GETHIRED_SUBSCRIPTION_GUARDRAILS_BACKLOG_V4.md).
 */
export async function countVideoResponses(companyId) {
  try {
    const jobs = await getBasicJobList(companyId, 2);
    if (!jobs || jobs.length === 0) {
      return { count: 0, confidence: 'confirmed', source: 'video_responses.job_ids' };
    }
    const jobIds = jobs.map(function(j) { return j.jobId; });
    const videoRows = await getAllVideoResponsesByJobIds(jobIds);
    return { count: (videoRows && videoRows.length) || 0, confidence: 'confirmed', source: 'video_responses.job_ids' };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countVideoResponses error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'video_responses.job_ids' };
  }
}

/**
 * Count the video screening questions candidates see on ONE job: the questions on the
 * job's 'default' template, which is exactly the set services/job.service.js
 * getJobInterviewQuestions() serves.
 *
 * This is the employer-side meter: questions the EMPLOYER configures on a job post. It
 * is a DIFFERENT quantity from video_responses, which counts answers submitted by
 * APPLICANTS across the whole account (owner ruling, 2026-09-13). Every
 * interview_template_question row is a recorded-video question.
 */
export async function countVideoQuestionsForJob(jobId) {
  if (!jobId) {
    return { count: 0, confidence: 'unavailable', source: 'interview_template_question.default' };
  }
  try {
    const { rows } = await dbQuery.query(
      `SELECT COUNT(q.template_question_id)::int AS c
         FROM ${dbSchema}.job_interview_template t
         JOIN ${dbSchema}.interview_template_question q
           ON q.job_interview_template_id = t.job_interview_template_id
        WHERE t.job_id = $1 AND t.job_interview_template_name = 'default';`,
      [jobId]
    );
    return {
      count: (rows && rows[0]) ? rows[0].c : 0,
      confidence: 'confirmed',
      source: 'interview_template_question.default',
    };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countVideoQuestionsForJob error:', err && err.message);
    // Unavailable, not zero: a failed count must never read as "no questions".
    return { count: 0, confidence: 'unavailable', source: 'interview_template_question.default' };
  }
}

/**
 * Count the applications an employer has received, across all of its jobs. Feeds the
 * Free Trial's applicant cap. Archived applications still count: they were received.
 */
export async function countApplicantsForCompany(companyId) {
  try {
    const { rows } = await dbQuery.query(
      `SELECT COUNT(*)::int AS c
         FROM ${dbSchema}.job_applicants ja
         JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
        WHERE j.company_id = $1;`,
      [companyId]
    );
    return {
      count: (rows && rows[0]) ? rows[0].c : 0,
      confidence: 'confirmed',
      source: 'job_applicants.company_jobs',
    };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countApplicantsForCompany error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'job_applicants.company_jobs' };
  }
}

/**
 * Get all usage metrics for a company at once.
 * Returns structured object matching entitlement keys.
 */
export async function getCompanyUsageV4(companyId) {
  var results = await Promise.all([
    countActiveJobPosts(companyId).catch(function(e) { return { count: 0, confidence: 'unavailable', source: 'jobs.status', error: e && e.message }; }),
    countAdminUsers(companyId).catch(function(e) { return { count: 0, confidence: 'unavailable', source: 'company_employees', error: e && e.message }; }),
    countVideoResponses(companyId).catch(function(e) { return { count: 0, confidence: 'unavailable', source: 'video_responses.job_ids', error: e && e.message }; }),
  ]);

  return {
    active_job_posts: results[0],
    admin_users: results[1],
    video_responses: results[2],
  };
}

/**
 * Derive warning level from usage percentage.
 */
export function getWarningLevel(used, limit) {
  if (typeof limit !== 'number' || limit < 0) return 'none'; // unlimited
  if (limit === 0) return 'at_limit';
  var pct = (used / limit) * 100;
  if (pct >= 100) return 'at_limit';
  if (pct >= 90) return 'near_90';
  if (pct >= 70) return 'near_70';
  return 'none';
}

/**
 * Build entitlement usage report for one key.
 */
export function buildEntitlementUsage(key, usageResult, limit) {
  var used = (usageResult && usageResult.count) || 0;
  var remaining = (typeof limit === 'number' && limit >= 0) ? Math.max(0, limit - used) : null;
  var percentUsed = (typeof limit === 'number' && limit > 0) ? parseFloat(((used / limit) * 100).toFixed(2)) : null;
  var warningLevel = getWarningLevel(used, limit);

  return {
    key: key,
    used: used,
    limit: (typeof limit === 'number' && limit < 0) ? 'unlimited' : limit,
    remaining: remaining,
    percentUsed: percentUsed,
    warningLevel: warningLevel,
    countSource: (usageResult && usageResult.source) || 'unknown',
    countConfidence: (usageResult && usageResult.confidence) || 'unavailable',
  };
}
