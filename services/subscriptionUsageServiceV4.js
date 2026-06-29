/**
 * SubscriptionUsageService V4
 * Counts active jobs, admin users, video responses for a company.
 * All queries use server-resolved companyId — never trusts client input.
 * Node 14 / ESM safe: no ?. or ??
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { getBasicJobList } from '../controllers/jobsController';
import { companyUsers } from '../services/company.service';
import { getAllVideoResponsesByJobIds } from '../services/job.service';

const dbSchema = env.schema;

/**
 * Count active (published) job posts for a company.
 * job_status_id=2 = published/active (consistent with getBasicJobList status=2 filter).
 */
export async function countActiveJobPosts(companyId) {
  try {
    const jobs = await getBasicJobList(companyId, 2);
    return { count: (jobs && jobs.length) || 0, confidence: 'confirmed', source: 'jobs.status' };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countActiveJobPosts error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'jobs.status' };
  }
}

/**
 * Count admin/recruiter users attached to a company.
 * Uses companyUsers() from company.service — excludes applicants and platform admins.
 */
export async function countAdminUsers(companyId) {
  try {
    const users = await companyUsers(companyId);
    return { count: (users && users.length) || 0, confidence: 'confirmed', source: 'company_employees' };
  } catch (err) {
    console.warn('[subscriptionUsageServiceV4] countAdminUsers error:', err && err.message);
    return { count: 0, confidence: 'unavailable', source: 'company_employees' };
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
