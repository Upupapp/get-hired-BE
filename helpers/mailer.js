import env from "../env";
import {
  isValidEmail
} from "../helpers/validation";

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(env.mailerKey);

const templates = {
  // TODO to add template here once created
  verify_email: "d-e17949b4eba541d29973d785f8deba90",
  pw_reset: "d-fc85ac8a67a64c9083483069aedd19a8"
};

const send = (recipient, templateToUse, data) => {
  const email = isValidEmail(recipient.trim()) ? recipient : env.mailerSender;
  const msg = {
      to: email,
      from: env.mailerSender,
      templateId: templates[templateToUse],
      dynamic_template_data: {
          ...data
      }
  };

  sgMail.send(msg).then(() => {
      return 'Email sent!';
  }, error => {
      console.log(error);
  });
}

export {
  send
};