import env from '../env.js';

const sgMail = require('@sendgrid/mail');
if (env.mailerKey) { sgMail.setApiKey(env.mailerKey); }

const ALLOWED_REQUEST_TYPES = new Set([
  'access', 'correction', 'deletion', 'portability',
  'objection', 'withdraw_consent', 'account_privacy',
  'employer_data', 'security_concern', 'other',
]);

const ALLOWED_ROLES = new Set(['job_seeker', 'employer', 'recruiter', 'visitor', 'other']);

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[\r\n]{3,}/g, '\n\n').trim();

export const submitPrivacyRequest = async (req, res) => {
  try {
    const {
      request_type,
      name,
      email,
      role,
      message,
      related_account_email,
      consent_to_contact,
    } = req.body ?? {};

    // --- Validation ---
    if (!ALLOWED_REQUEST_TYPES.has(request_type)) {
      return res.status(400).json({ message: 'Invalid request type.' });
    }
    const cleanName = strip(name);
    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({ message: 'Name is required (max 100 characters).' });
    }
    const cleanEmail = strip(email).toLowerCase();
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 200) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    const cleanMessage = strip(message);
    if (!cleanMessage || cleanMessage.length < 10 || cleanMessage.length > 2000) {
      return res.status(400).json({ message: 'Message must be 10–2000 characters.' });
    }
    if (!consent_to_contact) {
      return res.status(400).json({ message: 'Consent to contact is required.' });
    }
    let cleanRelated = '';
    if (related_account_email) {
      cleanRelated = strip(related_account_email).toLowerCase();
      if (cleanRelated && (!EMAIL_RE.test(cleanRelated) || cleanRelated.length > 200)) {
        return res.status(400).json({ message: 'Related account email is not valid.' });
      }
    }

    // --- Send internal notification email ---
    if (env.mailerKey && env.mailerSender) {
      const subject = `[GetHired Privacy Request] ${request_type.toUpperCase()} — ${cleanName}`;
      const text = [
        'GetHired Privacy Request',
        '========================',
        '',
        `Request type : ${request_type}`,
        `Name         : ${cleanName}`,
        `Email        : ${cleanEmail}`,
        `Role         : ${role}`,
        `Related acct : ${cleanRelated || 'N/A'}`,
        `Consent      : Yes`,
        '',
        'Message:',
        cleanMessage,
        '',
        '---',
        'This request was submitted via gethiredonline.app/privacy.',
        'IMPORTANT: Identity has NOT been verified. Verify the requester\'s identity',
        'before disclosing, correcting, or deleting any personal data.',
      ].join('\n');

      await sgMail.send({
        to: env.mailerSender,
        from: { email: env.mailerSender, name: 'GetHired Privacy' },
        replyTo: cleanEmail,
        subject,
        text,
      });
    }

    return res.status(200).json({
      message: 'Your request was received. We will review it and contact you at the email you provided.',
    });
  } catch (err) {
    console.error('[privacyController] submitPrivacyRequest:', err?.message ?? err);
    return res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
};
