// GETHIRED_PUBLIC_COMPANY_PROFILE_REDESIGN_TRUST_JOBS_SEO_FULLSTACK_V3
// Safe public endpoints — no auth required.
// Strips all private fields (email, phone, billing) before responding.

import db from "../db";

// --- Constants ---

var RESERVED_SLUGS = new Set([
  'admin', 'api', 'recruiter', 'user', 'users', 'company', 'companies',
  'jobs', 'login', 'signup', 'pricing', 'subscription', 'billing',
  'settings', 'profile', 'public', 'assets', 'static', 'search',
  'help', 'about', 'contact', 'cv-doctor', 'cv-health'
]);

var WORK_SETUP_MAP = {
  1: 'On-site',
  2: 'Remote',
  3: 'Hybrid',
};

var JOB_TYPE_MAP = {
  1: 'Full-time',
  2: 'Part-time',
  3: 'Contract',
  4: 'Internship',
  5: 'Freelance',
};

// --- Safe DTO builder ---
// Returns only fields safe for public consumption.
// Uses &&/|| guards — never ?. or ?? (Acorn 6/7 incompatibility).

var toPublicProfileDto = function(raw, openJobsCount) {
  var slug        = raw.company_slug || '';
  var displayName = raw.company_name || '';
  var city        = raw.company_city || '';
  var country     = raw.company_country || '';
  var locationParts = [city, country].filter(Boolean);
  var location    = locationParts.length > 0 ? locationParts.join(', ') : null;

  var logoObj = null;
  if (raw.company_logo) {
    logoObj = { url: raw.company_logo, alt: displayName + ' logo' };
  }
  var bannerObj = null;
  if (raw.company_banner) {
    bannerObj = { url: raw.company_banner, alt: displayName + ' banner' };
  }

  var about       = raw.company_details || null;
  var industry    = raw.company_industry_name || null;
  var workSetup   = WORK_SETUP_MAP[raw.work_setup_id] || null;
  var workSetupId = raw.work_setup_id || null;
  var companySize = raw.number_of_employee ? String(raw.number_of_employee) : null;
  var openJobs    = openJobsCount || 0;

  var seoTitle = displayName + ' Careers and Jobs | GetHired';
  var seoDesc  = about
    ? (about.length > 155 ? about.slice(0, 155) + '...' : about)
    : ('Explore ' + displayName + ' on GetHired.');
  var seoCanon  = 'https://gethiredonline.app/companies/' + slug;
  var seoOgImg  = (raw.company_banner || raw.company_logo) || null;

  return {
    slug:           slug,
    companyId:      raw.company_id,
    displayName:    displayName,
    about:          about,
    industry:       industry,
    workSetup:      workSetup,
    workSetupId:    workSetupId,
    companySize:    companySize,
    location:       location,
    logo:           logoObj,
    heroBanner:     bannerObj,
    openJobsCount:  openJobs,
    updatedAt:      raw.updated_at || null,
    seo: {
      title:       seoTitle,
      description: seoDesc,
      canonical:   seoCanon,
      ogImage:     seoOgImg,
    },
  };
};

// --- getPublicCompanyProfile ---
// GET /api/public/company/:slug
// No auth. Returns safe DTO only.

export var getPublicCompanyProfile = async function(req, res) {
  try {
    var slug = (req.params.slug || '').toLowerCase().trim();

    if (!slug || RESERVED_SLUGS.has(slug)) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var companyRows = await db.query(
      'SELECT c.company_id, c.company_name, c.company_slug, c.company_logo, c.company_banner, c.company_details, c.company_city, c.company_country, c.number_of_employee, c.work_setup_id, c.updated_at, i.industry_name AS company_industry_name FROM gethired.companies c LEFT JOIN gethired.industry i ON i.industry_id = c.industry_id WHERE c.company_slug = $1 LIMIT 1',
      [slug]
    );

    if (!companyRows || !companyRows.rows || companyRows.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var raw = companyRows.rows[0];

    var jobCountRows = await db.query(
      'SELECT COUNT(*) AS open_jobs_count FROM gethired.jobs WHERE company_id = $1 AND job_status_id = 2',
      [raw.company_id]
    );

    var openJobsCount = 0;
    if (jobCountRows && jobCountRows.rows && jobCountRows.rows[0]) {
      openJobsCount = parseInt(jobCountRows.rows[0].open_jobs_count, 10) || 0;
    }

    var profile = toPublicProfileDto(raw, openJobsCount);
    return res.status(200).json({ data: profile });

  } catch (err) {
    console.error('[publicCompanyController] getPublicCompanyProfile error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// --- getPublicCompanyJobs ---
// GET /api/public/company/:slug/jobs
// No auth. Returns only published (job_status_id=2) jobs.

export var getPublicCompanyJobs = async function(req, res) {
  try {
    var slug = (req.params.slug || '').toLowerCase().trim();

    if (!slug || RESERVED_SLUGS.has(slug)) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var companyRows = await db.query(
      'SELECT company_id FROM gethired.companies WHERE company_slug = $1 LIMIT 1',
      [slug]
    );

    if (!companyRows || !companyRows.rows || companyRows.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var companyId = companyRows.rows[0].company_id;

    var jobRows = await db.query(
      'SELECT j.job_id, j.job_title, j.work_setup_id, j.job_type_id, j.salary_min, j.salary_max, j.currency, j.salary_rate, j.job_city, j.job_country, j.created_at FROM gethired.jobs j WHERE j.company_id = $1 AND j.job_status_id = 2 ORDER BY j.created_at DESC LIMIT 50',
      [companyId]
    );

    var jobs = [];
    if (jobRows && jobRows.rows) {
      jobs = jobRows.rows.map(function(j) {
        var cityParts = [j.job_city, j.job_country].filter(Boolean);
        var location  = cityParts.length > 0 ? cityParts.join(', ') : null;
        return {
          jobId:     j.job_id,
          jobTitle:  j.job_title,
          workSetup: WORK_SETUP_MAP[j.work_setup_id] || null,
          jobType:   JOB_TYPE_MAP[j.job_type_id] || null,
          salaryMin: j.salary_min ? parseFloat(j.salary_min) : null,
          salaryMax: j.salary_max ? parseFloat(j.salary_max) : null,
          currency:  j.currency || null,
          rate:      j.salary_rate || null,
          location:  location,
          postedAt:  j.created_at || null,
        };
      });
    }

    return res.status(200).json({ data: { jobs: jobs, total: jobs.length } });

  } catch (err) {
    console.error('[publicCompanyController] getPublicCompanyJobs error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// --- resolveCompanyIdToSlug ---
// GET /api/public/company/id/:companyId/resolve
// No auth. Resolves legacy ?id=COM-XX-YYYYYY to slug for redirect.

export var resolveCompanyIdToSlug = async function(req, res) {
  try {
    var companyId = (req.params.companyId || '').trim();

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required.' });
    }

    var rows = await db.query(
      'SELECT company_id, company_slug FROM gethired.companies WHERE company_id = $1 LIMIT 1',
      [companyId]
    );

    if (!rows || !rows.rows || rows.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var row  = rows.rows[0];
    var slug = row.company_slug || null;

    if (!slug) {
      return res.status(404).json({ message: 'No slug for this company.' });
    }

    return res.status(200).json({ data: { slug: slug, companyId: row.company_id } });

  } catch (err) {
    console.error('[publicCompanyController] resolveCompanyIdToSlug error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};
