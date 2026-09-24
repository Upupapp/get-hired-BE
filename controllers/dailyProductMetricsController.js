import dbQuery from "../db/dbQuery";
import env from "../env";
import { errorResponse, status } from "../helpers/status";
import { loadPayments } from "./adminController";
import { createDailyProductMetricsService, createDailyProductMetricsHttp } from "../services/dailyProductMetrics";

function buildDailyProductMetricsHandlers(overrides) {
  var extra = overrides || {};
  var service = createDailyProductMetricsService({
    query: extra.query || function (text, params) {
      return dbQuery.query(text, params);
    },
    schema: extra.schema || env.schema,
    loadPayments: extra.loadPayments || loadPayments,
  });
  var httpDeps = {};
  if (Object.prototype.hasOwnProperty.call(extra, "cronSecret")) {
    httpDeps.cronSecret = extra.cronSecret;
  }
  if (typeof extra.now === "function") httpDeps.now = extra.now;
  return createDailyProductMetricsHttp(service, {
    errorResponse: errorResponse,
    status: status,
  }, httpDeps);
}

const handlers = buildDailyProductMetricsHandlers();

export {
  handlers,
  buildDailyProductMetricsHandlers,
};
