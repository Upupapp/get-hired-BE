import env from "../env";
import {
  isValidEmail
} from "../helpers/validation";

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(env.mailerKey);

const templates = {
  // TODO to add template here once created
  verify_email: "d-f476e852447940a4a3acfee5f4a7f63d",
  pw_reset: "d-3517d64c1dd1403fb4d857af16b9e8a4",
  add_user: "d-0140cd7cd48743efa350e9c044381b3d",
  invite: "d-0561f943fa504c80a2ea47eb18f52cd0 "
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
      console.log(error.response.body);
      throw Error('Failed Sending Email');
  });
}

export {
  send
};