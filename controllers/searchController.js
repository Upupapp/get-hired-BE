/**
 * searchController.js
 * Handles GET /api/search/* endpoints.
 * Role-aware, company-scoped, privacy-safe.
 * No ?. or ?? — esm/Acorn compat.
 */

import { parsePublicSearchParams, parsePage, sanitiseString } from '../services/searchQueryParserService';
import {
  searchPublicJobs,
  searchPublicCompanies,
  searchPublicCompaniesRanked,
  getCompanySpotlight,
  getJobTitleSuggestions,
  getCompanySuggestions,
  getLocationSuggestions,
  searchEmployerJobs,
  searchEmployerApplicants,
  searchApplicantSavedJobs,
} from '../services/searchService';
import db from '../db/dbQuery';

var dbSchema = 'gethired';
var MAX_AUTOCOMPLETE_QUERY_LENGTH = 60;

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code: code, message: message } });
}

function buildPagination(rows, limit, offset, page) {
  var total = (rows && rows.length > 0 && rows[0].total_count)
    ? parseInt(rows[0].total_count, 10)
    : 0;
  var hasMore = offset + limit < total;
  return {
    page: page,
    limit: limit,
    total: total,
    hasMore: hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}

function stripTotalCount(rows) {
  return (rows || []).map(function(r) {
    var clean = Object.assign({}, r);
    delete clean.total_count;
    return clean;
  });
}

// ── Public job presenter — never expose private fields ────────────────────────

// Strip web-scraper artifact from titles — "Finance Analyst Job Details | Corp"
// comes from scrapers that read <title> tag instead of the actual posting title.
function sanitizeJobTitle(raw) {
  if (!raw) return raw;
  var s = String(raw).trim();
  var pipeIdx = s.indexOf(' | ');
  if (pipeIdx !== -1) {
    var before = s.substring(0, pipeIdx).replace(/\s*(Job Details?|Job Post)\s*$/i, '').trim();
    return before || s;
  }
  return s;
}

function presentPublicJob(row) {
  var salary = null;
  if (row.salary_minimum || row.salary_maximum) {
    salary = {
      isPublic: true,
      min: row.salary_minimum ? parseFloat(row.salary_minimum) : null,
      max: row.salary_maximum ? parseFloat(row.salary_maximum) : null,
      currency: row.salary_currency || 'PHP',
    };
  }
  return {
    type: 'job',
    jobId: row.job_id,
    title: sanitizeJobTitle(row.job_title),
    companyName: row.company_name,
    companyLogoUrl: row.company_logo || null,
    companySlug: row.company_slug || null,
    location: [row.job_city, row.job_country].filter(Boolean).join(', '),
    workSetup: row.work_setup_name || null,
    employmentType: row.job_type_name || null,
    salary: salary,
    postedAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    jobBanner: row.job_banner || null,
  };
}

function presentPublicCompany(row) {
  return {
    type: 'company',
    companyId: row.company_id,
    companyName: row.company_name,
    companyLogoUrl: row.company_logo || null,
    companySlug: row.company_slug,
    industry: row.industry_name || null,
    location: [row.company_city, row.company_country].filter(Boolean).join(', '),
    openJobsCount: parseInt(row.open_jobs_count, 10) || 0,
  };
}

function presentEmployerJob(row) {
  return {
    type: 'employer_job',
    jobId: row.job_id,
    title: row.job_title,
    statusId: row.job_status_id,
    statusName: row.job_status_name,
    workSetup: row.work_setup_name || null,
    employmentType: row.job_type_name || null,
    applicantCount: parseInt(row.applicant_count, 10) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expirationDate: row.expiration_date || null,
  };
}

function presentEmployerApplicant(row) {
  // No raw CV/video URLs — only safe summary fields
  return {
    type: 'applicant',
    applicationId: row.job_applicant_id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    applicantName: row.applicant_name || 'Applicant',
    applicationStatus: row.application_status || null,
    appliedAt: row.applied_at,
  };
}

// ── Resolve company from authenticated user ───────────────────────────────────

async function getCompanyForUser(uid) {
  var sql = `
    SELECT cu.company_id FROM ${dbSchema}.company_users cu
    WHERE cu.uid = $1 AND cu.is_active = true
    LIMIT 1
  `;
  var result = await db.query(sql, [uid]);
  return (result.rows && result.rows.length > 0) ? result.rows[0].company_id : null;
}

// ── Public search — federated response ───────────────────────────────────────

export async function publicSearch(req, res) {
  try {
    var start = Date.now();
    var params = parsePublicSearchParams(req.query);
    var scope = params.scope; // 'all', 'jobs', 'companies'

    // Pagination limits per group in All mode
    var JOB_LIMIT_ALL = 12;
    var COMPANY_LIMIT_ALL = 4;

    var jobGroup = null;
    var companyGroup = null;
    var spotlightData = null;

    // ── Fetch jobs ──
    if (scope === 'jobs' || scope === 'all') {
      var jobPagination;
      if (scope === 'all') {
        jobPagination = { page: params.pagination.page, limit: JOB_LIMIT_ALL, offset: (params.pagination.page - 1) * JOB_LIMIT_ALL };
      } else {
        jobPagination = params.pagination;
      }
      var jobParams = Object.assign({}, params, { pagination: jobPagination });
      var jobRows = await searchPublicJobs(jobParams);
      var jobTotal = (jobRows && jobRows.length > 0 && jobRows[0].total_count) ? parseInt(jobRows[0].total_count, 10) : 0;
      var jobItems = stripTotalCount(jobRows).map(presentPublicJob);
      var jobHasMore = jobPagination.offset + jobPagination.limit < jobTotal;
      jobGroup = {
        items: jobItems,
        total: jobTotal,
        hasMore: jobHasMore,
        page: jobPagination.page,
        limit: jobPagination.limit,
      };
    }

    // ── Fetch companies ──
    if (scope === 'companies' || scope === 'all') {
      var compPagination;
      if (scope === 'all') {
        compPagination = { page: 1, limit: COMPANY_LIMIT_ALL, offset: 0 };
      } else {
        compPagination = params.pagination;
      }
      var compParams = Object.assign({}, params, { pagination: compPagination });
      var compRows = await searchPublicCompaniesRanked(compParams);
      var compTotal = (compRows && compRows.length > 0 && compRows[0].total_count) ? parseInt(compRows[0].total_count, 10) : 0;
      var compItems = stripTotalCount(compRows).map(presentPublicCompany);
      var compHasMore = compPagination.offset + compPagination.limit < compTotal;
      companyGroup = {
        items: compItems,
        total: compTotal,
        hasMore: compHasMore,
        page: compPagination.page,
        limit: compPagination.limit,
      };
    }

    // ── Company spotlight (only in All mode with a meaningful query) ──
    if (scope === 'all' && params.q && params.q.length >= 2) {
      spotlightData = await getCompanySpotlight(params.q);
    }

    // ── Counts ──
    var jobCount = jobGroup ? jobGroup.total : 0;
    var companyCount = companyGroup ? companyGroup.total : 0;
    var counts = {
      all: jobCount + companyCount,
      jobs: jobCount,
      companies: companyCount,
    };

    // ── Empty recovery ──
    var emptyRecovery = null;
    if (jobCount === 0 && companyCount > 0) {
      emptyRecovery = {
        type: 'jobs_missing',
        message: 'No open jobs matched this search, but these companies may be relevant.',
      };
    } else if (companyCount === 0 && jobCount > 0) {
      emptyRecovery = {
        type: 'companies_missing',
        message: 'No matching companies found for this search.',
      };
    } else if (jobCount === 0 && companyCount === 0) {
      emptyRecovery = {
        type: 'empty',
        message: 'No jobs or companies found for this search.',
      };
    }

    // ── Company spotlight presenter ──
    var spotlight = null;
    if (spotlightData) {
      spotlight = {
        companyId: spotlightData.company_id,
        companyName: spotlightData.company_name,
        companyLogoUrl: spotlightData.company_logo || null,
        companySlug: spotlightData.company_slug,
        industry: spotlightData.industry_name || null,
        location: [spotlightData.company_city, spotlightData.company_country].filter(Boolean).join(', '),
        openJobsCount: parseInt(spotlightData.open_jobs_count, 10) || 0,
        topJobs: (spotlightData.topJobs || []).map(function(j) {
          return {
            jobId: j.job_id,
            title: j.job_title,
            location: [j.job_city, j.job_country].filter(Boolean).join(', '),
            workSetup: j.work_setup_name || null,
            employmentType: j.job_type_name || null,
          };
        }),
      };
    }

    return res.json({
      query: params.q || '',
      type: scope,
      counts: counts,
      groups: {
        jobs: jobGroup,
        companies: companyGroup,
      },
      companySpotlight: spotlight,
      appliedFilters: {
        location: params.location || null,
        workSetup: params.workSetup || null,
        employmentType: params.employmentType || null,
        salary: params.salary,
        sort: params.sort,
      },
      emptyRecovery: emptyRecovery,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    console.error('[searchController] publicSearch error:', err.message);
    return sendError(res, 500, 'search_unavailable', 'Search is temporarily unavailable.');
  }
}

// ── Autocomplete ──────────────────────────────────────────────────────────────

export async function autocomplete(req, res) {
  try {
    var raw = req.query.q;
    if (!raw || typeof raw !== 'string') {
      return res.json({ query: '', suggestions: [] });
    }

    var q = raw.trim().slice(0, MAX_AUTOCOMPLETE_QUERY_LENGTH);
    if (!q || q.length < 2) {
      return res.json({ query: q, suggestions: [] });
    }

    var [titles, companies, locations] = await Promise.all([
      getJobTitleSuggestions(q),
      getCompanySuggestions(q),
      getLocationSuggestions(q),
    ]);

    var suggestions = [];

    titles.forEach(function(t) {
      suggestions.push({
        type: 'job_title',
        label: t,
        url: '/jobs?q=' + encodeURIComponent(t),
      });
    });

    // Companies: grouped with open job count context
    companies.forEach(function(c) {
      suggestions.push({
        type: 'company',
        label: c.company_name,
        sublabel: c.open_jobs_count > 0 ? (c.open_jobs_count + ' open role' + (c.open_jobs_count === 1 ? '' : 's')) : null,
        logoUrl: c.company_logo || null,
        url: '/companies/' + (c.company_slug || ''),
        slug: c.company_slug || null,
      });
    });

    locations.forEach(function(l) {
      suggestions.push({
        type: 'location',
        label: l,
        url: '/jobs?location=' + encodeURIComponent(l),
      });
    });

    // Shortcuts
    var careerKeywords = ['cv', 'resume', 'career', 'apply', 'health'];
    var isCareerQuery = careerKeywords.some(function(kw) {
      return q.toLowerCase().indexOf(kw) !== -1;
    });
    if (isCareerQuery) {
      suggestions.push({
        type: 'shortcut',
        label: 'Check your CV Health',
        url: '/user/cv-doctor',
        icon: 'cv_doctor',
      });
    }

    // Always offer a browse-companies shortcut if companies were found
    if (companies.length > 0) {
      suggestions.push({
        type: 'shortcut',
        label: 'See all companies on GetHired',
        url: '/jobs?q=' + encodeURIComponent(q) + '&type=companies',
        icon: 'companies',
      });
    }

    // Grouped response for better FE rendering
    return res.json({
      query: q,
      groups: {
        jobs: titles.map(function(t) { return { type: 'job_title', label: t, url: '/jobs?q=' + encodeURIComponent(t) }; }),
        companies: companies.map(function(c) {
          return {
            type: 'company',
            label: c.company_name,
            sublabel: c.open_jobs_count > 0 ? (c.open_jobs_count + ' open role' + (c.open_jobs_count === 1 ? '' : 's')) : null,
            logoUrl: c.company_logo || null,
            url: '/companies/' + (c.company_slug || ''),
            slug: c.company_slug || null,
          };
        }),
        locations: locations.map(function(l) { return { type: 'location', label: l, url: '/jobs?location=' + encodeURIComponent(l) }; }),
      },
      suggestions: suggestions,
    });
  } catch (err) {
    console.error('[searchController] autocomplete error:', err.message);
    return res.json({ query: req.query.q || '', suggestions: [] });
  }
}

// ── Employer search ──────────────────────────────────────────────────────────

export async function employerSearch(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return sendError(res, 401, 'unauthorized', 'Authentication required.');

    var companyId = await getCompanyForUser(uid);
    if (!companyId) return sendError(res, 403, 'forbidden', 'No company access found.');

    var scope = sanitiseString(req.query.scope, 20).toLowerCase() || 'jobs';
    var q = sanitiseString(req.query.q, 200);
    var pagination = parsePage(req.query.page, req.query.limit);
    var status = parseInt(req.query.status, 10) || null;

    var params = { q: q, pagination: pagination, status: status };
    var results = [];
    var paginationMeta = null;

    if (scope === 'jobs') {
      var rows = await searchEmployerJobs(companyId, params);
      paginationMeta = buildPagination(rows, pagination.limit, pagination.offset, pagination.page);
      results = stripTotalCount(rows).map(presentEmployerJob);
    } else if (scope === 'applicants') {
      var rows = await searchEmployerApplicants(companyId, params);
      paginationMeta = buildPagination(rows, pagination.limit, pagination.offset, pagination.page);
      results = stripTotalCount(rows).map(presentEmployerApplicant);
    } else {
      return sendError(res, 400, 'invalid_scope', 'Scope must be: jobs, applicants.');
    }

    return res.json({
      query: q,
      scope: scope,
      companyId: companyId,
      results: results,
      pagination: paginationMeta || { page: 1, limit: pagination.limit, total: 0, hasMore: false },
    });
  } catch (err) {
    console.error('[searchController] employerSearch error:', err.message);
    return sendError(res, 500, 'search_unavailable', 'Search is temporarily unavailable.');
  }
}

// ── Applicant search ─────────────────────────────────────────────────────────

export async function applicantSearch(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return sendError(res, 401, 'unauthorized', 'Authentication required.');

    var scope = sanitiseString(req.query.scope, 20).toLowerCase() || 'jobs';
    var q = sanitiseString(req.query.q, 200);
    var pagination = parsePage(req.query.page, req.query.limit);
    var params = parsePublicSearchParams(req.query);
    params.pagination = pagination;

    var results = [];
    var paginationMeta = null;

    if (scope === 'jobs') {
      // Applicants can search public jobs — same as public search
      var rows = await searchPublicJobs(params);
      paginationMeta = buildPagination(rows, pagination.limit, pagination.offset, pagination.page);
      results = stripTotalCount(rows).map(presentPublicJob);
    } else if (scope === 'saved_jobs') {
      var rows = await searchApplicantSavedJobs(uid, params);
      paginationMeta = buildPagination(rows, pagination.limit, pagination.offset, pagination.page);
      results = stripTotalCount(rows).map(presentPublicJob);
    } else {
      return sendError(res, 400, 'invalid_scope', 'Scope must be: jobs, saved_jobs.');
    }

    return res.json({
      query: q,
      scope: scope,
      results: results,
      pagination: paginationMeta || { page: 1, limit: pagination.limit, total: 0, hasMore: false },
    });
  } catch (err) {
    console.error('[searchController] applicantSearch error:', err.message);
    return sendError(res, 500, 'search_unavailable', 'Search is temporarily unavailable.');
  }
}
