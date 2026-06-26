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

// LAUNCH-02: send() is now async and returns { sent: true } or { sent: false, reason }.
// It never throws — callers can safely fire-and-forget or await/catch.
const send = async (recipient, templateToUse, data) => {
  const email = isValidEmail(recipient.trim()) ? recipient : env.mailerSender;
  const templateId = getTemplate(templateToUse);
  if (!templateId) {
    console.warn('[mailer] No template configured for:', templateToUse, '(env:', env.mailerTemplate + ')');
    return { sent: false, reason: 'no_template' };
  }
  const msg = {
    to: email,
    from: env.mailerSender,
    templateId: templateId,
    dynamic_template_data: { ...data },
  };
  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error) {
    const code = error && error.code ? error.code : 'SENDGRID_ERROR';
    const body = error && error.response && error.response.body
      ? JSON.stringify(error.response.body).substring(0, 200)
      : '';
    console.error('[mailer] SendGrid send failed:', code, body);
    return { sent: false, reason: code };
  }
};

export { send };
