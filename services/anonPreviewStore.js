/**
 * Anonymous Preview Store
 * In-memory TTL store for AI-generated job ad previews.
 * Keyed by secure random token (64-char hex). TTL = 30 minutes.
 * No external dependency — Node built-in crypto for token generation.
 *
 * SYNTAX: no ?. or ?? — Node 14 ESM compatible.
 * Security: full draft is server-side only; partial preview is returned to browser.
 * Cleanup: expired entries are removed every 5 minutes (passive eviction + active cleanup).
 */

import crypto from 'crypto';

var PREVIEW_TTL_MS = 30 * 60 * 1000; // 30 minutes

// store: { [token: string]: { data: any, expiresAt: number } }
var store = {};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setPreview(data) {
  var token = generateToken();
  store[token] = {
    data: data,
    expiresAt: Date.now() + PREVIEW_TTL_MS,
  };
  return token;
}

function getPreview(token) {
  var entry = store[token];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete store[token];
    return null;
  }
  return entry.data;
}

function deletePreview(token) {
  if (store[token]) delete store[token];
}

function cleanup() {
  var now = Date.now();
  Object.keys(store).forEach(function(tok) {
    if (store[tok] && now > store[tok].expiresAt) {
      delete store[tok];
    }
  });
}

// Active cleanup every 5 minutes — unref so this doesn't prevent Node exit
var cleanupTimer = setInterval(cleanup, 5 * 60 * 1000);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export { setPreview, getPreview, deletePreview };
