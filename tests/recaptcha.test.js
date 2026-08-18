/**
 * reCAPTCHA verification tests — SEC-08 fix (2026-08-18)
 *
 * Regression coverage for helpers/recaptcha.js: fails open (signup
 * proceeds) when RECAPTCHA_SECRET_KEY isn't configured -- preserving
 * today's behavior in every environment that hasn't set it -- and
 * genuinely verifies against Google's siteverify endpoint once it is.
 *
 * Same convention as tests/sitemap.test.js and tests/auth-middleware.test.js:
 * the BE has no Jest config or test runner in package.json yet. These are
 * written as executable Jest tests and serve as an accurate, runnable spec
 * once test infra is added (see those files for the exact setup steps).
 */

const mockPost = jest.fn();
jest.mock('axios', () => ({
  post: (...args) => mockPost(...args),
}));

const { verifyRecaptcha } = require('../helpers/recaptcha.js');

describe('verifyRecaptcha (SEC-08)', () => {
  const originalSecret = process.env.RECAPTCHA_SECRET_KEY;

  afterEach(() => {
    mockPost.mockReset();
    if (originalSecret === undefined) {
      delete process.env.RECAPTCHA_SECRET_KEY;
    } else {
      process.env.RECAPTCHA_SECRET_KEY = originalSecret;
    }
  });

  it('fails open (success: true, skipped: true) when RECAPTCHA_SECRET_KEY is not set, regardless of token', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;

    const result = await verifyRecaptcha(undefined);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects a missing token once a secret IS configured', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'a-real-secret';

    const result = await verifyRecaptcha(undefined);

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('calls Google siteverify with the secret and token, and accepts a successful response', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'a-real-secret';
    mockPost.mockResolvedValue({ data: { success: true } });

    const result = await verifyRecaptcha('a-real-token-from-the-widget');

    expect(mockPost).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: 'a-real-secret', response: 'a-real-token-from-the-widget' } }
    );
    expect(result.success).toBe(true);
  });

  it('rejects when Google reports success: false', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'a-real-secret';
    mockPost.mockResolvedValue({ data: { success: false, 'error-codes': ['invalid-input-response'] } });

    const result = await verifyRecaptcha('a-bad-token');

    expect(result.success).toBe(false);
  });

  it('rejects (does not silently pass) when the siteverify request itself fails', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'a-real-secret';
    mockPost.mockRejectedValue(new Error('network error'));

    const result = await verifyRecaptcha('some-token');

    expect(result.success).toBe(false);
  });
});
