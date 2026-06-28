/**
 * searchSynonymService.js
 * Philippine job market synonyms for search query expansion.
 * No ?. or ?? — esm/Acorn compat.
 */

// Phrase-level synonyms (longest phrases first to avoid partial replacement)
var PHRASE_SYNONYMS = [
  ['work from home', 'remote'],
  ['work-from-home', 'remote'],
  ['fresh graduate', 'entry level'],
  ['fresh grad', 'entry level'],
  ['call center', 'customer service'],
  ['office based', 'onsite'],
  ['office-based', 'onsite'],
  ['no experience required', 'entry level'],
  ['no experience', 'entry level'],
  ['business process outsourcing', 'bpo customer service'],
];

// Word-level synonyms applied after phrase pass
var WORD_SYNONYMS = {
  'wfh': 'remote',
  'wfo': 'onsite',
  'csr': 'customer service representative',
  'dev': 'developer',
  'va': 'virtual assistant',
  'lgu': 'local government unit',
  'bpo': 'customer service outsourcing',
  'hr': 'human resources',
  'qa': 'quality assurance',
  'it': 'information technology',
  'pm': 'project manager',
  'ui': 'user interface',
  'ux': 'user experience',
  'bd': 'business development',
  'sa': 'systems analyst',
  'hybrid': 'hybrid remote onsite',
};

function expandSynonyms(q) {
  if (!q || typeof q !== 'string') return q || '';
  var result = q.toLowerCase();

  // Phrase pass
  for (var i = 0; i < PHRASE_SYNONYMS.length; i++) {
    var phrase = PHRASE_SYNONYMS[i][0];
    var replacement = PHRASE_SYNONYMS[i][1];
    result = result.split(phrase).join(replacement);
  }

  // Word pass (whole-word only via regex)
  var words = result.split(/\s+/);
  var expanded = words.map(function(word) {
    return WORD_SYNONYMS[word] || word;
  });

  return expanded.join(' ').replace(/\s+/g, ' ').trim();
}

export { expandSynonyms };
