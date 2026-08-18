/**
 * Auth middleware status-code tests — SEC-08 fix (2026-08-18)
 *
 * Regression coverage for the verifyAuth.js / verifyRoles.js 401-vs-403
 * fix: verifyAuth's every failure path is an authentication failure (no
 * token, invalid token, expired token) and must return 401, never 403;
 * verifyRoles' "valid token but role not permitted" branch is an
 * authorization denial and must return 403, never 401. Getting this wrong
 * previously let the frontend's session-expiry interceptor force-log-out
 * users on a routine, correctly-denied 403 (see
 * gethired-jobseeker-FE/src/app/core/interceptor/unauthorize.interceptor.ts
 * and the identical file in gethired-employer-FE).
 *
 * Same convention as tests/sitemap.test.js: the BE has no Jest config or
 * test runner in package.json yet. These are written as executable Jest
 * tests and serve as an accurate, runnable spec once test infra is added:
 *
 *   1. npm install --save-dev jest supertest @babel/core @babel/preset-env babel-jest
 *   2. Add to package.json scripts: "test": "jest --testPathPattern=tests/"
 *   3. Add jest.config.js or a "jest" key with transform config for ESM/Babel
 *
 * Current state: tests CANNOT run automatically because the BE has no test
 * runner installed (package.json "test" script is a placeholder echo).
 *
 * Format: standard Jest / describe / it / expect — runnable once test infra added.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — must come before the middleware imports
// ──────────────────────────────────────────────────────────────────────────────

const mockVerifyIdToken = jest.fn();
jest.mock('../middleware/firebaseApp.js', () => ({
  firebaseAdmin: {
    auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  },
}));

const mockDbQuery = jest.fn();
jest.mock('../db/dbQuery.js', () => ({
  default: { query: mockDbQuery },
}));

jest.mock('../env.js', () => ({
  default: { schema: 'gethired' },
}));

const verifyAuth = require('../middleware/verifyAuth.js').default;
const verifyRoles = require('../middleware/verifyRoles.js').default;

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers — minimal Express req/res/next doubles
// ──────────────────────────────────────────────────────────────────────────────

function buildReq({ authHeader, cookieSession, user } = {}) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    cookies: cookieSession ? { __session: cookieSession } : undefined,
    user,
  };
}

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ──────────────────────────────────────────────────────────────────────────────
// verifyAuth — every failure path must be 401, never 403
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyAuth (SEC-08)', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  it('returns 401 (not 403) when no Authorization header or session cookie is present', async () => {
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await verifyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 (not 403) when the token fails verification (malformed/invalid)', async () => {
    mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('invalid'), { code: 'auth/argument-error' }));
    const req = buildReq({ authHeader: 'Bearer not-a-real-token' });
    const res = buildRes();
    const next = jest.fn();

    await verifyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 (not 403) when the token is expired', async () => {
    mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('expired'), { code: 'auth/id-token-expired' }));
    const req = buildReq({ authHeader: 'Bearer an-expired-token' });
    const res = buildRes();
    const next = jest.fn();

    await verifyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user for a valid token, with no error response', async () => {
    const decoded = { uid: 'user-123', email: 'seeker@example.com' };
    mockVerifyIdToken.mockResolvedValue(decoded);
    const req = buildReq({ authHeader: 'Bearer a-real-valid-token' });
    const res = buildRes();
    const next = jest.fn();

    await verifyAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(decoded);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts a valid __session cookie the same way as a Bearer header', async () => {
    const decoded = { uid: 'user-456' };
    mockVerifyIdToken.mockResolvedValue(decoded);
    const req = buildReq({ cookieSession: 'a-real-session-cookie' });
    const res = buildRes();
    const next = jest.fn();

    await verifyAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// verifyRoles — a valid identity denied by role must be 403, never 401
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyRoles (SEC-08)', () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it('returns 401 when req.user is absent (verifyAuth did not run / found no identity)', async () => {
    const req = buildReq({ user: undefined });
    const res = buildRes();
    const next = jest.fn();

    await verifyRoles([2])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 (not 401) for a valid, authenticated identity whose role is not in the allow-list', async () => {
    mockDbQuery.mockResolvedValue({ rows: [{ uid: 'user-123', role: 3 }] }); // role 3 = job seeker
    const req = buildReq({ user: { uid: 'user-123' } });
    const res = buildRes();
    const next = jest.fn();

    await verifyRoles([2])(req, res, next); // route requires role 2 = employer

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 (not 401) when the uid has no matching row at all', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });
    const req = buildReq({ user: { uid: 'ghost-uid' } });
    const res = buildRes();
    const next = jest.fn();

    await verifyRoles([2])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() with no error response when the role is permitted', async () => {
    mockDbQuery.mockResolvedValue({ rows: [{ uid: 'user-789', role: 2 }] });
    const req = buildReq({ user: { uid: 'user-789' } });
    const res = buildRes();
    const next = jest.fn();

    await verifyRoles([2])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
