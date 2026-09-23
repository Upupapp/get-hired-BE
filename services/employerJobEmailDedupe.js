/**
 * Employer job email claim / status helpers.
 * Claim-first INSERT ON CONFLICT DO NOTHING RETURNING id for idempotency.
 * Node 14 / ESM safe: no ?. or ??
 */

import crypto from 'crypto';
import dbQuery from '../db/dbQuery';
import env from '../env';

const dbSchema = env.schema;

function hashEmail(email) {
  if (!email) return null;
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
}

/**
 * Claim a (job_id, milestone) send slot.
 * Returns { claimed: true, id } or { claimed: false }.
 * Table-missing (42P01) → claimed:false + missingTable:true (caller should skip send).
 */
async function claimEmployerJobEmailEvent(opts) {
  var q = `
    INSERT INTO ${dbSchema}.employer_job_email_events
      (job_id, company_id, milestone, application_count, recipient_email_hash,
       status, provider, template_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'queued', 'sendgrid', $6, NOW(), NOW())
    ON CONFLICT (job_id, milestone) DO NOTHING
    RETURNING id
  `;
  try {
    var res = await dbQuery.query(q, [
      opts.jobId,
      opts.companyId || null,
      opts.milestone,
      opts.applicationCount != null ? opts.applicationCount : null,
      opts.recipientEmailHash || null,
      opts.templateId || null,
    ]);
    if (res.rows && res.rows.length > 0) {
      return { claimed: true, id: res.rows[0].id };
    }
    return { claimed: false, reason: 'duplicate' };
  } catch (err) {
    if (err && err.code === '42P01') {
      console.warn('[employerJobEmailDedupe] table missing — skip claim/send until migration applied');
      return { claimed: false, reason: 'missing_table', missingTable: true };
    }
    console.warn('[employerJobEmailDedupe] claim error:', err && err.code, err && err.message);
    return { claimed: false, reason: 'claim_error', error: err };
  }
}

async function updateEmployerJobEmailEvent(id, patch) {
  var q = `
    UPDATE ${dbSchema}.employer_job_email_events
    SET status = $2,
        provider_message_id = COALESCE($3, provider_message_id),
        recipient_email_hash = COALESCE($4, recipient_email_hash),
        last_error_code = $5,
        last_error_message = $6,
        sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE id = $1
  `;
  try {
    await dbQuery.query(q, [
      id,
      patch.status || 'failed',
      patch.providerMessageId || null,
      patch.recipientEmailHash || null,
      patch.lastErrorCode || null,
      patch.lastErrorMessage ? String(patch.lastErrorMessage).substring(0, 500) : null,
    ]);
  } catch (err) {
    if (err && err.code !== '42P01') {
      console.warn('[employerJobEmailDedupe] update error:', err && err.code);
    }
  }
}

export { claimEmployerJobEmailEvent, updateEmployerJobEmailEvent, hashEmail };
