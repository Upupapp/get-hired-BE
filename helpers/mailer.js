import env from "../env";

const SibApiV3Sdk = require("sib-api-v3-sdk");
let defaultClient = SibApiV3Sdk.ApiClient.instance;

let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = env.mailerKey;

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

const emailTemplateList = {
  verify_email: 1,
  pw_reset: 13,
  admin_create_user: 15,
};

const send = (recipient, templateToUse, data) => {
  sendSmtpEmail.templateId = emailTemplateList[templateToUse];

  sendSmtpEmail.to = [{ email: recipient.email, name: recipient.name }];
  sendSmtpEmail.replyTo = { email: "admin@gwana.app", name: "Gwana Admin" };
  sendSmtpEmail.params = data;
  sendSmtpEmail.sender = { name: "Gwana Admin", email: "admin@gwana.app" };

  apiInstance.sendTransacEmail(sendSmtpEmail).then(
    (data) => {
      console.log(
        "API called successfully. Returned data: " + JSON.stringify(data)
      );
      return data.messageId;
    },
    (error) => {
      console.log(error);
      return error;
    }
  );
};

export { send };
