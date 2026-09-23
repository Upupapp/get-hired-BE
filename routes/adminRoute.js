import express from "express";
import verifyAuth from "../middleware/verifyAuth";
import verifyRoles from "../middleware/verifyRoles";

import {
  getUserProfile,
  getDashboard,
  listUsers,
  listJobs,
  unpublishJob,
  listCompanies,
} from "../controllers/adminController";

const router = express.Router();

// Role 1 = admin. verifyAuth must run first so verifyRoles reads req.user.uid.
router.get("/admin/dashboard", verifyAuth, verifyRoles([1]), getDashboard);
router.get("/admin/users", verifyAuth, verifyRoles([1]), listUsers);
router.get("/admin/userprofile", verifyAuth, verifyRoles([1]), getUserProfile);
router.get("/admin/jobs", verifyAuth, verifyRoles([1]), listJobs);
router.post("/admin/jobs/:jobId/unpublish", verifyAuth, verifyRoles([1]), unpublishJob);
router.get("/admin/companies", verifyAuth, verifyRoles([1]), listCompanies);

export default router;
