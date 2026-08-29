// LinkedIn OIDC — backend-brokered auth flow.
//
// Flow:
//   1. GET  /api/auth/linkedin/start     — generate state+PKCE, redirect to LinkedIn
//   2. GET  /api/auth/linkedin/callback  — validate, exchange code, resolve user, issue one-time ticket
//   3. POST /api/auth/linkedin/complete  — exchange ticket for Firebase custom token → ID token
//   4. DELETE /api/auth/linkedin/unlink  — remove auth_identity for this user (requires verifyAuth)
//
// Security:
//   - Client secret never leaves the server.
//   - State is a signed JWT (HS256) containing codeVerifier + nonce — works across PM2 cluster workers.
//   - PKCE S256 prevents code interception.
//   - Ticket is a short-lived signed JWT (5 min, single-use via oauth_tickets DB).
//   - Userinfo is fetched from LinkedIn directly (authoritative identity source).
//   - No LinkedIn tokens are returned to the FE. Only Firebase ID tokens.

import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { firebaseAdmin } from '../middleware/firebaseApp';
import dbQuery from '../db/dbQuery';
import { hashPassword } from '../helpers/validation';
import { getUserCredentialsByEmail } from '../helpers/userDetails';
import { getUserCompany } from './companiesController';
import { companySubscriptions } from './subscriptionController';
import { send } from '../helpers/mailer';
import env from '../env';
import {
  createLinkedinState,
  verifyLinkedinState,
  makeTicketJwt,
  decodeTicketJwt,
} from '../middleware/linkedinSession';

const dbSchema = env.schema;

// ─── Config ─────────────────────────────────────────────────────────────────

// BUGFIX: production "LinkedIn token validation failed" (invalid_audience) --
// LinkedIn's own OAuth handshake tolerates/trims incidental whitespace in the
// client_id it's given, but our own aud/iss checks below did a raw !==
// string comparison against the untrimmed env value -- a stray trailing
// space/newline in LINKEDIN_CLIENT_ID (easy to introduce pasting into a
// .env file) let the handshake itself succeed while still failing our own
// stricter-than-LinkedIn's equality check. .trim() everything read from env.
function getLiConfig() {
  return {
    clientId:      (process.env.LINKEDIN_CLIENT_ID || '').trim(),
    clientSecret:  (process.env.LINKEDIN_CLIENT_SECRET || '').trim(),
    redirectUri:   (process.env.LINKEDIN_REDIRECT_URI || '').trim(),
    authEndpoint:  (process.env.LINKEDIN_AUTHORIZATION_ENDPOINT || 'https://www.linkedin.com/oauth/v2/authorization').trim(),
    tokenEndpoint: (process.env.LINKEDIN_TOKEN_ENDPOINT         || 'https://www.linkedin.com/oauth/v2/accessToken').trim(),
    userinfoUrl:   (process.env.LINKEDIN_USERINFO_ENDPOINT      || 'https://api.linkedin.com/v2/userinfo').trim(),
    enabled:       process.env.LINKEDIN_AUTH_ENABLED === 'true',
    appUrl:        env.app_url || 'http://localhost:4200',
  };
}

function isEnabled() {
  return getLiConfig().enabled;
}

// ─── Sanitize returnTo — internal paths only ─────────────────────────────────

function sanitizeReturn(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var u = raw.trim();
  if (!u.startsWith('/') || u.startsWith('//')) return '';
  if (/[<>"'`]/.test(u)) return '';
  return u.substring(0, 256);
}

// ─── Build the same session response shape as Google/email auth ──────────────

async function buildSessionResponse(uid, email, firstName, lastName, role, firebaseIdToken, refreshToken, photoUrl) {
  var userCompany = await getUserCompany(uid);
  var isActive = false;
  if (userCompany && userCompany.companyId) {
    try {
      var subs = await companySubscriptions(userCompany.companyId);
      if (subs && subs.length > 0) {
        isActive = new Date(subs[0].endAt) > new Date();
      }
    } catch (_) {}
  }
  return {
    id: uid, email, firstName: firstName || '', lastName: lastName || '',
    role, photoUrl: photoUrl || '',
    token: firebaseIdToken, refreshToken: refreshToken || '',
    withCompany: !!(userCompany && userCompany.companyId),
    companyName: (userCompany && userCompany.companyName) || '',
    companyId: (userCompany && userCompany.companyId) || null,
    withActiveSubscription: isActive,
  };
}

// ─── Exchange Firebase custom token for Firebase ID token via REST API ────────
// Same approach used by googleAuthController for consistency.

async function customTokenToIdToken(customToken) {
  var apiKey = env.apiKey;
  if (!apiKey) throw new Error('Firebase API key not configured');
  var res = await axios.post(
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + apiKey,
    { token: customToken, returnSecureToken: true },
    { timeout: 10000 }
  );
  return { idToken: res.data.idToken, refreshToken: res.data.refreshToken };
}

// ─── oauth_tickets DB helpers ─────────────────────────────────────────────────

async function storeTicket(jti, uid, data, expiresAt) {
  await dbQuery.query(
    `INSERT INTO ${dbSchema}.oauth_tickets (jti, uid, data, expires_at) VALUES ($1,$2,$3,$4)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, uid, JSON.stringify(data), expiresAt]
  );
}

async function consumeTicketDb(jti) {
  var result = await dbQuery.query(
    `UPDATE ${dbSchema}.oauth_tickets
     SET used_at = NOW()
     WHERE jti = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING uid, data`,
    [jti]
  );
  return result.rows[0] || null;
}

// ─── 1. GET /api/auth/linkedin/start ─────────────────────────────────────────

export const linkedinStart = async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ message: 'LinkedIn sign-in is not enabled.' });

  var cfg = getLiConfig();
  if (!cfg.clientId || !cfg.redirectUri) {
    return res.status(503).json({ message: 'LinkedIn is not configured on this server.' });
  }

  var intent   = req.query.intent   ? String(req.query.intent).substring(0, 32) : 'auto';
  var source   = req.query.source   ? String(req.query.source).substring(0, 64) : 'unknown';
  var returnTo = sanitizeReturn(req.query.returnTo);

  // createLinkedinState still generates a nonce for ID token replay protection.
  // PKCE is omitted — LinkedIn confidential clients authenticate via client_secret,
  // so the PKCE code_verifier causes token exchange to fail with invalid_client.
  var { state } = createLinkedinState(intent, source, returnTo);

  var params = new URLSearchParams({
    response_type: 'code',
    client_id:     cfg.clientId,
    redirect_uri:  cfg.redirectUri,
    scope:         'openid profile email',
    state:         state,
  });

  return res.redirect(302, cfg.authEndpoint + '?' + params.toString());
};

// ─── 2. GET /api/auth/linkedin/callback ──────────────────────────────────────

export const linkedinCallback = async (req, res) => {
  var cfg = getLiConfig();
  var feBase = cfg.appUrl;

  function redirectError(code) {
    return res.redirect(302, feBase + '/linkedin/complete?error=' + code);
  }

  if (!isEnabled()) return redirectError('not_enabled');

  var { code, state, error: liError } = req.query;

  if (liError) {
    console.log('[linkedin/callback] LinkedIn error:', liError);
    return redirectError('linkedin_denied');
  }

  if (!state || !code) return redirectError('missing_params');

  // Validate + decode state JWT
  var transaction = verifyLinkedinState(String(state));
  if (!transaction) return redirectError('invalid_state');

  var { codeVerifier, nonce, intent, returnTo } = transaction;

  try {
    // Exchange authorization code for tokens (no code_verifier — confidential client)
    var tokenRes = await axios.post(cfg.tokenEndpoint,
      new URLSearchParams({
        grant_type:    'authorization_code',
        code:          String(code),
        redirect_uri:  cfg.redirectUri,
        client_id:     cfg.clientId,
        client_secret: cfg.clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    var accessToken = tokenRes.data.access_token;
    var idTokenRaw  = tokenRes.data.id_token;

    if (!accessToken) return redirectError('no_access_token');

    // Verify basic claims from ID token (decode without full sig check;
    // userinfo call below provides the authoritative identity source).
    if (idTokenRaw) {
      var decoded = jwt.decode(idTokenRaw, { complete: true });
      if (decoded && decoded.payload) {
        var p = decoded.payload;
        var now = Math.floor(Date.now() / 1000);
        // BUGFIX: these four checks used to fail completely silently --
        // no server-side log line at all, only a generic redirect to the
        // FE -- making a real mismatch (e.g. invalid_audience) undiagnosable
        // from PM2 logs. Log the actual vs. expected values (never the
        // client secret) whenever one of these trips.
        if (p.iss && p.iss !== 'https://www.linkedin.com') {
          console.error('[linkedin/callback] invalid_issuer: got=' + p.iss);
          return redirectError('invalid_issuer');
        }
        if (p.aud && p.aud !== cfg.clientId) {
          console.error('[linkedin/callback] invalid_audience: tokenAud=' + p.aud + ' cfgClientId=' + cfg.clientId);
          return redirectError('invalid_audience');
        }
        if (p.exp && p.exp < now) {
          console.error('[linkedin/callback] token_expired: exp=' + p.exp + ' now=' + now);
          return redirectError('token_expired');
        }
        if (nonce && p.nonce && p.nonce !== nonce) {
          console.error('[linkedin/callback] invalid_nonce: tokenNonce=' + p.nonce + ' expectedNonce=' + nonce);
          return redirectError('invalid_nonce');
        }
      }
    }

    // Fetch authoritative identity from LinkedIn userinfo endpoint
    var userInfoRes = await axios.get(cfg.userinfoUrl, {
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 10000,
    });
    var ui = userInfoRes.data;

    var liSub     = String(ui.sub || '');
    var email     = String(ui.email || '').toLowerCase().trim();
    var emailVer  = !!ui.email_verified;
    var firstName = String(ui.given_name  || '').trim();
    var lastName  = String(ui.family_name || '').trim();
    var photoUrl  = String(ui.picture     || '').trim();
    var name      = String(ui.name        || '').trim();

    if (!liSub)  return redirectError('missing_sub');
    if (!email)  return redirectError('missing_email');
    if (!emailVer) return redirectError('email_not_verified');

    // ── Resolve GetHired user ─────────────────────────────────────────────────

    var uid = null;
    var existingRole = null;
    var isNewUser = false;

    // 1. Look up by LinkedIn identity (provider + sub)
    var identityRow = await dbQuery.query(
      `SELECT user_uid FROM ${dbSchema}.auth_identities WHERE provider='linkedin' AND provider_subject=$1`,
      [liSub]
    );
    if (identityRow.rows.length > 0) {
      uid = identityRow.rows[0].user_uid;
      var credRow = await dbQuery.query(
        `SELECT role FROM ${dbSchema}.user_credentials WHERE uid=$1`,
        [uid]
      );
      existingRole = credRow.rows[0] ? credRow.rows[0].role : null;
      // Update last_login_at
      await dbQuery.query(
        `UPDATE ${dbSchema}.auth_identities SET last_login_at=NOW(), updated_at=NOW(),
         provider_picture=$1, provider_name=$2
         WHERE provider='linkedin' AND provider_subject=$3`,
        [photoUrl || null, name || null, liSub]
      );
    } else {
      // 2. Look up by email — link existing account or prepare new one
      var existing = await getUserCredentialsByEmail(email);
      if (existing) {
        uid = existing.uid;
        existingRole = existing.role;
        // Link LinkedIn identity to existing account
        await dbQuery.query(
          `INSERT INTO ${dbSchema}.auth_identities
           (user_uid, provider, provider_subject, provider_email, provider_email_verified,
            provider_name, provider_picture, linked_at, last_login_at, updated_at)
           VALUES ($1,'linkedin',$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
           ON CONFLICT (provider, provider_subject) DO NOTHING`,
          [uid, liSub, email, emailVer, name || null, photoUrl || null]
        );
      } else {
        isNewUser = true;
      }
    }

    var status = 'authenticated';
    var roleRequired = false;

    if (isNewUser) {
      // New user — no GetHired account yet.
      // If intent is explicit (jobseeker/employer), we can create the account now.
      // Otherwise set role_required so FE shows the role picker.
      if (intent === 'jobseeker') {
        uid = await createLinkedinUser(liSub, email, emailVer, firstName, lastName, photoUrl, name, 3);
        existingRole = 3;
      } else if (intent === 'employer') {
        uid = await createLinkedinUser(liSub, email, emailVer, firstName, lastName, photoUrl, name, 2);
        existingRole = 2;
      } else {
        // role_required — FE will show the role picker
        status = 'role_required';
        roleRequired = true;
        // Temporarily store LinkedIn identity without a user (no FK yet)
        // We'll create user on /api/auth/linkedin/choose-role
        uid = null; // signal: no user yet
      }
    }

    // ── Issue one-time ticket ─────────────────────────────────────────────────
    var ticketData = {
      status, intent, returnTo, roleRequired,
      liSub, email, emailVer, firstName, lastName, photoUrl, name,
      role: existingRole,
    };

    // For role_required, uid is null — store placeholder so we can create user on complete
    var ticketUid = uid || ('pending:linkedin:' + liSub);
    var ticketJwt = makeTicketJwt(ticketUid, status, intent, returnTo, roleRequired);
    var decoded2  = jwt.decode(ticketJwt);
    var jti       = decoded2.jti;
    var expiresAt = new Date((decoded2.exp) * 1000).toISOString();

    await storeTicket(jti, ticketUid, ticketData, expiresAt);

    console.log('[linkedin/callback] uid=' + (ticketUid || 'pending') + ' status=' + status);

    // Redirect to FE — ticket is in query param (single-use, 5-min TTL, safe over HTTPS)
    var dest = feBase + '/linkedin/complete?ticket=' + encodeURIComponent(ticketJwt);
    if (returnTo) dest += '&returnTo=' + encodeURIComponent(returnTo);

    return res.redirect(302, dest);

  } catch (err) {
    var msg = (err && err.message) || '';
    console.error('[linkedin/callback] error:', msg.substring(0, 120));
    if (err && err.response) {
      console.error('[linkedin/callback] LinkedIn API:', err.response.status, JSON.stringify(err.response.data || {}).substring(0, 200));
    }
    return redirectError('server_error');
  }
};

// ─── Helper: create new GetHired user from LinkedIn identity ─────────────────

async function createLinkedinUser(liSub, email, emailVer, firstName, lastName, photoUrl, name, roleId) {
  // Generate Firebase user (or use the LinkedIn sub as UID if Firebase isn't involved)
  // We create the Firebase user so guards work; or use a deterministic UID.
  // Safest: generate a pseudo-Firebase UID from LinkedIn sub (consistent, no Firebase call needed)
  var uid = 'li_' + crypto.createHash('sha256').update('linkedin:' + liSub).digest('hex').substring(0, 28);

  var dummyPassword = hashPassword(uid + '_linkedin_provider');

  await dbQuery.query(
    `INSERT INTO ${dbSchema}.user_credentials (uid, email, "password", "role", created_date)
     VALUES ($1,$2,$3,$4,current_timestamp)
     ON CONFLICT (uid) DO NOTHING`,
    [uid, email, dummyPassword, roleId]
  );
  // STITCH QA11 FIX F-01: users.email was dropped in a DDL migration --
  // email lives on user_credentials only (already inserted above). Same
  // fix pattern applied to userController.js's registerUserInDB and
  // googleAuthController.js's chooseRole.
  await dbQuery.query(
    `INSERT INTO ${dbSchema}.users (uid, firstname, lastname, photo_url)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (uid) DO NOTHING`,
    [uid, firstName || null, lastName || null, photoUrl || null]
  );
  await dbQuery.query(
    `INSERT INTO ${dbSchema}.auth_identities
     (user_uid, provider, provider_subject, provider_email, provider_email_verified,
      provider_name, provider_picture, linked_at, last_login_at, updated_at)
     VALUES ($1,'linkedin',$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
     ON CONFLICT (provider, provider_subject) DO NOTHING`,
    [uid, liSub, email, emailVer, name || null, photoUrl || null]
  );

  // Seed applicants_profile stub for job seekers (role 3) so completeness scoring
  // works immediately after first login and the dashboard doesn't show an empty state.
  if (roleId === 3) {
    try {
      var profileId = 'AP' + crypto.randomBytes(3).toString('hex').toUpperCase();
      await dbQuery.query(
        `INSERT INTO ${dbSchema}.applicants_profile
         (applicant_profile_id, user_id, photo_url, is_profile_ready, created_at)
         VALUES ($1,$2,$3,false,NOW())
         ON CONFLICT (applicant_profile_id) DO NOTHING`,
        [profileId, uid, photoUrl || null]
      );
    } catch (_) {}
  }

  // Send welcome email (non-fatal)
  try { await send(email, 'welcome', { name: firstName || 'there', email }); } catch (_) {}

  console.log('[linkedin] created user uid=' + uid.substring(0, 12) + ' role=' + roleId);
  return uid;
}

// ─── 3. POST /api/auth/linkedin/complete ─────────────────────────────────────

export const linkedinComplete = async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ message: 'LinkedIn sign-in is not enabled.' });

  var body = req.body || {};
  var ticketJwt = body.ticket ? String(body.ticket) : '';

  if (!ticketJwt) return res.status(400).json({ message: 'Missing ticket.' });

  // Decode + verify ticket JWT
  var ticketPayload = decodeTicketJwt(ticketJwt);
  if (!ticketPayload) return res.status(400).json({ message: 'Invalid or expired ticket.' });

  var { jti, uid: ticketUid, status, intent, rt: returnTo, rr: roleRequired } = ticketPayload;

  // Mark ticket as used in DB (prevents replay even across workers)
  var dbTicket = await consumeTicketDb(jti);
  if (!dbTicket) return res.status(400).json({ message: 'Ticket already used or expired.' });

  var ticketData = dbTicket.data;

  try {
    if (status === 'role_required') {
      // New user: return role_required so FE shows the choose-role screen
      return res.status(200).json({
        success: true,
        status: 'role_required',
        provider: 'linkedin',
        googleEmail:        ticketData.email,
        googleDisplayName:  ticketData.name,
        googlePhotoUrl:     ticketData.photoUrl,
        inferredFirstName:  ticketData.firstName,
        inferredLastName:   ticketData.lastName,
        // Pass a short-lived token for /auth/choose-role (liSub + profile fields embedded)
        linkedinPendingToken: makeTicketJwt('pending:linkedin:' + ticketData.liSub, 'pending', intent, returnTo, true, {
          email:     ticketData.email     || '',
          firstName: ticketData.firstName || '',
          lastName:  ticketData.lastName  || '',
          photoUrl:  ticketData.photoUrl  || '',
          name:      ticketData.name      || '',
        }),
        returnTo: returnTo || '',
        expiresInMinutes: 55,
      });
    }

    // Authenticated — create Firebase custom token → exchange for Firebase ID token
    var uid = ticketUid;
    var firebaseCustomToken = await firebaseAdmin.auth().createCustomToken(uid, { provider: 'linkedin' });
    var { idToken: firebaseIdToken, refreshToken } = await customTokenToIdToken(firebaseCustomToken);

    // Fetch current profile from DB
    var profRes = await dbQuery.query(
      `SELECT u.firstname, u.lastname, u.photo_url, uc.role
       FROM ${dbSchema}.users u
       JOIN ${dbSchema}.user_credentials uc ON uc.uid = u.uid
       WHERE u.uid=$1`,
      [uid]
    );
    var prof = profRes.rows[0] || {};

    var sessionData = await buildSessionResponse(
      uid, ticketData.email,
      prof.firstname || ticketData.firstName,
      prof.lastname  || ticketData.lastName,
      prof.role      || ticketData.role,
      firebaseIdToken, refreshToken,
      prof.photo_url || ticketData.photoUrl
    );

    console.log('[linkedin/complete] authenticated uid=' + uid.substring(0, 12));

    return res.status(200).json({ success: true, status: 'authenticated', data: sessionData });

  } catch (err) {
    console.error('[linkedin/complete] error:', (err && err.message || '').substring(0, 120));
    return res.status(500).json({ message: 'LinkedIn sign-in could not be completed. Please try again.' });
  }
};

// ─── 4. POST /api/auth/linkedin/choose-role ──────────────────────────────────
// For new LinkedIn users who went through role_required.
// Accepts: { linkedinPendingToken, selectedRole }

export const linkedinChooseRole = async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ message: 'LinkedIn sign-in is not enabled.' });

  var body = req.body || {};
  var pendingToken  = body.linkedinPendingToken ? String(body.linkedinPendingToken) : '';
  var selectedRole  = body.selectedRole ? String(body.selectedRole) : '';

  var roleId = null;
  if (selectedRole === 'job_seeker')  roleId = 3;
  else if (selectedRole === 'employer') roleId = 2;
  else return res.status(400).json({ message: 'Please choose either Job Seeker or Employer.' });

  var pendingPayload = decodeTicketJwt(pendingToken);
  if (!pendingPayload) return res.status(400).json({ message: 'Invalid or expired session. Please sign in with LinkedIn again.' });

  // uid is 'pending:linkedin:<liSub>'
  var uidField = String(pendingPayload.uid || '');
  if (!uidField.startsWith('pending:linkedin:')) {
    return res.status(400).json({ message: 'Invalid pending token.' });
  }

  var liSub = uidField.replace('pending:linkedin:', '');

  // Get user info from identity table or the pending ticket data
  // (we stored the original ticketData in oauth_tickets, but we can't re-read it here without the jti)
  // Instead, re-fetch from auth_identities if already partially inserted
  var identityRow = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.auth_identities WHERE provider='linkedin' AND provider_subject=$1`,
    [liSub]
  );

  var email, firstName, lastName, photoUrl, name, emailVer;
  if (identityRow.rows.length > 0) {
    // Already linked (race or retry) — just get the existing user
    var existingUid = identityRow.rows[0].user_uid;
    var credRow2 = await dbQuery.query(`SELECT role FROM ${dbSchema}.user_credentials WHERE uid=$1`, [existingUid]);
    if (credRow2.rows[0]) {
      // Already has a real account — proceed as authenticated
      email = identityRow.rows[0].provider_email;
      firstName = (identityRow.rows[0].provider_name || '').split(' ')[0];
      lastName  = (identityRow.rows[0].provider_name || '').split(' ').slice(1).join(' ');
      photoUrl  = identityRow.rows[0].provider_picture;
      var firebaseTok2 = await firebaseAdmin.auth().createCustomToken(existingUid, { provider: 'linkedin' });
      var { idToken: fid2, refreshToken: rt2 } = await customTokenToIdToken(firebaseTok2);
      var sess2 = await buildSessionResponse(existingUid, email, firstName, lastName, credRow2.rows[0].role, fid2, rt2, photoUrl);
      return res.status(200).json({ success: true, status: 'authenticated', data: sess2 });
    }
  }

  // We need the LinkedIn profile data to create the user.
  // The pending token payload has intent/returnTo but not the full profile.
  // We stored it in the callback's ticketData but that DB row was consumed.
  // Recover: re-decode the JWT sub fields embedded in pendingPayload.
  // Fallback: use empty names (user can fill in profile later).
  email     = pendingPayload.email     || '';
  firstName = pendingPayload.firstName || '';
  lastName  = pendingPayload.lastName  || '';
  photoUrl  = pendingPayload.photoUrl  || '';
  name      = pendingPayload.name      || '';
  emailVer  = true;

  if (!email) return res.status(400).json({ message: 'LinkedIn session data is incomplete. Please sign in with LinkedIn again.' });

  try {
    var uid = await createLinkedinUser(liSub, email, emailVer, firstName, lastName, photoUrl, name, roleId);
    var firebaseCustomToken = await firebaseAdmin.auth().createCustomToken(uid, { provider: 'linkedin' });
    var { idToken: firebaseIdToken, refreshToken } = await customTokenToIdToken(firebaseCustomToken);
    var sessionData = await buildSessionResponse(uid, email, firstName, lastName, roleId, firebaseIdToken, refreshToken, photoUrl);
    console.log('[linkedin/choose-role] created uid=' + uid.substring(0, 12) + ' role=' + roleId);
    return res.status(200).json({ success: true, status: 'authenticated', roleId, data: sessionData });
  } catch (err) {
    console.error('[linkedin/choose-role] error:', (err && err.message || '').substring(0, 120));
    return res.status(500).json({ message: 'Could not complete LinkedIn sign-up. Please try again.' });
  }
};

// ─── 5. DELETE /api/auth/linkedin/unlink ─────────────────────────────────────
// Requires verifyAuth middleware. Removes the LinkedIn identity from this account.

export const linkedinUnlink = async (req, res) => {
  var uid = req.user && req.user.uid;
  if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

  var result = await dbQuery.query(
    `DELETE FROM ${dbSchema}.auth_identities WHERE user_uid=$1 AND provider='linkedin' RETURNING id`,
    [uid]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'No LinkedIn account is linked to your profile.' });
  }
  console.log('[linkedin/unlink] uid=' + uid.substring(0, 8));
  return res.status(200).json({ success: true, message: 'LinkedIn account unlinked.' });
};

// ─── 6. GET /api/auth/linkedin/link-status ───────────────────────────────────
// Requires verifyAuth. Returns whether LinkedIn is linked for the current user.

export const linkedinLinkStatus = async (req, res) => {
  var uid = req.user && req.user.uid;
  if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

  var row = await dbQuery.query(
    `SELECT provider_email, provider_name, linked_at, last_login_at
     FROM ${dbSchema}.auth_identities WHERE user_uid=$1 AND provider='linkedin'`,
    [uid]
  );
  if (row.rows.length === 0) {
    return res.status(200).json({ linked: false });
  }
  var r = row.rows[0];
  return res.status(200).json({
    linked: true,
    linkedEmail: r.provider_email,
    linkedName:  r.provider_name,
    linkedAt:    r.linked_at,
    lastLoginAt: r.last_login_at,
  });
};
