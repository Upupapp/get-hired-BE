/**
 * Daily product metrics for the Emailer digest.
 *
 * Day windows come only from helpers/adminScreens.js parseAdminRange
 * (Asia/Manila, half-open [fromAt, toAt)). This module does not compute
 * its own midnight.
 *
 * Revenue is the Finance figure: loadPayments + assembleFinance
 * revenue_in_range_php (succeeded payments only, ledger then orphan
 * attempts then invoices, deduped). Month-to-date is Manila month start
 * through the selected day's day_end.
 *
 * Product locks (2026-09-25):
 * - default day is yesterday Manila; ?day=today and ?day=YYYY-MM-DD for ops
 * - employers / jobseekers are role 2 / role 3 users with is_archive = false
 * - new jobs are jobs.created_at in the day, all statuses; live is job_status_id = 2
 * - JOA counts are subscription rows; new is created_at, not distinct users
 * - LGUIDS companies and jobs stay in the totals
 * - applications count every job_applicants row (no is_archived filter)
 *
 * ESM-safe: no optional chaining and no nullish coalescing.
 */

import { parseAdminRange, parseYmd, addCalendarDays, ymd, assembleFinance, isMissingSchemaObject } from "../helpers/adminScreens";
import { secretsMatch } from "./jobOpeningAlerts.cjs";

var TIMEZONE = "Asia/Manila";
var MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
var DAY_ERROR = "day must be YYYY-MM-DD, today, or yesterday.";
var FORMAT_ERROR = "format must be json or csv.";

var CSV_COLUMNS = [
  "day",
  "timezone",
  "generated_at",
  "revenue_php_day",
  "revenue_php_mtd",
  "live_jobs",
  "new_jobs_day",
  "employers_total",
  "new_employers_day",
  "jobseekers_total",
  "new_jobseekers_day",
  "joa_subscribers_active",
  "joa_subscribers_new_day",
  "joa_available",
  "applications_total",
  "applications_day",
  "companies_total",
];

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function asInt(value) {
  var n = parseInt(value, 10);
  return isFinite(n) ? n : 0;
}

function httpError(code, message) {
  var err = new Error(message);
  err.httpStatus = code;
  return err;
}

function formatManilaTimestamp(date) {
  var shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return shifted.getUTCFullYear()
    + "-" + pad2(shifted.getUTCMonth() + 1)
    + "-" + pad2(shifted.getUTCDate())
    + "T" + pad2(shifted.getUTCHours())
    + ":" + pad2(shifted.getUTCMinutes())
    + ":" + pad2(shifted.getUTCSeconds())
    + "+08:00";
}

function clockOrNow(now) {
  return now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
}

function singleDayRange(text, now) {
  return parseAdminRange({ range: "custom", from: text, to: text }, now);
}

/**
 * Resolve the Manila calendar day for the digest.
 * Omitted day and "yesterday" are the previous Manila date.
 * The returned range is one calendar day: [midnight, next midnight).
 */
function resolveMetricsDay(query, now) {
  var source = query || {};
  var raw = source.day === undefined || source.day === null ? "" : String(source.day).trim().toLowerCase();
  var clock = clockOrNow(now);

  if (!raw || raw === "yesterday") {
    var today = parseAdminRange({ range: "today" }, clock);
    var parts = parseYmd(today.from);
    if (!parts) return { error: DAY_ERROR };
    var prev = addCalendarDays(parts, -1);
    return singleDayRange(ymd(prev.y, prev.m, prev.d), clock);
  }
  if (raw === "today") {
    return parseAdminRange({ range: "today" }, clock);
  }
  var range = singleDayRange(raw, clock);
  if (range.error) return { error: DAY_ERROR };
  return range;
}

/** Manila month start through the selected day's exclusive end. */
function monthToDateRange(dayRange, now) {
  var parts = parseYmd(dayRange && dayRange.from);
  if (!parts) return { error: DAY_ERROR };
  var from = ymd(parts.y, parts.m, 1);
  var range = parseAdminRange({ range: "custom", from: from, to: dayRange.to }, now);
  if (range.error) return { error: DAY_ERROR };
  return range;
}

function assertSchema(schemaName) {
  if (typeof schemaName !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
    throw new Error("Invalid database schema");
  }
  return schemaName;
}

function countsSql(schemaName) {
  return "SELECT"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".jobs WHERE job_status_id = 2) AS live_jobs,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".jobs WHERE created_at >= $1 AND created_at < $2) AS new_jobs_day,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".user_credentials WHERE role = 2 AND is_archive = false) AS employers_total,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".user_credentials WHERE role = 2 AND is_archive = false AND created_date >= $1 AND created_date < $2) AS new_employers_day,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".user_credentials WHERE role = 3 AND is_archive = false) AS jobseekers_total,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".user_credentials WHERE role = 3 AND is_archive = false AND created_date >= $1 AND created_date < $2) AS new_jobseekers_day,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".job_applicants) AS applications_total,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".job_applicants WHERE date_applied >= $1 AND date_applied < $2) AS applications_day,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".companies) AS companies_total";
}

function joaSql(schemaName) {
  return "SELECT"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".job_opening_alert_subscriptions WHERE active = true) AS joa_subscribers_active,"
    + " (SELECT COUNT(*)::int FROM " + schemaName + ".job_opening_alert_subscriptions WHERE created_at >= $1 AND created_at < $2) AS joa_subscribers_new_day";
}

function parseFormat(query) {
  var source = query || {};
  var raw = source.format === undefined || source.format === null ? "" : String(source.format).trim().toLowerCase();
  if (!raw || raw === "json") return { value: "json" };
  if (raw === "csv") return { value: "csv" };
  return { error: FORMAT_ERROR };
}

function csvCell(value) {
  var text;
  if (value === true) text = "true";
  else if (value === false) text = "false";
  else if (value === undefined || value === null) text = "";
  else text = String(value);
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function toCsv(row) {
  var header = CSV_COLUMNS.join(",");
  var values = [];
  var i;
  for (i = 0; i < CSV_COLUMNS.length; i++) {
    values.push(csvCell(row[CSV_COLUMNS[i]]));
  }
  return header + "\n" + values.join(",") + "\n";
}

function revenueOf(payments, range) {
  return assembleFinance([], payments, range, {}).revenue_in_range_php;
}

function createDailyProductMetricsService(deps) {
  var options = deps || {};
  var query = options.query;
  var loadPayments = options.loadPayments;

  async function loadJoa(schemaName, bounds) {
    try {
      var result = await query(joaSql(schemaName), bounds);
      var row = (result && result.rows && result.rows[0]) || {};
      return {
        joa_subscribers_active: asInt(row.joa_subscribers_active),
        joa_subscribers_new_day: asInt(row.joa_subscribers_new_day),
        joa_available: true,
      };
    } catch (error) {
      if (isMissingSchemaObject(error)) {
        console.warn("[dailyProductMetrics] job_opening_alert_subscriptions unavailable");
        return {
          joa_subscribers_active: 0,
          joa_subscribers_new_day: 0,
          joa_available: false,
        };
      }
      throw error;
    }
  }

  async function collect(queryParams, now) {
    var clock = clockOrNow(now);
    var dayRange = resolveMetricsDay(queryParams, clock);
    if (dayRange.error) throw httpError(400, dayRange.error);
    var mtdRange = monthToDateRange(dayRange, clock);
    if (mtdRange.error) throw httpError(400, mtdRange.error);
    var schemaName = assertSchema(options.schema);
    var bounds = [dayRange.fromAt, dayRange.toAt];

    var loaded = await Promise.all([
      query(countsSql(schemaName), bounds),
      loadJoa(schemaName, bounds),
      loadPayments(schemaName, dayRange, null),
      loadPayments(schemaName, mtdRange, null),
    ]);

    var countRow = (loaded[0] && loaded[0].rows && loaded[0].rows[0]) || {};
    var joa = loaded[1];
    return {
      day: dayRange.from,
      timezone: TIMEZONE,
      generated_at: formatManilaTimestamp(clock),
      revenue_php_day: revenueOf(loaded[2], dayRange),
      revenue_php_mtd: revenueOf(loaded[3], mtdRange),
      live_jobs: asInt(countRow.live_jobs),
      new_jobs_day: asInt(countRow.new_jobs_day),
      employers_total: asInt(countRow.employers_total),
      new_employers_day: asInt(countRow.new_employers_day),
      jobseekers_total: asInt(countRow.jobseekers_total),
      new_jobseekers_day: asInt(countRow.new_jobseekers_day),
      joa_subscribers_active: joa.joa_subscribers_active,
      joa_subscribers_new_day: joa.joa_subscribers_new_day,
      joa_available: joa.joa_available,
      applications_total: asInt(countRow.applications_total),
      applications_day: asInt(countRow.applications_day),
      companies_total: asInt(countRow.companies_total),
    };
  }

  return { collect: collect };
}

function createDailyProductMetricsHttp(service, present, deps) {
  if (!present || typeof present.errorResponse !== "function" || !present.status) {
    throw new Error("daily product metrics http requires present helpers");
  }
  var status = present.status;

  function cronSecret() {
    if (deps && Object.prototype.hasOwnProperty.call(deps, "cronSecret")) {
      return deps.cronSecret || "";
    }
    return process.env.DAILY_METRICS_CRON_SECRET || "";
  }

  function sendError(res, err) {
    var code = err && err.httpStatus ? err.httpStatus : status.error;
    if (code >= 500) {
      console.error("[dailyProductMetrics]", err && err.message ? String(err.message).substring(0, 200) : "");
    }
    var message;
    if (code >= 500) message = "Operation not successful. Please try again.";
    else message = err && err.message ? err.message : "Operation not successful. Please try again.";
    return res.status(code).json(present.errorResponse(message));
  }

  async function getMetrics(req, res) {
    var expected = cronSecret();
    if (!expected) {
      return res.status(503).json(present.errorResponse("Daily product metrics are not configured."));
    }
    var provided = req.get ? (req.get("x-daily-metrics-cron") || "") : "";
    if (!secretsMatch(String(provided), String(expected))) {
      return res.status(status.unauthorized).json(present.errorResponse("Unauthorized"));
    }

    var format = parseFormat(req.query);
    if (format.error) {
      return res.status(status.bad).json(present.errorResponse(format.error));
    }

    try {
      var clock = deps && typeof deps.now === "function" ? deps.now() : new Date();
      var data = await service.collect(req.query || {}, clock);
      if (format.value === "csv") {
        res.set("Content-Type", "text/csv; charset=utf-8");
        return res.status(status.success).send(toCsv(data));
      }
      return res.status(status.success).json(data);
    } catch (err) {
      return sendError(res, err);
    }
  }

  return { getMetrics: getMetrics };
}

export {
  resolveMetricsDay,
  monthToDateRange,
  toCsv,
  createDailyProductMetricsService,
  createDailyProductMetricsHttp,
};
