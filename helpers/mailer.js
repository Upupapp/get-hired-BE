import env from "../env";
import { isValidEmail } from "../helpers/validation";

const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(env.mailerKey);
const isStaging = process.env.is_staging == "true";

const jobhuntSendgrid = {
  verify_email: "d-acbbb666db9a4958ae2b45f0f06728bd",
  add_user: "d-50e5c815421d407799988169ccf3ac3c",
  invite: "d-822df45e7ba644d2b748d07b3284a884",
  contact: "d-a2ffda953c6046b7828fda40a13d3b67",
  pw_reset: "d-f750b17fac53437ab663f75b0b641d4e",
};

const gethiredSendgrid = {
  verify_email: "d-0dffbe21de484b3b9b9f7c113d92c5fd",
  pw_reset: "d-673ee5e8ebdf4db6ac5efe19d7f6f57a",
  add_user: "d-3ccde8af4bee41ef923e3baa2824ec2a",
  invite: "d-db34d7fe16994377bcb29b1609f21b52",
  contact: "d-f041a4c13a0f49c0a91b3aa425bb7b38",
  interview: "d-998725e138f042399ac0142db104e86d",
  application: "d-9775084a27d44a36834f0b43c8abe1fc",
  // LAUNCH-02: status-change email reuses the application template for P0.
  // Create a dedicated SendGrid dynamic template and update this ID post-launch.
  application_status_changed: "d-9775084a27d44a36834f0b43c8abe1fc",
  // TODO: paste your SendGrid template ID here after creating it.
  // Template HTML is at: docs/email-template-pw_changed.html
  // Variables: {{name}}, {{email}}. Set subject: "Your GetHired password has been changed"
  pw_changed: "d-7c5d1e911776439dbbf43ef05ec5db9d",
  // Subscription Lifecycle V4 — published 2026-06-30 via SendGrid API
  subscription_trial_started:        "d-3d7b0fffbcc84328899381cb770655ff",
  subscription_trial_ending:         "d-361de7d8d2fd45a691cced40b1530729",
  subscription_trial_expired:        "d-4d3ca6cf577449e0b2ce087af64bcf8a",
  subscription_renewal_reminder:     "d-19b3c4375f0848caa645a7455ec1c77c",
  subscription_payment_pending:      "d-d2518aa0aaef4d66b907ae5813a2677d",
  subscription_payment_link_expired: "d-bae872d08a5b433d8093572e26484cb2",
  subscription_payment_failed:       "d-0f406231133b4957bad966cc1d57557a",
  subscription_payment_overdue:      "d-e231ed316fde4d99a55392a66830f851",
  subscription_payment_grace_final:  "d-befef97d222349908187b63e621c5460",
  subscription_payment_success:      "d-548aa9946d004d88a1ec2f7d494ea54e",
  subscription_reactivated:          "d-aafe4375a717449b9c8346dc916de365",
  subscription_expired:              "d-761e40f9ed9e45548edba32f28a02d8b",
  // Invoice Vault — published 2026-06-30 via SendGrid API
  invoice_issued:                    "d-8584306d5098429490840e8d234ada89",
  // Employer product emails — Dynamic Templates (2026-09-23)
  employer_milestone_1:  "d-d91c57747612444cba76c8ecdb4f1d31",
  employer_milestone_10: "d-1de4ba3ec9ed44378c235cdbf2ed9c4d",
  employer_milestone_20: "d-04a7bb0c51334134a62a95175400072b",
  employer_milestone_40: "d-0e294950e8a54863b26e352fda7ab2fa",
  employer_milestone_50: "d-d1ea2c7986ca40e1895a7cb62fad02b7",
  employer_job_live:     "d-aaa81d288c5c47b89ff5f1cb07424135",
};

const eucannajobsSendgrid = {
  verify_email: "d-870db565b1f44ae5831783a9cf1e7bb6",
  pw_reset: "d-fd054d81e05448a1b91ff6be8b79a604",
  add_user: "d-1d6be80e3cab43e690c330d8c2d64b0d",
  invite: "d-90e15e456a274e4aa35b2e6aa8f383d0",
  contacts: "d-8be3ed55dd8740ffae9381e76af12302",
};

const getTemplate = (template) => {
  switch (env.mailerTemplate) {
    case "gethiredSendgrid":
      return gethiredSendgrid[template] || null;
    case "jobhuntSendgrid":
      return jobhuntSendgrid[template] || null;
    case "eucannajobsSendgrid":
      return eucannajobsSendgrid[template] || null;
    default:
      return null;
  }
};

function resolveFrom(options) {
  if (options && options.fromEmail) {
    if (options.fromName) {
      return { email: options.fromEmail, name: options.fromName };
    }
    return options.fromEmail;
  }
  return env.mailerSender;
}

function extractMessageId(response) {
  if (!response) return null;
  var headers = response.headers || {};
  return headers["x-message-id"] || headers["X-Message-Id"] || null;
}

// LAUNCH-02: send() is now async and returns { sent: true, messageId } or
// { sent: false, reason }. It never throws — callers can safely fire-and-forget.
// Optional 4th arg `options`: { fromEmail, fromName } for per-template From
// without changing global MAILER_SENDER (used by employer milestone/job-live).
const send = async (recipient, templateToUse, data, options) => {
  const email = isValidEmail(recipient.trim()) ? recipient : env.mailerSender;
  const templateId = getTemplate(templateToUse);
  if (!templateId) {
    console.warn('[mailer] No template configured for:', templateToUse, '(env:', env.mailerTemplate + ')');
    return { sent: false, reason: 'no_template' };
  }
  const msg = {
    to: email,
    from: resolveFrom(options),
    templateId: templateId,
    dynamic_template_data: { ...data },
  };
  try {
    const sgResult = await sgMail.send(msg);
    // @sendgrid/mail returns [ClientResponse, body] or ClientResponse depending on version
    const response = Array.isArray(sgResult) ? sgResult[0] : sgResult;
    const messageId = extractMessageId(response);
    return { sent: true, messageId: messageId || null };
  } catch (error) {
    const code = error && error.code ? error.code : 'SENDGRID_ERROR';
    const body = error && error.response && error.response.body
      ? JSON.stringify(error.response.body).substring(0, 200)
      : '';
    console.error('[mailer] SendGrid send failed:', code, body);
    return { sent: false, reason: code };
  }
};

export { send, gethiredSendgrid, getTemplate };
