import service from "../services/jobOpeningAlertService";
import { successResponse, errorResponse, status } from "../helpers/status";
import { createJobOpeningAlertHttp } from "../services/jobOpeningAlerts.cjs";

const handlers = createJobOpeningAlertHttp(service, {
  successResponse: successResponse,
  errorResponse: errorResponse,
  status: status,
});

export { handlers };
export const listJobOpeningAlerts = handlers.list;
export const subscribeJobOpeningAlert = handlers.subscribe;
export const unsubscribeJobOpeningAlert = handlers.unsubscribe;
export const runJobOpeningAlertDigest = handlers.digest;
