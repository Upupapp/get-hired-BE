/**
 * Instant Job Ad Generator V4
 * Composes hiring intent + role templates + variation into a structured draft.
 * SYNTAX: no ?. or ?? — Node 14 ESM safe.
 *
 * Input:  { inputs, hiringIntent, template }
 * Output: structured draft V4 object per GETHIRED_INSTANT_JOB_AD_STRUCTURED_DRAFT_CONTRACT_V4
 */

import { getRoleTemplate } from './roleTemplateLibraryV4';

// ── Variation profiles ────────────────────────────────────────────────────────
var VARIATION_PROFILES = [
  'standard_candidate_friendly',
  'senior_operations_leadership',
  'field_activation_civic_tech',
  'technical_delivery',
  'customer_service_bpo',
  'finance_reporting_analysis',
];

var VARIATION_BY_FAMILY = {
  events_field_activation: 'field_activation_civic_tech',
  finance_accounting: 'finance_reporting_analysis',
  customer_service_bpo: 'customer_service_bpo',
  it_software_data: 'technical_delivery',
  lgu_civic_technology: 'field_activation_civic_tech',
  executive_leadership: 'senior_operations_leadership',
};

function selectVariationProfile(familyId, seniority) {
  if (seniority === 'senior' || seniority === 'manager') {
    return VARIATION_BY_FAMILY[familyId] || 'senior_operations_leadership';
  }
  return VARIATION_BY_FAMILY[familyId] || 'standard_candidate_friendly';
}

// ── Role summary generators ───────────────────────────────────────────────────
function buildRoleSummary(inputs, intent, template, variationProfile) {
  var title = (inputs && inputs.jobTitle) || 'professional';
  var company = (inputs && inputs.companyName) || 'our team';
  var industry = (inputs && inputs.industry) || '';
  var workSetup = (intent && intent.resolvedWorkSetup) || '';
  var employmentType = (intent && intent.resolvedEmploymentType) || '';
  var outcome = (intent && intent.primaryOutcome) || '';
  var profile = (intent && intent.candidateProfile) || '';

  var isLGU = /lgu|government|civic|public sector/i.test(industry) || (intent && intent.roleFamilyId === 'lgu_civic_technology');
  var workSetupPhrase = '';
  if (workSetup === 'Remote') workSetupPhrase = ' (Remote)';
  else if (workSetup === 'Hybrid') workSetupPhrase = ' (Hybrid)';

  if (variationProfile === 'field_activation_civic_tech' && isLGU) {
    return 'We are looking for a ' + title + workSetupPhrase + ' to support ' + company + '\'s initiatives through well-planned coordination, stakeholder engagement, and execution. ' + outcome + ' ' + profile;
  }

  if (variationProfile === 'technical_delivery') {
    return 'We are hiring a ' + title + workSetupPhrase + ' to join ' + company + '. In this role, you will ' + outcome.toLowerCase() + ' ' + profile;
  }

  if (variationProfile === 'senior_operations_leadership') {
    return 'We are seeking an experienced ' + title + workSetupPhrase + ' to lead and drive results for ' + company + '. This is a senior role responsible for ' + outcome.toLowerCase() + ' ' + profile;
  }

  if (variationProfile === 'finance_reporting_analysis') {
    return 'We are looking for a ' + title + workSetupPhrase + ' to support ' + company + '\'s financial operations. ' + outcome + ' ' + profile;
  }

  if (variationProfile === 'customer_service_bpo') {
    return 'We are hiring a ' + title + workSetupPhrase + ' to deliver outstanding customer experience at ' + company + '. ' + outcome + ' ' + profile;
  }

  // standard_candidate_friendly (default)
  return 'We are looking for a ' + title + workSetupPhrase + ' to join ' + company + '. ' + outcome + ' ' + profile;
}

// ── Item selection helpers ────────────────────────────────────────────────────
function selectItems(bank, count) {
  if (!bank || bank.length === 0) return [];
  if (bank.length <= count) return bank.slice();
  return bank.slice(0, count);
}

function selectSkills(skills, count) {
  if (!skills || skills.length === 0) return [];
  return skills.slice(0, count);
}

// ── Location formatter ────────────────────────────────────────────────────────
function parseLocation(location) {
  if (!location) return { city: '', province: '', country: 'Philippines', label: '' };
  var parts = location.split(',').map(function(p) { return p.trim(); });
  var city = parts[0] || '';
  var province = parts[1] || '';
  var country = parts[2] || 'Philippines';
  var label = [city, province, country].filter(Boolean).join(', ');
  return { city: city, province: province, country: country, label: label };
}

// ── Salary formatter ──────────────────────────────────────────────────────────
function formatSalaryLabel(min, max, currency) {
  var cur = currency || 'PHP';
  var fmt = function(n) {
    if (!n) return '';
    return Number(n).toLocaleString();
  };
  if (min && max) return cur + ' ' + fmt(min) + '–' + fmt(max);
  if (min) return 'From ' + cur + ' ' + fmt(min);
  if (max) return 'Up to ' + cur + ' ' + fmt(max);
  return '';
}

// ── Badge suggestion builder ──────────────────────────────────────────────────
function buildBadgeSuggestions(inputs, intent, template) {
  var suggestions = [];
  var hasSalary = !!(inputs && (inputs.salaryMin || inputs.salaryMax));
  var hasBenefits = !!(inputs && inputs.benefitsProvided && inputs.benefitsProvided.length > 0);
  var workSetup = (intent && intent.resolvedWorkSetup) || '';
  var industry = (inputs && inputs.industry) || '';
  var isLGU = /lgu|government|civic/i.test(industry) || (intent && intent.roleFamilyId === 'lgu_civic_technology');
  var rules = (template && template.badgeSuggestionRules) || [];

  var i;
  for (i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule) continue;
    var condition = rule.condition || '';
    var include = false;
    if (condition === 'always') include = true;
    else if (condition === 'if salary supplied' && hasSalary) include = true;
    else if (condition === 'if benefits supplied' && hasBenefits) include = true;
    else if (/civic|lgu|public-sector/.test(condition) && isLGU) include = true;
    else if (/remote/.test(condition) && workSetup === 'Remote') include = true;
    else if (/hybrid/.test(condition) && workSetup === 'Hybrid') include = true;
    if (include) suggestions.push({ badge: rule.badge, requiresReview: false });
  }

  return suggestions;
}

// ── Review flag builder ───────────────────────────────────────────────────────
function buildReviewFlags(inputs, intent, template, intentReviewFlags) {
  var flags = (intentReviewFlags || []).slice();
  var hasSalary = !!(inputs && (inputs.salaryMin || inputs.salaryMax));
  var hasBenefits = !!(inputs && inputs.benefitsProvided && inputs.benefitsProvided.length > 0);
  var hasSchedule = !!(inputs && inputs.schedule);

  if (!hasSalary) flags.push({ key: 'salary_missing', severity: 'info', section: 'basics', message: 'No salary provided. Adding salary increases application rates.', blocksPublish: false });
  if (!hasBenefits) flags.push({ key: 'benefits_missing', severity: 'info', section: 'basics', message: 'No benefits listed. Consider adding benefits to attract better candidates.', blocksPublish: false });
  if (!hasSchedule) flags.push({ key: 'schedule_missing', severity: 'info', section: 'basics', message: 'No schedule specified. Consider adding working hours.', blocksPublish: false });

  flags.push({ key: 'generated_content_review_required', severity: 'warning', section: 'content', message: 'This job draft was generated from inputs. Review all sections before publishing.', blocksPublish: false });
  flags.push({ key: 'interview_questions_review_needed', severity: 'info', section: 'application', message: 'Interview question suggestions are for review only. Activate only if needed.', blocksPublish: false });
  flags.push({ key: 'video_questions_review_needed', severity: 'info', section: 'application', message: 'Video question suggestions are for review only. Do not activate without employer review.', blocksPublish: false });
  flags.push({ key: 'badges_need_confirmation', severity: 'info', section: 'branding', message: 'Badge suggestions require employer confirmation before being set as public.', blocksPublish: false });

  return flags;
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateStructuredDraft(inputs, hiringIntent) {
  var familyId = (hiringIntent && hiringIntent.roleFamilyId) || '_fallback';
  var template = getRoleTemplate(familyId);
  var seniority = (hiringIntent && hiringIntent.likelySeniority) || 'specialist';
  var variationProfile = selectVariationProfile(familyId, seniority);

  // How many items to use based on seniority
  var itemCounts = {
    responsibilities: seniority === 'entry' ? 5 : seniority === 'senior' || seniority === 'manager' ? 8 : 6,
    required: seniority === 'entry' ? 4 : seniority === 'senior' || seniority === 'manager' ? 6 : 5,
    preferred: 3,
    skills: seniority === 'entry' ? 6 : 10,
    interviewQ: seniority === 'entry' ? 3 : 4,
  };

  var roleSummary = buildRoleSummary(inputs, hiringIntent, template, variationProfile);
  var responsibilities = selectItems(template.responsibilitiesBank, itemCounts.responsibilities);
  var requiredQualifications = selectItems(template.requiredQualificationsBank, itemCounts.required);
  var preferredQualifications = selectItems(template.preferredQualificationsBank, itemCounts.preferred);
  var skills = selectSkills(template.skills, itemCounts.skills);
  var tools = selectSkills(template.tools, 5);
  var interviewSuggestions = selectItems(template.interviewQuestionBank, itemCounts.interviewQ);
  var videoSuggestions = selectItems(template.videoPromptBank, 2);
  var badgeSuggestions = buildBadgeSuggestions(inputs, hiringIntent, template);
  var reviewFlags = buildReviewFlags(inputs, hiringIntent, template, (hiringIntent && hiringIntent.reviewFlags) || []);

  var location = parseLocation(inputs && inputs.location);
  var salaryMin = (inputs && inputs.salaryMin) || null;
  var salaryMax = (inputs && inputs.salaryMax) || null;
  var salaryCurrency = (inputs && inputs.salaryCurrency) || 'PHP';
  var salaryLabel = formatSalaryLabel(salaryMin, salaryMax, salaryCurrency);
  var normalizedTitle = (hiringIntent && hiringIntent.normalizedTitle) || (inputs && inputs.jobTitle) || '';
  var companyName = (inputs && inputs.companyName) || '';

  var completeness = 'draft_ready';
  var i;
  for (i = 0; i < reviewFlags.length; i++) {
    if (reviewFlags[i].severity === 'blocking') { completeness = 'blocked'; break; }
  }

  // Confidence map
  var confidenceByField = {
    'basics.jobTitle': (hiringIntent && hiringIntent.confidence) || 'medium',
    'hiringIntent.roleFamily': (hiringIntent && hiringIntent.confidence) || 'medium',
    'content.roleSummary': 'medium',
    'content.responsibilities': 'medium',
    'content.requiredQualifications': 'medium',
    'content.skills': 'medium',
  };

  // Source map
  var sourceByField = {
    'basics.jobTitle': 'employer_input',
    'basics.jobLocation': 'employer_input',
    'basics.workSetup': 'employer_input',
    'basics.employmentType': 'employer_input',
    'hiringIntent': 'hiring_intent_resolver_v4',
    'content.roleSummary': 'role_template_v4',
    'content.responsibilities': 'role_template_v4',
    'content.requiredQualifications': 'role_template_v4',
    'content.preferredQualifications': 'role_template_v4',
    'content.skills': 'role_template_v4',
    'application.interviewQuestionSuggestions': 'role_template_v4',
    'application.videoQuestionSuggestions': 'role_template_v4',
    'branding.badgeSuggestions': 'badge_eligibility_rules_v4',
  };

  return {
    version: 'instant_job_ad_v4',
    source: (inputs && inputs.sourceRoute) || 'employer_portal',
    referenceProfile: {
      jobContentSources: ['GetHired field schema', 'role template library v4'],
      occupationalSources: ['O*NET-style task classification', 'Philippine job market synonyms'],
      structuredHiringSources: ['competency-based interview patterns'],
      fairnessSources: ['EEOC-style safeguards', 'PH RA 10911 age-discrimination guard'],
      seoSources: ['Schema.org JobPosting candidate fields'],
      securitySources: ['OWASP API Security', 'BOLA guard pattern'],
      accessibilitySources: ['WCAG 2.2'],
    },
    inputs: {
      jobTitle: (inputs && inputs.jobTitle) || '',
      location: (inputs && inputs.location) || '',
      workSetup: (inputs && inputs.workSetup) || '',
      employmentType: (inputs && inputs.employmentType) || '',
      companyName: companyName,
      industry: (inputs && inputs.industry) || '',
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency,
      benefitsProvided: (inputs && inputs.benefitsProvided) || [],
      schedule: (inputs && inputs.schedule) || null,
      sourceRoute: (inputs && inputs.sourceRoute) || 'employer_portal',
    },
    hiringIntent: {
      roleFamily: (hiringIntent && hiringIntent.roleFamily) || '',
      roleSubfamily: (hiringIntent && hiringIntent.roleSubfamily) || null,
      likelyRoleOutcome: (hiringIntent && hiringIntent.primaryOutcome) || '',
      likelyDayToDayWork: (hiringIntent && hiringIntent.coreCapabilities) || [],
      likelyMustHaveCapabilities: (hiringIntent && hiringIntent.coreCapabilities) || [],
      likelyCandidateProfile: (hiringIntent && hiringIntent.candidateProfile) || '',
      likelySeniority: seniority,
      possibleAlternativeIntents: (hiringIntent && hiringIntent.alternativeIntents) || [],
      intentConfidence: (hiringIntent && hiringIntent.confidence) || 'medium',
      clarificationQuestions: (hiringIntent && hiringIntent.clarificationQuestions) || [],
    },
    basics: {
      jobTitle: normalizedTitle,
      normalizedTitle: normalizedTitle,
      seniority: seniority,
      industry: (inputs && inputs.industry) || '',
      employmentType: (inputs && inputs.employmentType) || '',
      workSetup: (hiringIntent && hiringIntent.resolvedWorkSetup) || (inputs && inputs.workSetup) || '',
      jobLocation: location,
      openings: (inputs && inputs.openings) || null,
    },
    content: {
      roleSummary: roleSummary,
      responsibilities: responsibilities,
      requiredQualifications: requiredQualifications,
      preferredQualifications: preferredQualifications,
      skills: skills,
      tools: tools,
      education: null,
      experience: null,
      certifications: [],
      benefits: (inputs && inputs.benefitsProvided) || [],
      schedule: (inputs && inputs.schedule) || null,
      workingConditions: [],
    },
    application: {
      cvRequired: true,
      profileRequired: true,
      documentRequirements: [],
      employerQuestionSuggestions: [],
      interviewQuestionSuggestions: interviewSuggestions,
      videoQuestionSuggestions: videoSuggestions,
      applicationStepsPreview: ['Create a GetHired profile', 'Upload your CV', 'Answer interview questions (if enabled)', 'Submit application'],
    },
    branding: {
      badgeSuggestions: badgeSuggestions,
      mediaSuggestions: ['Add a company banner image to make your job post stand out.'],
      companyProfileSuggestions: companyName ? ['Ensure your company profile is complete to build trust with applicants.'] : ['Add your company name and profile to increase application rates.'],
    },
    publicDisplay: {
      jobCard: {
        title: normalizedTitle,
        companyName: companyName,
        locationLabel: location.label,
        workSetupLabel: (hiringIntent && hiringIntent.resolvedWorkSetup) || '',
        employmentTypeLabel: (inputs && inputs.employmentType) || '',
        salaryLabel: salaryLabel,
        badges: badgeSuggestions.slice(0, 2).map(function(b) { return b.badge; }),
      },
      jobDetail: {
        heroTitle: normalizedTitle,
        summary: roleSummary,
        snapshotFacts: [
          { label: 'Job type', value: (inputs && inputs.employmentType) || '' },
          { label: 'Work setup', value: (hiringIntent && hiringIntent.resolvedWorkSetup) || '' },
          { label: 'Location', value: location.label },
          { label: 'Salary', value: salaryLabel || 'Not disclosed' },
        ],
        applicationRequirements: ['GetHired profile', 'CV/resume'],
        companyTrustFields: [],
      },
      seo: {
        titleCandidate: normalizedTitle + (location.city ? ' — ' + location.city : '') + ' | GetHired Online',
        descriptionCandidate: roleSummary.substring(0, 155),
        jobPostingEligibleAfterPublish: false,
      },
    },
    quality: {
      completeness: completeness,
      reviewFlags: reviewFlags,
      blockedClaimsRemoved: [],
      missingRecommendedFields: [
        ...(salaryMin || salaryMax ? [] : ['salary']),
        ...(inputs && inputs.benefitsProvided && inputs.benefitsProvided.length ? [] : ['benefits']),
      ],
      confidenceByField: confidenceByField,
      sourceByField: sourceByField,
      variationProfile: variationProfile,
    },
    security: {
      anonymousPreviewSafe: true,
      fullContentReturnedToAnonymous: false,
      requiresEmployerClaim: true,
    },
  };
}

// ── Anonymous redaction ───────────────────────────────────────────────────────
// Returns a safe partial preview for anonymous (non-authenticated) users.
// Full content is never sent — locked sections are placeholders only.
export function redactForAnonymous(draft) {
  if (!draft) return null;
  var content = draft.content || {};
  var resp = content.responsibilities || [];
  var req = content.requiredQualifications || [];

  return {
    version: draft.version,
    basics: draft.basics,
    hiringIntent: {
      roleFamily: (draft.hiringIntent && draft.hiringIntent.roleFamily) || '',
      likelyRoleOutcome: (draft.hiringIntent && draft.hiringIntent.likelyRoleOutcome) || '',
      intentConfidence: (draft.hiringIntent && draft.hiringIntent.intentConfidence) || '',
      clarificationQuestions: (draft.hiringIntent && draft.hiringIntent.clarificationQuestions) || [],
    },
    publicDisplay: draft.publicDisplay,
    preview: {
      roleSummary: content.roleSummary || '',
      topResponsibilities: resp.slice(0, 3),
      topRequiredQualifications: req.slice(0, 3),
      applicationStepsPreview: (draft.application && draft.application.applicationStepsPreview) || [],
      lockedSections: [
        { id: 'responsibilities_full', label: 'Full responsibilities list', count: Math.max(0, resp.length - 3) },
        { id: 'required_qualifications_full', label: 'All required qualifications', count: Math.max(0, req.length - 3) },
        { id: 'preferred_qualifications', label: 'Preferred qualifications', count: (content.preferredQualifications || []).length },
        { id: 'skills_tools', label: 'Skills & tools', count: ((content.skills || []).length + (content.tools || []).length) },
        { id: 'interview_questions', label: 'Interview question suggestions' },
        { id: 'badge_suggestions', label: 'Job branding & badge suggestions' },
      ],
    },
    quality: {
      completeness: (draft.quality && draft.quality.completeness) || '',
      reviewFlagCount: ((draft.quality && draft.quality.reviewFlags) || []).length,
    },
    security: draft.security,
    cta: {
      primary: 'Create an employer account to edit, save, and publish this job.',
      secondary: 'Sign in to your employer account',
    },
  };
}
