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
    title: row.job_title,
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

// ── Public search ─────────────────────────────────────────────────────────────

export async function publicSearch(req, res) {
  try {
    var start = Date.now();
    var params = parsePublicSearchParams(req.query);
    var scope = params.scope; // 'jobs', 'companies', 'all'

    var results = [];
    var pagination = null;

    if (scope === 'jobs' || scope === 'all') {
      var jobRows = await searchPublicJobs(params);
      var jobPage = buildPagination(jobRows, params.pagination.limit, params.pagination.offset, params.pagination.page);
      var jobs = stripTotalCount(jobRows).map(presentPublicJob);

      if (scope === 'jobs') {
        results = jobs;
        pagination = jobPage;
      } else {
        results = results.concat(jobs);
        pagination = jobPage;
      }
    }

    if (scope === 'companies' || scope === 'all') {
      var companyRows = await searchPublicCompanies(params);
      var companyPage = buildPagination(companyRows, params.pagination.limit, params.pagination.offset, params.pagination.page);
      var companies = stripTotalCount(companyRows).map(presentPublicCompany);

      if (scope === 'companies') {
        results = companies;
        pagination = companyPage;
      } else {
        results = results.concat(companies);
        if (!pagination) pagination = companyPage;
      }
    }

    return res.json({
      query: params.q || '',
      scope: scope,
      filters: {
        location: params.location || null,
        workSetup: params.workSetup || null,
        employmentType: params.employmentType || null,
        salary: params.salary,
        sort: params.sort,
      },
      results: results,
      pagination: pagination || { page: 1, limit: params.pagination.limit, total: 0, hasMore: false },
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

    companies.forEach(function(c) {
      suggestions.push({
        type: 'company',
        label: c.company_name,
        url: '/companies/' + (c.company_slug || ''),
      });
    });

    locations.forEach(function(l) {
      suggestions.push({
        type: 'location',
        label: l,
        url: '/jobs?location=' + encodeURIComponent(l),
      });
    });

    // CV Doctor shortcut if query sounds career-related
    var careerKeywords = ['cv', 'resume', 'job', 'career', 'apply'];
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

    return res.json({ query: q, suggestions: suggestions });
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
