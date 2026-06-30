/**
 * Recruiter Dashboard Analytics Service V1
 *
 * Company-scoped, range-filtered analytics for employer dashboard.
 * Node 14 ESM safe: no ?., no ??, uses &&, ternaries, and explicit defaults.
 */

import dbQuery from '../db/dbQuery';
import env from '../env';

var dbSchema = env.schema;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeInt(val) {
  var n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function safeFloat(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse a range key ('7d' | '30d' | '90d') into ISO date boundaries.
 * Returns current period and previous period for comparison.
 */
function parseDateRange(rangeKey) {
  var key = (rangeKey === '7d' || rangeKey === '30d' || rangeKey === '90d') ? rangeKey : '30d';
  var days = key === '7d' ? 7 : key === '90d' ? 90 : 30;

  var endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  var startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  var prevEnd = new Date(startDate.getTime() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  var prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
  prevStart.setHours(0, 0, 0, 0);

  return {
    key: key,
    days: days,
    label: 'Last ' + days + ' days',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: prevEnd.toISOString(),
  };
}

/**
 * Build a zero-filled daily series for every date in the range.
 * Merges actual view and application rows into the series.
 */
function buildDateSeries(startDate, endDate, viewsRows, appsRows) {
  var viewsMap = {};
  var appsMap = {};

  for (var i = 0; i < viewsRows.length; i++) {
    var vrow = viewsRows[i];
    var vkey = vrow.date ? String(vrow.date).substring(0, 10) : null;
    if (vkey) { viewsMap[vkey] = safeInt(vrow.count); }
  }
  for (var j = 0; j < appsRows.length; j++) {
    var arow = appsRows[j];
    var akey = arow.date ? String(arow.date).substring(0, 10) : null;
    if (akey) { appsMap[akey] = safeInt(arow.count); }
  }

  var series = [];
  var current = new Date(startDate);
  var end = new Date(endDate);
  while (current <= end) {
    var dateStr = current.toISOString().substring(0, 10);
    series.push({
      date: dateStr,
      views: viewsMap[dateStr] || 0,
      applications: appsMap[dateStr] || 0,
    });
    current.setDate(current.getDate() + 1);
  }
  return series;
}

/**
 * Build trend comparison between current and previous period.
 */
function buildTrend(current, previous) {
  if (previous === 0 && current === 0) {
    return { delta: null, trend: 'flat', deltaLabel: null };
  }
  if (previous === 0) {
    return { delta: null, trend: 'up', deltaLabel: '+new' };
  }
  var pct = ((current - previous) / previous) * 100;
  var rounded = Math.round(pct * 10) / 10;
  return {
    delta: rounded,
    trend: current > previous ? 'up' : current < previous ? 'down' : 'flat',
    deltaLabel: (rounded >= 0 ? '+' : '') + rounded + '%',
  };
}

/**
 * Build conversion rate safely — never returns NaN, Infinity, or misleading %.
 */
function buildConversionRate(views, applications) {
  if (views === 0 && applications === 0) {
    return { value: null, label: '—', state: 'no_activity' };
  }
  if (views === 0) {
    return { value: null, label: '—', state: 'no_views' };
  }
  if (applications === 0) {
    return { value: 0, label: '0%', state: 'no_applications' };
  }
  var rate = (applications / views) * 100;
  var rounded = Math.round(rate * 10) / 10;
  return { value: rounded, label: rounded + '%', state: 'valid' };
}

/**
 * Generate insight copy based on current metrics.
 * No fake benchmarks or forecasts — only states what data actually shows.
 */
function buildInsight(views, applications, activeJobs, conversionRate) {
  if (activeJobs === 0) {
    return {
      severity: 'empty',
      title: 'No active jobs',
      body: 'Post a job to start tracking views and applications.',
    };
  }
  if (views === 0 && applications === 0) {
    return {
      severity: 'info',
      title: 'No job views yet',
      body: 'Your job is live. Share the public job link or improve the job post to help candidates discover it.',
    };
  }
  if (views > 0 && applications === 0) {
    return {
      severity: 'warn',
      title: 'Views are starting — no applications yet',
      body: 'Candidates are seeing your job but no one has applied yet. Consider adding salary, clearer requirements, or job badges.',
    };
  }
  var rate = conversionRate && conversionRate.value !== null ? conversionRate.value : 0;
  if (rate >= 10) {
    return {
      severity: 'good',
      title: 'Strong conversion',
      body: views + ' views · ' + applications + ' application' + (applications === 1 ? '' : 's') + ' · ' + conversionRate.label + ' conversion. Keep up the momentum.',
    };
  }
  if (rate >= 3) {
    return {
      severity: 'info',
      title: 'Healthy activity',
      body: views + ' views · ' + applications + ' application' + (applications === 1 ? '' : 's') + ' · ' + conversionRate.label + ' conversion.',
    };
  }
  return {
    severity: 'warn',
    title: 'Low conversion rate',
    body: 'You have views but few applications. Improving job details, salary transparency, or company profile often increases applications.',
  };
}

/**
 * Build next-best-action per job based on its current analytics.
 */
function buildNextAction(views, applications, newApplicants, jobId) {
  if (newApplicants > 0) {
    return {
      label: 'Review applicants',
      url: '/recruiter/jobs/applicants?id=' + jobId,
      reason: newApplicants + ' applicant' + (newApplicants === 1 ? '' : 's') + ' waiting for review.',
    };
  }
  if (applications > 0) {
    return {
      label: 'View applicants',
      url: '/recruiter/jobs/applicants?id=' + jobId,
      reason: 'See all applicants for this job.',
    };
  }
  if (views > 0) {
    return {
      label: 'Improve job post',
      url: '/recruiter/jobs/edit/' + jobId,
      reason: 'Views are not converting into applications.',
    };
  }
  return {
    label: 'Share job post',
    url: '/recruiter/jobs/edit/' + jobId,
    reason: 'No views yet. Share the public job link to attract candidates.',
  };
}

// ---------------------------------------------------------------------------
// Main analytics function
// ---------------------------------------------------------------------------

/**
 * getAnalytics — main entry point.
 *
 * @param {string} companyId
 * @param {string} rangeKey — '7d' | '30d' | '90d'
 * @returns {Promise<object>} analytics DTO
 */
export async function getAnalytics(companyId, rangeKey) {
  var range = parseDateRange(rangeKey);

  // ── Current period: views per day ─────────────────────────────────────────
  var viewsSeriesQuery =
    'SELECT DATE(l.date_of_activity) as date, count(l.activity_id) as count ' +
    'FROM ' + dbSchema + '.logs l ' +
    'LEFT JOIN ' + dbSchema + '.jobs j ON j.job_id = l.activity_id ' +
    'WHERE j.company_id = $1 AND l.activity_name = \'Job View\' ' +
    'AND l.date_of_activity >= $2 AND l.date_of_activity <= $3 ' +
    'GROUP BY DATE(l.date_of_activity) ' +
    'ORDER BY DATE(l.date_of_activity)';

  // ── Current period: applications per day ─────────────────────────────────
  var appsSeriesQuery =
    'SELECT DATE(a.date_applied) as date, count(a.job_application_id) as count ' +
    'FROM ' + dbSchema + '.job_applicants a ' +
    'JOIN ' + dbSchema + '.jobs j ON j.job_id = a.job_id ' +
    'WHERE j.company_id = $1 ' +
    'AND a.date_applied >= $2 AND a.date_applied <= $3 ' +
    'AND a.date_applied IS NOT NULL ' +
    'AND (a.is_archived IS NULL OR a.is_archived = false) ' +
    'GROUP BY DATE(a.date_applied) ' +
    'ORDER BY DATE(a.date_applied)';

  // ── Previous period: totals for comparison ────────────────────────────────
  var prevViewsTotalQuery =
    'SELECT count(l.activity_id) as count ' +
    'FROM ' + dbSchema + '.logs l ' +
    'LEFT JOIN ' + dbSchema + '.jobs j ON j.job_id = l.activity_id ' +
    'WHERE j.company_id = $1 AND l.activity_name = \'Job View\' ' +
    'AND l.date_of_activity >= $2 AND l.date_of_activity <= $3';

  var prevAppsTotalQuery =
    'SELECT count(a.job_application_id) as count ' +
    'FROM ' + dbSchema + '.job_applicants a ' +
    'JOIN ' + dbSchema + '.jobs j ON j.job_id = a.job_id ' +
    'WHERE j.company_id = $1 ' +
    'AND a.date_applied >= $2 AND a.date_applied <= $3 ' +
    'AND a.date_applied IS NOT NULL ' +
    'AND (a.is_archived IS NULL OR a.is_archived = false)';

  // ── Active jobs count ─────────────────────────────────────────────────────
  var activeJobsQuery =
    'SELECT count(job_id) as count FROM ' + dbSchema + '.jobs ' +
    'WHERE company_id = $1 AND job_status_id = \'2\'';

  // ── Per-job performance ───────────────────────────────────────────────────
  // Get top 5 jobs by applications then views. Includes published and draft.
  var jobPerfQuery =
    'SELECT j.job_id, j.job_title, j.job_status_id, j.created_at, ' +
    'COALESCE(v.view_count, 0) as views, ' +
    'COALESCE(a.app_count, 0) as applications, ' +
    'COALESCE(nr.needs_review_count, 0) as needs_review ' +
    'FROM ' + dbSchema + '.jobs j ' +
    'LEFT JOIN ( ' +
      'SELECT l.activity_id as job_id, count(l.activity_id) as view_count ' +
      'FROM ' + dbSchema + '.logs l ' +
      'WHERE l.activity_name = \'Job View\' ' +
      'AND l.date_of_activity >= $2 AND l.date_of_activity <= $3 ' +
      'GROUP BY l.activity_id ' +
    ') v ON v.job_id = j.job_id ' +
    'LEFT JOIN ( ' +
      'SELECT a2.job_id, count(a2.job_application_id) as app_count ' +
      'FROM ' + dbSchema + '.job_applicants a2 ' +
      'WHERE a2.date_applied >= $2 AND a2.date_applied <= $3 ' +
      'AND a2.date_applied IS NOT NULL ' +
      'AND (a2.is_archived IS NULL OR a2.is_archived = false) ' +
      'GROUP BY a2.job_id ' +
    ') a ON a.job_id = j.job_id ' +
    'LEFT JOIN ( ' +
      'SELECT a3.job_id, count(a3.job_application_id) as needs_review_count ' +
      'FROM ' + dbSchema + '.job_applicants a3 ' +
      'WHERE a3.application_status_id IN (1, 3) ' +
      'AND (a3.is_archived IS NULL OR a3.is_archived = false) ' +
      'GROUP BY a3.job_id ' +
    ') nr ON nr.job_id = j.job_id ' +
    'WHERE j.company_id = $1 AND j.job_status_id IN (\'1\', \'2\') ' +
    'ORDER BY COALESCE(a.app_count, 0) DESC, COALESCE(v.view_count, 0) DESC, j.created_at DESC ' +
    'LIMIT 5';

  try {
    var results = await Promise.all([
      dbQuery.query(viewsSeriesQuery, [companyId, range.startDate, range.endDate]),
      dbQuery.query(appsSeriesQuery, [companyId, range.startDate, range.endDate]),
      dbQuery.query(prevViewsTotalQuery, [companyId, range.prevStart, range.prevEnd]),
      dbQuery.query(prevAppsTotalQuery, [companyId, range.prevStart, range.prevEnd]),
      dbQuery.query(activeJobsQuery, [companyId]),
      dbQuery.query(jobPerfQuery, [companyId, range.startDate, range.endDate]),
    ]);

    var viewsRows = results[0].rows;
    var appsRows = results[1].rows;
    var prevViewsRows = results[2].rows;
    var prevAppsRows = results[3].rows;
    var activeJobsRows = results[4].rows;
    var jobPerfRows = results[5].rows;

    // Compute totals
    var totalViews = 0;
    for (var i = 0; i < viewsRows.length; i++) {
      totalViews += safeInt(viewsRows[i].count);
    }
    var totalApps = 0;
    for (var j = 0; j < appsRows.length; j++) {
      totalApps += safeInt(appsRows[j].count);
    }
    var prevViews = prevViewsRows[0] ? safeInt(prevViewsRows[0].count) : 0;
    var prevApps = prevAppsRows[0] ? safeInt(prevAppsRows[0].count) : 0;
    var activeJobs = activeJobsRows[0] ? safeInt(activeJobsRows[0].count) : 0;

    var series = buildDateSeries(range.startDate, range.endDate, viewsRows, appsRows);
    var viewsTrend = buildTrend(totalViews, prevViews);
    var appsTrend = buildTrend(totalApps, prevApps);
    var conversion = buildConversionRate(totalViews, totalApps);
    var insight = buildInsight(totalViews, totalApps, activeJobs, conversion);

    var jobPerformance = (jobPerfRows || []).map(function(r) {
      var views = safeInt(r.views);
      var apps = safeInt(r.applications);
      var newApp = safeInt(r.needs_review);
      var conv = buildConversionRate(views, apps);
      return {
        jobId: r.job_id,
        title: r.job_title || 'Untitled job',
        status: r.job_status_id === '2' ? 'Published' : 'Draft',
        views: views,
        applications: apps,
        conversionRate: conv.label,
        newApplicants: newApp,
        nextAction: buildNextAction(views, apps, newApp, r.job_id),
      };
    });

    return {
      range: {
        key: range.key,
        start: range.startDate,
        end: range.endDate,
        label: range.label,
      },
      summary: {
        views: {
          value: totalViews,
          previousValue: prevViews,
          delta: viewsTrend.delta,
          deltaLabel: viewsTrend.deltaLabel,
          trend: viewsTrend.trend,
        },
        applications: {
          value: totalApps,
          previousValue: prevApps,
          delta: appsTrend.delta,
          deltaLabel: appsTrend.deltaLabel,
          trend: appsTrend.trend,
        },
        conversionRate: conversion,
        activeJobs: { value: activeJobs },
      },
      series: series,
      insight: insight,
      jobPerformance: jobPerformance,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };
  } catch (err) {
    throw err;
  }
}
