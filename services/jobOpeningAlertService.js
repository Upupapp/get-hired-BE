import dbQuery from "../db/dbQuery";
import env from "../env";
import { send } from "../helpers/mailer";
import { createJobOpeningAlertService } from "./jobOpeningAlerts.cjs";

const service = createJobOpeningAlertService({
  query: function(text, params) {
    return dbQuery.query(text, params);
  },
  send: send,
  schema: env.schema || "gethired",
  appUrl: env.app_url,
  publicSiteUrl: process.env.PUBLIC_SITE_URL || "",
});

export default service;
