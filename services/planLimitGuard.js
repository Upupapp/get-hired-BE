/**
 * Plan limit guard: refuses NEW actions that would take an employer past a plan limit.
 *
 * SPRINT-01 A3. Owner ruling, relayed by the hub on 2026-09-13: "plan limits actually
 * block actions before your first subscriber".
 *
 * The contract every caller relies on:
 * - Only NEW actions are refused: publishing or reopening a job, putting more video
 *   questions live, adding team members, and a new application to a Free Trial job
 *   past its applicant cap. Nothing here deletes, unpublishes or edits an existing
 *   record, so an employer already over a limit keeps everything and simply cannot add
 *   more.
 * - Draft saves are never refused.
 * - An action is refused when used + requested > limit. A null limit (Enterprise, or
 *   the applicant count on a paid plan) is unlimited.
 * - Fails OPEN when usage cannot be measured: an infrastructure fault must not stop
 *   hiring.
 * - Every decision is logged in every enforcement mode. Only 'enforce' refuses.
 * - EMPLOYER refusals: HTTP 402, one payload carrying the fields the frontend's
 *   subscription-limit-modal reads. An employer with no subscription at all is asked to
 *   choose a plan (PLAN_REQUIRED).
 * - CANDIDATE refusals (A3.1, deploy blocker RISK-01): the only one is a Free Trial job
 *   past its applicant cap. A candidate is never refused because the employer has no
 *   subscription, and never for the employer's storage. The body is a human message
 *   plus a neutral code, sent with HTTP 400, exactly as a closed job answers: nothing
 *   about plans, limits or enforcement reaches a candidate.
 *
 * 402, not 403, for employers: the frontend's global interceptor already treats 403 as
 * an authorization failure.
 *
 * Node 14 / esm@3.2.25 safe: no ?. or ??
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { checkEntitlement, getEnforcementMode } from './subscriptionEntitlementServiceV4';
import {
  countActiveJobPosts,
  countAdminUsers,
  countVideoQuestionsForJob,
  countApplicantsForCompany,
} from './subscriptionUsageServiceV4';
import { getPlanBySlug } from './planCatalogServiceV4';
import { logSubscriptionDecision } from './subscriptionAuditLogServiceV4';

const dbSchema = env.schema;

export var PLAN_LIMIT_HTTP_STATUS = 402;
export var PLAN_LIMIT_CODE = 'PLAN_LIMIT_REACHED';
// A candidate is refused the way a closed job already refuses: 400, neutral code.
export var CANDIDATE_REFUSAL_HTTP_STATUS = 400;
export var CANDIDATE_REFUSAL_CODE = 'JOB_NOT_ACCEPTING_APPLICATIONS';
export var ACTIVE_JOB_STATUS_ID = 2;

var GB = 1073741824;

var LIMIT_CODES = {
  active_job_posts: 'ACTIVE_JOB_LIMIT_REACHED',
  admin_users: 'EMPLOYER_USER_LIMIT_REACHED',
  video_questions_per_job: 'VIDEO_QUESTION_LIMIT_REACHED',
  recruitment_storage_bytes: 'STORAGE_LIMIT_REACHED',
  applicants: 'APPLICANT_LIMIT_REACHED',
};

// The one candidate-facing refusal: no blame, and nothing about plans or limits.
export var CANDIDATE_REFUSAL_MESSAGE = "This job isn't accepting new applications right now. Please check back later.";

var SELF_SERVE_ORDER = ['free_trial', 'starter', 'growth', 'business'];
var UNLOCK_ORDER = ['active_job_posts', 'admin_users', 'recruitment_storage_bytes', 'video_questions_per_job', 'applicants'];

function capacityLine(key, value) {
  var unlimited = value === null || typeof value === 'undefined';
  if (key === 'active_job_posts') return unlimited ? 'Unlimited active jobs' : value + (value === 1 ? ' active job' : ' active jobs');
  if (key === 'admin_users') return unlimited ? 'Unlimited team members' : value + (value === 1 ? ' team member' : ' team members');
  if (key === 'recruitment_storage_bytes') return unlimited ? 'Custom Recruitment Storage' : Math.round(value / GB) + ' GB Recruitment Storage';
  if (key === 'video_questions_per_job') return unlimited ? 'Custom video questions per job' : value + (value === 1 ? ' video question per job' : ' video questions per job');
  if (key === 'applicants') return unlimited ? 'Unlimited applicants' : value + ' applicants';
  return null;
}

// The cheapest self-serve plan above the current one whose limit fits what the
// refused action needed. null when none does, which means contact sales.
function recommendPlan(currentSlug, key, needed) {
  var start = Math.max(SELF_SERVE_ORDER.indexOf(currentSlug) + 1, 1);
  for (var i = start; i < SELF_SERVE_ORDER.length; i++) {
    var plan = getPlanBySlug(SELF_SERVE_ORDER[i]);
    if (!plan) continue;
    var limit = plan.entitlements[key];
    if (limit === null || (typeof limit === 'number' && limit >= needed)) return plan;
  }
  return null;
}

function unlocksFor(plan, key) {
  var keys = [key].concat(UNLOCK_ORDER.filter(function (k) { return k !== key; }));
  return keys
    .filter(function (k) { return Object.prototype.hasOwnProperty.call(plan.entitlements, k); })
    .map(function (k) { return capacityLine(k, plan.entitlements[k]); })
    .filter(Boolean);
}

function employerMessage(key, limit, requested, used, planName, reasonCode) {
  if (reasonCode === 'no_subscription_found') return 'Choose a plan to continue.';
  var plan = planName ? 'Your ' + planName + ' plan' : 'Your plan';
  if (key === 'active_job_posts') {
    return plan + ' includes ' + capacityLine(key, limit) + ', and all of them are in use. ' +
      'Close or archive a job, or upgrade to publish this one. You can still save it as a draft.';
  }
  if (key === 'admin_users') {
    return plan + ' includes ' + capacityLine(key, limit) + '. Adding ' + requested +
      (requested === 1 ? ' more person' : ' more people') + ' would go over it. Remove a member, or upgrade to add more.';
  }
  if (key === 'video_questions_per_job') {
    return plan + ' allows ' + capacityLine(key, limit) + ', and this job would have ' + (used + requested) +
      ' live. Remove some questions, or upgrade for more. You can still save the job as a draft.';
  }
  return 'This action is not included in your current plan.';
}

function payload(fields) {
  return {
    success: false,
    status: 'error',
    code: PLAN_LIMIT_CODE,
    limitCode: fields.limitCode,
    reasonCode: fields.reasonCode,
    audience: fields.audience,
    error: fields.userMessage,
    message: fields.userMessage,
    userMessage: fields.userMessage,
    entitlementKey: fields.entitlementKey,
    used: fields.used,
    limit: fields.limit,
    requested: fields.requested,
    warningLevel: fields.warningLevel,
    upgradeRoute: fields.upgradeRoute,
    recommendedPlanSlug: fields.recommendedPlanSlug,
    recommendedPlanName: fields.recommendedPlanName,
    unlocks: fields.unlocks,
    contactSalesRequired: fields.contactSalesRequired,
    preserveWork: fields.preserveWork,
    enforcementMode: 'enforce',
  };
}

export function buildEmployerRefusal(ctx) {
  var reasonCode = ctx.reasonCode === 'no_subscription_found' ? 'no_subscription_found' : ctx.entitlementKey + '_limit_reached';
  var current = ctx.currentSlug ? getPlanBySlug(ctx.currentSlug) : null;
  var needed = (typeof ctx.used === 'number' ? ctx.used : 0) + ctx.requested;
  var rec = recommendPlan(ctx.currentSlug || null, ctx.entitlementKey, needed);
  var draftable = ctx.entitlementKey === 'active_job_posts' || ctx.entitlementKey === 'video_questions_per_job';
  var userMessage = employerMessage(ctx.entitlementKey, ctx.limit, ctx.requested, ctx.used || 0, current ? current.name : null, reasonCode);
  return payload({
    limitCode: reasonCode === 'no_subscription_found' ? 'PLAN_REQUIRED' : (LIMIT_CODES[ctx.entitlementKey] || 'PLAN_LIMIT_REACHED'),
    reasonCode: reasonCode,
    audience: 'employer',
    userMessage: userMessage,
    entitlementKey: ctx.entitlementKey,
    used: typeof ctx.used === 'number' ? ctx.used : 0,
    limit: typeof ctx.limit === 'number' ? ctx.limit : null,
    requested: ctx.requested,
    warningLevel: 'at_limit',
    upgradeRoute: rec ? '/recruiter/subscription/upgrade/' + rec.slug : '/recruiter/subscription',
    recommendedPlanSlug: rec ? rec.slug : null,
    recommendedPlanName: rec ? rec.name : null,
    unlocks: rec ? unlocksFor(rec, ctx.entitlementKey) : [],
    contactSalesRequired: !rec && reasonCode !== 'no_subscription_found',
    preserveWork: { canSaveDraft: draftable, draftSaved: false },
  });
}

// Exactly these keys: a human message and a neutral code (A3.1). Existing readers
// show errBody.error || errBody.message.
export function buildCandidateRefusal() {
  return {
    success: false,
    status: 'error',
    code: CANDIDATE_REFUSAL_CODE,
    error: CANDIDATE_REFUSAL_MESSAGE,
    message: CANDIDATE_REFUSAL_MESSAGE,
  };
}

// Would this action be refused if enforcement were on? Pure, so it can be tested alone.
export function judgePlanLimit(decision, requested, audience) {
  if (!decision) return { wouldBlock: false, reason: 'no_decision' };
  if (decision.reasonCode === 'usage_unavailable') return { wouldBlock: false, reason: 'usage_unavailable' };
  if (decision.reasonCode === 'no_subscription_found') {
    // A3.1 (RISK-01): an employer's missing subscription is never a candidate's problem.
    // With no subscribers yet, refusing here would close every job to applicants.
    if (audience === 'candidate') return { wouldBlock: false, reason: 'no_subscription_not_candidate_facing' };
    return { wouldBlock: true, reason: 'no_subscription_found' };
  }
  var ent = decision.entitlement;
  if (!ent) return { wouldBlock: false, reason: 'no_entitlement' };
  if (ent.countConfidence !== 'confirmed') return { wouldBlock: false, reason: 'usage_unmeasured' };
  if (typeof ent.limit !== 'number') return { wouldBlock: false, reason: 'unlimited' };
  if (!(requested > 0)) return { wouldBlock: false, reason: 'nothing_requested' };
  if (ent.used + requested > ent.limit) return { wouldBlock: true, reason: 'limit_reached' };
  return { wouldBlock: false, reason: 'within_limit' };
}

function logPlanLimitDecision(entry) {
  try {
    console.log('[planLimit]', JSON.stringify(entry));
  } catch (err) {
    // logging must never break a request
  }
}

/**
 * Evaluate one entitlement for one action.
 * @param {object} opts companyId, actorId, action, entitlementKey, usage ({count, confidence, source}),
 *   requested (default 1), audience ('employer' | 'candidate')
 */
export async function evaluatePlanLimit(opts) {
  var requested = typeof opts.requested === 'number' ? opts.requested : 1;
  var decision = await checkEntitlement(opts.companyId, opts.actorId || null, opts.action, opts.entitlementKey, opts.usage);
  var mode = getEnforcementMode();
  var verdict = judgePlanLimit(decision, requested, opts.audience);
  var blocked = verdict.wouldBlock && mode === 'enforce';
  var ent = (decision && decision.entitlement) || null;
  var used = ent && typeof ent.used === 'number' ? ent.used : 0;
  var limit = ent ? ent.limit : null;

  logSubscriptionDecision(decision);
  logPlanLimitDecision({
    ts: new Date().toISOString(),
    mode: mode,
    action: opts.action,
    entitlementKey: opts.entitlementKey,
    companyId: opts.companyId,
    audience: opts.audience || 'employer',
    used: used,
    limit: typeof limit === 'undefined' ? null : limit,
    requested: requested,
    wouldBlock: verdict.wouldBlock,
    blocked: blocked,
    reason: verdict.reason,
  });

  var refusal = null;
  if (blocked) {
    refusal = opts.audience === 'candidate'
      ? buildCandidateRefusal()
      : buildEmployerRefusal({
          entitlementKey: opts.entitlementKey,
          used: used,
          limit: limit,
          requested: requested,
          reasonCode: verdict.reason === 'no_subscription_found' ? 'no_subscription_found' : null,
          currentSlug: decision && decision.plan ? decision.plan.slug : null,
        });
  }

  return {
    allowed: !blocked,
    wouldBlock: verdict.wouldBlock,
    reason: verdict.reason,
    mode: mode,
    used: used,
    limit: limit,
    requested: requested,
    refusal: refusal,
    httpStatus: blocked ? (opts.audience === 'candidate' ? CANDIDATE_REFUSAL_HTTP_STATUS : PLAN_LIMIT_HTTP_STATUS) : null,
  };
}

function allowedResult(reason) {
  return { allowed: true, wouldBlock: false, reason: reason, mode: getEnforcementMode(), refusal: null };
}

// A guard that runs several checks answers with the first one that WOULD have refused,
// so observe mode never reports "fine" for an action an earlier check would have
// stopped. (Under enforce, a refusing check has already returned.)
function firstWouldBlock(results, fallback) {
  for (var i = 0; i < results.length; i++) {
    if (results[i] && results[i].wouldBlock) return results[i];
  }
  return fallback;
}

async function readJobStatus(jobId, companyId) {
  if (!jobId) return null;
  var { rows } = await dbQuery.query(
    `SELECT job_status_id FROM ${dbSchema}.jobs WHERE job_id = $1 AND company_id = $2 LIMIT 1;`,
    [jobId, companyId]
  );
  return rows && rows[0] ? Number(rows[0].job_status_id) : null;
}

/**
 * A job save or status change that leaves the job LIVE (status 2).
 * - Not live afterwards (a draft save, closing, archiving): never refused.
 * - Going live from any other status takes an active-job slot, and every video
 *   question on the job goes live with it.
 * - Staying live: no new slot; only questions added in this request count.
 * @param {object} opts companyId, actorId, jobId (null for a new job), requestedStatusId,
 *   questionsAdded (new questions carried by this request)
 */
export async function guardJobLive(opts) {
  if (Number(opts.requestedStatusId) !== ACTIVE_JOB_STATUS_ID) return allowedResult('not_going_live');
  var added = opts.questionsAdded > 0 ? opts.questionsAdded : 0;
  var currentStatus = opts.jobId ? await readJobStatus(opts.jobId, opts.companyId) : null;
  var alreadyLive = currentStatus === ACTIVE_JOB_STATUS_ID;
  var checked = [];

  if (!alreadyLive) {
    var slot = await evaluatePlanLimit({
      companyId: opts.companyId,
      actorId: opts.actorId,
      action: opts.jobId ? 'publish_existing_job' : 'publish_new_job',
      entitlementKey: 'active_job_posts',
      usage: await countActiveJobPosts(opts.companyId),
      requested: 1,
    });
    if (!slot.allowed) return slot;
    checked.push(slot);
  }

  var existing = opts.jobId ? await countVideoQuestionsForJob(opts.jobId) : { count: 0, confidence: 'confirmed', source: 'new_job' };
  var liveNow = alreadyLive ? existing : { count: 0, confidence: existing.confidence, source: existing.source };
  var goingLive = alreadyLive ? added : existing.count + added;
  if (goingLive === 0) return firstWouldBlock(checked, allowedResult('no_questions_going_live'));

  var questions = await evaluatePlanLimit({
    companyId: opts.companyId,
    actorId: opts.actorId,
    action: alreadyLive ? 'add_questions_to_live_job' : 'publish_job_questions',
    entitlementKey: 'video_questions_per_job',
    usage: liveNow,
    requested: goingLive,
  });
  if (!questions.allowed) return questions;
  checked.push(questions);
  return firstWouldBlock(checked, questions);
}

/**
 * Questions saved onto a job's candidate-facing ('default') template outside a job save.
 * Refused only when the job is live; a draft's questions are checked when it is published.
 */
export async function guardQuestionsOnJob(opts) {
  var currentStatus = await readJobStatus(opts.jobId, opts.companyId);
  if (currentStatus !== ACTIVE_JOB_STATUS_ID) return allowedResult('job_not_live');
  return guardJobLive({
    companyId: opts.companyId,
    actorId: opts.actorId,
    jobId: opts.jobId,
    requestedStatusId: ACTIVE_JOB_STATUS_ID,
    questionsAdded: opts.questionsAdded,
  });
}

/** Adding people to the team. The whole request is checked, before any account exists. */
export async function guardTeamSeats(opts) {
  if (!(opts.requested > 0)) return allowedResult('nothing_requested');
  return evaluatePlanLimit({
    companyId: opts.companyId,
    actorId: opts.actorId,
    action: 'add_team_members',
    entitlementKey: 'admin_users',
    usage: await countAdminUsers(opts.companyId),
    requested: opts.requested,
  });
}

/**
 * A NEW application. The only candidate-facing refusal (A3.1): a Free Trial job whose
 * employer has received its applicant cap. Never refused because the employer has no
 * subscription, and never for the employer's storage -- the employer hears about full
 * storage through the engagement engine's operational storage.full rule.
 */
export async function guardApplication(opts) {
  return evaluatePlanLimit({
    companyId: opts.companyId,
    actorId: null,
    action: 'receive_application',
    entitlementKey: 'applicants',
    usage: await countApplicantsForCompany(opts.companyId),
    requested: 1,
    audience: 'candidate',
  });
}

export function planLimitError(refusal, httpStatus) {
  var err = new Error(refusal.message || refusal.userMessage);
  err.code = PLAN_LIMIT_CODE;
  err.refusal = refusal;
  err.httpStatus = httpStatus || PLAN_LIMIT_HTTP_STATUS;
  return err;
}

export function isPlanLimitError(err) {
  return !!(err && err.code === PLAN_LIMIT_CODE && err.refusal);
}

export function sendPlanLimitRefusal(res, refusal, httpStatus) {
  return res.status(httpStatus || PLAN_LIMIT_HTTP_STATUS).json(refusal);
}
