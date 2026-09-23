import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import verifyRoles from "../middleware/verifyRoles";
import { handlers } from "../controllers/jobOpeningAlertController";
import { mountJobOpeningAlertRoutes, JOBSEEKER_ROLE_ID } from "../services/jobOpeningAlerts.cjs";

const router = express.Router();

// Jobseekers only. user_credentials.role 3 = candidate (db/user_ddl.sql).
// verifyRoles returns 403 { message: "User not allowed to access this API" }
// for employers (2), admins (1), and any other non-candidate role.
// POST /internal/job-opening-alerts/digest is cron-secret only: no Firebase
// auth and no role check. Mount this router before billingRoutes so that
// digest call does not enter billing's router-wide auth gate.
mountJobOpeningAlertRoutes(router, handlers, verifyAuth, verifyRoles([JOBSEEKER_ROLE_ID]));

export default router;
