/**
 * Pure helpers for the admin screens endpoints.
 *
 * Timezone for Today and custom bounds is Asia/Manila (UTC+8, no DST).
 * Rolling 7d / 30d are exact hour windows ending at the request clock.
 *
 * Plan prices and caps are copied from services/planCatalogServiceV4.js.
 * Growth in that catalog is 15 active jobs / 5 admin users / 100 video
 * responses. The older billing row pricing_2026_09_21:growth stored
 * jobs 6 / users 3 / video 100; a company's effective_entitlements win
 * when present. Admin plan_label for slug business is "Business"
 * (addendum). The catalog product name for that slug is "Premium".
 *
 * Visits are pageview row counts from gethired.site_pageviews
 * (visits_metric_label "Pageviews"). They are not unique sessions.
 * If that table is missing, the dashboard keeps zeros and the label
 * "Site visits not collected".
 *
 * ESM-safe: no optional chaining and no nullish coalescing.
 */

var MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
var DAY_MS = 24 * 60 * 60 * 1000;
var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var MAX_RANGE_DAYS = 366;

var VISITS_METRIC_LABEL = "Site visits not collected";
var PAGEVIEWS_METRIC_LABEL = "Pageviews";
var MRR_NOTE = "Current monthly recurring (snapshot)";
var PLAN_BREAKDOWN_NOTE = "Share of companies with a plan row";

var PLAN_ORDER = ["free_trial", "starter", "growth", "business", "other"];

var PLAN_FACTS = {
  free_trial: { label: "Free Trial", monthly: 0, annualMonthly: 0, jobs: 1, admins: 1, videos: 5 },
  starter: { label: "Starter", monthly: 1490, annualMonthly: 1242, jobs: 5, admins: 2, videos: 25 },
  growth: { label: "Growth", monthly: 3490, annualMonthly: 2908, jobs: 15, admins: 5, videos: 100 },
  business: { label: "Business", monthly: 5990, annualMonthly: 4992, jobs: 40, admins: 15, videos: 400 },
  other: { label: "Other", monthly: 0, annualMonthly: 0, jobs: null, admins: null, videos: null },
};

var SLUG_ALIASES = {
  premium: "business",
  enterprise: "other",
  none: "other",
};

var ID_SLUGS = {
  1: "free_trial",
  2: "starter",
  3: "growth",
  4: "business",
  5: "other",
};

var SUBSCRIPTION_STATUSES = {
  trialing: true,
  active: true,
  past_due: true,
  grace: true,
  expired: true,
  none: true,
};

var PAYMENT_STATUSES = {
  succeeded: true,
  failed: true,
  pending: true,
  refunded: true,
};

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function ymd(y, m, d) {
  return y + "-" + pad2(m) + "-" + pad2(d);
}

function manilaYmd(date) {
  var shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function manilaMidnightUtc(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - MANILA_OFFSET_MS);
}

function parseYmd(text) {
  if (text === undefined || text === null) return null;
  var match = DATE_RE.exec(String(text).trim());
  if (!match) return null;
  var y = parseInt(match[1], 10);
  var m = parseInt(match[2], 10);
  var d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  var check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return { y: y, m: m, d: d };
}

function addCalendarDays(parts, delta) {
  var utc = Date.UTC(parts.y, parts.m - 1, parts.d) + delta * DAY_MS;
  var dt = new Date(utc);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

function finishRange(rangeKey, fromDate, toDate) {
  var fromParts = manilaYmd(fromDate);
  var lastIncluded = new Date(toDate.getTime() - 1);
  var toParts = manilaYmd(lastIncluded);
  var duration = toDate.getTime() - fromDate.getTime();
  var previousFrom = new Date(fromDate.getTime() - duration);
  var series = [];
  var cursor = { y: fromParts.y, m: fromParts.m, d: fromParts.d };
  var endText = ymd(toParts.y, toParts.m, toParts.d);
  var guard = 0;
  while (guard < MAX_RANGE_DAYS + 2) {
    var text = ymd(cursor.y, cursor.m, cursor.d);
    series.push(text);
    if (text === endText) break;
    cursor = addCalendarDays(cursor, 1);
    guard += 1;
  }
  return {
    range: rangeKey,
    from: ymd(fromParts.y, fromParts.m, fromParts.d),
    to: endText,
    fromAt: fromDate.toISOString(),
    toAt: toDate.toISOString(),
    previousFromAt: previousFrom.toISOString(),
    previousToAt: fromDate.toISOString(),
    seriesDates: series,
  };
}

function parseAdminRange(query, now) {
  var source = query || {};
  var rangeRaw = source.range === undefined || source.range === null ? "" : String(source.range).trim().toLowerCase();
  var fromRaw = source.from === undefined || source.from === null ? "" : String(source.from).trim();
  var toRaw = source.to === undefined || source.to === null ? "" : String(source.to).trim();
  var clock = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();

  if (rangeRaw && rangeRaw !== "today" && rangeRaw !== "7d" && rangeRaw !== "30d" && rangeRaw !== "custom") {
    return { error: "range must be today, 7d, 30d, or custom." };
  }

  if (rangeRaw === "today" || rangeRaw === "7d" || rangeRaw === "30d") {
    if (rangeRaw === "today") {
      var parts = manilaYmd(clock);
      var start = manilaMidnightUtc(parts.y, parts.m, parts.d);
      var next = addCalendarDays(parts, 1);
      var end = manilaMidnightUtc(next.y, next.m, next.d);
      return finishRange("today", start, end);
    }
    var days = rangeRaw === "30d" ? 30 : 7;
    return finishRange(rangeRaw, new Date(clock.getTime() - days * DAY_MS), clock);
  }

  if (rangeRaw === "custom" || fromRaw || toRaw) {
    if (!fromRaw || !toRaw) {
      return { error: "custom range requires from and to as YYYY-MM-DD." };
    }
    var fromParts = parseYmd(fromRaw);
    var toParts = parseYmd(toRaw);
    if (!fromParts || !toParts) {
      return { error: "from and to must be YYYY-MM-DD." };
    }
    var fromUtc = manilaMidnightUtc(fromParts.y, fromParts.m, fromParts.d);
    var toNext = addCalendarDays(toParts, 1);
    var toUtc = manilaMidnightUtc(toNext.y, toNext.m, toNext.d);
    if (toUtc.getTime() <= fromUtc.getTime()) {
      return { error: "to must be on or after from." };
    }
    if (toUtc.getTime() - fromUtc.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      return { error: "custom range cannot exceed 366 days." };
    }
    return finishRange("custom", fromUtc, toUtc);
  }

  return finishRange("7d", new Date(clock.getTime() - 7 * DAY_MS), clock);
}

function hasRangeInput(query) {
  var source = query || {};
  var rangeRaw = source.range === undefined || source.range === null ? "" : String(source.range).trim();
  var fromRaw = source.from === undefined || source.from === null ? "" : String(source.from).trim();
  var toRaw = source.to === undefined || source.to === null ? "" : String(source.to).trim();
  return !!(rangeRaw || fromRaw || toRaw);
}

function emptyVisits(range) {
  var series = [];
  var dates = (range && range.seriesDates) || [];
  var i;
  for (i = 0; i < dates.length; i++) {
    series.push({ date: dates[i], count: 0 });
  }
  return {
    visits_total: 0,
    visits_previous: 0,
    visits_series: series,
    visits_metric_label: VISITS_METRIC_LABEL,
  };
}

function intOrZero(value) {
  var n = parseInt(value, 10);
  return isFinite(n) ? n : 0;
}

function buildPageviewVisits(range, totalRow, seriesRows) {
  var total = intOrZero(totalRow && totalRow.visits_total);
  var previous = intOrZero(totalRow && totalRow.visits_previous);
  var rows = seriesRows || [];
  var series = [];
  var i;
  if (range && (range.range === "7d" || range.range === "30d")) {
    var buckets = range.range === "30d" ? 30 : 7;
    var byBucket = {};
    for (i = 0; i < rows.length; i++) {
      if (rows[i].bucket === undefined || rows[i].bucket === null || rows[i].bucket === "") continue;
      byBucket[String(parseInt(rows[i].bucket, 10))] = intOrZero(rows[i].count);
    }
    var startMs = new Date(range.fromAt).getTime();
    for (i = 0; i < buckets; i++) {
      var parts = manilaYmd(new Date(startMs + i * DAY_MS));
      series.push({
        date: ymd(parts.y, parts.m, parts.d),
        count: byBucket[String(i)] || 0,
      });
    }
  } else {
    var byDate = {};
    for (i = 0; i < rows.length; i++) {
      if (!rows[i].date) continue;
      byDate[String(rows[i].date)] = intOrZero(rows[i].count);
    }
    var dates = (range && range.seriesDates) || [];
    for (i = 0; i < dates.length; i++) {
      series.push({ date: dates[i], count: byDate[dates[i]] || 0 });
    }
  }
  return {
    visits_total: total,
    visits_previous: previous,
    visits_series: series,
    visits_metric_label: PAGEVIEWS_METRIC_LABEL,
  };
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  var n = Number(value);
  return isFinite(n);
}

function subscriptionBag(row) {
  if (!row || !row.subscription_row || typeof row.subscription_row !== "object") return {};
  return row.subscription_row;
}

function isComplimentary(row) {
  var raw = subscriptionBag(row);
  if (raw.access_kind !== "internal_complimentary") return false;
  if (typeof raw.access_granted_by !== "string" || !String(raw.access_granted_by).trim()) return false;
  if (!raw.access_granted_at) return false;
  var at = new Date(raw.access_granted_at);
  return !isNaN(at.getTime());
}

function resolvePlanSlug(row) {
  // Explicit slug wins. Unknown, enterprise, and other legacy names stay
  // "other" and do not fall through to subscription_id (that would relabel
  // a legacy plan as Starter/Growth). subscription_id is only the fallback
  // when both canonical_slug and plan_slug are empty.
  var explicit = "";
  if (row) {
    if (row.canonical_slug) explicit = row.canonical_slug;
    else if (row.plan_slug) explicit = row.plan_slug;
  }
  explicit = String(explicit || "").trim().toLowerCase();
  if (explicit) {
    if (SLUG_ALIASES[explicit]) explicit = SLUG_ALIASES[explicit];
    if (explicit !== "other" && PLAN_FACTS[explicit]) return explicit;
    return "other";
  }
  var id = row && row.subscription_id !== undefined && row.subscription_id !== null
    ? parseInt(row.subscription_id, 10)
    : NaN;
  if (ID_SLUGS[id]) return ID_SLUGS[id];
  return "other";
}

function planLabel(slug) {
  var facts = PLAN_FACTS[slug];
  return facts ? facts.label : PLAN_FACTS.other.label;
}

function planCodeFromVersionId(id) {
  if (id === undefined || id === null || String(id).trim() === "") return "";
  var text = String(id).trim().toLowerCase();
  var idx = text.lastIndexOf(":");
  var code = idx === -1 ? text : text.slice(idx + 1);
  if (SLUG_ALIASES[code]) return SLUG_ALIASES[code];
  if (PLAN_FACTS[code]) return code;
  return "other";
}

function normalizeCycle(row, slug) {
  var cycle = "";
  if (row && row.billing_cycle) cycle = String(row.billing_cycle).toLowerCase();
  else if (row && row.payment_occurence) cycle = String(row.payment_occurence).toLowerCase();
  if (cycle === "annually" || cycle === "annual" || cycle === "yearly") return "annual";
  if (cycle === "trial") return "trial";
  if (slug === "free_trial") return "trial";
  if (cycle === "monthly") return "monthly";
  return slug === "free_trial" ? "trial" : "monthly";
}

function asBool(value) {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function isoOrNull(value) {
  if (!value) return null;
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeSubStatus(row, now) {
  if (!row) return "none";
  var clock = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  if (isComplimentary(row)) return "active";

  var subStatus = String(row.sub_status || "").trim().toLowerCase();
  var slug = resolvePlanSlug(row);
  var subscriptionId = row.subscription_id === undefined || row.subscription_id === null
    ? null
    : parseInt(row.subscription_id, 10);
  var periodEnd = row.period_end ? new Date(row.period_end) : null;
  var createdAt = row.created_at ? new Date(row.created_at) : null;
  var isTrial = slug === "free_trial" || subscriptionId === 1 || subStatus === "trialing" || subStatus === "trial_active" || subStatus === "trial_ending";

  if (isTrial) {
    var trialEnd = periodEnd;
    if ((!trialEnd || isNaN(trialEnd.getTime())) && createdAt && !isNaN(createdAt.getTime())) {
      trialEnd = new Date(createdAt.getTime() + 7 * DAY_MS);
    }
    if (trialEnd && !isNaN(trialEnd.getTime()) && trialEnd.getTime() <= clock.getTime()) return "expired";
    return "trialing";
  }

  if (subStatus === "past_due" || subStatus === "payment_failed" || subStatus === "pending_payment") return "past_due";
  if (subStatus === "expired" || subStatus === "canceled" || subStatus === "cancelled") return "expired";
  if (subStatus === "grace" || subStatus === "grace_period") return "grace";

  if (asBool(row.is_paid) || subStatus === "active" || subStatus === "reactivated") {
    if (periodEnd && !isNaN(periodEnd.getTime()) && periodEnd.getTime() < clock.getTime()) {
      var graceCutoff = periodEnd.getTime() + 7 * DAY_MS;
      if (clock.getTime() <= graceCutoff) return "grace";
      return "expired";
    }
    return "active";
  }

  return "none";
}

function agreedMonthlyPhp(row, cycle) {
  var raw = subscriptionBag(row);
  if (cycle === "annual" && finiteNumber(raw.agreed_annual_minor)) {
    return Math.round((Number(raw.agreed_annual_minor) / 100) / 12);
  }
  if (finiteNumber(raw.agreed_monthly_minor)) {
    return Math.round(Number(raw.agreed_monthly_minor) / 100);
  }
  return 0;
}

function mrrPhp(row, status, slug, cycle) {
  if (isComplimentary(row)) return 0;
  if (status !== "active" && status !== "grace" && status !== "past_due") return 0;
  if (slug === "free_trial" || slug === "other") {
    if (slug === "other") return agreedMonthlyPhp(row, cycle);
    return 0;
  }
  var facts = PLAN_FACTS[slug];
  if (!facts) return 0;
  if (cycle === "annual") return facts.annualMonthly;
  return facts.monthly;
}

function trialDaysLeft(row, status, now) {
  if (status !== "trialing") return null;
  var clock = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  var periodEnd = row && row.period_end ? new Date(row.period_end) : null;
  var createdAt = row && row.created_at ? new Date(row.created_at) : null;
  var trialEnd = periodEnd;
  if ((!trialEnd || isNaN(trialEnd.getTime())) && createdAt && !isNaN(createdAt.getTime())) {
    trialEnd = new Date(createdAt.getTime() + 7 * DAY_MS);
  }
  if (!trialEnd || isNaN(trialEnd.getTime())) return null;
  var ms = trialEnd.getTime() - clock.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}

function normalizeSubscriptionRow(row, now) {
  var slug = resolvePlanSlug(row);
  var status = normalizeSubStatus(row, now);
  var cycle = isComplimentary(row) ? (normalizeCycle(row, slug) === "trial" ? null : normalizeCycle(row, slug)) : normalizeCycle(row, slug);
  var mrr = mrrPhp(row, status, slug, cycle || "monthly");
  var lastPayment = row && (row.last_payment_at || row.payment_date);
  return {
    company_id: row.company_id,
    company_name: row.company_name || null,
    plan_slug: slug,
    plan_label: planLabel(slug),
    status: status,
    cycle: cycle,
    started_at: isoOrNull(row.period_start || row.created_at),
    period_end: isoOrNull(row.period_end),
    mrr_php: mrr,
    last_payment_at: isoOrNull(lastPayment),
    trial_days_left: trialDaysLeft(row, status, now),
  };
}

function numericEntitlement(bag, keys) {
  var i;
  for (i = 0; i < keys.length; i++) {
    if (finiteNumber(bag[keys[i]])) return Number(bag[keys[i]]);
  }
  return null;
}

function entitlementLimits(row, slug) {
  var facts = PLAN_FACTS[slug] || PLAN_FACTS.other;
  var limits = {
    jobs: facts.jobs,
    admins: facts.admins,
    videos: facts.videos,
  };
  var bag = subscriptionBag(row);
  var ent = bag.effective_entitlements || bag.entitlements;
  if (!ent || typeof ent !== "object") return limits;
  var jobs = numericEntitlement(ent, ["active_job_posts", "jobs"]);
  var admins = numericEntitlement(ent, ["admin_users", "users", "admins"]);
  var videos = numericEntitlement(ent, ["video_responses", "video", "videos"]);
  if (jobs !== null) limits.jobs = jobs;
  if (admins !== null) limits.admins = admins;
  if (videos !== null) limits.videos = videos;
  return limits;
}

function entitlementMeters(row, slug, usage) {
  var limits = entitlementLimits(row, slug);
  var used = usage || {};
  return [
    { label: "Jobs", used: used.jobs || 0, limit: limits.jobs },
    { label: "Admins", used: used.admins || 0, limit: limits.admins },
    { label: "Videos", used: used.videos || 0, limit: limits.videos },
  ];
}

function paymentStatusFromRaw(raw) {
  var text = String(raw || "").trim().toLowerCase();
  if (text === "paid" || text === "succeeded" || text === "success") return "succeeded";
  if (text === "refunded" || text === "partially_refunded") return "refunded";
  if (text === "failed" || text === "expired" || text === "cancelled" || text === "canceled" || text === "checkout_unknown" || text === "void" || text === "voided") {
    return "failed";
  }
  return "pending";
}

function minorToPhp(minor) {
  if (!finiteNumber(minor)) return 0;
  return Math.round(Number(minor)) / 100;
}

function paymentFromLedger(row) {
  var slug = "";
  if (row && row.plan_slug) slug = resolvePlanSlug({ plan_slug: row.plan_slug });
  else if (row && row.plan_version_id) slug = planCodeFromVersionId(row.plan_version_id);
  var amount = 0;
  if (row && finiteNumber(row.gross_minor)) amount = minorToPhp(row.gross_minor);
  else if (row && finiteNumber(row.amount_php)) amount = Number(row.amount_php);
  return {
    id: row && row.id !== undefined && row.id !== null ? String(row.id) : null,
    paid_at: isoOrNull(row && row.paid_at),
    company_id: row ? row.company_id || null : null,
    company_name: row ? row.company_name || null : null,
    plan_label: slug ? planLabel(slug) : null,
    amount_php: amount,
    method: row && row.method ? String(row.method) : null,
    status: paymentStatusFromRaw(row && row.raw_status),
    external_id: row && row.external_id ? String(row.external_id) : null,
  };
}

function mergePayments(groups) {
  var seenExternal = {};
  var seenId = {};
  var out = [];
  var g;
  var i;
  for (g = 0; g < groups.length; g++) {
    var list = groups[g] || [];
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;
      if (item.external_id && seenExternal[item.external_id]) continue;
      if (item.id && seenId[item.id]) continue;
      if (item.external_id) seenExternal[item.external_id] = true;
      if (item.id) seenId[item.id] = true;
      out.push(item);
    }
  }
  return out;
}

function nameMatches(companyName, q) {
  if (!q) return true;
  return String(companyName || "").toLowerCase().indexOf(String(q).toLowerCase()) !== -1;
}

function slicePage(items, page, pageSize) {
  var start = (page - 1) * pageSize;
  if (start < 0) start = 0;
  return items.slice(start, start + pageSize);
}

function roundPct(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function assembleFinance(subscriptions, payments, range, filters) {
  var list = subscriptions || [];
  var pays = payments || [];
  var query = filters || {};
  var page = query.page || 1;
  var pageSize = query.pageSize || 25;
  var payPage = query.payPage || 1;
  var i;
  var mrr = 0;
  var paying = 0;
  var active = 0;
  var trials = 0;
  var pastDue = 0;
  var counts = { free_trial: 0, starter: 0, growth: 0, business: 0, other: 0 };

  for (i = 0; i < list.length; i++) {
    var sub = list[i];
    if (sub.status === "active") {
      active += 1;
      mrr += sub.mrr_php || 0;
      if ((sub.mrr_php || 0) > 0) paying += 1;
    } else if (sub.status === "trialing") {
      trials += 1;
    } else if (sub.status === "past_due") {
      pastDue += 1;
    }
    if (counts[sub.plan_slug] === undefined) counts.other += 1;
    else counts[sub.plan_slug] += 1;
  }

  var revenue = 0;
  for (i = 0; i < pays.length; i++) {
    if (pays[i].status === "succeeded") revenue += pays[i].amount_php || 0;
  }

  var breakdown = [];
  for (i = 0; i < PLAN_ORDER.length; i++) {
    var slug = PLAN_ORDER[i];
    breakdown.push({
      slug: slug,
      label: planLabel(slug),
      company_count: counts[slug] || 0,
      pct: roundPct(counts[slug] || 0, list.length),
    });
  }

  var filteredSubs = [];
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    if (query.plan && row.plan_slug !== query.plan) continue;
    if (query.status && row.status !== query.status) continue;
    if (!nameMatches(row.company_name, query.q)) continue;
    filteredSubs.push(row);
  }
  filteredSubs.sort(function (a, b) {
    var an = String(a.company_name || "");
    var bn = String(b.company_name || "");
    if (an < bn) return -1;
    if (an > bn) return 1;
    if (String(a.company_id) < String(b.company_id)) return -1;
    if (String(a.company_id) > String(b.company_id)) return 1;
    return 0;
  });

  var filteredPays = [];
  for (i = 0; i < pays.length; i++) {
    var pay = pays[i];
    if (query.payStatus && pay.status !== query.payStatus) continue;
    if (!nameMatches(pay.company_name, query.q)) continue;
    filteredPays.push(pay);
  }
  filteredPays.sort(function (a, b) {
    var at = a.paid_at || "";
    var bt = b.paid_at || "";
    if (at > bt) return -1;
    if (at < bt) return 1;
    if (String(a.id) < String(b.id)) return -1;
    if (String(a.id) > String(b.id)) return 1;
    return 0;
  });

  var subItems = slicePage(filteredSubs, page, pageSize).map(function (sub) {
    return {
      company_id: sub.company_id,
      company_name: sub.company_name,
      plan_slug: sub.plan_slug,
      plan_label: sub.plan_label,
      status: sub.status,
      cycle: sub.cycle,
      period_end: sub.period_end,
      mrr_php: sub.mrr_php,
      last_payment_at: sub.last_payment_at,
    };
  });

  return {
    currency: "PHP",
    mrr_php: mrr,
    mrr_note: MRR_NOTE,
    revenue_in_range_php: revenue,
    paying_companies: paying,
    active_subscriptions: active,
    trials: trials,
    past_due: pastDue,
    plan_breakdown: breakdown,
    plan_breakdown_note: PLAN_BREAKDOWN_NOTE,
    range: range ? range.range : null,
    from: range ? range.from : null,
    to: range ? range.to : null,
    subscriptions: {
      items: subItems,
      total: filteredSubs.length,
      page: page,
      pageSize: pageSize,
    },
    payments: {
      items: slicePage(filteredPays, payPage, pageSize),
      total: filteredPays.length,
      page: payPage,
      pageSize: pageSize,
    },
  };
}

function historyFromLifecycle(rows) {
  var out = [];
  var i;
  for (i = 0; i < (rows || []).length; i++) {
    var row = rows[i];
    var parts = [];
    if (row.event_type) parts.push(String(row.event_type));
    if (row.previous_status || row.new_status) {
      parts.push(String(row.previous_status || "—") + " → " + String(row.new_status || "—"));
    }
    if (row.plan_slug) parts.push(String(row.plan_slug));
    out.push({
      at: isoOrNull(row.created_at),
      kind: "subscription",
      summary: parts.join(" · ") || "Subscription event",
      actor: null,
    });
  }
  return out;
}

function historyFromPayments(payments) {
  var out = [];
  var i;
  for (i = 0; i < (payments || []).length; i++) {
    var pay = payments[i];
    var summary = "Payment " + (pay.status || "recorded");
    if (finiteNumber(pay.amount_php)) summary += " · PHP " + pay.amount_php;
    if (pay.plan_label) summary += " · " + pay.plan_label;
    out.push({
      at: pay.paid_at || null,
      kind: "payment",
      summary: summary,
      actor: null,
    });
  }
  return out;
}

function mergeHistory(groups) {
  var out = [];
  var g;
  var i;
  for (g = 0; g < groups.length; g++) {
    var list = groups[g] || [];
    for (i = 0; i < list.length; i++) out.push(list[i]);
  }
  out.sort(function (a, b) {
    var at = a.at || "";
    var bt = b.at || "";
    if (at > bt) return -1;
    if (at < bt) return 1;
    return 0;
  });
  if (out.length > 100) return out.slice(0, 100);
  return out;
}

function validCompanyId(raw) {
  var companyId = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(companyId)) return null;
  return companyId;
}

function isMissingSchemaObject(error) {
  var code = error && error.code;
  return code === "42P01" || code === "42703";
}

export {
  VISITS_METRIC_LABEL,
  PLAN_FACTS,
  PLAN_ORDER,
  SUBSCRIPTION_STATUSES,
  PAYMENT_STATUSES,
  parseAdminRange,
  hasRangeInput,
  emptyVisits,
  buildPageviewVisits,
  PAGEVIEWS_METRIC_LABEL,
  resolvePlanSlug,
  planLabel,
  normalizeSubscriptionRow,
  entitlementMeters,
  paymentFromLedger,
  paymentStatusFromRaw,
  mergePayments,
  assembleFinance,
  historyFromLifecycle,
  historyFromPayments,
  mergeHistory,
  validCompanyId,
  isMissingSchemaObject,
  isComplimentary,
  parseYmd,
  addCalendarDays,
  ymd,
};
