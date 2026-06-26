import { initializeApp } from 'firebase/app';
import admin from 'firebase-admin';
import env from '../env';

// ---------------------------------------------------------------------------
// Firebase Admin — credential resolution order
// ---------------------------------------------------------------------------
// 1. FIREBASE_SERVICE_ACCOUNT_BASE64  (preferred for Linode/CI)
// 2. FIREBASE_SERVICE_ACCOUNT_JSON    (JSON string in env)
// 3. Application Default Credentials  (GCP-hosted environments)
// 4. FIREBASE_SERVICE_ACCOUNT_PATH    (local dev only; blocked in production)
// 5. No credentials                   → fail loudly
//
// SECURITY RULES:
//  - NEVER log service-account JSON or private-key material
//  - Log source type only (e.g. "env-base64")
//  - Redact credential errors from response bodies
// ---------------------------------------------------------------------------

function parseServiceAccountEnv(raw, sourceLabel) {
  try {
    const parsed = JSON.parse(raw);
    // Normalise escaped newlines that some secret-manager UIs insert
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (_) {
    throw new Error(`Firebase Admin: failed to parse JSON from ${sourceLabel} — check that the value is valid JSON`);
  }
}

function initFirebaseAdmin() {
  // Guard: init exactly once
  if (admin.apps.length > 0) {
    return admin.app('admin');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  let credential = null;
  let sourceLabel = null;

  // 1. Base-64 encoded service account (preferred for Linode/CI)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        'base64'
      ).toString('utf8');
      const sa = parseServiceAccountEnv(decoded, 'FIREBASE_SERVICE_ACCOUNT_BASE64');
      credential = admin.credential.cert(sa);
      sourceLabel = 'env-base64';
    } catch (err) {
      throw new Error(`Firebase Admin: env-base64 credential failed — ${err.message}`);
    }
  }

  // 2. JSON string in env
  if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const sa = parseServiceAccountEnv(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        'FIREBASE_SERVICE_ACCOUNT_JSON'
      );
      credential = admin.credential.cert(sa);
      sourceLabel = 'env-json';
    } catch (err) {
      throw new Error(`Firebase Admin: env-json credential failed — ${err.message}`);
    }
  }

  // 3. Application Default Credentials (GCP App Engine, Cloud Run, etc.)
  if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      credential = admin.credential.applicationDefault();
      sourceLabel = 'application-default';
    } catch (err) {
      throw new Error(`Firebase Admin: application-default credential failed — ${err.message}`);
    }
  }

  // 4. Local file path — LOCAL DEV ONLY (blocked in production)
  if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    if (isProduction) {
      throw new Error(
        'Firebase Admin: FIREBASE_SERVICE_ACCOUNT_PATH is not allowed in production. ' +
        'Use FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON instead.'
      );
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sa = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (sa.private_key && typeof sa.private_key === 'string') {
        sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      }
      credential = admin.credential.cert(sa);
      sourceLabel = 'local-dev-file';
    } catch (err) {
      throw new Error(`Firebase Admin: local-dev-file credential failed — ${err.message}`);
    }
  }

  // 5. No credentials found
  if (!credential) {
    if (isProduction) {
      throw new Error(
        'Firebase Admin: no credentials configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_BASE64 in the production environment.'
      );
    } else {
      throw new Error(
        'Firebase Admin: no credentials configured.\n' +
        'For local development, set one of:\n' +
        '  FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json\n' +
        '  FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-encoded-json>\n' +
        '  FIREBASE_SERVICE_ACCOUNT_JSON=<json-string>\n' +
        '  GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json'
      );
    }
  }

  console.log(`Firebase Admin: initializing via ${sourceLabel}`);

  return admin.initializeApp({ credential }, 'admin');
}

const _admin = initFirebaseAdmin();

export const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  messagingSenderId: env.messagingSenderId,
  appId: env.appId,
  measurementId: env.measurementId,
};

const _app = initializeApp(firebaseConfig);

export const firebaseAdmin = _admin;
export const firebaseApp = _app;
