import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import { handlers } from "../controllers/jobOpeningAlertController";
import { mountJobOpeningAlertRoutes } from "../services/jobOpeningAlerts.cjs";

const router = express.Router();

// Registered-user routes use Firebase verifyAuth.
// POST /internal/job-opening-alerts/digest is not Firebase-authenticated;
// it requires X-Job-Opening-Alert-Cron. Mount this router before billingRoutes
// so that digest call does not enter billing's router-wide auth gate.
mountJobOpeningAlertRoutes(router, handlers, verifyAuth);

export default router;
