/**
 * Instant Job Ad Validators V4
 * Deterministic validators — each returns { valid, issues[] }.
 * SYNTAX: no ?. or ?? — Node 14 ESM safe.
 */

// ── 1. Clean title validator ──────────────────────────────────────────────────
export function validateTitle(title) {
  var t = title || '';
  var issues = [];

  if (!t.trim()) {
    issues.push({ key: 'invalid_job_title', severity: 'blocking', message: 'Job title is required.' });
    return { valid: false, issues: issues };
  }
  if (/job details\s*[\|:]/i.test(t)) issues.push({ key: 'invalid_job_title', severity: 'blocking', message: 'Title contains metadata prefix (e.g. "Job Details |"). Remove it.' });
  if (/₱|php|\bsalary\b/i.test(t)) issues.push({ key: 'salary_in_title', severity: 'blocking', message: 'Remove salary information from the job title.' });
  if (/\d{5,}/.test(t)) issues.push({ key: 'job_code_in_title', severity: 'warning', message: 'Title appears to contain a job code. Consider cleaning it.' });
  if (/urgent!|urgently hiring|asap!/i.test(t)) issues.push({ key: 'urgency_in_title', severity: 'warning', message: 'Avoid urgency language in the title. It reduces quality perception.' });
  if (/ninja|rockstar|guru|wizard|unicorn/i.test(t)) issues.push({ key: 'gimmicky_title', severity: 'warning', message: 'Avoid gimmicky job titles. Use a standard industry title.' });
  if (t.length > 100) issues.push({ key: 'title_too_long', severity: 'warning', message: 'Job title is too long. Keep it under 100 characters.' });

  return { valid: issues.filter(function(i) { return i.severity === 'blocking'; }).length === 0, issues: issues };
}

// ── 2. Anti-discrimination validator ─────────────────────────────────────────
var DISCRIMINATORY_PATTERNS = [
  { pattern: /\b\d{2}\s*[\-–]\s*\d{2}\s*(years?|yrs?|y\.?o\.?)/i, key: 'age_range_detected', message: 'Age ranges are prohibited. Use experience-based requirements instead.' },
  { pattern: /\bnot more than\s+\d{2}/i, key: 'age_cap_detected', message: '"Not more than X years old" is prohibited under PH RA 10911.' },
  { pattern: /\byoung and energetic\b/i, key: 'age_bias_language', message: '"Young and energetic" implies age preference and is prohibited.' },
  { pattern: /\bfresh graduate(s)? only\b/i, key: 'fresh_grad_only', message: '"Fresh graduates only" is exclusionary. Use "open to fresh graduates" instead.' },
  { pattern: /\b(male|female|lalaki|babae)\s+(only|preferred|required)\b/i, key: 'gender_preference', message: 'Gender preferences are prohibited.' },
  { pattern: /\b(single|married)\s+(only|preferred|required)\b/i, key: 'marital_status', message: 'Marital status requirements are prohibited.' },
  { pattern: /\breligion\b|\bchristian\b|\bcatholic\b/i, key: 'religion_requirement', message: 'Religion requirements are prohibited.' },
  { pattern: /\bpleasing personality\b/i, key: 'appearance_language', message: '"Pleasing personality" is vague and can be discriminatory. Use specific skills instead.' },
  { pattern: /\bable[- ]bodied\b/i, key: 'disability_exclusion', message: '"Able-bodied" is exclusionary. Do not specify physical appearance unless it is a bona fide job requirement.' },
  { pattern: /\bnative speaker\b/i, key: 'native_speaker', message: '"Native speaker" should be reviewed for intent. Use "proficient in English" unless specific and justified.' },
];

export function validateAntiDiscrimination(text) {
  var t = text || '';
  var issues = [];
  var i;
  for (i = 0; i < DISCRIMINATORY_PATTERNS.length; i++) {
    var p = DISCRIMINATORY_PATTERNS[i];
    if (p.pattern.test(t)) {
      issues.push({ key: p.key, severity: 'blocking', message: p.message });
    }
  }
  return { valid: issues.length === 0, issues: issues };
}

// ── 3. Privacy/legal boilerplate detector ────────────────────────────────────
var BOILERPLATE_PATTERNS = [
  /respects your privacy/i,
  /personal information/i,
  /data privacy act/i,
  /privacy policy/i,
  /\bcollect from you\b/i,
  /pursuant to/i,
  /republic act\s+\d+/i,
  /\bRA\s+\d{4}\b/i,
];

export function detectBoilerplate(text) {
  var t = text || '';
  var found = [];
  var i;
  for (i = 0; i < BOILERPLATE_PATTERNS.length; i++) {
    if (BOILERPLATE_PATTERNS[i].test(t)) {
      found.push(BOILERPLATE_PATTERNS[i].toString());
    }
  }
  if (found.length > 0) {
    return { detected: true, issues: [{ key: 'possible_privacy_boilerplate', severity: 'blocking', message: 'Job description contains privacy or legal boilerplate text. This indicates the source content is likely a company privacy policy, not a job description.' }] };
  }
  return { detected: false, issues: [] };
}

// ── 4. Fake claims detector ───────────────────────────────────────────────────
var FAKE_CLAIM_PATTERNS = [
  { pattern: /\burgent(ly)? hiring\b/i, key: 'fake_urgency', message: 'Remove "urgently hiring" unless employer has confirmed urgent status.' },
  { pattern: /\bfast hiring\b/i, key: 'fake_fast_hiring', message: 'Remove "fast hiring" unless confirmed.' },
  { pattern: /\b\d{1,3}[k,]\d{3}\+ applicants?\b/i, key: 'fake_applicant_count', message: 'Do not include applicant count claims.' },
  { pattern: /\bverified (employer|company)\b/i, key: 'fake_verified', message: 'Do not claim "verified employer/company" status unless platform-confirmed.' },
  { pattern: /\b\d+[k+]+ (views?|applicants?|impressions?)\b/i, key: 'fake_reach', message: 'Do not include reach, view, or impression count claims.' },
  { pattern: /\bwork[- ]life balance\b/i, key: 'unverifiable_wlb', message: '"Work-life balance" is a claim that should only be used if employer specifically provides it as a stated benefit.' },
];

export function detectFakeClaims(text) {
  var t = text || '';
  var issues = [];
  var i;
  for (i = 0; i < FAKE_CLAIM_PATTERNS.length; i++) {
    var p = FAKE_CLAIM_PATTERNS[i];
    if (p.pattern.test(t)) {
      issues.push({ key: p.key, severity: 'warning', message: p.message });
    }
  }
  return { found: issues.length > 0, issues: issues };
}

// ── 5. Salary formatter validator ─────────────────────────────────────────────
export function validateSalary(min, max, currency) {
  var issues = [];
  var cur = currency || 'PHP';
  if (min !== null && min !== undefined && isNaN(Number(min))) {
    issues.push({ key: 'invalid_salary_min', severity: 'blocking', message: 'Salary minimum must be a number.' });
  }
  if (max !== null && max !== undefined && isNaN(Number(max))) {
    issues.push({ key: 'invalid_salary_max', severity: 'blocking', message: 'Salary maximum must be a number.' });
  }
  if (min && max && Number(min) > Number(max)) {
    issues.push({ key: 'salary_range_inverted', severity: 'blocking', message: 'Salary minimum is greater than maximum.' });
  }
  return { valid: issues.length === 0, issues: issues, formattedCurrency: cur };
}

// ── 6. Company mismatch detector ─────────────────────────────────────────────
var KNOWN_MISMATCHED_COMPANIES = ['san miguel', 'jollibee', 'sm prime', 'ayala', 'globe telecom', 'pldt'];

export function detectCompanyMismatch(text, expectedCompanyName) {
  var t = (text || '').toLowerCase();
  var expected = (expectedCompanyName || '').toLowerCase();
  var issues = [];
  var i;

  for (i = 0; i < KNOWN_MISMATCHED_COMPANIES.length; i++) {
    var known = KNOWN_MISMATCHED_COMPANIES[i];
    if (t.indexOf(known) !== -1 && expected && expected.indexOf(known) === -1) {
      issues.push({ key: 'possible_company_mismatch', severity: 'blocking', message: 'Generated content references "' + known + '" but employer company is "' + expectedCompanyName + '". This content may be from a different employer.' });
    }
  }

  return { found: issues.length > 0, issues: issues };
}

// ── 7. Anonymous preview leak guard ─────────────────────────────────────────
// Ensures a public-facing payload does not contain full locked content.
export function validateAnonymousPayload(payload) {
  var issues = [];
  var pl = payload || {};

  // Check that full content arrays are not present
  if (pl.content) {
    if (pl.content.responsibilities && pl.content.responsibilities.length > 3) {
      issues.push({ key: 'anonymous_preview_leak_detected', severity: 'blocking', message: 'Full responsibilities array returned to anonymous user. Redact to top 3 only.' });
    }
    if (pl.content.requiredQualifications && pl.content.requiredQualifications.length > 3) {
      issues.push({ key: 'anonymous_preview_leak_detected', severity: 'blocking', message: 'Full qualifications array returned to anonymous user. Redact to top 3 only.' });
    }
    if (pl.content.preferredQualifications && pl.content.preferredQualifications.length > 0) {
      issues.push({ key: 'anonymous_preview_leak_detected', severity: 'blocking', message: 'Preferred qualifications should not be sent to anonymous users.' });
    }
  }

  if (pl.application) {
    if (pl.application.interviewQuestionSuggestions && pl.application.interviewQuestionSuggestions.length > 0) {
      issues.push({ key: 'anonymous_preview_leak_detected', severity: 'blocking', message: 'Interview question suggestions should not be returned to anonymous users.' });
    }
  }

  return { valid: issues.length === 0, issues: issues };
}

// ── 8. XSS / injection sanitizer ─────────────────────────────────────────────
export function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .trim();
}

export function sanitizeInputs(inputs) {
  if (!inputs) return {};
  var safe = {};
  var keys = Object.keys(inputs);
  var i;
  for (i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = inputs[k];
    if (typeof v === 'string') safe[k] = sanitizeText(v);
    else if (Array.isArray(v)) safe[k] = v.map(function(item) { return typeof item === 'string' ? sanitizeText(item) : item; });
    else safe[k] = v;
  }
  return safe;
}

// ── 9. Prompt injection detector ──────────────────────────────────────────────
var INJECTION_PATTERNS = [
  /ignore (previous|above|prior) instructions?/i,
  /you are now/i,
  /act as (a|an|the)/i,
  /disregard (your|all|the)/i,
  /system prompt/i,
  /jailbreak/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
];

export function detectPromptInjection(text) {
  var t = text || '';
  var i;
  for (i = 0; i < INJECTION_PATTERNS.length; i++) {
    if (INJECTION_PATTERNS[i].test(t)) {
      return { detected: true, issue: { key: 'unsafe_script_or_html_detected', severity: 'blocking', message: 'Input contains potential prompt injection or unsafe content. Request rejected.' } };
    }
  }
  return { detected: false };
}

// ── 10. Full input validation pipeline ───────────────────────────────────────
export function validateGenerationInputs(inputs) {
  var allIssues = [];
  var valid = true;
  var sanitized = sanitizeInputs(inputs);

  // Prompt injection check on all string inputs
  var injectCheck = detectPromptInjection(JSON.stringify(inputs));
  if (injectCheck.detected) {
    return { valid: false, issues: [injectCheck.issue], sanitized: sanitized };
  }

  // Title validation
  var titleResult = validateTitle(sanitized.jobTitle);
  if (!titleResult.valid) valid = false;
  allIssues = allIssues.concat(titleResult.issues);

  // Salary validation
  if (sanitized.salaryMin !== null || sanitized.salaryMax !== null) {
    var salaryResult = validateSalary(sanitized.salaryMin, sanitized.salaryMax, sanitized.salaryCurrency);
    if (!salaryResult.valid) valid = false;
    allIssues = allIssues.concat(salaryResult.issues);
  }

  return { valid: valid, issues: allIssues, sanitized: sanitized };
}
