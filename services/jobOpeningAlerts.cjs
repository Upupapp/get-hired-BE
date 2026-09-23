'use strict';

/**
 * Seeker job-opening alerts.
 *
 * Match rule (published jobs only):
 *   jobs.job_status_id = 2
 *   AND (expiration_date IS NULL OR expiration_date >= Asia/Manila calendar date)
 *   AND (
 *     lower(btrim(job_title)) = normalized position
 *     OR (normalized length >= 3 AND lower(job_title) LIKE %position% with \ % _ escaped)
 *   )
 *   AND (subscription.job_role_id IS NULL OR jobs.job_role_id = subscription.job_role_id)
 * Newest first: COALESCE(updated_at, created_at) DESC, job_id DESC, LIMIT 10.
 *
 * job_title is the live free-text position. job_role_id is the optional
 * gethired.job_role option id; when the client sends it, it narrows the title match.
 *
 * Schedule: Tuesday 21:00 Asia/Manila (UTC+8, no DST) through Wednesday 03:00
 * catch-up. No node-cron. PM2 cluster runs the timer on instance 0 only.
 * Digest idempotency is last_digest_week (the Manila date of that Tuesday).
 * Instant idempotency is instant_sent_at on the subscription row.
 * instant_claimed_at is an in-flight lease. Employer milestone mail has no
 * claim TTL (a dead process leaves the row queued). This lease expires after
 * INSTANT_CLAIM_TTL_MINUTES (10) so a crash mid-send can be retried. A claim
 * younger than that is left alone so two overlapping subscribes cannot both send.
 *
 * From: GetHired <hrmanager@gethiredonline.app> — the verified transactional
 * sender already used by employer job mail. Display name is seeker-facing.
 */

var crypto = require('crypto');

var MAX_JOBS = 10;
var MAX_ACTIVE_SUBSCRIPTIONS = 30;
var MIN_SUBSTRING = 3;
var INSTANT_CLAIM_TTL_MINUTES = 10;
var MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
var TEMPLATE_KEY = 'job_opening_alert';
var FROM = {
  fromEmail: 'hrmanager@gethiredonline.app',
  fromName: 'GetHired',
};

function ident(schema) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema || '')) {
    throw new Error('Invalid schema');
  }
  return schema;
}

function httpError(status, message) {
  var err = new Error(message);
  err.httpStatus = status;
  return err;
}

function iso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function manilaParts(date) {
  var shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function ymd(parts) {
  return parts.year + '-' + pad2(parts.month) + '-' + pad2(parts.day);
}

function manilaYmd(date) {
  return ymd(manilaParts(date));
}

function addManilaDays(date, days) {
  var shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return new Date(shifted.getTime() - MANILA_OFFSET_MS);
}

function isDigestWindow(date) {
  var p = manilaParts(date);
  if (p.weekday === 2 && p.hour >= 21) return true;
  if (p.weekday === 3 && p.hour < 3) return true;
  return false;
}

function digestWeekKey(date, force) {
  var p = manilaParts(date);
  if (isDigestWindow(date)) {
    if (p.weekday === 2) return ymd(p);
    return ymd(manilaParts(addManilaDays(date, -1)));
  }
  if (!force) return null;
  var back;
  if (p.weekday === 2 && p.hour < 21) back = 7;
  else if (p.weekday >= 2) back = p.weekday - 2;
  else back = p.weekday + 5;
  return ymd(manilaParts(addManilaDays(date, -back)));
}

function shouldRunScheduler(env) {
  var e = env || process.env;
  var raw = e.JOB_OPENING_ALERTS_SCHEDULER;
  var flag = String(raw == null || raw === '' ? 'true' : raw).toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  var instance = e.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== null && String(instance) !== '' && String(instance) !== '0') {
    return false;
  }
  return true;
}

function secretsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (!expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function normalizePosition(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Position is required.' };
  var collapsed = raw.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  if (collapsed.length < 2 || collapsed.length > 120) {
    return { ok: false, error: 'Position must be 2–120 characters.' };
  }
  return { ok: true, position: collapsed, normalized: collapsed.toLowerCase() };
}

function parseJobRoleId(body) {
  if (!body || typeof body !== 'object') return { ok: true, jobRoleId: null };
  var raw = body.jobRoleId != null ? body.jobRoleId : body.job_role_id;
  if (raw == null || raw === '') return { ok: true, jobRoleId: null };
  var n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1000000) {
    return { ok: false, error: 'jobRoleId must be a positive integer.' };
  }
  return { ok: true, jobRoleId: n };
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, function(ch) { return '\\' + ch; });
}

function likePattern(normalized) {
  return '%' + escapeLike(normalized) + '%';
}

function titleMatches(jobTitle, normalized) {
  var raw = String(jobTitle || '').toLowerCase();
  var trimmed = raw.trim();
  if (trimmed === normalized) return true;
  if (normalized.length >= MIN_SUBSTRING && raw.indexOf(normalized) !== -1) return true;
  return false;
}

function formatLocation(city, country) {
  var parts = [];
  if (city) parts.push(String(city).trim());
  if (country) parts.push(String(country).trim());
  return parts.filter(Boolean).join(', ');
}

function publicBase(deps) {
  var raw = (deps && deps.publicSiteUrl) || process.env.PUBLIC_SITE_URL || (deps && deps.appUrl) || 'https://gethiredonline.app';
  return String(raw).replace(/\/$/, '');
}

function buildJobUrl(base, jobId) {
  return base + '/jobs/details/' + encodeURIComponent(jobId);
}

function buildManageAlertsUrl(base) {
  return base + '/job-alerts';
}

function isPlausibleEmail(email) {
  if (!email || typeof email !== 'string' || email.length > 254) return false;
  return /\S+@\S+\.\S+/.test(email.trim());
}

function matchingJobsSql(schema) {
  var s = ident(schema);
  return ''
    + 'SELECT j.job_id, j.job_title, c.company_name, j.job_city, j.job_country, '
    + 'COALESCE(j.updated_at, j.created_at) AS posted_at '
    + 'FROM ' + s + '.jobs j '
    + 'LEFT JOIN ' + s + '.companies c ON c.company_id = j.company_id '
    + 'WHERE j.job_status_id = 2 '
    + 'AND (j.expiration_date IS NULL OR j.expiration_date >= $5::date) '
    + 'AND ( '
    + '  lower(btrim(j.job_title)) = $1 '
    + "  OR ($2::boolean IS TRUE AND lower(j.job_title) LIKE $3 ESCAPE '\\') "
    + ') '
    + 'AND ($4::int IS NULL OR j.job_role_id = $4) '
    + 'ORDER BY COALESCE(j.updated_at, j.created_at) DESC NULLS LAST, j.job_id DESC '
    + 'LIMIT 10';
}

function mapSubscription(row) {
  return {
    id: String(row.id),
    position: row.position,
    jobRoleId: row.job_role_id == null ? null : Number(row.job_role_id),
    active: row.active === true,
    instantSentAt: iso(row.instant_sent_at),
    instantJobCount: row.instant_job_count == null ? null : Number(row.instant_job_count),
    lastDigestSentAt: iso(row.last_digest_sent_at),
    lastDigestWeek: row.last_digest_week || null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function emptyDigest(extra) {
  return Object.assign({
    ran: false,
    reason: null,
    weekKey: null,
    source: null,
    considered: 0,
    sent: 0,
    skippedAlready: 0,
    skippedNoMatches: 0,
    skippedNoEmail: 0,
    failed: 0,
  }, extra || {});
}

function createJobOpeningAlertService(deps) {
  if (!deps || typeof deps.query !== 'function' || typeof deps.send !== 'function') {
    throw new Error('job opening alert service requires query and send');
  }
  var schema = ident(deps.schema || 'gethired');
  var table = schema + '.job_opening_alert_subscriptions';
  var cols = 'id, user_uid, position, position_normalized, job_role_id, active, '
    + 'instant_sent_at, instant_claimed_at, instant_message_id, instant_job_count, '
    + 'last_digest_week, last_digest_sent_at, last_digest_message_id, last_digest_job_count, '
    + 'created_at, updated_at';

  function now() {
    return deps.now ? deps.now() : new Date();
  }

  function dryRun() {
    if (typeof deps.dryRun === 'boolean') return deps.dryRun;
    return String(process.env.JOB_OPENING_ALERT_DRY_RUN || '').toLowerCase() === 'true';
  }

  async function query(text, params) {
    try {
      var res = await deps.query(text, params);
      return res && res.rows ? res.rows : [];
    } catch (err) {
      if (err && err.code === '42P01') {
        throw httpError(503, 'Job opening alerts are not available yet.');
      }
      throw err;
    }
  }

  async function loadSubscription(id, uid) {
    var rows = await query(
      'SELECT ' + cols + ' FROM ' + table + ' WHERE id = $1 AND user_uid = $2 LIMIT 1',
      [id, uid]
    );
    return rows[0] || null;
  }

  async function findByPosition(uid, normalized) {
    var rows = await query(
      'SELECT ' + cols + ' FROM ' + table + ' WHERE user_uid = $1 AND position_normalized = $2 LIMIT 1',
      [uid, normalized]
    );
    return rows[0] || null;
  }

  function toJobCards(rows) {
    var base = publicBase(deps);
    var cards = [];
    var list = rows || [];
    var n = Math.min(list.length, MAX_JOBS);
    for (var i = 0; i < n; i++) {
      var row = list[i];
      cards.push({
        job_id: row.job_id,
        job_title: row.job_title,
        company_name: row.company_name || '',
        location: formatLocation(row.job_city, row.job_country),
        job_url: buildJobUrl(base, row.job_id),
        posted_at: iso(row.posted_at) || '',
      });
    }
    return cards;
  }

  async function matchingJobs(sub) {
    var normalized = sub.position_normalized;
    var useSubstring = normalized.length >= MIN_SUBSTRING;
    var rows = await query(matchingJobsSql(schema), [
      normalized,
      useSubstring,
      likePattern(normalized),
      sub.job_role_id == null ? null : Number(sub.job_role_id),
      manilaYmd(now()),
    ]);
    return toJobCards(rows);
  }

  async function loadRecipient(uid) {
    var rows = await query(
      'SELECT c.email, u.firstname '
      + 'FROM ' + schema + '.user_credentials c '
      + 'LEFT JOIN ' + schema + '.users u ON u.uid = c.uid '
      + 'WHERE c.uid = $1 AND COALESCE(c.is_archive, false) = FALSE '
      + 'LIMIT 1',
      [uid]
    );
    return rows[0] || null;
  }

  function templateData(sub, recipient, jobs, kind, weekKey) {
    var first = recipient && recipient.firstname ? String(recipient.firstname).trim() : '';
    return {
      first_name: first || 'there',
      position: sub.position,
      job_count: jobs.length,
      jobs: jobs,
      manage_alerts_url: buildManageAlertsUrl(publicBase(deps)),
      alert_kind: kind,
      digest_week: weekKey || '',
    };
  }

  async function markInstant(id, messageId, jobCount) {
    await query(
      'UPDATE ' + table + ' SET instant_sent_at = NOW(), instant_message_id = $2, '
      + 'instant_job_count = $3, updated_at = NOW() '
      + 'WHERE id = $1 AND instant_sent_at IS NULL',
      [id, messageId, jobCount]
    );
  }

  async function releaseInstant(id) {
    await query(
      'UPDATE ' + table + ' SET instant_claimed_at = NULL, updated_at = NOW() '
      + 'WHERE id = $1 AND instant_sent_at IS NULL',
      [id]
    );
  }

  async function sendAlert(recipient, sub, jobs, kind, weekKey) {
    if (dryRun()) {
      console.log('[jobOpeningAlerts] DRY_RUN skip_send', {
        kind: kind,
        subscriptionId: String(sub.id),
        jobCount: jobs.length,
      });
      return { sent: true, dryRun: true, messageId: 'dry-run' };
    }
    var result;
    try {
      result = await deps.send(
        String(recipient.email).trim(),
        TEMPLATE_KEY,
        templateData(sub, recipient, jobs, kind, weekKey),
        FROM
      );
    } catch (err) {
      console.error('[jobOpeningAlerts] send threw', err && err.message ? String(err.message).substring(0, 120) : '');
      return { sent: false, reason: 'send_threw' };
    }
    if (result && result.sent) {
      return { sent: true, dryRun: false, messageId: result.messageId || null };
    }
    return { sent: false, reason: (result && result.reason) || 'send_failed' };
  }

  async function maybeSendInstant(row) {
    if (row.instant_sent_at) {
      return { sent: false, reason: 'already_sent', jobCount: row.instant_job_count == null ? 0 : Number(row.instant_job_count), dryRun: false };
    }
    var claimed = await query(
      'UPDATE ' + table + ' SET instant_claimed_at = NOW(), updated_at = NOW() '
      + 'WHERE id = $1 AND user_uid = $2 AND active = TRUE '
      + 'AND instant_sent_at IS NULL '
      + 'AND (instant_claimed_at IS NULL OR instant_claimed_at < NOW() - ($3::int * INTERVAL \'1 minute\')) '
      + 'RETURNING id',
      [row.id, row.user_uid, INSTANT_CLAIM_TTL_MINUTES]
    );
    if (!claimed.length) {
      return { sent: false, reason: 'already_sent', jobCount: 0, dryRun: false };
    }
    var jobs = await matchingJobs(row);
    if (!jobs.length) {
      await markInstant(row.id, null, 0);
      console.log('[jobOpeningAlerts] instant consumed with no current matches', { subscriptionId: String(row.id) });
      return { sent: false, reason: 'no_matches', jobCount: 0, dryRun: false };
    }
    var recipient = await loadRecipient(row.user_uid);
    if (!recipient || !isPlausibleEmail(recipient.email)) {
      await releaseInstant(row.id);
      return { sent: false, reason: 'no_email', jobCount: jobs.length, dryRun: false };
    }
    var sent = await sendAlert(recipient, row, jobs, 'instant', null);
    if (!sent.sent) {
      await releaseInstant(row.id);
      return { sent: false, reason: sent.reason, jobCount: jobs.length, dryRun: false };
    }
    await markInstant(row.id, sent.messageId, jobs.length);
    console.log('[jobOpeningAlerts] instant sent', { subscriptionId: String(row.id), jobCount: jobs.length });
    return { sent: true, reason: null, jobCount: jobs.length, dryRun: !!sent.dryRun };
  }

  async function subscribe(input) {
    var uid = input && input.uid;
    if (!uid || typeof uid !== 'string') throw httpError(401, 'Unauthorized');
    var body = input.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw httpError(400, 'Position is required.');
    }
    var norm = normalizePosition(body.position);
    if (!norm.ok) throw httpError(400, norm.error);
    var role = parseJobRoleId(body);
    if (!role.ok) throw httpError(400, role.error);
    if (role.jobRoleId != null) {
      var roles = await query(
        'SELECT job_role_id FROM ' + schema + '.job_role WHERE job_role_id = $1 LIMIT 1',
        [role.jobRoleId]
      );
      if (!roles.length) throw httpError(400, 'Unknown position option.');
    }

    var existing = await findByPosition(uid, norm.normalized);
    var created = false;
    var row;
    if (!existing) {
      var counts = await query(
        'SELECT COUNT(*)::int AS c FROM ' + table + ' WHERE user_uid = $1 AND active = TRUE',
        [uid]
      );
      var activeCount = counts[0] ? Number(counts[0].c) : 0;
      if (activeCount >= MAX_ACTIVE_SUBSCRIPTIONS) {
        throw httpError(400, 'You can subscribe to at most 30 positions.');
      }
      var inserted = await query(
        'INSERT INTO ' + table + ' (user_uid, position, position_normalized, job_role_id, active) '
        + 'VALUES ($1, $2, $3, $4, TRUE) '
        + 'ON CONFLICT (user_uid, position_normalized) DO NOTHING '
        + 'RETURNING ' + cols,
        [uid, norm.position, norm.normalized, role.jobRoleId]
      );
      if (inserted.length) {
        row = inserted[0];
        created = true;
      } else {
        row = await findByPosition(uid, norm.normalized);
      }
    } else {
      var touched = await query(
        'UPDATE ' + table + ' SET active = TRUE, position = $3, '
        + 'job_role_id = COALESCE($4, job_role_id), updated_at = NOW() '
        + 'WHERE user_uid = $1 AND position_normalized = $2 '
        + 'RETURNING ' + cols,
        [uid, norm.normalized, norm.position, role.jobRoleId]
      );
      row = touched[0] || existing;
    }
    if (!row) throw httpError(500, 'Could not save subscription.');

    var instant;
    try {
      instant = await maybeSendInstant(row);
    } catch (err) {
      if (row && !row.instant_sent_at) {
        try { await releaseInstant(row.id); } catch (releaseErr) { /* claim released on the next subscribe */ }
      }
      throw err;
    }
    var fresh = await loadSubscription(row.id, uid);
    return {
      created: created,
      subscription: mapSubscription(fresh || row),
      instant: instant,
    };
  }

  async function list(uid) {
    if (!uid || typeof uid !== 'string') throw httpError(401, 'Unauthorized');
    var rows = await query(
      'SELECT ' + cols + ' FROM ' + table + ' WHERE user_uid = $1 AND active = TRUE ORDER BY created_at DESC, id DESC',
      [uid]
    );
    return { subscriptions: rows.map(mapSubscription) };
  }

  async function unsubscribe(uid, idRaw) {
    if (!uid || typeof uid !== 'string') throw httpError(401, 'Unauthorized');
    if (!/^\d+$/.test(String(idRaw || ''))) throw httpError(400, 'Subscription id is invalid.');
    var updated = await query(
      'UPDATE ' + table + ' SET active = FALSE, updated_at = NOW() '
      + 'WHERE id = $1 AND user_uid = $2 AND active = TRUE RETURNING id',
      [idRaw, uid]
    );
    if (updated.length) return { id: String(idRaw), active: false, removed: true };
    var existing = await loadSubscription(idRaw, uid);
    if (!existing) throw httpError(404, 'Subscription not found.');
    return { id: String(existing.id), active: false, removed: false };
  }

  async function claimDigest(sub, weekKey) {
      var rows = await query(
      'UPDATE ' + table + ' SET last_digest_week = $2, updated_at = NOW() '
      + 'WHERE id = $1 AND active = TRUE '
      + 'AND last_digest_week IS NOT DISTINCT FROM $3 '
      + 'AND ($3::varchar IS NULL OR $3::varchar < $2) '
      + 'RETURNING id',
      [sub.id, weekKey, sub.last_digest_week == null ? null : sub.last_digest_week]
    );
    return rows.length > 0;
  }

  async function markDigest(id, weekKey, messageId, jobCount) {
    await query(
      'UPDATE ' + table + ' SET last_digest_sent_at = NOW(), last_digest_message_id = $3, '
      + 'last_digest_job_count = $4, updated_at = NOW() '
      + 'WHERE id = $1 AND last_digest_week = $2',
      [id, weekKey, messageId, jobCount]
    );
  }

  async function releaseDigest(id, weekKey, previousWeek) {
    await query(
      'UPDATE ' + table + ' SET last_digest_week = $3, updated_at = NOW() '
      + 'WHERE id = $1 AND last_digest_week = $2 AND last_digest_sent_at IS NULL',
      [id, weekKey, previousWeek == null ? null : previousWeek]
    );
  }

  async function runDigest(opts) {
    var options = opts || {};
    var force = options.force === true;
    var clock = now();
    var weekKey = digestWeekKey(clock, force);
    var summary = emptyDigest({ source: options.source || 'manual', weekKey: weekKey });
    if (!weekKey) {
      summary.reason = 'outside_window';
      return summary;
    }
    summary.ran = true;
    var subs = await query(
      'SELECT id, user_uid, position, position_normalized, job_role_id, active, last_digest_week '
      + 'FROM ' + table + ' WHERE active = TRUE ORDER BY id ASC',
      []
    );
    summary.considered = subs.length;
    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      if (sub.last_digest_week === weekKey) {
        summary.skippedAlready += 1;
        continue;
      }
      var claimed = await claimDigest(sub, weekKey);
      if (!claimed) {
        summary.skippedAlready += 1;
        continue;
      }
      try {
        var jobs = await matchingJobs(sub);
        if (!jobs.length) {
          await markDigest(sub.id, weekKey, null, 0);
          summary.skippedNoMatches += 1;
          continue;
        }
        var recipient = await loadRecipient(sub.user_uid);
        if (!recipient || !isPlausibleEmail(recipient.email)) {
          await markDigest(sub.id, weekKey, null, jobs.length);
          summary.skippedNoEmail += 1;
          continue;
        }
        var sent = await sendAlert(recipient, sub, jobs, 'digest', weekKey);
        if (!sent.sent) {
          await releaseDigest(sub.id, weekKey, sub.last_digest_week);
          summary.failed += 1;
          continue;
        }
        await markDigest(sub.id, weekKey, sent.messageId, jobs.length);
        summary.sent += 1;
      } catch (err) {
        console.error('[jobOpeningAlerts] digest row failed', err && err.code ? err.code : '');
        try { await releaseDigest(sub.id, weekKey, sub.last_digest_week); } catch (releaseErr) { /* next tick retries */ }
        summary.failed += 1;
      }
    }
    console.log('[jobOpeningAlerts] digest', {
      weekKey: weekKey,
      source: summary.source,
      considered: summary.considered,
      sent: summary.sent,
      failed: summary.failed,
    });
    return summary;
  }

  return {
    subscribe: subscribe,
    list: list,
    unsubscribe: unsubscribe,
    runDigest: runDigest,
  };
}

function createJobOpeningAlertHttp(service, present, deps) {
  if (!present || typeof present.successResponse !== 'function' || typeof present.errorResponse !== 'function' || !present.status) {
    throw new Error('job opening alert http requires present helpers');
  }
  var status = present.status;

  function cronSecret() {
    if (deps && Object.prototype.hasOwnProperty.call(deps, 'cronSecret')) return deps.cronSecret || '';
    return process.env.JOB_OPENING_ALERT_CRON_SECRET || '';
  }

  function sendError(res, err) {
    var code = err && err.httpStatus ? err.httpStatus : status.error;
    if (code >= 500) {
      console.error('[jobOpeningAlerts]', err && err.message ? String(err.message).substring(0, 200) : '');
    }
    var message;
    if (code === 503) message = 'Job opening alerts are not available yet.';
    else if (code >= 500) message = 'Operation not successful. Please try again.';
    else message = err && err.message ? err.message : 'Operation not successful. Please try again.';
    return res.status(code).json(present.errorResponse(message));
  }

  async function list(req, res) {
    try {
      var uid = req.user && req.user.uid;
      var data = await service.list(uid);
      return res.status(status.success).json(present.successResponse(data));
    } catch (err) {
      return sendError(res, err);
    }
  }

  async function subscribe(req, res) {
    try {
      var uid = req.user && req.user.uid;
      var data = await service.subscribe({ uid: uid, body: req.body || {} });
      var code = data.created ? status.created : status.success;
      return res.status(code).json(present.successResponse(data));
    } catch (err) {
      return sendError(res, err);
    }
  }

  async function unsubscribe(req, res) {
    try {
      var uid = req.user && req.user.uid;
      var data = await service.unsubscribe(uid, req.params && req.params.id);
      return res.status(status.success).json(present.successResponse(data));
    } catch (err) {
      return sendError(res, err);
    }
  }

  async function digest(req, res) {
    var expected = cronSecret();
    if (!expected) {
      return res.status(503).json(present.errorResponse('Job opening alert digest is not configured.'));
    }
    var provided = req.get ? (req.get('x-job-opening-alert-cron') || '') : '';
    if (!secretsMatch(String(provided), String(expected))) {
      return res.status(status.unauthorized).json(present.errorResponse('Unauthorized'));
    }
    try {
      var force = !!(req.body && req.body.force === true);
      var data = await service.runDigest({ force: force, source: 'http' });
      return res.status(status.success).json(present.successResponse(data));
    } catch (err) {
      return sendError(res, err);
    }
  }

  return { list: list, subscribe: subscribe, unsubscribe: unsubscribe, digest: digest };
}

function mountJobOpeningAlertRoutes(router, handlers, auth) {
  router.get('/job-opening-alerts', auth, handlers.list);
  router.post('/job-opening-alerts', auth, handlers.subscribe);
  router.delete('/job-opening-alerts/:id', auth, handlers.unsubscribe);
  router.post('/internal/job-opening-alerts/digest', handlers.digest);
}

function startJobOpeningAlertScheduler(opts) {
  var options = opts || {};
  if (!shouldRunScheduler(options.env)) {
    return { started: false, stop: function() {} };
  }
  var stopped = false;
  var running = false;
  var bootDelay = options.bootDelayMs != null ? options.bootDelayMs : 20000;
  var intervalMs = options.intervalMs || (15 * 60 * 1000);

  async function tick() {
    if (stopped || running) return;
    var clock = options.now ? options.now() : new Date();
    if (!isDigestWindow(clock)) return;
    if (typeof options.runDigest !== 'function') return;
    running = true;
    try {
      await options.runDigest();
    } catch (err) {
      console.error('[jobOpeningAlerts] scheduler tick failed', err && err.message ? String(err.message).substring(0, 160) : '');
    } finally {
      running = false;
    }
  }

  var boot = setTimeout(tick, bootDelay);
  var timer = setInterval(tick, intervalMs);
  if (boot.unref) boot.unref();
  if (timer.unref) timer.unref();
  return {
    started: true,
    stop: function() {
      stopped = true;
      clearTimeout(boot);
      clearInterval(timer);
    },
  };
}

module.exports = {
  MAX_JOBS: MAX_JOBS,
  MAX_ACTIVE_SUBSCRIPTIONS: MAX_ACTIVE_SUBSCRIPTIONS,
  INSTANT_CLAIM_TTL_MINUTES: INSTANT_CLAIM_TTL_MINUTES,
  TEMPLATE_KEY: TEMPLATE_KEY,
  FROM: FROM,
  normalizePosition: normalizePosition,
  parseJobRoleId: parseJobRoleId,
  escapeLike: escapeLike,
  likePattern: likePattern,
  titleMatches: titleMatches,
  isDigestWindow: isDigestWindow,
  digestWeekKey: digestWeekKey,
  manilaYmd: manilaYmd,
  shouldRunScheduler: shouldRunScheduler,
  secretsMatch: secretsMatch,
  matchingJobsSql: matchingJobsSql,
  buildJobUrl: buildJobUrl,
  buildManageAlertsUrl: buildManageAlertsUrl,
  createJobOpeningAlertService: createJobOpeningAlertService,
  createJobOpeningAlertHttp: createJobOpeningAlertHttp,
  mountJobOpeningAlertRoutes: mountJobOpeningAlertRoutes,
  startJobOpeningAlertScheduler: startJobOpeningAlertScheduler,
};
