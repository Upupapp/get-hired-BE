/**
 * Google Indexing API integration.
 *
 * DISABLED BY DEFAULT — GOOGLE_INDEXING_API_ENABLED must be set to "true"
 * in the deployment environment before this service does anything.
 *
 * Pre-requisites before enabling (see SEO_GOOGLE_INDEXING_API_RUNBOOK.md):
 *   1. Search Console property verified for https://gethiredonline.app
 *   2. GCP service account created and granted "Owner" role in Search Console
 *   3. "Web Search Indexing API" enabled in the GCP project
 *   4. Service account key generated and stored in GOOGLE_INDEXING_SERVICE_ACCOUNT_BASE64
 *
 * Usage in controllers (fire-and-forget — do NOT await):
 *   const { notifyJobUrlUpdated, notifyJobUrlDeleted } = require('../services/googleIndexing.service');
 *   notifyJobUrlUpdated(job);   // after publish / un-delete
 *   notifyJobUrlDeleted(job);   // after delete / unpublish
 */

import { google } from 'googleapis';

const ENABLED     = process.env.GOOGLE_INDEXING_API_ENABLED === 'true';
const SITE_URL    = (process.env.PUBLIC_SITE_URL || 'https://gethiredonline.app').replace(/\/$/, '');

// Only valid public job detail paths may be submitted. Any attempt to
// derive a URL that does not start with SITE_URL is rejected so that
// private dashboard routes can never be accidentally indexed.
function buildJobUrl(job) {
  const id = job && (job.job_id || job.jobId || job.id);
  if (!id) return null;
  return `${SITE_URL}/jobs/details/${id}`;
}

function getAuthClient() {
  const base64 = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return new google.auth.GoogleAuth({
      credentials: json,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
  }

  const clientEmail  = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const privateKey   = (process.env.GOOGLE_INDEXING_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    return new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
  }

  throw new Error('Google Indexing: no credentials configured');
}

/**
 * Notify Google of a URL change.
 * @param {string} url   - The full public URL to notify
 * @param {'URL_UPDATED'|'URL_DELETED'} type - Notification type
 */
async function notifyUrl(url, type) {
  if (!ENABLED) return; // hard gate — no-op when disabled

  // Safety: never submit URLs outside the public site
  if (!url || !url.startsWith(SITE_URL)) {
    console.warn('[googleIndexing] Rejected URL not within SITE_URL:', url);
    return;
  }

  try {
    const auth   = getAuthClient();
    const client = await auth.getClient();
    const indexing = google.indexing({ version: 'v3', auth: client });

    await indexing.urlNotifications.publish({
      requestBody: { url, type },
    });

    console.log(`[googleIndexing] ${type} notified: ${url}`);
  } catch (err) {
    // Best-effort: log a redacted error but never let this block the response.
    const msg = err && err.message ? err.message.substring(0, 120) : String(err);
    console.error('[googleIndexing] Notification failed (non-fatal):', msg);
  }
}

/**
 * Notify Google that a job URL was published or updated.
 * Call after: job create, job publish, job un-delete.
 * Fire-and-forget — do NOT await in request handlers.
 */
export async function notifyJobUrlUpdated(job) {
  const url = buildJobUrl(job);
  if (url) notifyUrl(url, 'URL_UPDATED');
}

/**
 * Notify Google that a job URL was deleted or unpublished.
 * Call after: job delete, job unpublish, job expire.
 * Fire-and-forget — do NOT await in request handlers.
 */
export async function notifyJobUrlDeleted(job) {
  const url = buildJobUrl(job);
  if (url) notifyUrl(url, 'URL_DELETED');
}
