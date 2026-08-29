// GETHIRED_PUBLIC_COMPANY_PROFILE_REDESIGN_TRUST_JOBS_SEO_FULLSTACK_V3
// V3 ADDENDUM: Sticky subnav + Follow Company + enhanced DTO
// Safe public endpoints — no auth required (except follow/unfollow).
// Strips all private fields (email, phone, billing) before responding.

import dbQuery from "../db/dbQuery";
import { firebaseAdmin } from "../middleware/firebaseApp";

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

var DEFAULT_HIRING_STEPS = [
  { step: 1, title: 'Apply',     description: 'Submit your application through GetHired.' },
  { step: 2, title: 'Screening', description: 'The hiring team reviews your application and qualifications.' },
  { step: 3, title: 'Interview', description: 'Selected candidates are invited to interview with the team.' },
  { step: 4, title: 'Offer',     description: 'Successful candidates receive an offer.' },
];

// --- Helper: parse optional Firebase token (never throws) ---
// Returns decoded token payload or null.
// Uses &&/|| guards — never ?. or ?? (Acorn 6/7 incompatibility).

var tryDecodeToken = async function(req) {
  var authHeader = req.headers && req.headers.authorization ? req.headers.authorization : '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) { return null; }
  var idToken = authHeader.split('Bearer ')[1];
  if (!idToken) { return null; }
  try {
    var decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (e) {
    return null;
  }
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
  var hasAbout    = !!(about && about.trim().length > 0);

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
    // COMPANY DUPLICATION FIX: true only for a renamed duplicate ("Company
    // Name #2", etc.) created by the historical-duplicates backfill --
    // drives the "duplicate listing" banner on this public page.
    isDuplicate:    raw.is_duplicate === true,
    seo: {
      title:       seoTitle,
      description: seoDesc,
      canonical:   seoCanon,
      ogImage:     seoOgImg,
    },
    snapshot: {
      industry:         industry,
      companySize:      companySize,
      workSetup:        workSetup,
      location:         location,
      openRoles:        openJobs,
      lastUpdated:      raw.updated_at || null,
      hiringOnGetHired: true,
    },
    whyJoinUs: {
      about:      about,
      hasContent: hasAbout,
    },
    hiringProcess: {
      steps:     DEFAULT_HIRING_STEPS,
      isDefault: true,
    },
    benefits: {
      items:      [],
      hasContent: false,
    },
    navigation: {
      tabs: hasAbout
        ? ['snapshot', 'whyJoinUs', 'jobs', 'hiringProcess']
        : ['snapshot', 'jobs', 'hiringProcess'],
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

    var companyResult = await dbQuery.query(
      'SELECT c.company_id, c.company_name, c.company_slug, c.company_logo, c.company_banner, c.company_details, c.company_city, c.company_country, c.number_of_employee, c.work_setup_id, c.updated_at, c.is_duplicate, i.industry_name AS company_industry_name FROM gethired.companies c LEFT JOIN gethired.industry i ON i.industry_id = c.industry_id WHERE c.company_slug = $1 LIMIT 1',
      [slug]
    );

    if (!companyResult || !companyResult.rows || companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var raw = companyResult.rows[0];

    var jobCountResult = await dbQuery.query(
      'SELECT COUNT(*) AS open_jobs_count FROM gethired.jobs WHERE company_id = $1 AND job_status_id = 2',
      [raw.company_id]
    );

    var openJobsCount = 0;
    if (jobCountResult && jobCountResult.rows && jobCountResult.rows[0]) {
      openJobsCount = parseInt(jobCountResult.rows[0].open_jobs_count, 10) || 0;
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

    var companyResult = await dbQuery.query(
      'SELECT company_id FROM gethired.companies WHERE company_slug = $1 LIMIT 1',
      [slug]
    );

    if (!companyResult || !companyResult.rows || companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var companyId = companyResult.rows[0].company_id;

    var jobResult = await dbQuery.query(
      'SELECT j.job_id, j.job_title, j.work_setup_id, j.job_type_id, j.salary_minimum, j.salary_maximum, j.salary_currency, j.rate, j.job_city, j.job_country, j.created_at FROM gethired.jobs j WHERE j.company_id = $1 AND j.job_status_id = 2 ORDER BY j.created_at DESC LIMIT 50',
      [companyId]
    );

    var jobs = [];
    if (jobResult && jobResult.rows) {
      jobs = jobResult.rows.map(function(j) {
        var cityParts = [j.job_city, j.job_country].filter(Boolean);
        var location  = cityParts.length > 0 ? cityParts.join(', ') : null;
        return {
          jobId:     j.job_id,
          jobTitle:  j.job_title,
          workSetup: WORK_SETUP_MAP[j.work_setup_id] || null,
          jobType:   JOB_TYPE_MAP[j.job_type_id] || null,
          salaryMin: j.salary_minimum ? parseFloat(j.salary_minimum) : null,
          salaryMax: j.salary_maximum ? parseFloat(j.salary_maximum) : null,
          currency:  j.salary_currency || null,
          rate:      j.rate || null,
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

// --- getPublicCompaniesList ---
// GET /api/public/companies
// No auth. Returns paginated list of all companies with a public slug.
// Uses &&/|| guards — never ?. or ?? (Acorn 6/7 incompatibility).

export var getPublicCompaniesList = async function(req, res) {
  try {
    var page = parseInt(req.query && req.query.page ? req.query.page : '1', 10);
    if (!page || page < 1) { page = 1; }
    var limit = 24;
    var offset = (page - 1) * limit;

    var sql = 'SELECT c.company_id, c.company_name, c.company_slug, c.company_logo, c.company_city, c.company_country, c.number_of_employee, c.work_setup_id, i.industry_name AS company_industry_name, (SELECT COUNT(*) FROM gethired.jobs j2 WHERE j2.company_id = c.company_id AND j2.job_status_id = 2) AS open_jobs FROM gethired.companies c LEFT JOIN gethired.industry i ON i.industry_id = c.industry_id WHERE c.company_slug IS NOT NULL AND c.company_slug <> \'\' ORDER BY open_jobs DESC, c.company_name ASC LIMIT $1 OFFSET $2';

    var companiesResult = await dbQuery.query(sql, [limit, offset]);

    var countResult = await dbQuery.query(
      'SELECT COUNT(*) AS total FROM gethired.companies WHERE company_slug IS NOT NULL AND company_slug <> \'\'',
      []
    );

    var companies = [];
    if (companiesResult && companiesResult.rows) {
      companies = companiesResult.rows.map(function(c) {
        var city    = c.company_city || '';
        var country = c.company_country || '';
        var location = null;
        if (city && country) { location = city + ', ' + country; }
        else if (city)       { location = city; }
        else if (country)    { location = country; }

        return {
          companyId:     c.company_id,
          displayName:   c.company_name || '',
          slug:          c.company_slug || '',
          logoUrl:       c.company_logo || null,
          industry:      c.company_industry_name || null,
          location:      location,
          workSetup:     c.work_setup_id ? (WORK_SETUP_MAP[c.work_setup_id] || null) : null,
          employeeCount: c.number_of_employee || null,
          openJobs:      parseInt(c.open_jobs, 10) || 0,
        };
      });
    }

    var total = 0;
    if (countResult && countResult.rows && countResult.rows[0]) {
      total = parseInt(countResult.rows[0].total, 10) || 0;
    }

    return res.status(200).json({
      data: { companies: companies, total: total, page: page, limit: limit }
    });

  } catch (err) {
    console.error('[publicCompanyController] getPublicCompaniesList error:', err && err.message ? err.message : err);
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

    var result = await dbQuery.query(
      'SELECT company_id, company_slug FROM gethired.companies WHERE company_id = $1 LIMIT 1',
      [companyId]
    );

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var row  = result.rows[0];
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

// --- getPublicCompanyFollowState ---
// GET /api/public/companies/:slug/follow-state
// Optional auth. Returns follow state for the calling user (or unavailable if not logged in).

export var getPublicCompanyFollowState = async function(req, res) {
  try {
    var slug = (req.params.slug || '').toLowerCase().trim();
    if (!slug || RESERVED_SLUGS.has(slug)) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var companyResult = await dbQuery.query(
      'SELECT company_id FROM gethired.companies WHERE company_slug = $1 LIMIT 1',
      [slug]
    );
    if (!companyResult || !companyResult.rows || companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }
    var companyId = companyResult.rows[0].company_id;

    var decoded = await tryDecodeToken(req);
    if (!decoded || !decoded.uid) {
      return res.status(200).json({ data: { following: false, available: false, message: 'Sign in to follow' } });
    }
    var uid = decoded.uid;

    // Anti-self-follow: employer cannot follow their own company
    var empCheck = await dbQuery.query(
      'SELECT 1 FROM gethired.company_employees WHERE employee_uuid = $1 AND company_id = $2 LIMIT 1',
      [uid, companyId]
    );
    if (empCheck && empCheck.rows && empCheck.rows.length > 0) {
      return res.status(200).json({ data: { following: false, available: false, message: 'Employers cannot follow their own company' } });
    }

    var followResult = await dbQuery.query(
      "SELECT status FROM gethired.company_followers WHERE company_id = $1 AND follower_uid = $2 LIMIT 1",
      [companyId, uid]
    );

    var following = false;
    if (followResult && followResult.rows && followResult.rows.length > 0) {
      following = followResult.rows[0].status === 'active';
    }

    return res.status(200).json({ data: { following: following, available: true } });

  } catch (err) {
    console.error('[publicCompanyController] getPublicCompanyFollowState error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// --- followCompany ---
// POST /api/public/companies/:slug/follow
// Requires auth. Idempotent — safe to call multiple times.

export var followCompany = async function(req, res) {
  try {
    var slug = (req.params.slug || '').toLowerCase().trim();
    if (!slug || RESERVED_SLUGS.has(slug)) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var uid = req.user && req.user.uid ? req.user.uid : null;
    if (!uid) { return res.status(403).json({ message: 'Unauthorized.' }); }

    var companyResult = await dbQuery.query(
      'SELECT company_id FROM gethired.companies WHERE company_slug = $1 LIMIT 1',
      [slug]
    );
    if (!companyResult || !companyResult.rows || companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }
    var companyId = companyResult.rows[0].company_id;

    // Anti-self-follow
    var empCheck = await dbQuery.query(
      'SELECT 1 FROM gethired.company_employees WHERE employee_uuid = $1 AND company_id = $2 LIMIT 1',
      [uid, companyId]
    );
    if (empCheck && empCheck.rows && empCheck.rows.length > 0) {
      return res.status(403).json({ message: 'Employers cannot follow their own company.' });
    }

    // Upsert: if row exists set active, else insert
    await dbQuery.query(
      "INSERT INTO gethired.company_followers (company_id, follower_uid, status, updated_at) VALUES ($1, $2, 'active', NOW()) ON CONFLICT (company_id, follower_uid) DO UPDATE SET status = 'active', updated_at = NOW()",
      [companyId, uid]
    );

    return res.status(200).json({ data: { following: true } });

  } catch (err) {
    console.error('[publicCompanyController] followCompany error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// --- unfollowCompany ---
// DELETE /api/public/companies/:slug/follow
// Requires auth. Idempotent — safe to call when not following.

export var unfollowCompany = async function(req, res) {
  try {
    var slug = (req.params.slug || '').toLowerCase().trim();
    if (!slug || RESERVED_SLUGS.has(slug)) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    var uid = req.user && req.user.uid ? req.user.uid : null;
    if (!uid) { return res.status(403).json({ message: 'Unauthorized.' }); }

    var companyResult = await dbQuery.query(
      'SELECT company_id FROM gethired.companies WHERE company_slug = $1 LIMIT 1',
      [slug]
    );
    if (!companyResult || !companyResult.rows || companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }
    var companyId = companyResult.rows[0].company_id;

    // Soft-delete: set status to 'inactive' (preserves follow history for analytics)
    await dbQuery.query(
      "UPDATE gethired.company_followers SET status = 'inactive', updated_at = NOW() WHERE company_id = $1 AND follower_uid = $2",
      [companyId, uid]
    );

    return res.status(200).json({ data: { following: false } });

  } catch (err) {
    console.error('[publicCompanyController] unfollowCompany error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};
