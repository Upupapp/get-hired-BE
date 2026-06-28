/**
 * Easy Job Post Extraction Service
 * Extracts structured job fields from PDF, DOCX, TXT, RTF, and web URLs.
 *
 * SYNTAX CONSTRAINT: NO optional chaining (?.) or nullish coalescing (??)
 * Use &&, ||, ternary only — enforced by esm v3.2.25 / Acorn parser.
 */

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import dns from 'dns';

// ---------------------------------------------------------------------------
// Magic-byte signatures for document types
// ---------------------------------------------------------------------------

var MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46],           // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04],           // ZIP (DOCX is ZIP)
  docx_alt1: [0x50, 0x4B, 0x05, 0x06],
  docx_alt2: [0x50, 0x4B, 0x07, 0x08],
  doc: [0xD0, 0xCF, 0x11, 0xE0],           // OLE2 compound doc
  rtf: [0x7B, 0x5C, 0x72, 0x74, 0x66],    // {\rtf
};

function matchBytes(buffer, signature) {
  for (var i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

export function validateDocumentMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 8) return false;
  var e = (ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'pdf') return matchBytes(buffer, MAGIC_BYTES.pdf);
  if (e === 'docx') {
    return matchBytes(buffer, MAGIC_BYTES.docx) ||
      matchBytes(buffer, MAGIC_BYTES.docx_alt1) ||
      matchBytes(buffer, MAGIC_BYTES.docx_alt2);
  }
  if (e === 'doc') return matchBytes(buffer, MAGIC_BYTES.doc);
  if (e === 'rtf') return matchBytes(buffer, MAGIC_BYTES.rtf);
  if (e === 'txt') return true; // no magic bytes for plain text
  return false;
}

// ---------------------------------------------------------------------------
// Text extraction per file type
// ---------------------------------------------------------------------------

async function extractTextFromPdf(buffer) {
  var data = await pdfParse(buffer);
  return (data && data.text) || '';
}

async function extractTextFromDocx(buffer) {
  var result = await mammoth.extractRawText({ buffer: buffer });
  return (result && result.value) || '';
}

function extractTextFromTxt(buffer) {
  return buffer.toString('utf8');
}

function stripRtfMarkup(rtfStr) {
  // Remove RTF control words, groups, and binary data — return readable text
  var text = rtfStr
    .replace(/\\pict[\s\S]*?\}/g, '')
    .replace(/\\[a-z*-]+[\-\d]* ?/gi, ' ')
    .replace(/\{|\}/g, ' ')
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/[ \t]+/g, ' ');
  return text.trim();
}

function extractTextFromRtf(buffer) {
  return stripRtfMarkup(buffer.toString('utf8'));
}

export async function extractTextFromBuffer(buffer, ext) {
  var e = (ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'pdf') return extractTextFromPdf(buffer);
  if (e === 'docx') return extractTextFromDocx(buffer);
  if (e === 'doc') {
    // Old .doc binary format — mammoth handles it too (falls back gracefully)
    try {
      return await extractTextFromDocx(buffer);
    } catch (_) {
      return extractTextFromTxt(buffer);
    }
  }
  if (e === 'rtf') return extractTextFromRtf(buffer);
  return extractTextFromTxt(buffer);
}

// ---------------------------------------------------------------------------
// SSRF-safe URL fetching
// ---------------------------------------------------------------------------

var PRIVATE_IP_RE = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
];

function isPrivateIp(ip) {
  for (var i = 0; i < PRIVATE_IP_RE.length; i++) {
    if (PRIVATE_IP_RE[i].test(ip)) return true;
  }
  // 172.16.0.0/12
  var m = ip.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return true;
  return false;
}

function stripHtml(html) {
  // Remove non-content elements entirely
  var cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');

  // Block-level elements become newlines
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr|td|th|blockquote)>/gi, '\n')
    .replace(/<(?:p|div|h[1-6])(?:\s[^>]*)?>/gi, '\n');

  // Strip remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function(m, code) { return String.fromCharCode(parseInt(code, 10)); })
    .replace(/&[a-z]+;/g, ' ');

  // Collapse whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

function parseUrlSafe(urlStr) {
  // Simple URL parser without the WHATWG URL class (for Node compat)
  var match = urlStr.match(/^(https?):\/\/([^/?#]+)(.*)?$/i);
  if (!match) return null;
  return { protocol: match[1].toLowerCase() + ':', hostname: match[2].toLowerCase().split(':')[0] };
}

export async function extractTextFromUrl(urlStr) {
  // Validate URL format
  var parsed = parseUrlSafe(urlStr);
  if (!parsed) throw new Error('Invalid URL format.');
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.');
  }

  var hostname = parsed.hostname;

  // Block numeric IP literals
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('The URL resolves to a private network address.');
  }

  // DNS resolution
  var address = await new Promise(function(resolve, reject) {
    dns.lookup(hostname, function(err, addr) {
      if (err) return reject(new Error('Could not resolve the URL hostname.'));
      resolve(addr);
    });
  });

  if (isPrivateIp(address)) throw new Error('The URL resolves to a private network address.');

  // Fetch with strict limits
  var response = await axios.get(urlStr, {
    timeout: 8000,
    maxContentLength: 5 * 1024 * 1024,
    maxRedirects: 3,
    headers: {
      'User-Agent': 'GetHired-JobImporter/1.0',
      'Accept': 'text/html,text/plain',
    },
    responseType: 'text',
    validateStatus: function(status) { return status >= 200 && status < 400; },
  });

  var contentType = (response.headers && response.headers['content-type']) || '';
  var bodyStr = typeof response.data === 'string' ? response.data : String(response.data);

  // Plain text — return as-is
  if (contentType.indexOf('text/plain') !== -1) {
    return bodyStr.replace(/\s+/g, ' ').trim();
  }

  // HTML — strip tags and return readable text
  return stripHtml(bodyStr);
}

// ---------------------------------------------------------------------------
// Field extraction from raw text
// ---------------------------------------------------------------------------

// Known Philippine cities for location detection
var PH_CITIES = [
  'makati', 'bgc', 'taguig', 'bonifacio', 'mandaluyong', 'pasig', 'ortigas',
  'quezon city', 'cubao', 'eastwood', 'alabang', 'muntinlupa', 'las pinas',
  'paranaque', 'manila', 'ermita', 'malate', 'intramuros', 'binondo',
  'san juan', 'marikina', 'caloocan', 'malabon', 'navotas', 'valenzuela',
  'antipolo', 'cavite', 'bacoor', 'imus', 'dasmarias', 'laguna', 'sta rosa',
  'binan', 'calamba', 'batangas', 'cebu', 'cebu city', 'davao', 'davao city',
  'cagayan de oro', 'iloilo', 'bacolod', 'zamboanga', 'baguio', 'angeles',
  'clark', 'subic', 'pampanga', 'bulacan', 'rizal', 'cainta', 'taytay',
];

// Section header patterns
var SECTION_HEADERS = {
  responsibilities: /^(responsibilities|duties|what you'?ll? do|key responsibilities|job functions?|your role|main tasks?|scope of work|deliverables)[\s:.]*/i,
  requirements: /^(requirements?|qualifications?|what we'?re? looking for|must[ -]have|what you (need|must have)|required skills?|job requirements?)[\s:.]*/i,
  niceToHave: /^(nice[ -]to[ -]have|good[ -]to[ -]have|preferred|bonus|ideal candidate|advantage)[\s:.]*/i,
  skills: /^(skills?|technical skills?|tech(nical)? stack|technologies|tools?|tech requirements?|technical requirements?)[\s:.]*/i,
  benefits: /^(benefits?|perks?|what we offer|compensation (and benefits)?|package)[\s:.]*/i,
  about: /^(about( the)? (role|position|job)|job (summary|overview|description)|overview|summary|about us|the role)[\s:.]*/i,
};

function detectSectionHeader(line) {
  var keys = Object.keys(SECTION_HEADERS);
  for (var i = 0; i < keys.length; i++) {
    if (SECTION_HEADERS[keys[i]].test(line.trim())) return keys[i];
  }
  return null;
}

function extractBulletItems(lines) {
  var items = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Bullet patterns: -, *, •, ◦, ▪, digits followed by . or )
    var match = line.match(/^[-*•◦▪‣➤→]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
    if (match && match[1] && match[1].trim().length > 2) {
      items.push(match[1].trim());
    } else if (line.length > 10 && line.length < 200 && !detectSectionHeader(line)) {
      // Non-bullet lines that look like list items (not too short, not too long, not a header)
      items.push(line);
    }
  }
  return items.filter(function(item) { return item.length > 3; });
}

// Extract salary: PHP 50,000 – 80,000 or ₱50k-80k etc.
function extractSalary(text) {
  // Match PHP/₱ followed by numbers, with optional range
  var patterns = [
    /(?:PHP|₱)\s*([\d,]+(?:\.\d+)?)\s*(?:to|[-–—])\s*([\d,]+(?:\.\d+)?)/gi,
    /(?:PHP|₱)\s*([\d,]+(?:k|K)?)\s*(?:to|[-–—])\s*([\d,]+(?:k|K)?)/gi,
    /salary[:\s]+(?:PHP|₱)?\s*([\d,]+(?:k|K)?)\s*(?:to|[-–—])\s*([\d,]+(?:k|K)?)/gi,
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = patterns[i].exec(text);
    if (match) {
      var minStr = match[1].replace(/,/g, '');
      var maxStr = match[2].replace(/,/g, '');
      // Handle 'k' suffix
      var minVal = minStr.match(/(\d+(?:\.\d+)?)k/i) ? parseFloat(minStr) * 1000 : parseFloat(minStr);
      var maxVal = maxStr.match(/(\d+(?:\.\d+)?)k/i) ? parseFloat(maxStr) * 1000 : parseFloat(maxStr);
      if (minVal > 0 && maxVal > 0) {
        return { min: Math.round(minVal), max: Math.round(maxVal), currency: 'PHP' };
      }
    }
  }

  // Single salary value
  var single = /(?:PHP|₱)\s*([\d,]+(?:k|K)?)/i.exec(text);
  if (single) {
    var val = single[1].replace(/,/g, '');
    var num = val.match(/(\d+(?:\.\d+)?)k/i) ? parseFloat(val) * 1000 : parseFloat(val);
    if (num > 0) return { min: Math.round(num), max: null, currency: 'PHP' };
  }
  return null;
}

function extractWorkSetupHint(text) {
  var t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return 'Hybrid';
  if (/\b(remote|wfh|work from home|telecommute|fully remote|100% remote)\b/.test(t)) return 'Remote';
  if (/\b(on(-| )?site|onsite|in(-| )?office|in(-| )?person|office(-| )?based)\b/.test(t)) return 'On-site';
  return null;
}

function extractJobTypeHint(text) {
  var t = text.toLowerCase();
  if (/\b(full(-| )?time|permanent|regular)\b/.test(t)) return 'Full-time';
  if (/\bpart(-| )?time\b/.test(t)) return 'Part-time';
  if (/\b(contract|contractual|project(-| )?based)\b/.test(t)) return 'Contract';
  if (/\b(freelance|freelancer)\b/.test(t)) return 'Freelance';
  if (/\b(intern|internship)\b/.test(t)) return 'Internship';
  if (/\b(temporary|temp\b)/.test(t)) return 'Temporary';
  return null;
}

function extractJobLevelHint(text) {
  var t = text.toLowerCase();
  if (/\b(vp|vice president|c-?level|chief|cto|ceo|coo)\b/.test(t)) return 'Executive';
  if (/\b(director|head of|department head)\b/.test(t)) return 'Director';
  if (/\b(manager|management level)\b/.test(t)) return 'Manager';
  if (/\b(lead|tech lead|team lead|principal|architect)\b/.test(t)) return 'Lead';
  if (/\b(senior|sr\.?|sr )\b/.test(t)) return 'Senior';
  if (/\b(mid(-| )level|midlevel|mid\b)\b/.test(t)) return 'Mid-level';
  if (/\b(junior|jr\.?|jr )\b/.test(t)) return 'Junior';
  if (/\b(entry(-| )level|entry level|fresh grad|fresh graduate|no experience required)\b/.test(t)) return 'Entry Level';
  return null;
}

function extractCity(text) {
  var t = text.toLowerCase();

  // Look for explicit location label first
  var locMatch = text.match(/(?:location|based in|work location|office location|city)[:\s]+([A-Z][^\n,;.]+)/i);
  if (locMatch) {
    var loc = locMatch[1].trim().split(/[,\n;]/)[0].trim();
    if (loc.length > 1 && loc.length < 60) return loc;
  }

  // Scan for known PH cities
  for (var i = 0; i < PH_CITIES.length; i++) {
    var city = PH_CITIES[i];
    var re = new RegExp('\\b' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(t)) {
      // Return in title case
      return city.split(' ').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    }
  }

  return null;
}

function extractJobTitle(lines) {
  // Strategy: first non-empty line if short enough, otherwise look for explicit labels
  for (var i = 0; i < Math.min(lines.length, 8); i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Explicit label
    var match = line.match(/^(?:job title|position|role|opening|vacancy)[:\s]+(.+)/i);
    if (match) return match[1].trim();

    // First line that looks like a title: < 80 chars, no URL, not a company address
    if (line.length < 80 && line.length > 3 && !detectSectionHeader(line) &&
        !/https?:\/\//.test(line) && !/^(apply|about|we are|we're)/i.test(line)) {
      return line;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main mapping function
// ---------------------------------------------------------------------------

export function mapTextToJobFields(rawText) {
  var lines = rawText.split(/\r?\n/);
  var nonEmpty = lines.map(function(l) { return l.trim(); }).filter(Boolean);

  var result = {
    jobTitle: null,
    jobCity: null,
    jobCountry: 'Philippines',
    jobDescription: null,
    jobDuties: null,
    workSetupHint: null,
    jobTypeHint: null,
    jobLevelHint: null,
    salaryMinimum: null,
    salaryMaximum: null,
    salaryCurrency: 'PHP',
    requirements: [],
    goodToHave: [],
    skills: [],
    confidence: {},
    missingRequiredFields: [],
    warnings: [],
  };

  // --- Job title ---
  var title = extractJobTitle(nonEmpty);
  if (title) {
    result.jobTitle = title;
    result.confidence.jobTitle = 'medium';
  }

  // --- Full-text heuristics ---
  result.workSetupHint = extractWorkSetupHint(rawText);
  result.jobTypeHint = extractJobTypeHint(rawText);
  result.jobLevelHint = extractJobLevelHint(rawText);
  result.jobCity = extractCity(rawText);

  if (result.workSetupHint) result.confidence.workSetupHint = 'medium';
  if (result.jobTypeHint) result.confidence.jobTypeHint = 'medium';
  if (result.jobLevelHint) result.confidence.jobLevelHint = 'medium';
  if (result.jobCity) result.confidence.jobCity = 'medium';

  // --- Salary ---
  var salary = extractSalary(rawText);
  if (salary) {
    result.salaryMinimum = salary.min;
    result.salaryMaximum = salary.max;
    result.salaryCurrency = salary.currency;
    result.confidence.salary = 'high';
  }

  // --- Section-based extraction ---
  var currentSection = 'preamble';
  var sections = { preamble: [], responsibilities: [], requirements: [], niceToHave: [], skills: [], benefits: [] };
  var aboutSectionFound = false;

  for (var i = 0; i < nonEmpty.length; i++) {
    var line = nonEmpty[i];
    var sectionKey = detectSectionHeader(line);
    if (sectionKey) {
      currentSection = sectionKey;
      if (sectionKey === 'about') {
        aboutSectionFound = true;
        currentSection = 'preamble';
      }
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  // --- Job description: preamble content ---
  var descLines = (sections.preamble || []).filter(function(l) {
    return l.length > 20 && !extractJobTitle([l]);
  });
  if (descLines.length > 0) {
    result.jobDescription = descLines.join('\n').trim();
    if (result.jobDescription.length > 30) {
      result.confidence.jobDescription = 'medium';
    }
  }

  // --- Responsibilities → jobDuties ---
  var respLines = sections.responsibilities || [];
  if (respLines.length > 0) {
    var respItems = extractBulletItems(respLines);
    if (respItems.length > 0) {
      result.jobDuties = respItems.join('\n');
      result.confidence.jobDuties = 'high';
    } else {
      result.jobDuties = respLines.join('\n').trim();
      result.confidence.jobDuties = 'medium';
    }
  }

  // --- Requirements ---
  var reqLines = sections.requirements || [];
  if (reqLines.length > 0) {
    result.requirements = extractBulletItems(reqLines);
    if (result.requirements.length > 0) result.confidence.requirements = 'high';
  }

  // --- Nice to have ---
  var nthLines = sections.niceToHave || [];
  if (nthLines.length > 0) {
    result.goodToHave = extractBulletItems(nthLines);
    if (result.goodToHave.length > 0) result.confidence.goodToHave = 'high';
  }

  // --- Skills ---
  var skillLines = sections.skills || [];
  if (skillLines.length > 0) {
    result.skills = extractBulletItems(skillLines);
    if (result.skills.length > 0) result.confidence.skills = 'high';
  }

  // If no explicit skills section, extract tech keywords from requirements
  if (result.skills.length === 0 && result.requirements.length > 0) {
    var techKeywords = /\b(javascript|typescript|python|java|php|ruby|go|rust|swift|kotlin|react|angular|vue|node|express|django|laravel|spring|mysql|postgresql|postgres|mongodb|redis|aws|azure|gcp|docker|kubernetes|git|figma|adobe|photoshop|illustrator|excel|sql|html|css|sass|scss|wordpress|shopify|salesforce|sap|tableau|power bi|jira|confluence|slack)\b/gi;
    var allReqText = result.requirements.join(' ');
    var techMatches = [];
    var m;
    while ((m = techKeywords.exec(allReqText)) !== null) {
      var kw = m[0].charAt(0).toUpperCase() + m[0].slice(1);
      if (techMatches.indexOf(kw) === -1) techMatches.push(kw);
    }
    if (techMatches.length > 0) {
      result.skills = techMatches;
      result.confidence.skills = 'medium';
    }
  }

  // --- Missing required fields check ---
  // Required for publish: jobTypeId, jobLevelId, jobCity, jobCountry, jobDescription, workSetupId, jobBanner
  if (!result.jobTitle) result.missingRequiredFields.push('jobTitle');
  if (!result.jobCity) result.missingRequiredFields.push('jobCity');
  if (!result.jobDescription || result.jobDescription.length < 20) result.missingRequiredFields.push('jobDescription');
  // These can only be selected by recruiter — always flag as "needs selection"
  result.missingRequiredFields.push('jobTypeId');
  result.missingRequiredFields.push('jobLevelId');
  result.missingRequiredFields.push('workSetupId');
  result.missingRequiredFields.push('jobBanner');

  // --- Warnings ---
  if (result.jobTitle && result.jobTitle.length > 100) {
    result.warnings.push('Job title appears very long — please review and shorten.');
    result.jobTitle = result.jobTitle.substring(0, 100);
  }
  if (!result.salaryMinimum) {
    result.warnings.push('No salary information detected — add salary details to attract more applicants.');
  }
  if (result.requirements.length === 0 && result.jobDescription && result.jobDescription.length < 100) {
    result.warnings.push('Limited job content detected — please review and add more details.');
  }

  return result;
}
