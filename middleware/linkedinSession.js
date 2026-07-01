// LinkedIn OIDC — stateless state and one-time ticket utilities.
//
// STATE: encoded as a signed JWT so it works across PM2 cluster workers
// without shared memory. Contains codeVerifier, nonce, intent, returnTo.
//
// TICKET: one-time redemption token. Stored in oauth_tickets DB table so
// both workers can mark it used (prevents replay even across workers).

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../env';

const STATE_TTL_SECONDS = 10 * 60;   // 10 min for LinkedIn redirect round-trip
const TICKET_TTL_SECONDS = 5 * 60;   // 5 min — FE must call /complete quickly

// ─── State (stateless JWT, no storage needed) ──────────────────────────────

export function createLinkedinState(intent, source, returnTo) {
  var codeVerifier = crypto.randomBytes(32).toString('base64url');
  var codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  var nonce = crypto.randomBytes(16).toString('hex');
  var payload = { cv: codeVerifier, nc: nonce, it: intent || 'auto', sc: source || 'unknown', rt: returnTo || '' };
  var state = jwt.sign(payload, env.secret, { algorithm: 'HS256', expiresIn: STATE_TTL_SECONDS });
  return { state, codeVerifier, codeChallenge, nonce };
}

export function verifyLinkedinState(state) {
  try {
    var payload = jwt.verify(state, env.secret, { algorithms: ['HS256'] });
    return { codeVerifier: payload.cv, nonce: payload.nc, intent: payload.it, source: payload.sc, returnTo: payload.rt };
  } catch (_) {
    return null;
  }
}

// ─── One-time ticket (DB-backed for cross-worker safety) ────────────────────

export function makeTicketJwt(uid, status, intent, returnTo, roleRequired, extra) {
  var jti = crypto.randomBytes(24).toString('hex');
  var payload = { jti, uid, status, intent: intent || 'auto', rt: returnTo || '', rr: !!roleRequired };
  if (extra && typeof extra === 'object') Object.assign(payload, extra);
  return jwt.sign(payload, env.secret, { algorithm: 'HS256', expiresIn: TICKET_TTL_SECONDS });
}

export function decodeTicketJwt(ticketJwt) {
  try {
    return jwt.verify(ticketJwt, env.secret, { algorithms: ['HS256'] });
  } catch (_) {
    return null;
  }
}
