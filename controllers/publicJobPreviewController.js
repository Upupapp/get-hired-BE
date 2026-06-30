/**
 * Public Job Preview Controller
 * GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1
 *
 * Two endpoints:
 *   generateAnonPreview — anonymous, returns partial preview only (never full draft)
 *   claimPreview        — authenticated employers only, creates job draft in DB
 *
 * Security constraints enforced:
 *   - Full generated content NEVER sent to anonymous browser
 *   - company_id resolved from JWT only, never from request body
 *   - Job created as draft (status 1), never auto-published
 *   - Preview token is single-use (deleted on claim)
 *   - IP rate limiting: 5 requests / IP / 15 minutes for anonymous generation
 *
 * SYNTAX: no ?. or ?? — Node 14 ESM compatible.
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import idGenerator from '../helpers/randomNumberForId';
import { resolveHiringIntent } from '../services/hiringIntentResolverV4';
import { generateStructuredDraft } from '../services/instantJobAdGeneratorV4';
import { validateGenerationInputs } from '../services/instantJobAdValidatorsV4';
import { getUserCompanyForRequest } from './companiesController';
import { setPreview, getPreview, deletePreview } from '../services/anonPreviewStore';
import { saveJobArray } from '../services/job.service';

var dbSchema = env.schema;

// ── Per-IP rate limiting for anonymous AI generation ──────────────────────────
// 5 requests per IP per 15 minutes (separate from global writeLimiter)
var IP_RATE_WINDOW_MS = 15 * 60 * 1000;
var IP_RATE_MAX = 5;
var ipRateCounts = {};

// Cleanup IP rate counts every 30 minutes
var ipCleanupTimer = setInterval(function() {
  var now = Date.now();
  Object.keys(ipRateCounts).forEach(function(ip) {
    if (ipRateCounts[ip] && now > ipRateCounts[ip].resetAt) {
      delete ipRateCounts[ip];
    }
  });
}, 30 * 60 * 1000);
if (ipCleanupTimer && typeof ipCleanupTimer.unref === 'function') {
  ipCleanupTimer.unref();
}

function checkIpRate(ip) {
  var now = Date.now();
  var entry = ipRateCounts[ip];
  if (!entry || now > entry.resetAt) {
    ipRateCounts[ip] = { count: 1, resetAt: now + IP_RATE_WINDOW_MS };
    return true;
  }
  if (entry.count >= IP_RATE_MAX) return false;
  entry.count++;
  return true;
}

function getClientIp(req) {
  var xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSnippet(roleSummary) {
  if (!roleSummary || typeof roleSummary !== 'string') return '';
  var words = roleSummary.split(/\s+/).filter(Boolean);
  var snippet = words.slice(0, 45).join(' ');
  if (words.length > 45) snippet = snippet + '...';
  return snippet;
}

function stripHtml(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

// ── POST /api/public/employer/ai-preview-generate ─────────────────────────────
// Anonymous endpoint. Returns partial preview only.
// Full draft stored server-side in anonPreviewStore with 30-min TTL.
export async function generateAnonPreview(req, res) {
  try {
    var ip = getClientIp(req);
    if (!checkIpRate(ip)) {
      return res.status(429).json({ message: 'Too many preview requests. Please try again in 15 minutes.' });
    }

    var body = req.body || {};
    var rawInputs = {
      jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : '',
      location: typeof body.location === 'string' ? body.location : '',
      workSetup: typeof body.workSetup === 'string' ? body.workSetup : '',
      employmentType: typeof body.employmentType === 'string' ? body.employmentType : '',
      companyName: '', // anonymous — no company name
      industry: typeof body.industry === 'string' ? body.industry : '',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'PHP',
      benefitsProvided: [],
      schedule: null,
      openings: null,
      sourceRoute: 'public_employer_portal_anon',
    };

    var validation = validateGenerationInputs(rawInputs);
    if (!validation.valid) {
      var blockingIssues = (validation.issues || []).filter(function(i) { return i && i.severity === 'blocking'; });
      if (blockingIssues.length > 0) {
        return res.status(422).json({ message: blockingIssues[0].message || 'Invalid input.' });
      }
    }

    var inputs = validation.sanitized || rawInputs;
    inputs.salaryMin = null;
    inputs.salaryMax = null;
    inputs.sourceRoute = 'public_employer_portal_anon';

    var hiringIntent = resolveHiringIntent({
      jobTitle: inputs.jobTitle,
      workSetup: inputs.workSetup,
      employmentType: inputs.employmentType,
      companyName: '',
      industry: inputs.industry,
    });

    var intentBlocks = (hiringIntent && hiringIntent.reviewFlags ? hiringIntent.reviewFlags : [])
      .filter(function(f) { return f && f.blocksPublish === true; });
    if (intentBlocks.length > 0) {
      return res.status(422).json({ message: intentBlocks[0].message || 'Could not generate preview for this job title.' });
    }

    var draft = generateStructuredDraft(inputs, hiringIntent);

    // Build partial preview — NEVER expose full draft to anonymous browser
    var roleSummary = (draft.content && draft.content.roleSummary) ? draft.content.roleSummary : '';
    var snippet = buildSnippet(stripHtml(roleSummary));
    var title = (draft.basics && draft.basics.jobTitle) ? draft.basics.jobTitle : (inputs.jobTitle || '');
    var skills = (draft.content && draft.content.skills && Array.isArray(draft.content.skills))
      ? draft.content.skills.slice(0, 4)
      : [];

    // Store full draft server-side only — token is returned to browser, not content
    var previewToken = setPreview({
      draft: draft,
      inputs: {
        jobTitle: inputs.jobTitle,
        location: inputs.location,
        workSetup: inputs.workSetup,
        employmentType: inputs.employmentType,
      },
    });

    return res.status(200).json({
      success: true,
      previewToken: previewToken,
      partialPreview: {
        title: title,
        snippet: snippet,
        skills: skills,
      },
      expiresInMinutes: 30,
    });
  } catch (err) {
    console.error('[AnonPreview] generateAnonPreview error:', err && err.message);
    return res.status(500).json({ message: 'Could not generate preview. Please try again.' });
  }
}

// ── POST /api/recruiter/job-post-assistant/claim-preview ──────────────────────
// Authenticated employers only (verifyAuth in route).
// Claims anonymous preview → creates job draft in DB → returns jobId.
export async function claimPreview(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var body = req.body || {};
    var token = body.previewToken;

    // Basic token validation — never trust unvalidated client input
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 200) {
      return res.status(400).json({ message: 'Missing or invalid preview token.' });
    }

    var stored = getPreview(token);
    if (!stored) {
      return res.status(404).json({ message: 'Preview not found or expired. Please generate a new preview.' });
    }

    // Resolve company from JWT — never from request body
    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company associated with this account. Please complete your employer setup first.' });
    }
    var companyId = company.companyId;

    var draft = stored.draft;
    var jobTitle = '';
    if (draft.basics && draft.basics.jobTitle) {
      jobTitle = draft.basics.jobTitle;
    } else if (stored.inputs && stored.inputs.jobTitle) {
      jobTitle = stored.inputs.jobTitle;
    } else {
      jobTitle = 'Untitled Draft';
    }

    var roleSummary = (draft.content && draft.content.roleSummary) ? draft.content.roleSummary : null;
    var jobDescription = roleSummary ? stripHtml(roleSummary) : null;

    // Build duties text from responsibilities array
    var responsibilitiesArr = (draft.content && draft.content.responsibilities && Array.isArray(draft.content.responsibilities))
      ? draft.content.responsibilities
      : [];
    var jobDuties = null;
    if (responsibilitiesArr.length > 0) {
      jobDuties = responsibilitiesArr.map(function(r) { return '• ' + String(r); }).join('\n');
    }

    // Create job as draft (status_id = 1 — always draft, never auto-published)
    var jobId = idGenerator(6, 'JB');
    var insertQuery = [
      'INSERT INTO', dbSchema + '.jobs',
      '(job_id, job_title, company_id, job_description, job_duties, created_at, job_status_id)',
      'VALUES ($1, $2, $3, $4, $5, current_timestamp, $6)',
      'RETURNING job_id',
    ].join(' ');

    var result = await dbQuery.query(insertQuery, [
      jobId,
      jobTitle,
      companyId,
      jobDescription,
      jobDuties,
      1, // draft — never auto-publish
    ]);

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(500).json({ message: 'Could not create job draft. Please try again.' });
    }

    // Save associated arrays (non-fatal if this fails)
    var skills = (draft.content && draft.content.skills && Array.isArray(draft.content.skills))
      ? draft.content.skills : [];
    var requirements = (draft.content && draft.content.requiredQualifications && Array.isArray(draft.content.requiredQualifications))
      ? draft.content.requiredQualifications : [];
    var goodToHave = (draft.content && draft.content.preferredQualifications && Array.isArray(draft.content.preferredQualifications))
      ? draft.content.preferredQualifications : [];

    try {
      await saveJobArray(jobId, {
        badges: [],
        requirements: requirements,
        goodToHave: goodToHave,
        educationalBackground: [],
        skills: skills,
        tags: [],
        certificationRequirements: [],
      });
    } catch (saveErr) {
      // Non-fatal — job is created, arrays will be empty; employer fills in on review
      console.error('[AnonPreview] claimPreview saveJobArray non-fatal error:', saveErr && saveErr.message);
    }

    // Consume token — single-use; prevents replay claims
    deletePreview(token);

    return res.status(200).json({
      success: true,
      jobId: jobId,
      message: 'Job draft created. Review and complete your job post before publishing.',
    });
  } catch (err) {
    console.error('[AnonPreview] claimPreview error:', err && err.message);
    return res.status(500).json({ message: 'Could not claim preview. Please try again.' });
  }
}
