/**
 * Employer job product emails: application milestones (1/10/20/40/50) + job-live.
 * Non-blocking — never throws to callers. Claim-first idempotency via
 * employer_job_email_events UNIQUE(job_id, milestone).
 *
 * Prefs v1 (Emailer/Aryhan): send unless explicitly opted out. No required
 * engagement_preferences key. If an explicit mute/opt-out for job/employer
 * alerts exists (e.g. JOB_ALERTS === false), respect it; else fail-open send.
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { send, getTemplate } from '../helpers/mailer';
import { getCompanyAdminEmails } from './subscriptionNotificationServiceV4';
import {
  claimEmployerJobEmailEvent,
  updateEmployerJobEmailEvent,
  hashEmail,
} from './employerJobEmailDedupe';

const dbSchema = env.schema;

var MILESTONE_COUNTS = { 1: true, 10: true, 20: true, 40: true, 50: true };

var TEMPLATE_KEY_BY_MILESTONE = {
  '1': 'employer_milestone_1',
  '10': 'employer_milestone_10',
  '20': 'employer_milestone_20',
  '40': 'employer_milestone_40',
  '50': 'employer_milestone_50',
  job_live: 'employer_job_live',
};

var HR_MANAGER_FROM = {
  fromEmail: 'hrmanager@gethiredonline.app',
  fromName: 'HR Manager',
};

function isDryRun() {
  return String(process.env.EMPLOYER_JOB_EMAIL_DRY_RUN || '').toLowerCase() === 'true';
}

function appBaseUrl() {
  return String(env.app_url || process.env.APP_URL || 'https://gethiredonline.app').replace(/\/$/, '');
}

function publicSiteBaseUrl() {
  return String(process.env.PUBLIC_SITE_URL || env.app_url || 'https://gethiredonline.app').replace(/\/$/, '');
}

function buildJobPublicUrl(jobId) {
  return publicSiteBaseUrl() + '/jobs/details/' + encodeURIComponent(jobId);
}

function buildJobApplicantsUrl(jobId) {
  return appBaseUrl() + '/recruiter/jobs/applicants?id=' + encodeURIComponent(jobId);
}

function buildJobManageUrl(jobId) {
  return appBaseUrl() + '/recruiter/jobs/edit?id=' + encodeURIComponent(jobId);
}

function buildManageNotificationsUrl() {
  // Emailer product stub interim (2026-09-23): public employer settings.
  return publicSiteBaseUrl() + '/employer/settings';
}

function buildShareFacebookUrl(jobPublicUrl) {
  return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(jobPublicUrl);
}

function buildShareLinkedInUrl(jobPublicUrl) {
  return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(jobPublicUrl);
}

async function countApplicantsForJob(jobId) {
  var q = `
    SELECT COUNT(*)::int AS c
    FROM ${dbSchema}.job_applicants
    WHERE job_id = $1
      AND (is_archived IS NULL OR is_archived = false)
  `;
  var res = await dbQuery.query(q, [jobId]);
  return (res.rows && res.rows[0] && res.rows[0].c) || 0;
}

/**
 * Prefs gate v1: send unless explicitly opted out.
 * Known opt-out: engagement_preferences.JOB_ALERTS === false (or
 * EMPLOYER_JOB_ALERTS / job_alerts === false if present). Missing key / missing
 * table / missing row → fail-open allow + log. Do not require JOB_ALERTS true.
 */
function prefsObjectOptedOut(prefs) {
  if (!prefs || typeof prefs !== 'object') return false;
  var keys = ['JOB_ALERTS', 'EMPLOYER_JOB_ALERTS', 'job_alerts'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (Object.prototype.hasOwnProperty.call(prefs, k) && prefs[k] === false) {
      return true;
    }
  }
  return false;
}

async function isEmployerJobEmailAllowed(companyId) {
  if (!companyId) {
    console.log('[employerJobEmail] PREFS_FAIL_OPEN reason=no_company_id');
    return { allowed: true, reason: 'no_company_id' };
  }
  var q = `
    SELECT preferences
    FROM ${dbSchema}.engagement_preferences
    WHERE company_id = $1
  `;
  try {
    var res = await dbQuery.query(q, [companyId]);
    if (!res.rows || res.rows.length === 0) {
      console.log('[employerJobEmail] PREFS_FAIL_OPEN reason=no_prefs_row companyId=[REDACTED]');
      return { allowed: true, reason: 'no_prefs_row' };
    }
    for (var i = 0; i < res.rows.length; i++) {
      if (prefsObjectOptedOut(res.rows[i].preferences || {})) {
        return { allowed: false, reason: 'explicit_opt_out' };
      }
    }
    console.log('[employerJobEmail] PREFS_FAIL_OPEN reason=no_explicit_opt_out companyId=[REDACTED]');
    return { allowed: true, reason: 'no_explicit_opt_out' };
  } catch (err) {
    if (err && err.code === '42P01') {
      console.log('[employerJobEmail] PREFS_FAIL_OPEN reason=engagement_preferences_missing');
      return { allowed: true, reason: 'engagement_preferences_missing' };
    }
    console.warn('[employerJobEmail] prefs check error (fail-open):', err && err.code);
    return { allowed: true, reason: 'prefs_error_fail_open' };
  }
}

async function resolveJobMeta(jobId, provided) {
  if (provided && provided.jobTitle) {
    return {
      jobId: jobId,
      jobTitle: provided.jobTitle,
      companyId: provided.companyId || provided.company_id || null,
      companyName: provided.companyName || provided.company_name || '',
    };
  }
  var q = `
    SELECT j.job_id, j.job_title, j.company_id, c.company_name
    FROM ${dbSchema}.jobs j
    LEFT JOIN ${dbSchema}.companies c ON c.company_id = j.company_id
    WHERE j.job_id = $1
    LIMIT 1
  `;
  var res = await dbQuery.query(q, [jobId]);
  if (!res.rows || res.rows.length === 0) return null;
  var row = res.rows[0];
  return {
    jobId: row.job_id,
    jobTitle: row.job_title,
    companyId: row.company_id,
    companyName: row.company_name || '',
  };
}

async function sendClaimedEmail(opts) {
  var eventId = opts.eventId;
  var templateKey = opts.templateKey;
  var dynamicData = opts.dynamicData;
  var recipients = opts.recipients || [];

  if (!recipients.length) {
    await updateEmployerJobEmailEvent(eventId, {
      status: 'failed',
      lastErrorCode: 'no_recipients',
      lastErrorMessage: 'No company admin emails found',
    });
    console.warn('[employerJobEmail] no recipients for milestone=' + opts.milestone);
    return { sent: false, reason: 'no_recipients' };
  }

  var primary = recipients[0];
  var recipientHash = hashEmail(primary.email);

  if (isDryRun()) {
    console.log('[employerJobEmail] DRY_RUN claim+skip_send', {
      milestone: opts.milestone,
      templateKey: templateKey,
      jobId: opts.jobId,
      recipientCount: recipients.length,
      dynamicDataKeys: Object.keys(dynamicData || {}),
    });
    await updateEmployerJobEmailEvent(eventId, {
      status: 'sent',
      providerMessageId: 'dry-run',
      recipientEmailHash: recipientHash,
    });
    return { sent: true, dryRun: true };
  }

  var anySent = false;
  var lastMessageId = null;
  var lastError = null;

  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    var dataForRecipient = Object.assign({}, dynamicData, {
      employer_first_name: r.name || dynamicData.employer_first_name || '',
    });
    try {
      var result = await send(r.email, templateKey, dataForRecipient, HR_MANAGER_FROM);
      if (result && result.sent) {
        anySent = true;
        lastMessageId = result.messageId || lastMessageId;
      } else {
        lastError = (result && result.reason) || 'send_failed';
      }
    } catch (err) {
      lastError = err && err.message ? err.message : 'send_threw';
      console.error('[employerJobEmail] send threw (non-blocking):', lastError.substring(0, 120));
    }
  }

  if (anySent) {
    await updateEmployerJobEmailEvent(eventId, {
      status: 'sent',
      providerMessageId: lastMessageId,
      recipientEmailHash: recipientHash,
    });
    return { sent: true, messageId: lastMessageId };
  }

  await updateEmployerJobEmailEvent(eventId, {
    status: 'failed',
    recipientEmailHash: recipientHash,
    lastErrorCode: 'send_failed',
    lastErrorMessage: lastError,
  });
  return { sent: false, reason: lastError || 'send_failed' };
}

/**
 * After a successful jobApply insert: if COUNT ∈ {1,10,20,40,50}, claim + send.
 * Fire-and-forget safe — never throws.
 */
async function maybeSendApplicantMilestoneEmail(jobId, jobMeta) {
  try {
    if (!jobId) return { sent: false, reason: 'no_job_id' };

    var count = await countApplicantsForJob(jobId);
    if (!MILESTONE_COUNTS[count]) {
      return { sent: false, reason: 'not_milestone', count: count };
    }

    var milestone = String(count);
    var templateKey = TEMPLATE_KEY_BY_MILESTONE[milestone];
    var templateId = getTemplate(templateKey);

    var meta = await resolveJobMeta(jobId, jobMeta);
    if (!meta) {
      console.warn('[employerJobEmail] milestone skip — job not found', jobId);
      return { sent: false, reason: 'job_not_found' };
    }

    var claim = await claimEmployerJobEmailEvent({
      jobId: jobId,
      companyId: meta.companyId,
      milestone: milestone,
      applicationCount: count,
      templateId: templateId,
    });
    if (!claim.claimed) {
      return { sent: false, reason: claim.reason || 'not_claimed' };
    }

    var prefs = await isEmployerJobEmailAllowed(meta.companyId);
    if (!prefs.allowed) {
      await updateEmployerJobEmailEvent(claim.id, {
        status: 'skipped_pref',
        lastErrorCode: 'skipped_pref',
        lastErrorMessage: prefs.reason,
      });
      console.log('[employerJobEmail] SKIPPED_PREF milestone=' + milestone);
      return { sent: false, reason: 'skipped_pref' };
    }

    var recipients = await getCompanyAdminEmails(meta.companyId);
    var jobApplicantsUrl = buildJobApplicantsUrl(jobId);
    var dynamicData = {
      employer_first_name: (recipients[0] && recipients[0].name) || '',
      job_title: meta.jobTitle || '',
      company_name: meta.companyName || '',
      job_applicants_url: jobApplicantsUrl,
      manage_notifications_url: buildManageNotificationsUrl(),
    };

    return await sendClaimedEmail({
      eventId: claim.id,
      milestone: milestone,
      templateKey: templateKey,
      jobId: jobId,
      recipients: recipients,
      dynamicData: dynamicData,
    });
  } catch (err) {
    console.error(
      '[employerJobEmail] maybeSendApplicantMilestoneEmail failed (non-blocking):',
      err && err.message ? err.message.substring(0, 120) : 'unknown'
    );
    return { sent: false, reason: 'error' };
  }
}

/**
 * On transition into job_status_id === 2 (published). Idempotent via milestone 'job_live'.
 * Callers must only invoke on real draft→published (or create-as-published) transitions.
 * Never throws.
 */
async function maybeSendJobLiveEmail(jobId, jobMeta) {
  try {
    if (!jobId) return { sent: false, reason: 'no_job_id' };

    var templateKey = TEMPLATE_KEY_BY_MILESTONE.job_live;
    var templateId = getTemplate(templateKey);

    var meta = await resolveJobMeta(jobId, jobMeta);
    if (!meta) {
      console.warn('[employerJobEmail] job_live skip — job not found', jobId);
      return { sent: false, reason: 'job_not_found' };
    }

    var claim = await claimEmployerJobEmailEvent({
      jobId: jobId,
      companyId: meta.companyId,
      milestone: 'job_live',
      applicationCount: null,
      templateId: templateId,
    });
    if (!claim.claimed) {
      return { sent: false, reason: claim.reason || 'not_claimed' };
    }

    var prefs = await isEmployerJobEmailAllowed(meta.companyId);
    if (!prefs.allowed) {
      await updateEmployerJobEmailEvent(claim.id, {
        status: 'skipped_pref',
        lastErrorCode: 'skipped_pref',
        lastErrorMessage: prefs.reason,
      });
      console.log('[employerJobEmail] SKIPPED_PREF milestone=job_live');
      return { sent: false, reason: 'skipped_pref' };
    }

    var recipients = await getCompanyAdminEmails(meta.companyId);
    var jobPublicUrl = buildJobPublicUrl(jobId);
    var dynamicData = {
      employer_first_name: (recipients[0] && recipients[0].name) || '',
      job_title: meta.jobTitle || '',
      company_name: meta.companyName || '',
      job_public_url: jobPublicUrl,
      job_manage_url: buildJobManageUrl(jobId),
      share_facebook_url: buildShareFacebookUrl(jobPublicUrl),
      share_linkedin_url: buildShareLinkedInUrl(jobPublicUrl),
    };

    return await sendClaimedEmail({
      eventId: claim.id,
      milestone: 'job_live',
      templateKey: templateKey,
      jobId: jobId,
      recipients: recipients,
      dynamicData: dynamicData,
    });
  } catch (err) {
    console.error(
      '[employerJobEmail] maybeSendJobLiveEmail failed (non-blocking):',
      err && err.message ? err.message.substring(0, 120) : 'unknown'
    );
    return { sent: false, reason: 'error' };
  }
}

export {
  maybeSendApplicantMilestoneEmail,
  maybeSendJobLiveEmail,
  buildJobPublicUrl,
  buildJobApplicantsUrl,
  buildJobManageUrl,
  buildManageNotificationsUrl,
  buildShareFacebookUrl,
  buildShareLinkedInUrl,
  MILESTONE_COUNTS,
  TEMPLATE_KEY_BY_MILESTONE,
  isEmployerJobEmailAllowed,
  countApplicantsForJob,
};
