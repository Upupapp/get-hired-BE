/**
 * Hiring Intent Resolver V4
 * Deterministic rule-based classification — no external AI.
 * SYNTAX: no ?. or ?? — Node 14 ESM safe.
 *
 * Input:  { jobTitle, workSetup, employmentType, companyName, industry }
 * Output: { roleFamily, roleSubfamily, likelySeniority, primaryOutcome,
 *           candidateProfile, dayToDayTasks[], coreCapabilities[],
 *           likelyTools[], likelyApplicationNeeds[], reviewFlags[],
 *           confidence, alternativeIntents[] }
 */

// ── Seniority keyword tables ─────────────────────────────────────────────────
var SENIOR_PREFIXES = ['senior', 'sr.', 'sr ', 'lead', 'principal', 'head of', 'chief', 'director', 'vp ', 'vice president'];
var MID_PREFIXES    = ['specialist', 'associate', 'mid ', 'experienced'];
var JUNIOR_PREFIXES = ['junior', 'jr.', 'jr ', 'entry', 'trainee', 'intern', 'graduate', 'fresh'];
var MANAGER_SUFFIXES = ['manager', 'supervisor', 'team lead', 'team leader'];

function classifySeniority(title) {
  var t = (title || '').toLowerCase();
  var i;
  for (i = 0; i < SENIOR_PREFIXES.length; i++) {
    if (t.indexOf(SENIOR_PREFIXES[i]) !== -1) return 'senior';
  }
  for (i = 0; i < JUNIOR_PREFIXES.length; i++) {
    if (t.indexOf(JUNIOR_PREFIXES[i]) !== -1) return 'entry';
  }
  for (i = 0; i < MANAGER_SUFFIXES.length; i++) {
    if (t.indexOf(MANAGER_SUFFIXES[i]) !== -1) return 'manager';
  }
  for (i = 0; i < MID_PREFIXES.length; i++) {
    if (t.indexOf(MID_PREFIXES[i]) !== -1) return 'associate';
  }
  return 'specialist';
}

// ── Role family classification table ─────────────────────────────────────────
var ROLE_FAMILIES = [
  {
    id: 'events_field_activation',
    label: 'Events / Field Activation',
    keywords: ['event manager', 'event planner', 'event coordinator', 'event specialist', 'events officer',
      'field activation', 'activations', 'roadshow', 'trade show', 'exhibit', 'launch manager',
      'convention', 'conference manager', 'campaign execution'],
    ambiguous: false,
  },
  {
    id: 'finance_accounting',
    label: 'Finance / Accounting',
    keywords: ['finance', 'financial', 'accounting', 'accountant', 'audit', 'auditor', 'treasury',
      'budget', 'controller', 'bookkeeper', 'bookkeeping', 'payroll', 'tax', 'cpa',
      'accounts payable', 'accounts receivable', 'cost accountant', 'general ledger', 'finance analyst', 'finance officer'],
    ambiguous: false,
  },
  {
    id: 'customer_service_bpo',
    label: 'Customer Service / BPO',
    keywords: ['csr', 'customer service', 'customer support', 'customer care', 'call center', 'bpo',
      'help desk', 'helpdesk', 'service desk', 'contact center', 'technical support', 'tier 1', 'tier 2',
      'customer rep', 'service representative'],
    ambiguous: false,
  },
  {
    id: 'it_software_data',
    label: 'IT / Software / Data',
    keywords: ['developer', 'programmer', 'software engineer', 'full stack', 'fullstack', 'frontend', 'back end',
      'backend', 'web developer', 'mobile developer', 'ios developer', 'android developer', 'devops',
      'data engineer', 'data scientist', 'machine learning', 'ai engineer', 'cloud engineer',
      'systems analyst', 'network engineer', 'database admin', 'qa engineer', 'test engineer',
      'it specialist', 'it administrator', 'it support', 'technical lead', 'tech lead', 'angular', 'react developer'],
    ambiguous: false,
  },
  {
    id: 'hr_recruitment',
    label: 'HR / Recruitment',
    keywords: ['hr ', 'human resources', 'recruiter', 'recruitment', 'talent acquisition',
      'people operations', 'people & culture', 'hris', 'learning and development', 'l&d',
      'compensation and benefits', 'c&b', 'organizational development', 'hr generalist',
      'hr business partner', 'hrbp', 'sourcing specialist', 'talent management'],
    ambiguous: false,
  },
  {
    id: 'lgu_civic_technology',
    label: 'Government / LGU / Civic Technology',
    keywords: ['lgu', 'local government', 'government', 'municipal', 'barangay', 'public sector',
      'civic', 'public service', 'city hall', 'provincial', 'government liaison', 'public administration'],
    ambiguous: true,
  },
  {
    id: 'administration_office',
    label: 'Administration / Office',
    keywords: ['admin assistant', 'administrative assistant', 'executive assistant', 'office administrator',
      'secretary', 'receptionist', 'office clerk', 'data entry', 'encoder', 'clerical',
      'front desk', 'document controller', 'records officer'],
    ambiguous: false,
  },
  {
    id: 'sales_business_dev',
    label: 'Sales / Business Development',
    keywords: ['sales', 'business development', 'account executive', 'sales representative', 'sales agent',
      'territory', 'business dev', 'bd manager', 'partnership', 'revenue', 'outbound', 'inside sales',
      'sales consultant', 'sales officer'],
    ambiguous: false,
  },
  {
    id: 'marketing_communications',
    label: 'Marketing / Communications',
    keywords: ['marketing', 'brand', 'content', 'seo', 'digital marketing', 'social media', 'communications',
      'marketing manager', 'marketing specialist', 'campaign manager', 'pr ', 'public relations',
      'copywriter', 'marketing officer', 'media'],
    ambiguous: false,
  },
  {
    id: 'operations_logistics',
    label: 'Operations / Logistics',
    keywords: ['operations', 'logistics', 'supply chain', 'warehouse', 'distribution', 'fulfillment',
      'fleet', 'inventory', 'purchasing', 'process improvement', 'ops manager', 'operations manager',
      'operations officer'],
    ambiguous: true,
  },
  {
    id: 'project_product_mgmt',
    label: 'Product / Project Management',
    keywords: ['project manager', 'program manager', 'project coordinator', 'product manager', 'scrum master',
      'agile', 'pmo', 'project officer', 'implementation manager', 'delivery manager',
      'project management'],
    ambiguous: false,
  },
  {
    id: 'customer_success',
    label: 'Customer Success / Account Management',
    keywords: ['customer success', 'account manager', 'client success', 'client relations', 'account management',
      'onboarding specialist', 'client servicing', 'relationship manager'],
    ambiguous: false,
  },
  {
    id: 'healthcare_wellness',
    label: 'Healthcare / Wellness',
    keywords: ['nurse', 'doctor', 'physician', 'medical', 'clinical', 'pharmacist', 'therapist',
      'healthcare', 'wellness', 'dental', 'radiologist', 'paramedic', 'care coordinator'],
    ambiguous: false,
  },
  {
    id: 'education_training',
    label: 'Education / Training',
    keywords: ['teacher', 'instructor', 'trainer', 'faculty', 'professor', 'curriculum', 'educator',
      'learning specialist', 'e-learning', 'tutor', 'coach', 'facilitator'],
    ambiguous: false,
  },
  {
    id: 'executive_leadership',
    label: 'Executive / Leadership',
    keywords: ['ceo', 'coo', 'cfo', 'cto', 'chief ', 'executive director', 'president', 'general manager',
      'managing director', 'country manager', 'vp ', 'vice president'],
    ambiguous: false,
  },
  {
    id: 'creative_design_content',
    label: 'Creative / Design / Content',
    keywords: ['graphic designer', 'ui designer', 'ux designer', 'ui/ux', 'visual designer', 'content creator',
      'video editor', 'photographer', 'videographer', 'animator', 'illustrator', 'creative director',
      'art director', 'copywriter'],
    ambiguous: false,
  },
  {
    id: 'legal_compliance',
    label: 'Legal / Compliance',
    keywords: ['lawyer', 'attorney', 'legal', 'compliance', 'paralegal', 'corporate secretary',
      'regulatory', 'risk and compliance', 'data privacy'],
    ambiguous: false,
  },
  {
    id: 'procurement_supply_chain',
    label: 'Procurement / Supply Chain',
    keywords: ['procurement', 'purchasing', 'buyer', 'sourcing', 'vendor management', 'supply chain', 'p2p'],
    ambiguous: false,
  },
  {
    id: 'retail_store_ops',
    label: 'Retail / Store Operations',
    keywords: ['store manager', 'retail', 'branch manager', 'merchandiser', 'cashier', 'sales associate',
      'store associate', 'shop', 'outlet'],
    ambiguous: false,
  },
  {
    id: 'real_estate_property',
    label: 'Real Estate / Property',
    keywords: ['real estate', 'property', 'leasing', 'property manager', 'broker', 'realty'],
    ambiguous: false,
  },
  {
    id: 'social_media_community',
    label: 'Social Media / Community',
    keywords: ['social media manager', 'community manager', 'content strategist', 'influencer', 'social media specialist'],
    ambiguous: false,
  },
  {
    id: 'data_analytics',
    label: 'Data / Analytics',
    keywords: ['data analyst', 'business analyst', 'analytics', 'bi analyst', 'tableau', 'power bi', 'insights analyst'],
    ambiguous: false,
  },
  {
    id: 'field_sales_merchandising',
    label: 'Field Sales / Merchandising',
    keywords: ['field sales', 'promoter', 'merchandiser', 'brand ambassador', 'demo specialist', 'trade marketing'],
    ambiguous: false,
  },
  {
    id: 'construction_engineering',
    label: 'Construction / Engineering',
    keywords: ['civil engineer', 'structural', 'architect', 'mechanical engineer', 'electrical engineer',
      'project engineer', 'construction manager', 'site engineer', 'estimator'],
    ambiguous: false,
  },
  {
    id: 'hospitality_tourism',
    label: 'Hospitality / Tourism',
    keywords: ['hotel', 'front office', 'concierge', 'hospitality', 'tourism', 'travel agent', 'housekeeping', 'f&b'],
    ambiguous: false,
  },
  {
    id: 'manufacturing_production',
    label: 'Manufacturing / Production',
    keywords: ['production', 'manufacturing', 'plant', 'quality control', 'qc', 'line supervisor', 'process engineer'],
    ambiguous: false,
  },
  {
    id: 'security_safety',
    label: 'Security / Safety',
    keywords: ['security guard', 'safety officer', 'security officer', 'health and safety', 'hse', 'loss prevention'],
    ambiguous: false,
  },
  {
    id: 'transportation_fleet',
    label: 'Transportation / Fleet',
    keywords: ['driver', 'fleet', 'transport', 'logistics coordinator', 'delivery', 'dispatcher'],
    ambiguous: false,
  },
  {
    id: 'business_process',
    label: 'Business Process / Back Office',
    keywords: ['back office', 'process analyst', 'process associate', 'bpo analyst', 'data processing', 'operations associate'],
    ambiguous: false,
  },
  {
    id: 'training_implementation',
    label: 'Training / Implementation / Onboarding',
    keywords: ['implementation specialist', 'onboarding specialist', 'deployment specialist', 'integration specialist',
      'technical trainer', 'product trainer'],
    ambiguous: false,
  },
];

// ── Role family alternative intent hints ─────────────────────────────────────
var ALTERNATIVE_INTENT_HINTS = {
  'operations_logistics': ['General operations', 'Logistics/distribution', 'Process improvement', 'Business operations'],
  'lgu_civic_technology': ['Government liaison', 'Civic technology', 'Public administration', 'LGU project coordination'],
  'project_product_mgmt': ['IT project management', 'Business project coordination', 'Product management', 'Agile delivery'],
};

var AMBIGUOUS_TITLES = ['assistant', 'associate', 'officer', 'specialist', 'coordinator', 'staff', 'analyst', 'manager'];

// ── Primary outcome patterns by role family ───────────────────────────────────
var OUTCOME_PATTERNS = {
  events_field_activation: 'Plan and execute events, demos, launches, trainings, roadshows, and stakeholder activations.',
  finance_accounting: 'Support financial reporting, analysis, budgeting, reconciliation, and decision-support.',
  customer_service_bpo: 'Handle customer inquiries, resolve issues, and deliver consistent service quality across channels.',
  it_software_data: 'Build, maintain, test, and improve software features, APIs, databases, and integrations.',
  hr_recruitment: 'Source, screen, and hire talent while supporting employee experience and HR operations.',
  lgu_civic_technology: 'Coordinate government or civic technology projects, stakeholder engagement, and rollout support.',
  administration_office: 'Provide administrative support, document control, scheduling, and office coordination.',
  sales_business_dev: 'Generate leads, close deals, and grow revenue through consultative selling and relationship management.',
  marketing_communications: 'Plan and execute marketing campaigns, content, and brand communications across channels.',
  operations_logistics: 'Manage operational workflows, logistics, supply chain, and process efficiency.',
  project_product_mgmt: 'Plan, track, and deliver projects or product features on time and within scope.',
  customer_success: 'Onboard, retain, and grow customer accounts through proactive support and relationship management.',
  healthcare_wellness: 'Deliver patient care, clinical services, or health and wellness support.',
  education_training: 'Design and deliver learning programs, training, or educational content.',
  executive_leadership: 'Provide strategic leadership, drive organizational goals, and lead teams to results.',
  creative_design_content: 'Create compelling visual, content, or design assets that support brand and communication goals.',
  legal_compliance: 'Ensure regulatory compliance, manage legal documentation, and support corporate governance.',
  procurement_supply_chain: 'Source suppliers, manage vendor relationships, and optimize procurement processes.',
  retail_store_ops: 'Manage store operations, drive sales targets, and deliver excellent customer experience.',
  real_estate_property: 'Support property sales, leasing, management, or real estate transactions.',
  social_media_community: 'Grow brand presence and community engagement through social media and content strategy.',
  data_analytics: 'Collect, analyze, and visualize data to support business decisions and insights.',
  field_sales_merchandising: 'Execute field sales, brand activations, and in-store merchandising activities.',
  construction_engineering: 'Manage engineering, construction, or design work to deliver infrastructure or building projects.',
  hospitality_tourism: 'Provide exceptional guest experiences and hospitality operations support.',
  manufacturing_production: 'Manage production processes, quality control, and manufacturing operations.',
  security_safety: 'Maintain safety protocols, security operations, and risk mitigation in the workplace.',
  transportation_fleet: 'Manage fleet operations, vehicle scheduling, and transportation logistics.',
  business_process: 'Process transactions, manage back-office workflows, and support operational accuracy.',
  training_implementation: 'Deploy, train, and support clients through product implementation and onboarding.',
};

// ── Candidate profile patterns ────────────────────────────────────────────────
var CANDIDATE_PROFILES = {
  events_field_activation: 'An experienced events professional who can manage vendors, timelines, onsite execution, and stakeholder coordination.',
  finance_accounting: 'A finance or accounting professional with strong analytical skills and attention to detail in reporting and reconciliation.',
  customer_service_bpo: 'A service-oriented communicator who can handle customer inquiries with empathy, accuracy, and efficiency.',
  it_software_data: 'A technical professional who builds reliable, maintainable software and enjoys solving complex engineering problems.',
  hr_recruitment: 'An HR professional with strong interpersonal skills and experience managing the full recruitment or employee lifecycle.',
  lgu_civic_technology: 'A coordinator with experience in public sector or civic technology projects, stakeholder engagement, and project documentation.',
  administration_office: 'An organized, proactive professional who keeps office operations running smoothly and supports leadership effectively.',
  sales_business_dev: 'A results-driven sales professional who builds relationships, identifies opportunities, and closes deals.',
  marketing_communications: 'A creative and data-driven marketer who executes campaigns and communicates brand value across channels.',
  operations_logistics: 'An operations professional who designs and manages workflows to improve efficiency and service delivery.',
  project_product_mgmt: 'A structured project or product professional who keeps teams aligned, tracks progress, and removes blockers.',
  customer_success: 'A customer-focused professional who builds long-term relationships, drives adoption, and reduces churn.',
  healthcare_wellness: 'A licensed or experienced healthcare professional committed to patient care and clinical excellence.',
  education_training: 'An educator or trainer who designs engaging learning experiences and measures impact.',
  executive_leadership: 'A strategic leader who sets direction, builds teams, and drives organizational performance.',
};

// ── Core capabilities by role family ─────────────────────────────────────────
var CORE_CAPABILITIES = {
  events_field_activation: ['event planning', 'vendor management', 'logistics coordination', 'stakeholder management', 'onsite operations', 'budget tracking'],
  finance_accounting: ['financial reporting', 'data analysis', 'reconciliation', 'budgeting', 'forecasting', 'attention to detail'],
  customer_service_bpo: ['communication', 'customer handling', 'issue resolution', 'documentation', 'empathy', 'process adherence'],
  it_software_data: ['programming', 'debugging', 'system design', 'code review', 'API development', 'database management'],
  hr_recruitment: ['sourcing', 'screening', 'interviewing', 'onboarding', 'HR operations', 'employee relations'],
  lgu_civic_technology: ['stakeholder coordination', 'project documentation', 'communication', 'scheduling', 'reporting', 'follow-through'],
  administration_office: ['organization', 'scheduling', 'documentation', 'communication', 'file management', 'data entry'],
  sales_business_dev: ['prospecting', 'relationship management', 'negotiation', 'closing', 'pipeline management', 'communication'],
  marketing_communications: ['campaign management', 'content creation', 'brand communication', 'digital marketing', 'analytics', 'storytelling'],
  operations_logistics: ['process improvement', 'logistics coordination', 'inventory management', 'supplier management', 'reporting'],
  project_product_mgmt: ['project planning', 'risk management', 'stakeholder management', 'tracking', 'communication', 'delivery'],
  customer_success: ['onboarding', 'relationship management', 'retention', 'product adoption', 'issue escalation', 'reporting'],
};

// ── Work setup normalizer ─────────────────────────────────────────────────────
function normalizeWorkSetup(ws) {
  var w = (ws || '').toLowerCase().trim();
  if (w === 'remote' || w === 'wfh' || w === 'work from home' || w === 'full remote') return 'Remote';
  if (w === 'hybrid') return 'Hybrid';
  if (w === 'onsite' || w === 'on-site' || w === 'on site' || w === 'office') return 'Onsite';
  return ws || null;
}

// ── PH synonym normalizer ─────────────────────────────────────────────────────
function normalizePHTitle(title) {
  var t = (title || '').toLowerCase().trim();
  // Common PH job title synonyms
  if (t === 'csr') return 'Customer Service Representative';
  if (t === 'va' || t === 'virtual assistant') return 'Virtual Assistant';
  if (t.indexOf('encoder') !== -1) return title.replace(/encoder/i, 'Data Entry Specialist');
  if (t === 'accounting staff') return 'Accounting Associate';
  if (t === 'admin assistant') return 'Administrative Assistant';
  if (t === 'admin') return 'Administrative Staff';
  return title;
}

// ── Title pollution detector ──────────────────────────────────────────────────
function detectTitlePollution(title) {
  var t = title || '';
  var flags = [];
  if (/job details\s*\|/i.test(t)) flags.push('contains_metadata_prefix');
  if (/\d{4,}/.test(t)) flags.push('contains_job_code');
  if (/urgent|asap|hiring now/i.test(t)) flags.push('contains_urgency_language');
  if (/php|salary|₱/i.test(t)) flags.push('salary_in_title');
  if (/ninja|rockstar|guru|wizard/i.test(t)) flags.push('gimmicky_title');
  return flags;
};

// ── Main classifier ───────────────────────────────────────────────────────────
function classifyRoleFamily(title, industry) {
  var t = (title || '').toLowerCase();
  var matched = null;
  var matchScore = 0;
  var alternatives = [];

  var i, j, family, kw, score;
  for (i = 0; i < ROLE_FAMILIES.length; i++) {
    family = ROLE_FAMILIES[i];
    score = 0;
    for (j = 0; j < family.keywords.length; j++) {
      kw = family.keywords[j];
      if (t.indexOf(kw) !== -1) {
        // Longer keyword = higher specificity = higher weight
        score += kw.length > 8 ? 3 : kw.length > 4 ? 2 : 1;
      }
    }
    if (score > matchScore) {
      if (matched) alternatives.push({ id: matched.id, label: matched.label });
      matched = family;
      matchScore = score;
    } else if (score > 0 && score < matchScore) {
      alternatives.push({ id: family.id, label: family.label });
    }
  }

  // Industry override for LGU context
  if (industry && /lgu|government|public sector|civic/i.test(industry)) {
    if (!matched || matched.id !== 'lgu_civic_technology') {
      if (matched) alternatives.unshift({ id: matched.id, label: matched.label });
      // Find LGU entry
      for (i = 0; i < ROLE_FAMILIES.length; i++) {
        if (ROLE_FAMILIES[i].id === 'lgu_civic_technology') {
          alternatives.push({ id: ROLE_FAMILIES[i].id, label: ROLE_FAMILIES[i].label });
          break;
        }
      }
    }
  }

  // Confidence based on score
  var confidence;
  if (matchScore >= 4) confidence = 'high';
  else if (matchScore >= 2) confidence = 'medium';
  else if (matchScore >= 1) confidence = 'low';
  else confidence = 'low';

  // Check if title is ambiguous
  var tWords = t.split(/\s+/);
  var isAmbiguous = false;
  for (i = 0; i < AMBIGUOUS_TITLES.length; i++) {
    for (j = 0; j < tWords.length; j++) {
      if (tWords[j] === AMBIGUOUS_TITLES[i]) {
        isAmbiguous = true;
      }
    }
  }

  if (!matched && isAmbiguous) {
    confidence = 'low';
  }

  return {
    matched: matched,
    matchScore: matchScore,
    confidence: confidence,
    alternatives: alternatives.slice(0, 3),
    isAmbiguous: isAmbiguous,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function resolveHiringIntent(inputs) {
  var jobTitle = (inputs && inputs.jobTitle) || '';
  var workSetup = (inputs && inputs.workSetup) || '';
  var employmentType = (inputs && inputs.employmentType) || '';
  var companyName = (inputs && inputs.companyName) || '';
  var industry = (inputs && inputs.industry) || '';

  var normalizedTitle = normalizePHTitle(jobTitle.trim());
  var titlePollutionFlags = detectTitlePollution(normalizedTitle);
  var seniority = classifySeniority(normalizedTitle);
  var classification = classifyRoleFamily(normalizedTitle, industry);
  var family = classification.matched;

  var reviewFlags = [];
  if (titlePollutionFlags.length > 0) {
    reviewFlags.push({ key: 'invalid_job_title', severity: 'blocking', section: 'basics', message: 'Job title contains invalid content: ' + titlePollutionFlags.join(', '), blocksPublish: true });
  }
  if (classification.confidence === 'low' || !family) {
    reviewFlags.push({ key: 'role_family_confirm', severity: 'warning', section: 'basics', message: 'Could not confidently identify the role type. Please confirm the role focus.', blocksPublish: false });
  }
  if (classification.isAmbiguous) {
    reviewFlags.push({ key: 'role_focus_confirm', severity: 'info', section: 'basics', message: 'The job title may cover multiple role types. Add context to improve the generated content.', blocksPublish: false });
  }

  var familyId = family ? family.id : 'administration_office';
  var familyLabel = family ? family.label : 'General / Administration';

  var primaryOutcome = OUTCOME_PATTERNS[familyId] || 'Contribute to the organization\'s goals through this role.';
  var candidateProfile = CANDIDATE_PROFILES[familyId] || 'A capable professional with relevant skills and experience.';
  var coreCapabilities = CORE_CAPABILITIES[familyId] || [];

  var alternativeIntents = classification.alternatives.map(function(a) { return a.label; });
  if (ALTERNATIVE_INTENT_HINTS[familyId]) {
    alternativeIntents = ALTERNATIVE_INTENT_HINTS[familyId];
  }

  var clarificationQuestions = [];
  if (classification.confidence === 'low') {
    clarificationQuestions.push('What is the primary focus of this role?');
  }
  if (classification.isAmbiguous && alternativeIntents.length > 0) {
    clarificationQuestions.push('Confirm role focus: ' + alternativeIntents.slice(0, 4).join(', ') + '?');
  }

  // Determine work setup for context
  var resolvedWorkSetup = normalizeWorkSetup(workSetup);

  return {
    roleFamily: familyLabel,
    roleFamilyId: familyId,
    roleSubfamily: null,
    likelySeniority: seniority,
    primaryOutcome: primaryOutcome,
    candidateProfile: candidateProfile,
    coreCapabilities: coreCapabilities,
    likelyApplicationNeeds: ['GetHired profile', 'CV/resume'],
    reviewFlags: reviewFlags,
    confidence: classification.confidence,
    alternativeIntents: alternativeIntents,
    clarificationQuestions: clarificationQuestions,
    normalizedTitle: normalizedTitle,
    resolvedWorkSetup: resolvedWorkSetup,
    resolvedEmploymentType: employmentType || null,
  };
}
