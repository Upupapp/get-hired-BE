/**
 * Exactly one place in the code sends HTTP 402: services/planLimitGuard.js (A3.1 (d)).
 *
 * checkSubscriptionLimit was a second 402 emitter with a different body and no callers;
 * a dormant second emitter is how two refusal contracts drift apart. This scan fails if
 * one comes back.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['controllers', 'services', 'middleware', 'routes', 'helpers'];
const FILES = ['app.js', 'server.js'];

// Code lines only: block comments, whole-line comments and trailing // comments removed
// (a // preceded by ':' is a URL inside a string and is kept).
function codeLines(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .filter((line) => line.trim().length > 0);
}

function find402(src) {
  return codeLines(src).filter((line) => /\b402\b/.test(line)).map((line) => line.trim());
}

function jsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

it('control: the scanner sees a 402 in code, and ignores one in comments', () => {
  const sample = [
    '/** refuses with 402 */',
    '// res.status(402) in a comment',
    "const url = 'https://example.com/402'; // a 402 in a trailing comment",
    'res.status(402).json({});',
  ].join('\n');
  expect(find402(sample)).toEqual(["const url = 'https://example.com/402';", 'res.status(402).json({});']);
});

it('only services/planLimitGuard.js emits HTTP 402', () => {
  const hits = [];
  DIRS.flatMap((d) => jsFiles(path.join(ROOT, d)))
    .concat(FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)))
    .forEach((file) => {
      find402(fs.readFileSync(file, 'utf8')).forEach((line) => hits.push(path.relative(ROOT, file) + ': ' + line));
    });
  expect(hits).toEqual(['services/planLimitGuard.js: export var PLAN_LIMIT_HTTP_STATUS = 402;']);
});
