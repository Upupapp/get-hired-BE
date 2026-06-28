/**
 * searchQueryParserService.js
 * Parses, normalises, and validates raw search queries from the request.
 * No ?. or ?? — esm/Acorn compat.
 */

var MAX_QUERY_LENGTH = 200;
var MAX_FILTER_STRING_LENGTH = 100;
var MAX_PAGE_SIZE = 50;
var DEFAULT_PAGE_SIZE = 20;
var ALLOWED_SORT_FIELDS = ['relevance', 'newest', 'salary_high'];
var ALLOWED_WORK_SETUPS = ['remote', 'onsite', 'hybrid'];
var ALLOWED_EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contractor', 'freelance'];
var ALLOWED_SCOPES = ['jobs', 'companies', 'all'];

function sanitiseString(raw, maxLen) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLen || MAX_FILTER_STRING_LENGTH);
}

function parseQuery(raw) {
  var q = sanitiseString(raw, MAX_QUERY_LENGTH);
  // Strip characters that could confuse tsquery but keep useful search chars
  q = q.replace(/[^\w\s\-+#.,&()@/'"%₱]/g, ' ').replace(/\s+/g, ' ').trim();
  return q;
}

function parsePage(rawPage, rawLimit) {
  var limit = parseInt(rawLimit, 10);
  if (!limit || limit < 1 || limit > MAX_PAGE_SIZE) limit = DEFAULT_PAGE_SIZE;

  var page = parseInt(rawPage, 10);
  if (!page || page < 1) page = 1;

  var offset = (page - 1) * limit;
  return { page: page, limit: limit, offset: offset };
}

function parseSort(raw) {
  var s = sanitiseString(raw, 20).toLowerCase();
  return ALLOWED_SORT_FIELDS.indexOf(s) !== -1 ? s : 'relevance';
}

function parseWorkSetup(raw) {
  var s = sanitiseString(raw, 20).toLowerCase();
  return ALLOWED_WORK_SETUPS.indexOf(s) !== -1 ? s : null;
}

function parseEmploymentType(raw) {
  var s = sanitiseString(raw, 30).toLowerCase();
  return ALLOWED_EMPLOYMENT_TYPES.indexOf(s) !== -1 ? s : null;
}

function parseSalary(rawMin, rawMax) {
  var min = parseFloat(rawMin);
  var max = parseFloat(rawMax);
  return {
    min: (min && min > 0) ? min : null,
    max: (max && max > 0) ? max : null,
  };
}

function parseScope(raw) {
  var s = sanitiseString(raw, 20).toLowerCase();
  return ALLOWED_SCOPES.indexOf(s) !== -1 ? s : 'all';
}

function parsePublicSearchParams(query) {
  return {
    q: parseQuery(query.q),
    location: sanitiseString(query.location, 100),
    workSetup: parseWorkSetup(query.workSetup),
    employmentType: parseEmploymentType(query.employmentType),
    salary: parseSalary(query.salaryMin, query.salaryMax),
    sort: parseSort(query.sort),
    scope: parseScope(query.scope),
    pagination: parsePage(query.page, query.limit),
  };
}

export {
  parseQuery,
  parsePage,
  parseSort,
  parseWorkSetup,
  parseEmploymentType,
  parsePublicSearchParams,
  sanitiseString,
};
