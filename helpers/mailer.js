import env from "../env";
import {
  isValidEmail
} from "../helpers/validation";

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(env.mailerKey);

const templates = {
  // TODO to add template here once created
  verify_email: "d-f476e852447940a4a3acfee5f4a7f63d",
  pw_reset: "d-3517d64c1dd1403fb4d857af16b9e8a4"
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