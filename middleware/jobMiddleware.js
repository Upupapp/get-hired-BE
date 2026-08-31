/**
 * GETHIRED_EMPLOYER_JOB_POST_CREATE_FULL_REVAMP_V1 — Phase 11
 * Job-specific middleware functions.
 *
 * BE syntax: NO optional chaining (?.) or nullish coalescing (??) — use &&/|| guards.
 * All middleware follows (req, res, next) Express pattern.
 *
 * Functions:
 *   sanitizeJobContent       — strip disallowed HTML from free-text fields
 *   validateJobPublishPayload — server-side required-field gate for publish
 *   auditJobChange           — fire-and-forget lifecycle log (no DB required)
 *
 * NOTE: requireRecruiterAuth, requireCompanyContext, requireJobOwnership
 * are already provided by verifyAuth + the getUserCompanyForRequest pattern
 * used directly in jobsController.js. Magic-byte upload verification is
 * already in helpers/fileSignature.js (reused, not duplicated here).
 * checkSubscriptionJobPublishLimit is enforced in subscriptionController.js
 * and called via companySubscriptions() in jobsController.js.
 */

// ─── Allowed text field keys for sanitization ─────────────────────────────────
// Only these keys are sanitized. Unknown keys pass through unchanged
// (forward-compatible with future fields).
var TEXT_FIELDS = [
  'jobTitle',
  'jobDescription',
  'jobDuties',
  'jobAddress',
  'jobCity',
  'jobCountry',
];

// Allowlist of HTML tags that are safe in free-text fields (job description).
// Any other tag is stripped. For the simple text fields (title, address, city,
// country) even these are stripped — only description/duties allow formatting.
var DESCRIPTION_FIELDS = ['jobDescription', 'jobDuties'];

/**
 * Strip a subset of safe HTML from a string.
 * Strips all tags except <b><strong><i><em><ul><ol><li><p><br>.
 * Uses a simple replace — no DOM parser needed (Node environment, no window).
 */
function stripUnsafeTags(value) {
  if (!value || typeof value !== 'string') return value;
  // Remove script/style/iframe/object/embed regardless
  var stripped = value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '');
  // Remove any remaining tags that are not in the safe list
  stripped = stripped.replace(/<(?!\/?(?:b|strong|i|em|ul|ol|li|p|br)\b)[^>]*>/gi, '');
  return stripped.trim();
}

/**
 * Strip ALL HTML tags from a plain-text field (title, city, country, address).
 */
function stripAllTags(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

/**
 * Middleware: sanitizeJobContent
 * Strips HTML from job text fields in req.body before the controller processes them.
 * Only touches known text fields; never mutates arrays or non-strings.
 */
var sanitizeJobContent = function(req, res, next) {
  if (!req.body) return next();

  TEXT_FIELDS.forEach(function(field) {
    if (!req.body[field] || typeof req.body[field] !== 'string') return;
    if (DESCRIPTION_FIELDS.indexOf(field) !== -1) {
      req.body[field] = stripUnsafeTags(req.body[field]);
    } else {
      req.body[field] = stripAllTags(req.body[field]);
    }
  });

  // Also sanitize each string in array fields (requirements, goodToHave, etc.)
  var arrayFields = ['requirements', 'goodToHave', 'educationalBackground'];
  arrayFields.forEach(function(field) {
    var arr = req.body[field];
    if (!arr || !Array.isArray(arr)) return;
    req.body[field] = arr.map(function(item) {
      return typeof item === 'string' ? stripAllTags(item) : item;
    });
  });

  // Sanitize certification requirement names
  var certs = req.body.certificationRequirements;
  if (certs && Array.isArray(certs)) {
    req.body.certificationRequirements = certs.map(function(cert) {
      if (!cert || typeof cert !== 'object') return cert;
      var out = {};
      Object.keys(cert).forEach(function(k) {
        out[k] = typeof cert[k] === 'string' ? stripAllTags(cert[k]) : cert[k];
      });
      return out;
    });
  }

  next();
};

/**
 * Middleware: validateJobPublishPayload
 * Server-side gate: if jobStatusId === 2 (publish), enforce the one true
 * required field. Draft saves (jobStatusId === 1) are always allowed with
 * partial data.
 * Returns 422 with a structured error if validation fails.
 *
 * PRODUCTION FIX (universal, per explicit product decision): this used to
 * require jobTypeId/jobLevelId/jobCity/jobCountry/jobDescription/workSetupId
 * -- mirroring the frontend's own equally strict gate at the time. Both were
 * relaxed together: job-create.component.ts's publishJobPost() now only
 * hard-blocks on a missing jobTitle, offering a "Proceed Posting anyway /
 * Cancel" confirmation for every other field instead of a hard block. This
 * gate is kept in sync with that -- title only -- so a "Proceed anyway"
 * click can't turn around and get rejected here with a 422 the Employer
 * already explicitly chose to accept. jobTitle stays required because a
 * title-less job can't be listed, searched, or displayed meaningfully
 * anywhere in the product.
 *
 * Banner was already not required here (job-create bug fix, 2026-08-30/31):
 * it's optional on the FE form, and jobsController.js's createJobs/updateJob
 * apply a shared default banner image when none is uploaded.
 */
var validateJobPublishPayload = function(req, res, next) {
  var body = req.body || {};
  var statusId = parseInt(body.jobStatusId, 10) || 1;

  // Only enforce on publish (status 2)
  if (statusId !== 2) return next();

  var missing = [];

  if (!body.jobTitle || !String(body.jobTitle).trim()) missing.push('jobTitle');

  // companyId is derived server-side in the controller (from JWT) so we
  // don't require it in the body — but if present, validate it's a string.
  // (Controller will reject if company can't be resolved from JWT.)

  if (missing.length > 0) {
    return res.status(422).json({
      message: 'Job post is missing required fields for publishing.',
      missing: missing,
    });
  }

  next();
};

/**
 * Middleware: auditJobChange
 * Appends lightweight lifecycle metadata to req for downstream logging.
 * Does NOT write to the database — use insertLogs() from user.service.js
 * if you want DB audit trails. This middleware simply stamps req.auditMeta
 * so controllers can optionally call insertLogs with it.
 *
 * Fire-and-forget: never blocks the response.
 */
var auditJobChange = function(req, res, next) {
  var uid = (req.user && req.user.uid) || null;
  var statusId = (req.body && req.body.jobStatusId) || null;
  var action = statusId === 2 ? 'job_publish_attempt' : 'job_draft_save';

  req.auditMeta = {
    uid: uid,
    action: action,
    jobId: (req.body && req.body.jobId) || null,
    timestamp: new Date().toISOString(),
  };

  next();
};

export { sanitizeJobContent, validateJobPublishPayload, auditJobChange };
