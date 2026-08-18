import axios from 'axios';

// SEC-08 FIX (TAB 00/12 finding): the frontend has rendered a reCAPTCHA
// widget on signup for a long time, but the token it produces was never
// sent to the backend, and the backend never verified anything -- the
// widget provided zero real protection. Fixed on both ends: the frontend
// now includes the token in the signup payload, and this verifies it here.
//
// Fails OPEN (skips verification, signup proceeds) when RECAPTCHA_SECRET_KEY
// isn't configured, so this doesn't break signup in any environment that
// hasn't set the secret yet -- exactly today's behavior, preserved. The
// secret must come from the user's own Google reCAPTCHA admin console and
// be set directly in their environment; it is never something to invent or
// hardcode here. Once RECAPTCHA_SECRET_KEY is set, verification becomes
// real and signup is rejected on failure.
let _warnedNoSecret = false;

export async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    if (!_warnedNoSecret) {
      console.warn(
        '[recaptcha] RECAPTCHA_SECRET_KEY is not set -- signup reCAPTCHA ' +
        'verification is currently a no-op. Set it in the environment to ' +
        'enable real verification.'
      );
      _warnedNoSecret = true;
    }
    return { skipped: true, success: true };
  }

  if (!token) {
    return { skipped: false, success: false, reason: 'missing-token' };
  }

  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret, response: token } }
    );
    if (!data || data.success !== true) {
      return { skipped: false, success: false, reason: (data && data['error-codes']) || 'verification-failed' };
    }
    return { skipped: false, success: true };
  } catch (err) {
    // Network/infrastructure failure talking to Google -- do not silently
    // treat this as a pass (that would defeat the point), but also don't
    // leak err details to the caller.
    console.error('[recaptcha] siteverify request failed:', err && err.message);
    return { skipped: false, success: false, reason: 'verification-unavailable' };
  }
}
