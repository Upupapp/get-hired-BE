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
  verify_email: "d-f476e852447940a4a3acfee5f4a7f63d",
  pw_reset: "d-3517d64c1dd1403fb4d857af16b9e8a4",
  add_user: "d-0140cd7cd48743efa350e9c044381b3d",
  invite: "d-0561f943fa504c80a2ea47eb18f52cd0",
  contact: "d-ed57e2ed8a8c4638ad899f5af80c322a",
  interview: "d-c3bab8dfcd8f42d6b091dfcea491c17e",
  application: "d-8a9d4cc9603e4c7b9b65e2844da33788"
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
      return gethiredSendgrid[template];
    case "jobhuntSendgrid":
      return jobhuntSendgrid[template];
    case "eucannajobsSendgrid":
      return eucannajobsSendgrid[template];
  }
};

const send = (recipient, templateToUse, data) => {
  const email = isValidEmail(recipient.trim()) ? recipient : env.mailerSender;
  const msg = {
    to: email,
    from: env.mailerSender,
    templateId: getTemplate(templateToUse),
    dynamic_template_data: {
      ...data,
    },
  };

  console.log(msg);

  sgMail.send(msg).then(
    () => {
      return "Email sent!";
    },
    (error) => {
      console.log(error.response.body);
      throw Error("Failed Sending Email");
    }
  );
};

export { send };
