import axios from 'axios';
import { firebaseAdmin } from '../middleware/firebaseApp';
import dbQuery from '../db/dbQuery';
import { hashPassword } from '../helpers/validation';
import { getUserCredentialsByEmail } from '../helpers/userDetails';
import { getUserCompany } from './companiesController';
import { companySubscriptions } from './subscriptionController';
import { send } from '../helpers/mailer';
import env from '../env';

const dbSchema = env.schema;

// Per-IP rate limit for Google auth endpoint: 10 attempts/IP/15 min
const ipRateCounts = {};
setInterval(function() {
  const now = Date.now();
  var keys = Object.keys(ipRateCounts);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (ipRateCounts[k] && ipRateCounts[k].resetAt < now) {
      delete ipRateCounts[k];
    }
  }
}, 15 * 60 * 1000).unref();

function getClientIp(req) {
  var forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkIpRateLimit(ip) {
  var now = Date.now();
  var windowMs = 15 * 60 * 1000;
  var limit = 10;
  if (!ipRateCounts[ip]) {
    ipRateCounts[ip] = { count: 0, resetAt: now + windowMs };
  }
  if (ipRateCounts[ip].resetAt < now) {
    ipRateCounts[ip] = { count: 0, resetAt: now + windowMs };
  }
  ipRateCounts[ip].count += 1;
  return ipRateCounts[ip].count <= limit;
}

// Server-controlled allowlist of accepted Google credential types. The client
// selects only which TYPE of credential it is sending (an exact enum value) —
// it never supplies postBody/providerId itself, so it cannot inject an
// arbitrary IdP or arbitrary Firebase REST parameters.
var CREDENTIAL_TYPES = {
  google_id_token: 'id_token',
  google_access_token: 'access_token'
};

// Exchange a Google credential (GIS ID token, or an OAuth2 access token from
// the custom-button token-client flow) for Firebase credentials via Firebase's
// REST API. This is safe: Firebase's REST API verifies the Google credential
// with Google directly (signature verification for an ID token; a Google
// tokeninfo/userinfo check for an access token) internally, server-side. We
// then independently verify the returned Firebase ID token with Firebase
// Admin for double assurance — unchanged for either credential type.
//
// providerId is always the literal 'google.com' here, never client-supplied.
async function exchangeGoogleTokenForFirebase(credential, credentialType) {
  var postBodyField = CREDENTIAL_TYPES[credentialType];
  if (!postBodyField) {
    // Should be unreachable — callers validate credentialType before this point.
    throw new Error('unsupported_credential_type');
  }
  var apiKey = env.apiKey;
  var isProduction = process.env.NODE_ENV === 'production';
  var emulatorHost = !isProduction && process.env.FIREBASE_AUTH_EMULATOR_HOST;
  var base = emulatorHost
    ? 'http://' + emulatorHost + '/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + apiKey
    : 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + apiKey;
  var response = await axios.post(base, {
    requestUri: 'https://gethiredonline.app',
    postBody: postBodyField + '=' + encodeURIComponent(credential) + '&providerId=google.com',
    returnSecureToken: true,
    returnIdpCredential: false
  }, { timeout: 10000 });
  return response.data;
}

// Build the standard session response shape (same as loginUser) so FE reuses loggedIn()
async function buildSessionResponse(uid, email, firstName, lastName, role, firebaseIdToken, refreshToken, photoUrl) {
  var userCompany = await getUserCompany(uid);
  var isActive = false;

  if (userCompany && userCompany.companyId) {
    try {
      var subs = await companySubscriptions(userCompany.companyId);
      if (subs && subs.length > 0) {
        isActive = new Date(subs[0].endAt) > new Date();
      }
    } catch (_) { /* non-fatal */ }
  }

  return {
    id: uid,
    email: email,
    firstName: firstName || '',
    lastName: lastName || '',
    role: role,
    photoUrl: photoUrl || '',
    token: firebaseIdToken,
    refreshToken: refreshToken || '',
    withCompany: userCompany && userCompany.companyId ? true : false,
    companyName: (userCompany && userCompany.companyName) || '',
    companyId: (userCompany && userCompany.companyId) || null,
    withActiveSubscription: isActive
  };
}

// Sanitize returnUrl — only allow internal GetHired paths (no external, no protocol-relative)
function sanitizeReturnUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var url = raw.trim();
  if (!url.startsWith('/') || url.startsWith('//')) return '';
  // Reject javascript:, data:, and other schemes that might sneak in after decoding
  if (/[<>"'`]/.test(url)) return '';
  return url.substring(0, 256);
}

// POST /api/auth/google/firebase-session
// Anonymous endpoint — accepts Google ID token from GIS, creates/finds GetHired session
const googleFirebaseSession = async (req, res) => {
  var ip = getClientIp(req);
  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({ message: 'Too many sign-in attempts. Please try again in 15 minutes.' });
  }

  var body = req.body || {};
  var source = body.source ? String(body.source).substring(0, 64) : 'unknown';
  var returnUrl = sanitizeReturnUrl(body.returnUrl);

  // Two supported shapes on the wire:
  //  - legacy: { googleIdToken } — always the GIS ID-token flow (unchanged)
  //  - new:    { credential, credentialType } — credentialType is an exact
  //    allowlisted enum value (see CREDENTIAL_TYPES); the client never
  //    supplies postBody/providerId, only which TYPE of credential this is.
  var credentialType = 'google_id_token';
  var credential = '';
  if (body.credential) {
    credential = String(body.credential);
    credentialType = body.credentialType ? String(body.credentialType) : '';
  } else {
    credential = body.googleIdToken ? String(body.googleIdToken) : '';
  }

  if (!CREDENTIAL_TYPES[credentialType]) {
    return res.status(400).json({ message: 'Unsupported Google credential type.' });
  }

  // Basic sanity/bound check — Google JWTs and OAuth access tokens are both
  // comfortably under this ceiling in normal operation; this only exists to
  // reject empty/garbage input and cap payload size, not to validate shape.
  if (!credential || credential.length < 20 || credential.length > 4096) {
    return res.status(400).json({ message: 'Missing or invalid Google credential.' });
  }

  try {
    // Exchange the Google credential for a Firebase session via Firebase's REST API
    var fbData = await exchangeGoogleTokenForFirebase(credential, credentialType);
    var firebaseIdToken = fbData && fbData.idToken;
    var refreshToken = (fbData && fbData.refreshToken) || '';

    if (!firebaseIdToken) {
      return res.status(400).json({ message: 'Google sign-in could not be completed. Please try again.' });
    }

    // Verify the Firebase ID token with Firebase Admin (double verification)
    var decoded = await firebaseAdmin.auth().verifyIdToken(firebaseIdToken);
    var uid = decoded.uid;
    var email = (decoded.email || '').toLowerCase().trim();
    var emailVerified = decoded.email_verified;
    var displayName = decoded.name || '';
    var photoUrl = decoded.picture || '';

    if (!emailVerified) {
      return res.status(403).json({ message: 'Your Google account email is not verified. Please verify it with Google and try again.' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Could not retrieve your email from Google. Please try again.' });
    }

    // Look up existing user in DB by email
    var existing = await getUserCredentialsByEmail(email);

    if (existing) {
      // Existing user — return session exactly like loginUser does
      var profileResult = await dbQuery.query(
        'SELECT firstname, lastname, photo_url FROM ' + dbSchema + '.users WHERE uid=$1',
        [existing.uid]
      );
      var prof = profileResult.rows && profileResult.rows[0];
      var firstName = (prof && prof.firstname) || '';
      var lastName = (prof && prof.lastname) || '';
      var profilePhotoUrl = (prof && prof.photo_url) || photoUrl || '';

      var sessionData = await buildSessionResponse(
        existing.uid, email, firstName, lastName, existing.role,
        firebaseIdToken, refreshToken, profilePhotoUrl
      );

      console.log('[googleFirebaseSession] existing user uid=' + uid.substring(0, 8) + ' source=' + source);

      return res.status(200).json({
        success: true,
        status: 'authenticated',
        data: sessionData
      });
    }

    // New user — needs role classification
    // Return firebaseIdToken so FE can re-send it to /auth/choose-role after role selection
    // The token is valid for 1 hour — role selection must happen within that window
    // SECURITY: this is safe because /auth/choose-role re-verifies the token server-side
    // and the token alone cannot create an account without the server validating role selection
    var nameParts = displayName ? displayName.trim().split(/\s+/) : [];
    var inferredFirstName = nameParts.length > 0 ? nameParts[0] : '';
    var inferredLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    console.log('[googleFirebaseSession] new user email=' + email.substring(0, 4) + '... source=' + source);

    return res.status(200).json({
      success: true,
      status: 'role_required',
      googleDisplayName: displayName,
      googleEmail: email,
      googlePhotoUrl: photoUrl || '',
      inferredFirstName: inferredFirstName,
      inferredLastName: inferredLastName,
      firebaseIdToken: firebaseIdToken,
      refreshToken: refreshToken,
      expiresInMinutes: 55
    });

  } catch (err) {
    var errCode = (err && err.code) ? err.code : '';
    var errMsg = (err && err.message) ? err.message : '';

    if (errCode === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Your Google session has expired. Please sign in with Google again.' });
    }
    if (errCode === 'auth/argument-error' || errCode === 'auth/invalid-id-token') {
      return res.status(400).json({ message: 'Invalid Google credential. Please try signing in again.' });
    }

    // Check for Firebase REST API error (axios response error)
    if (err && err.response && err.response.data && err.response.data.error) {
      var apiErr = err.response.data.error;
      var apiMsg = apiErr.message || '';

      // SECURITY: apiMsg is Firebase's raw error text. For malformed input
      // it can echo back a fragment of the submitted credential (verified
      // via a synthetic sentinel test -- e.g. "Unable to parse id_token:
      // <the bad value we sent>"). Never log apiMsg itself. Only ever log a
      // normalized code drawn from this fixed, code-controlled set, so no
      // credential-bearing text can reach application logs. apiMsg is still
      // used below for the existing branch comparisons -- only what gets
      // logged has changed.
      var safeApiErrCode = 'UNKNOWN_FIREBASE_ERROR';
      if (apiMsg === 'EMAIL_EXISTS') safeApiErrCode = 'EMAIL_EXISTS';
      else if (apiMsg === 'INVALID_IDP_RESPONSE') safeApiErrCode = 'INVALID_IDP_RESPONSE';
      else if (apiMsg === 'MISSING_OR_INVALID_NONCE') safeApiErrCode = 'MISSING_OR_INVALID_NONCE';
      else if (apiMsg.indexOf('INVALID') === 0) safeApiErrCode = 'INVALID_OTHER';
      console.error('[googleFirebaseSession] Firebase REST API error code=' + safeApiErrCode + ' credentialType=' + credentialType);

      if (apiMsg === 'EMAIL_EXISTS') {
        // This email exists via a different provider (e.g. email+password)
        return res.status(409).json({
          message: 'An account with this email already exists. Please sign in with your email and password instead.',
          errorCode: 'account_exists_different_provider'
        });
      }
      if (apiMsg === 'INVALID_IDP_RESPONSE' || apiMsg === 'MISSING_OR_INVALID_NONCE' || apiMsg.indexOf('INVALID') === 0) {
        return res.status(400).json({ message: 'Google sign-in could not be verified. Please try again.' });
      }
    }

    console.error('[googleFirebaseSession] error code=' + errCode + ' msg=' + errMsg.substring(0, 100));
    return res.status(500).json({ message: 'Sign-in failed. Please try again.' });
  }
};

// POST /api/auth/choose-role
// Requires firebaseIdToken + selectedRole in body
// Creates user in DB with chosen role, returns full session
const chooseRole = async (req, res) => {
  var ip = getClientIp(req);
  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({ message: 'Too many requests. Please try again in 15 minutes.' });
  }

  var body = req.body || {};
  var firebaseIdToken = body.firebaseIdToken ? String(body.firebaseIdToken) : '';
  var selectedRole = body.selectedRole ? String(body.selectedRole) : '';

  if (!firebaseIdToken || firebaseIdToken.length < 200) {
    return res.status(400).json({ message: 'Invalid session. Please sign in with Google again.' });
  }

  // Validate role — only 'job_seeker' (3) or 'employer' (2) — never admin (1)
  var roleId = null;
  if (selectedRole === 'job_seeker') {
    roleId = 3;
  } else if (selectedRole === 'employer') {
    roleId = 2;
  } else {
    return res.status(400).json({ message: 'Please choose either Job Seeker or Employer.' });
  }

  try {
    // Re-verify Firebase token — never trust role selection from client alone
    var decoded = await firebaseAdmin.auth().verifyIdToken(firebaseIdToken);
    var uid = decoded.uid;
    var email = (decoded.email || '').toLowerCase().trim();
    var emailVerified = decoded.email_verified;
    var displayName = decoded.name || '';
    var photoUrl = decoded.picture || '';

    if (!emailVerified || !email) {
      return res.status(403).json({ message: 'Email verification required.' });
    }

    // Guard: check if user was created by a race condition (double-submit)
    var existing = await getUserCredentialsByEmail(email);
    if (existing) {
      // Already exists — return their session
      var profResult2 = await dbQuery.query(
        'SELECT firstname, lastname, photo_url FROM ' + dbSchema + '.users WHERE uid=$1',
        [existing.uid]
      );
      var prof2 = profResult2.rows && profResult2.rows[0];
      var sessionData2 = await buildSessionResponse(
        existing.uid, email,
        (prof2 && prof2.firstname) || '',
        (prof2 && prof2.lastname) || '',
        existing.role, firebaseIdToken, '', (prof2 && prof2.photo_url) || ''
      );
      return res.status(200).json({ success: true, status: 'authenticated', data: sessionData2 });
    }

    // Build name from Google display name
    var nameParts = displayName ? displayName.trim().split(/\s+/) : [];
    var firstName = nameParts.length > 0 ? nameParts[0] : '';
    var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Password for Google-created accounts: hash of uid — not guessable, never used for password login
    var dummyPassword = hashPassword(uid + '_google_provider');

    // Insert into user_credentials
    var credsResult = await dbQuery.query(
      'INSERT INTO ' + dbSchema + '.user_credentials (uid, email, "password", "role", created_date) VALUES ($1, $2, $3, $4, current_timestamp) RETURNING *',
      [uid, email, dummyPassword, roleId]
    );

    // Insert into users
    // STITCH QA11 FIX F-01: users.email was dropped in a DDL migration --
    // email lives on user_credentials only (already inserted above). Same
    // fix pattern already applied to controllers/userController.js's
    // registerUserInDB for the email/password signup path.
    var profileResult = await dbQuery.query(
      'INSERT INTO ' + dbSchema + '.users (uid, firstname, lastname, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [uid, firstName || null, lastName || null, photoUrl || null]
    );

    if (!credsResult.rows[0] || !profileResult.rows[0]) {
      return res.status(500).json({ message: 'Could not create your account. Please try again.' });
    }

    // Welcome email — non-fatal if it fails
    try {
      await send(email, 'welcome', { name: firstName || 'there', email: email });
    } catch (mailErr) {
      console.error('[chooseRole] welcome email error uid=' + uid.substring(0, 8));
    }

    console.log('[chooseRole] created user uid=' + uid.substring(0, 8) + ' role=' + roleId);

    var sessionData = await buildSessionResponse(uid, email, firstName, lastName, roleId, firebaseIdToken, '', photoUrl || '');

    return res.status(200).json({
      success: true,
      status: 'authenticated',
      roleId: roleId,
      data: sessionData
    });

  } catch (err) {
    var errCode2 = (err && err.code) ? err.code : '';
    var errMsg2 = (err && err.message) ? err.message : '';

    if (errCode2 === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Your Google session has expired. Please sign in with Google again.' });
    }
    if (errCode2 === '23505' || errMsg2.indexOf('duplicate key') !== -1 || errMsg2.indexOf('unique') !== -1) {
      // DB unique constraint — user created in a race; safe to look up and return session
      var raceExisting = await getUserCredentialsByEmail(email);
      if (raceExisting) {
        var raceProfResult = await dbQuery.query(
          'SELECT firstname, lastname, photo_url FROM ' + dbSchema + '.users WHERE uid=$1',
          [raceExisting.uid]
        );
        var raceProf = raceProfResult.rows && raceProfResult.rows[0];
        var raceSession = await buildSessionResponse(
          raceExisting.uid, email,
          (raceProf && raceProf.firstname) || '',
          (raceProf && raceProf.lastname) || '',
          raceExisting.role, firebaseIdToken, '', (raceProf && raceProf.photo_url) || ''
        );
        return res.status(200).json({ success: true, status: 'authenticated', data: raceSession });
      }
    }

    console.error('[chooseRole] error code=' + errCode2 + ' msg=' + errMsg2.substring(0, 100));
    return res.status(500).json({ message: 'Could not complete sign-up. Please try again.' });
  }
};

export { googleFirebaseSession, chooseRole };
