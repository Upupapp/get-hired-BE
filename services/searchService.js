/**
 * searchService.js
 * All search database queries. PostgreSQL full-text search with ts_rank.
 * No ?. or ?? — esm/Acorn compat.
 */

import db from '../db/dbQuery';
import { expandSynonyms } from './searchSynonymService';

var dbSchema = 'gethired';

// Public-safe job fields returned in search results (no private data)
var PUBLIC_JOB_SELECT = `
  j.job_id,
  j.job_title,
  j.job_banner,
  j.company_id,
  j.work_setup_id,
  j.job_type_id,
  j.job_city,
  j.job_country,
  j.salary_minimum,
  j.salary_maximum,
  j.salary_currency,
  j.created_at,
  j.updated_at,
  j.expiration_date,
  c.company_name,
  c.company_logo,
  c.company_slug,
  jt.job_type_name,
  ws.work_setup_name,
  jl.job_level_name
`;

// ---------- PUBLIC JOB SEARCH ----------

async function searchPublicJobs(params) {
  var q = params.q ? expandSynonyms(params.q) : '';
  var location = params.location || '';
  var workSetup = params.workSetup || null;
  var employmentType = params.employmentType || null;
  var salary = params.salary || {};
  var sort = params.sort || 'relevance';
  var limit = params.pagination.limit;
  var offset = params.pagination.offset;

  var values = [];
  var paramIdx = 1;
  var where = [`j.job_status_id = 2`];
  var orderBy = 'j.updated_at DESC';

  // Full-text search condition
  if (q) {
    values.push(q);
    where.push(`(
      to_tsvector('english', coalesce(j.job_title, '')) @@ plainto_tsquery('english', $${paramIdx})
      OR to_tsvector('english', coalesce(c.company_name, '')) @@ plainto_tsquery('english', $${paramIdx})
      OR lower(j.job_title) LIKE lower($${paramIdx}) || '%'
    )`);
    paramIdx++;

    if (sort === 'relevance' || sort === 'newest') {
      orderBy = `ts_rank_cd(to_tsvector('english', coalesce(j.job_title, '')), plainto_tsquery('english', $1)) DESC, j.updated_at DESC`;
    }
  } else {
    if (sort === 'newest' || sort === 'relevance') {
      orderBy = 'j.updated_at DESC';
    }
  }

  // Location filter
  if (location) {
    values.push('%' + location + '%');
    where.push(`(lower(j.job_city) LIKE lower($${paramIdx}) OR lower(j.job_country) LIKE lower($${paramIdx}))`);
    paramIdx++;
  }

  // Work setup filter
  if (workSetup) {
    values.push(workSetup);
    where.push(`lower(ws.work_setup_name) = $${paramIdx}`);
    paramIdx++;
  }

  // Employment type filter
  if (employmentType) {
    values.push(employmentType);
    where.push(`lower(jt.job_type_name) = $${paramIdx}`);
    paramIdx++;
  }

  // Salary filters
  if (salary.min) {
    values.push(salary.min);
    where.push(`j.salary_maximum >= $${paramIdx}`);
    paramIdx++;
  }
  if (salary.max) {
    values.push(salary.max);
    where.push(`j.salary_minimum <= $${paramIdx}`);
    paramIdx++;
  }

  if (sort === 'salary_high' && !q) {
    orderBy = 'j.salary_maximum DESC NULLS LAST, j.updated_at DESC';
  }

  values.push(limit);
  var limitParam = paramIdx++;
  values.push(offset);
  var offsetParam = paramIdx++;

  var sql = `
    SELECT
      ${PUBLIC_JOB_SELECT},
      COUNT(*) OVER() AS total_count
    FROM ${dbSchema}.jobs j
    LEFT JOIN ${dbSchema}.companies c ON j.company_id = c.company_id
    LEFT JOIN ${dbSchema}.job_type jt ON j.job_type_id = jt.job_type_id
    LEFT JOIN ${dbSchema}.work_setup ws ON j.work_setup_id = ws.work_setup_id
    LEFT JOIN ${dbSchema}.job_level jl ON j.job_level_id = jl.job_level_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  var result = await db.query(sql, values);
  return result.rows;
}

// ---------- PUBLIC COMPANY SEARCH ----------

async function searchPublicCompanies(params) {
  return searchPublicCompaniesRanked(params);
}

async function searchPublicCompaniesRanked(params) {
  var q = params.q ? expandSynonyms(params.q) : '';
  var sort = params.sort || 'relevance';
  var location = params.location || '';
  var limit = params.pagination.limit;
  var offset = params.pagination.offset;

  var values = [];
  var paramIdx = 1;
  // Only show companies that have at least one active published job — safe public fallback
  var where = [
    'c.company_slug IS NOT NULL',
    `EXISTS (SELECT 1 FROM ${dbSchema}.jobs jv WHERE jv.company_id = c.company_id AND jv.job_status_id = 2)`
  ];

  var orderBy = 'open_jobs_count DESC, c.company_name ASC';

  if (q) {
    values.push(q);
    where.push(`(
      to_tsvector('english', coalesce(c.company_name, '')) @@ plainto_tsquery('english', $${paramIdx})
      OR to_tsvector('english', coalesce(i.industry_name, '')) @@ plainto_tsquery('english', $${paramIdx})
      OR lower(c.company_name) LIKE lower($${paramIdx}) || '%'
    )`);
    if (sort === 'relevance') {
      orderBy = `ts_rank_cd(to_tsvector('english', coalesce(c.company_name, '')), plainto_tsquery('english', $${paramIdx})) DESC, open_jobs_count DESC, c.company_name ASC`;
    }
    paramIdx++;
  }

  if (location) {
    values.push('%' + location + '%');
    where.push(`(lower(c.company_city) LIKE lower($${paramIdx}) OR lower(c.company_country) LIKE lower($${paramIdx}))`);
    paramIdx++;
  }

  if (sort === 'most_open_roles') {
    orderBy = 'open_jobs_count DESC, c.company_name ASC';
  } else if (sort === 'name_asc') {
    orderBy = 'c.company_name ASC';
  } else if (sort === 'newest_posted') {
    orderBy = `(SELECT MAX(jnp.created_at) FROM ${dbSchema}.jobs jnp WHERE jnp.company_id = c.company_id AND jnp.job_status_id = 2) DESC NULLS LAST`;
  }

  values.push(limit);
  var limitParam = paramIdx++;
  values.push(offset);
  var offsetParam = paramIdx++;

  var sql = `
    SELECT
      c.company_id, c.company_name, c.company_logo, c.company_slug,
      c.company_city, c.company_country, c.number_of_employee,
      i.industry_name,
      (SELECT COUNT(*) FROM ${dbSchema}.jobs j2
       WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count,
      COUNT(*) OVER() AS total_count
    FROM ${dbSchema}.companies c
    LEFT JOIN ${dbSchema}.industry i ON c.industry_id = i.industry_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  var result = await db.query(sql, values);
  return result.rows;
}

// ---------- COMPANY SPOTLIGHT ----------
// Returns the single best company match for a spotlight card.
// Only triggered for short specific queries.

async function getCompanySpotlight(q) {
  if (!q || q.length < 2 || q.length > 80) return null;
  var words = q.trim().split(/\s+/);
  if (words.length > 5) return null;

  var sql = `
    SELECT
      c.company_id, c.company_name, c.company_logo, c.company_slug,
      c.company_city, c.company_country, c.number_of_employee,
      i.industry_name,
      (SELECT COUNT(*) FROM ${dbSchema}.jobs j2
       WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count,
      CASE
        WHEN lower(c.company_name) = lower($1) THEN 100
        WHEN lower(c.company_name) LIKE lower($1) || '%' THEN 60
        ELSE 30
      END AS match_score
    FROM ${dbSchema}.companies c
    LEFT JOIN ${dbSchema}.industry i ON c.industry_id = i.industry_id
    WHERE c.company_slug IS NOT NULL
      AND EXISTS (SELECT 1 FROM ${dbSchema}.jobs js WHERE js.company_id = c.company_id AND js.job_status_id = 2)
      AND (
        lower(c.company_name) = lower($1)
        OR lower(c.company_name) LIKE lower($1) || '%'
        OR to_tsvector('english', coalesce(c.company_name,'')) @@ plainto_tsquery('english', $1)
      )
    ORDER BY match_score DESC, open_jobs_count DESC
    LIMIT 1
  `;

  var result = await db.query(sql, [q]);
  if (!result.rows || result.rows.length === 0) return null;
  var company = result.rows[0];
  var score = parseInt(company.match_score, 10) || 0;
  // Only return spotlight for exact or strong prefix matches
  if (score < 60) return null;

  // Get top matching jobs from that company
  var jobSql = `
    SELECT j.job_id, j.job_title, j.job_city, j.job_country, jt.job_type_name, ws.work_setup_name
    FROM ${dbSchema}.jobs j
    LEFT JOIN ${dbSchema}.job_type jt ON j.job_type_id = jt.job_type_id
    LEFT JOIN ${dbSchema}.work_setup ws ON j.work_setup_id = ws.work_setup_id
    WHERE j.company_id = $1 AND j.job_status_id = 2
    ORDER BY j.updated_at DESC
    LIMIT 3
  `;
  var jobResult = await db.query(jobSql, [company.company_id]);
  company.topJobs = jobResult.rows || [];
  delete company.match_score;
  return company;
}

// ---------- AUTOCOMPLETE ----------

async function getJobTitleSuggestions(prefix) {
  if (!prefix || prefix.length < 2) return [];
  var sql = `
    SELECT DISTINCT lower(job_title) AS suggestion
    FROM ${dbSchema}.jobs
    WHERE job_status_id = 2
      AND lower(job_title) LIKE lower($1) || '%'
    ORDER BY suggestion
    LIMIT 8
  `;
  var result = await db.query(sql, [prefix]);
  return result.rows.map(function(r) { return r.suggestion; });
}

async function getCompanySuggestions(prefix) {
  if (!prefix || prefix.length < 2) return [];
  var sql = `
    SELECT
      c.company_name, c.company_slug, c.company_logo,
      (SELECT COUNT(*) FROM ${dbSchema}.jobs j2 WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs_count
    FROM ${dbSchema}.companies c
    WHERE lower(c.company_name) LIKE lower($1) || '%'
      AND c.company_slug IS NOT NULL
      AND EXISTS (SELECT 1 FROM ${dbSchema}.jobs jv WHERE jv.company_id = c.company_id AND jv.job_status_id = 2)
    ORDER BY c.company_name
    LIMIT 5
  `;
  var result = await db.query(sql, [prefix]);
  return result.rows;
}

async function getLocationSuggestions(prefix) {
  if (!prefix || prefix.length < 2) return [];
  var sql = `
    SELECT DISTINCT lower(job_city) AS suggestion
    FROM ${dbSchema}.jobs
    WHERE job_status_id = 2
      AND job_city IS NOT NULL
      AND lower(job_city) LIKE lower($1) || '%'
    ORDER BY suggestion
    LIMIT 5
  `;
  var result = await db.query(sql, [prefix]);
  return result.rows.map(function(r) { return r.suggestion; });
}

// ---------- EMPLOYER JOB SEARCH ----------

async function searchEmployerJobs(companyId, params) {
  if (!companyId) return [];
  var q = params.q ? params.q : '';
  var limit = params.pagination.limit;
  var offset = params.pagination.offset;

  var values = [companyId];
  var paramIdx = 2;
  var where = ['j.company_id = $1'];

  if (q) {
    values.push(q);
    where.push(`(
      lower(j.job_title) LIKE lower($${paramIdx}) || '%'
      OR to_tsvector('english', coalesce(j.job_title, '')) @@ plainto_tsquery('english', $${paramIdx})
    )`);
    paramIdx++;
  }

  // Status filter for employer
  if (params.status) {
    values.push(params.status);
    where.push(`j.job_status_id = $${paramIdx}`);
    paramIdx++;
  }

  values.push(limit);
  var limitParam = paramIdx++;
  values.push(offset);
  var offsetParam = paramIdx++;

  var sql = `
    SELECT
      j.job_id, j.job_title, j.job_status_id, js.job_status_name,
      j.created_at, j.updated_at, j.expiration_date,
      j.work_setup_id, j.job_type_id,
      ws.work_setup_name, jt.job_type_name,
      (SELECT COUNT(*) FROM ${dbSchema}.job_applicants ja WHERE ja.job_id = j.job_id) AS applicant_count,
      COUNT(*) OVER() AS total_count
    FROM ${dbSchema}.jobs j
    LEFT JOIN ${dbSchema}.job_status js ON j.job_status_id = js.job_status_id
    LEFT JOIN ${dbSchema}.work_setup ws ON j.work_setup_id = ws.work_setup_id
    LEFT JOIN ${dbSchema}.job_type jt ON j.job_type_id = jt.job_type_id
    WHERE ${where.join(' AND ')}
    ORDER BY j.updated_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  var result = await db.query(sql, values);
  return result.rows;
}

// ---------- EMPLOYER APPLICANT SEARCH ----------

async function searchEmployerApplicants(companyId, params) {
  if (!companyId) return [];
  var q = params.q ? params.q : '';
  var limit = params.pagination.limit;
  var offset = params.pagination.offset;

  var values = [companyId];
  var paramIdx = 2;
  var where = ['j.company_id = $1'];

  if (q) {
    values.push('%' + q + '%');
    where.push(`(
      lower(u.display_name) ILIKE $${paramIdx}
      OR lower(u.email) ILIKE $${paramIdx}
      OR lower(j.job_title) ILIKE $${paramIdx}
    )`);
    paramIdx++;
  }

  values.push(limit);
  var limitParam = paramIdx++;
  values.push(offset);
  var offsetParam = paramIdx++;

  var sql = `
    SELECT
      ja.job_applicant_id, ja.job_id, ja.candidate_id, ja.application_status,
      j.job_title,
      u.display_name AS applicant_name,
      u.email AS applicant_email,
      ja.created_at AS applied_at,
      COUNT(*) OVER() AS total_count
    FROM ${dbSchema}.job_applicants ja
    INNER JOIN ${dbSchema}.jobs j ON ja.job_id = j.job_id
    LEFT JOIN ${dbSchema}.users u ON ja.candidate_id = u.uid
    WHERE ${where.join(' AND ')}
    ORDER BY ja.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  var result = await db.query(sql, values);
  return result.rows;
}

// ---------- APPLICANT SAVED/APPLIED JOB SEARCH ----------

async function searchApplicantSavedJobs(userId, params) {
  if (!userId) return [];
  var q = params.q ? params.q : '';
  var limit = params.pagination.limit;
  var offset = params.pagination.offset;

  var values = [userId];
  var paramIdx = 2;
  var where = ['sj.user_id = $1'];

  if (q) {
    values.push(q);
    where.push(`to_tsvector('english', coalesce(j.job_title, '')) @@ plainto_tsquery('english', $${paramIdx})`);
    paramIdx++;
  }

  values.push(limit);
  var limitParam = paramIdx++;
  values.push(offset);
  var offsetParam = paramIdx++;

  var sql = `
    SELECT
      j.job_id, j.job_title, j.job_city, j.job_country,
      j.salary_minimum, j.salary_maximum, j.salary_currency,
      c.company_name, c.company_logo, c.company_slug,
      jt.job_type_name, ws.work_setup_name,
      j.job_status_id,
      sj.saved_at,
      COUNT(*) OVER() AS total_count
    FROM ${dbSchema}.saved_jobs sj
    INNER JOIN ${dbSchema}.jobs j ON sj.job_id = j.job_id
    LEFT JOIN ${dbSchema}.companies c ON j.company_id = c.company_id
    LEFT JOIN ${dbSchema}.job_type jt ON j.job_type_id = jt.job_type_id
    LEFT JOIN ${dbSchema}.work_setup ws ON j.work_setup_id = ws.work_setup_id
    WHERE ${where.join(' AND ')}
    ORDER BY sj.saved_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  var result = await db.query(sql, values);
  return result.rows;
}

export {
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
};
