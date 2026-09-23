'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { PGlite } = require('@electric-sql/pglite');
const alerts = require('../services/jobOpeningAlerts.cjs');

const present = {
  status: { success: 200, error: 500, notfound: 404, unauthorized: 401, created: 201, bad: 400 },
  successResponse: function(data) { return { status: 'success', data: data }; },
  errorResponse: function(error) { return { status: 'error', error: error }; },
};

function at(iso) { return new Date(iso); }

describe('job opening alert rules', function() {
  test('normalizes position text', function() {
    var n = alerts.normalizePosition('  Senior   Software Engineer  ');
    assert.equal(n.ok, true);
    assert.equal(n.position, 'Senior Software Engineer');
    assert.equal(n.normalized, 'senior software engineer');
    assert.equal(alerts.normalizePosition(' A ').ok, false);
    assert.equal(alerts.normalizePosition('').ok, false);
    assert.equal(alerts.normalizePosition(null).ok, false);
    assert.equal(alerts.normalizePosition('x'.repeat(121)).ok, false);
  });

  test('title match is exact for 2-character positions and substring from 3', function() {
    assert.equal(alerts.titleMatches('IT', 'it'), true);
    assert.equal(alerts.titleMatches('IT Manager', 'it'), false);
    assert.equal(alerts.titleMatches('Waiting Staff', 'it'), false);
    assert.equal(alerts.titleMatches('Senior Software Engineer', 'software engineer'), true);
    assert.equal(alerts.titleMatches('Baker', 'software engineer'), false);
    assert.equal(alerts.titleMatches('Nurse 100% remote', '100%'), true);
    assert.equal(alerts.titleMatches('Nurse', '100%'), false);
  });

  test('LIKE pattern escapes percent and underscore', function() {
    assert.equal(alerts.escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
    assert.equal(alerts.likePattern('100%'), '%100\\%%');
  });

  test('matching SQL is published-only, capped at 10, newest first', function() {
    var sql = alerts.matchingJobsSql('gethired');
    assert.match(sql, /job_status_id = 2/);
    assert.match(sql, /LIMIT 10/);
    assert.match(sql, /ORDER BY COALESCE\(j\.updated_at, j\.created_at\) DESC/);
    assert.match(sql, /LIKE \$3 ESCAPE/);
    assert.match(sql, /job_role_id = \$4/);
    assert.match(sql, /expiration_date/);
    assert.throws(function() { alerts.matchingJobsSql('gethired;drop'); });
  });

  test('Tuesday 21:00 Asia/Manila window and week key', function() {
    var tue2100 = at('2026-09-22T13:00:00.000Z');
    var tue2059 = at('2026-09-22T12:59:00.000Z');
    var wed0259 = at('2026-09-22T18:59:00.000Z');
    var wed0300 = at('2026-09-22T19:00:00.000Z');
    var monday = at('2026-09-21T13:00:00.000Z');

    assert.equal(alerts.isDigestWindow(tue2100), true);
    assert.equal(alerts.isDigestWindow(tue2059), false);
    assert.equal(alerts.isDigestWindow(wed0259), true);
    assert.equal(alerts.isDigestWindow(wed0300), false);
    assert.equal(alerts.isDigestWindow(monday), false);

    assert.equal(alerts.digestWeekKey(tue2100, false), '2026-09-22');
    assert.equal(alerts.digestWeekKey(wed0259, false), '2026-09-22');
    assert.equal(alerts.digestWeekKey(tue2059, false), null);
    assert.equal(alerts.digestWeekKey(monday, false), null);
    assert.equal(alerts.digestWeekKey(monday, true), '2026-09-15');
    assert.equal(alerts.digestWeekKey(tue2059, true), '2026-09-15');
    assert.equal(alerts.digestWeekKey(wed0300, true), '2026-09-22');
    assert.equal(alerts.manilaYmd(tue2100), '2026-09-22');
  });

  test('scheduler runs on PM2 instance 0 only', function() {
    assert.equal(alerts.shouldRunScheduler({ JOB_OPENING_ALERTS_SCHEDULER: 'true' }), true);
    assert.equal(alerts.shouldRunScheduler({}), true);
    assert.equal(alerts.shouldRunScheduler({ NODE_APP_INSTANCE: '0' }), true);
    assert.equal(alerts.shouldRunScheduler({ NODE_APP_INSTANCE: '1' }), false);
    assert.equal(alerts.shouldRunScheduler({ JOB_OPENING_ALERTS_SCHEDULER: 'false', NODE_APP_INSTANCE: '0' }), false);
  });

  test('cron secret compare rejects length mismatches', function() {
    assert.equal(alerts.secretsMatch('abc', 'abc'), true);
    assert.equal(alerts.secretsMatch('abd', 'abc'), false);
    assert.equal(alerts.secretsMatch('ab', 'abc'), false);
    assert.equal(alerts.secretsMatch('abc', ''), false);
  });

  test('job urls use the public site path', function() {
    assert.equal(
      alerts.buildJobUrl('https://gethiredonline.app', 'JB/1'),
      'https://gethiredonline.app/jobs/details/' + encodeURIComponent('JB/1')
    );
    assert.equal(alerts.buildManageAlertsUrl('https://gethiredonline.app'), 'https://gethiredonline.app/job-alerts');
  });
});

describe('job opening alert scheduler timer', function() {
  test('fires inside the Manila window and stays quiet outside it', async function() {
    var calls = 0;
    var armed = alerts.startJobOpeningAlertScheduler({
      env: { NODE_APP_INSTANCE: '0', JOB_OPENING_ALERTS_SCHEDULER: 'true' },
      now: function() { return at('2026-09-22T13:00:00.000Z'); },
      bootDelayMs: 15,
      intervalMs: 600000,
      runDigest: async function() { calls += 1; },
    });
    assert.equal(armed.started, true);
    await new Promise(function(resolve) { setTimeout(resolve, 40); });
    armed.stop();
    assert.equal(calls, 1);

    var quiet = 0;
    var idle = alerts.startJobOpeningAlertScheduler({
      env: { NODE_APP_INSTANCE: '0' },
      now: function() { return at('2026-09-21T13:00:00.000Z'); },
      bootDelayMs: 10,
      intervalMs: 600000,
      runDigest: async function() { quiet += 1; },
    });
    await new Promise(function(resolve) { setTimeout(resolve, 30); });
    idle.stop();
    assert.equal(quiet, 0);

    var other = alerts.startJobOpeningAlertScheduler({
      env: { NODE_APP_INSTANCE: '1' },
      runDigest: async function() { throw new Error('should not run'); },
    });
    assert.equal(other.started, false);
    other.stop();
  });
});

describe('job opening alerts against Postgres', function() {
  var db;
  var sends;
  var service;
  var clock;

  before(async function() {
    db = new PGlite();
    await db.exec('CREATE SCHEMA IF NOT EXISTS gethired;');
    var migration = fs.readFileSync(
      path.join(__dirname, '../db/20260923_job_opening_alert_subscriptions.sql'),
      'utf8'
    );
    await db.exec(migration);
    await db.exec(`
      CREATE TABLE gethired.job_role (
        job_role_id integer PRIMARY KEY,
        job_role_name varchar NOT NULL
      );
      CREATE TABLE gethired.companies (
        company_id varchar PRIMARY KEY,
        company_name varchar
      );
      CREATE TABLE gethired.jobs (
        job_id varchar PRIMARY KEY,
        job_title varchar NOT NULL,
        company_id varchar,
        job_role_id integer,
        job_status_id integer,
        job_city varchar,
        job_country varchar,
        created_at timestamptz,
        updated_at timestamptz,
        expiration_date date
      );
      CREATE TABLE gethired.users (
        uid varchar PRIMARY KEY,
        firstname varchar
      );
      CREATE TABLE gethired.user_credentials (
        uid varchar PRIMARY KEY,
        email varchar,
        is_archive boolean DEFAULT false
      );
      INSERT INTO gethired.job_role (job_role_id, job_role_name) VALUES (5, 'Nursing');
      INSERT INTO gethired.companies (company_id, company_name) VALUES ('CO1', 'Acme Care');
      INSERT INTO gethired.users (uid, firstname) VALUES ('seeker-1', 'Ana'), ('seeker-2', 'Ben');
      INSERT INTO gethired.user_credentials (uid, email) VALUES
        ('seeker-1', 'ana@example.com'),
        ('seeker-2', 'ben@example.com');
    `);

    var values = [];
    for (var i = 1; i <= 12; i++) {
      var day = String(i).padStart(2, '0');
      values.push(
        "('JOB" + day + "', 'Senior Software Engineer', 'CO1', NULL, 2, 'Manila', 'Philippines', "
        + "'2026-09-" + day + "T01:00:00Z', '2026-09-" + day + "T01:00:00Z', NULL)"
      );
    }
    values.push("('DRAFT1', 'Senior Software Engineer', 'CO1', NULL, 1, 'Manila', 'Philippines', '2026-09-20T01:00:00Z', '2026-09-20T01:00:00Z', NULL)");
    values.push("('OLD1', 'Senior Software Engineer', 'CO1', NULL, 2, 'Cebu', 'Philippines', '2026-09-18T01:00:00Z', '2026-09-18T01:00:00Z', '2026-09-21')");
    values.push("('BAKE1', 'Baker', 'CO1', NULL, 2, 'Manila', 'Philippines', '2026-09-19T01:00:00Z', '2026-09-19T01:00:00Z', NULL)");
    values.push("('NURSE1', 'Staff Nurse', 'CO1', 5, 2, 'Quezon City', 'Philippines', '2026-09-10T01:00:00Z', '2026-09-10T01:00:00Z', NULL)");
    values.push("('NURSE2', 'Staff Nurse', 'CO1', 9, 2, 'Davao', 'Philippines', '2026-09-11T01:00:00Z', '2026-09-11T01:00:00Z', NULL)");
    values.push("('PCT1', 'Nurse 100% remote', 'CO1', NULL, 2, 'Manila', 'Philippines', '2026-09-12T01:00:00Z', '2026-09-12T01:00:00Z', NULL)");
    await db.exec('INSERT INTO gethired.jobs (job_id, job_title, company_id, job_role_id, job_status_id, job_city, job_country, created_at, updated_at, expiration_date) VALUES ' + values.join(',') + ';');

    clock = at('2026-09-22T13:00:00.000Z');
    sends = [];
    service = alerts.createJobOpeningAlertService({
      schema: 'gethired',
      appUrl: 'https://app.example',
      publicSiteUrl: 'https://gethiredonline.app',
      now: function() { return clock; },
      dryRun: false,
      query: function(text, params) { return db.query(text, params); },
      send: async function(to, template, data, options) {
        sends.push({ to: to, template: template, data: data, options: options });
        return { sent: true, messageId: 'sg-' + sends.length };
      },
    });
  });

  after(async function() {
    if (db) await db.close();
  });

  test('subscribe sends one instant email of the 10 newest matches and does not send again', async function() {
    var first = await service.subscribe({ uid: 'seeker-1', body: { position: 'Software Engineer' } });
    assert.equal(first.created, true);
    assert.equal(first.instant.sent, true);
    assert.equal(first.instant.jobCount, 10);
    assert.equal(sends.length, 1);
    assert.equal(sends[0].to, 'ana@example.com');
    assert.equal(sends[0].template, 'job_opening_alert');
    assert.equal(sends[0].options.fromEmail, 'hrmanager@gethiredonline.app');
    assert.equal(sends[0].options.fromName, 'GetHired');
    assert.equal(sends[0].data.alert_kind, 'instant');
    assert.equal(sends[0].data.first_name, 'Ana');
    assert.equal(sends[0].data.job_count, 10);
    assert.equal(sends[0].data.jobs.length, 10);
    assert.equal(sends[0].data.jobs[0].job_id, 'JOB12');
    assert.equal(sends[0].data.jobs[9].job_id, 'JOB03');
    assert.equal(sends[0].data.jobs[0].company_name, 'Acme Care');
    assert.equal(sends[0].data.jobs[0].location, 'Manila, Philippines');
    assert.equal(sends[0].data.jobs[0].job_url, 'https://gethiredonline.app/jobs/details/JOB12');
    assert.equal(sends[0].data.manage_alerts_url, 'https://gethiredonline.app/job-alerts');
    var ids = sends[0].data.jobs.map(function(j) { return j.job_id; });
    assert.equal(ids.indexOf('DRAFT1'), -1);
    assert.equal(ids.indexOf('OLD1'), -1);
    assert.equal(ids.indexOf('BAKE1'), -1);
    assert.equal(ids.indexOf('JOB01'), -1);
    assert.equal(ids.indexOf('JOB02'), -1);

    var second = await service.subscribe({ uid: 'seeker-1', body: { position: '  software   engineer ' } });
    assert.equal(second.created, false);
    assert.equal(second.instant.sent, false);
    assert.equal(second.instant.reason, 'already_sent');
    assert.equal(second.subscription.id, first.subscription.id);
    assert.equal(sends.length, 1);

    var listed = await service.list('seeker-1');
    assert.equal(listed.subscriptions.length, 1);
    assert.equal(listed.subscriptions[0].position, 'software engineer');
    assert.ok(listed.subscriptions[0].instantSentAt);
  });

  test('literal percent position does not become a wildcard', async function() {
    var result = await service.subscribe({ uid: 'seeker-2', body: { position: '100%' } });
    assert.equal(result.instant.sent, true);
    assert.equal(result.instant.jobCount, 1);
    assert.equal(sends[sends.length - 1].data.jobs[0].job_id, 'PCT1');
  });

  test('jobRoleId narrows to that option id', async function() {
    var result = await service.subscribe({
      uid: 'seeker-1',
      body: { position: 'Staff Nurse', jobRoleId: 5 },
    });
    assert.equal(result.instant.jobCount, 1);
    assert.equal(sends[sends.length - 1].data.jobs[0].job_id, 'NURSE1');
  });

  test('unknown jobRoleId is rejected and does not send', async function() {
    var before = sends.length;
    await assert.rejects(
      function() { return service.subscribe({ uid: 'seeker-1', body: { position: 'Staff Nurse', jobRoleId: 404 } }); },
      function(err) { return err.httpStatus === 400; }
    );
    assert.equal(sends.length, before);
  });

  test('weekly digest sends one email per active subscription and not a second time that week', async function() {
    var before = sends.length;
    var first = await service.runDigest({ source: 'test' });
    assert.equal(first.ran, true);
    assert.equal(first.weekKey, '2026-09-22');
    assert.equal(first.sent, 3);
    assert.equal(sends.length, before + 3);
    var digestSends = sends.slice(before);
    digestSends.forEach(function(msg) {
      assert.equal(msg.template, 'job_opening_alert');
      assert.equal(msg.data.alert_kind, 'digest');
      assert.equal(msg.data.digest_week, '2026-09-22');
      assert.ok(msg.data.jobs.length <= 10);
    });

    var again = await service.runDigest({ source: 'test' });
    assert.equal(again.sent, 0);
    assert.equal(again.skippedAlready, 3);
    assert.equal(sends.length, before + 3);
  });

  test('digest stays quiet outside the Manila window unless forced', async function() {
    clock = at('2026-09-21T13:00:00.000Z');
    var before = sends.length;
    var quiet = await service.runDigest({ source: 'test' });
    assert.equal(quiet.ran, false);
    assert.equal(quiet.reason, 'outside_window');
    assert.equal(sends.length, before);
    clock = at('2026-09-22T13:00:00.000Z');
  });

  test('unsubscribe removes the row from the list and from the next week digest', async function() {
    var listed = await service.list('seeker-2');
    assert.equal(listed.subscriptions.length, 1);
    var removed = await service.unsubscribe('seeker-2', listed.subscriptions[0].id);
    assert.equal(removed.active, false);
    assert.equal(removed.removed, true);
    var after = await service.list('seeker-2');
    assert.equal(after.subscriptions.length, 0);
    await assert.rejects(
      function() { return service.unsubscribe('seeker-1', listed.subscriptions[0].id); },
      function(err) { return err.httpStatus === 404; }
    );

    clock = at('2026-09-29T13:00:00.000Z');
    var before = sends.length;
    var nextWeek = await service.runDigest({ source: 'test' });
    assert.equal(nextWeek.weekKey, '2026-09-29');
    assert.equal(nextWeek.sent, 2);
    assert.equal(sends.length, before + 2);
    sends.slice(before).forEach(function(msg) {
      assert.equal(msg.to, 'ana@example.com');
    });
    clock = at('2026-09-22T13:00:00.000Z');
  });

  test('a failed instant does not consume the slot; the next subscribe sends once', async function() {
    var flaky = 0;
    var localSends = [];
    var flakyService = alerts.createJobOpeningAlertService({
      schema: 'gethired',
      publicSiteUrl: 'https://gethiredonline.app',
      now: function() { return at('2026-09-22T13:00:00.000Z'); },
      query: function(text, params) { return db.query(text, params); },
      send: async function(to, template, data, options) {
        flaky += 1;
        if (flaky === 1) return { sent: false, reason: 'no_template' };
        localSends.push({ to: to, template: template, data: data, options: options });
        return { sent: true, messageId: 'ok-1' };
      },
    });
    var first = await flakyService.subscribe({ uid: 'seeker-2', body: { position: 'Baker' } });
    assert.equal(first.created, true);
    assert.equal(first.instant.sent, false);
    assert.equal(first.instant.reason, 'no_template');
    assert.equal(first.subscription.instantSentAt, null);
    var second = await flakyService.subscribe({ uid: 'seeker-2', body: { position: 'Baker' } });
    assert.equal(second.created, false);
    assert.equal(second.instant.sent, true);
    assert.equal(second.instant.jobCount, 1);
    assert.equal(localSends.length, 1);
    assert.equal(localSends[0].data.jobs[0].job_id, 'BAKE1');
    var third = await flakyService.subscribe({ uid: 'seeker-2', body: { position: 'Baker' } });
    assert.equal(third.instant.reason, 'already_sent');
    assert.equal(localSends.length, 1);
  });

  test('zero current matches consume the instant slot without an email', async function() {
    var localSends = [];
    var local = alerts.createJobOpeningAlertService({
      schema: 'gethired',
      publicSiteUrl: 'https://gethiredonline.app',
      now: function() { return at('2026-09-22T13:00:00.000Z'); },
      query: function(text, params) { return db.query(text, params); },
      send: async function() { localSends.push(1); return { sent: true, messageId: 'x' }; },
    });
    var result = await local.subscribe({ uid: 'seeker-2', body: { position: 'Astronaut' } });
    assert.equal(result.instant.sent, false);
    assert.equal(result.instant.reason, 'no_matches');
    assert.equal(localSends.length, 0);
    assert.ok(result.subscription.instantSentAt);
    var again = await local.subscribe({ uid: 'seeker-2', body: { position: 'Astronaut' } });
    assert.equal(again.instant.reason, 'already_sent');
    assert.equal(localSends.length, 0);
  });

  test('digest send failure releases the week so a later run can send', async function() {
    await db.query(
      "UPDATE gethired.job_opening_alert_subscriptions SET last_digest_week = NULL, last_digest_sent_at = NULL WHERE user_uid = 'seeker-2' AND position_normalized = 'baker'"
    );
    var bakerFailed = false;
    var local = alerts.createJobOpeningAlertService({
      schema: 'gethired',
      publicSiteUrl: 'https://gethiredonline.app',
      now: function() { return at('2026-10-06T13:00:00.000Z'); },
      query: function(text, params) { return db.query(text, params); },
      send: async function(to, template, data) {
        if (data.position === 'Baker' && !bakerFailed) {
          bakerFailed = true;
          return { sent: false, reason: 'no_template' };
        }
        return { sent: true, messageId: 'dg-ok' };
      },
    });
    var first = await local.runDigest({ source: 'retry' });
    assert.equal(first.failed >= 1, true);
    var second = await local.runDigest({ source: 'retry' });
    assert.equal(second.sent >= 1, true);
    var row = await db.query(
      "SELECT last_digest_week, last_digest_sent_at FROM gethired.job_opening_alert_subscriptions WHERE user_uid = 'seeker-2' AND position_normalized = 'baker'"
    );
    assert.equal(row.rows[0].last_digest_week, '2026-10-06');
    assert.ok(row.rows[0].last_digest_sent_at);
  });
});

describe('job opening alert HTTP', function() {
  var db;
  var server;
  var base;
  var sends;

  before(async function() {
    db = new PGlite();
    await db.exec('CREATE SCHEMA IF NOT EXISTS gethired;');
    await db.exec(fs.readFileSync(path.join(__dirname, '../db/20260923_job_opening_alert_subscriptions.sql'), 'utf8'));
    await db.exec(`
      CREATE TABLE gethired.companies (company_id varchar PRIMARY KEY, company_name varchar);
      CREATE TABLE gethired.jobs (
        job_id varchar PRIMARY KEY, job_title varchar NOT NULL, company_id varchar,
        job_role_id integer, job_status_id integer, job_city varchar, job_country varchar,
        created_at timestamptz, updated_at timestamptz, expiration_date date
      );
      CREATE TABLE gethired.users (uid varchar PRIMARY KEY, firstname varchar);
      CREATE TABLE gethired.user_credentials (uid varchar PRIMARY KEY, email varchar, is_archive boolean DEFAULT false);
      INSERT INTO gethired.companies VALUES ('CO1', 'Acme');
      INSERT INTO gethired.users VALUES ('seeker-1', 'Ana');
      INSERT INTO gethired.user_credentials VALUES ('seeker-1', 'ana@example.com', false);
      INSERT INTO gethired.jobs VALUES ('J1', 'Accountant', 'CO1', NULL, 2, 'Manila', 'Philippines', '2026-09-01', '2026-09-02', NULL);
    `);
    sends = [];
    var service = alerts.createJobOpeningAlertService({
      schema: 'gethired',
      publicSiteUrl: 'https://gethiredonline.app',
      now: function() { return at('2026-09-22T13:00:00.000Z'); },
      query: function(text, params) { return db.query(text, params); },
      send: async function(to, template, data) {
        sends.push({ to: to, template: template, data: data });
        return { sent: true, messageId: 'http-1' };
      },
    });
    var handlers = alerts.createJobOpeningAlertHttp(service, present, { cronSecret: 'cron-test-secret' });
    var auth = function(req, res, next) {
      if (!req.headers['x-test-uid']) return res.status(401).json(present.errorResponse('Unauthorized'));
      req.user = { uid: req.headers['x-test-uid'] };
      next();
    };
    var app = express();
    app.use(express.json());
    var router = express.Router();
    alerts.mountJobOpeningAlertRoutes(router, handlers, auth);
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise(function(resolve) { server.on('listening', resolve); });
    base = 'http://127.0.0.1:' + server.address().port;
  });

  after(async function() {
    if (server) await new Promise(function(resolve) { server.close(resolve); });
    if (db) await db.close();
  });

  function request(method, urlPath, uid, body, headers) {
    var extra = headers || {};
    if (uid) extra['x-test-uid'] = uid;
    return fetch(base + urlPath, {
      method: method,
      headers: Object.assign({ 'content-type': 'application/json' }, extra),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  test('requires a logged-in user and returns the subscription contract', async function() {
    var anon = await request('GET', '/api/job-opening-alerts');
    assert.equal(anon.status, 401);

    var created = await request('POST', '/api/job-opening-alerts', 'seeker-1', { position: 'Accountant' });
    assert.equal(created.status, 201);
    var createdBody = await created.json();
    assert.equal(createdBody.status, 'success');
    assert.equal(createdBody.data.created, true);
    assert.equal(createdBody.data.instant.sent, true);
    assert.equal(createdBody.data.instant.jobCount, 1);
    assert.equal(sends.length, 1);

    var again = await request('POST', '/api/job-opening-alerts', 'seeker-1', { position: 'accountant' });
    assert.equal(again.status, 200);
    var againBody = await again.json();
    assert.equal(againBody.data.created, false);
    assert.equal(againBody.data.instant.reason, 'already_sent');
    assert.equal(sends.length, 1);

    var list = await request('GET', '/api/job-opening-alerts', 'seeker-1');
    var listBody = await list.json();
    assert.equal(list.status, 200);
    assert.equal(listBody.data.subscriptions.length, 1);
    var id = listBody.data.subscriptions[0].id;

    var missing = await request('DELETE', '/api/job-opening-alerts/' + id, 'seeker-2');
    assert.equal(missing.status, 404);

    var removed = await request('DELETE', '/api/job-opening-alerts/' + id, 'seeker-1');
    assert.equal(removed.status, 200);
    var removedBody = await removed.json();
    assert.equal(removedBody.data.active, false);
  });

  test('digest endpoint is closed without the cron secret and runs with it', async function() {
    var open = alerts.createJobOpeningAlertHttp(
      { runDigest: async function() { throw new Error('should not run'); } },
      present,
      { cronSecret: '' }
    );
    var closedApp = express();
    closedApp.use(express.json());
    closedApp.post('/api/internal/job-opening-alerts/digest', open.digest);
    var closedServer = closedApp.listen(0, '127.0.0.1');
    await new Promise(function(resolve) { closedServer.on('listening', resolve); });
    var closedBase = 'http://127.0.0.1:' + closedServer.address().port;
    try {
      var unconfigured = await fetch(closedBase + '/api/internal/job-opening-alerts/digest', { method: 'POST' });
      assert.equal(unconfigured.status, 503);
    } finally {
      await new Promise(function(resolve) { closedServer.close(resolve); });
    }

    var denied = await request('POST', '/api/internal/job-opening-alerts/digest', null, { force: true }, {
      'x-job-opening-alert-cron': 'nope',
    });
    assert.equal(denied.status, 401);

    var allowed = await request('POST', '/api/internal/job-opening-alerts/digest', null, { force: true }, {
      'x-job-opening-alert-cron': 'cron-test-secret',
    });
    assert.equal(allowed.status, 200);
    var body = await allowed.json();
    assert.equal(body.status, 'success');
    assert.equal(body.data.ran, true);
    assert.equal(body.data.weekKey, '2026-09-22');
  });
});
