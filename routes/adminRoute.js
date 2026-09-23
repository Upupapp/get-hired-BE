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

// verifyAuth must run first so verifyRoles reads req.user.uid.
// BE allows role 0 (super_admin) and role 1 (admin). The FE still treats
// role '1' as admin; role 0 is an additional backend pass.
router.get("/admin/dashboard", verifyAuth, verifyRoles([0, 1]), getDashboard);
router.get("/admin/users", verifyAuth, verifyRoles([0, 1]), listUsers);
router.get("/admin/userprofile", verifyAuth, verifyRoles([0, 1]), getUserProfile);
router.get("/admin/jobs", verifyAuth, verifyRoles([0, 1]), listJobs);
router.post("/admin/jobs/:jobId/unpublish", verifyAuth, verifyRoles([0, 1]), unpublishJob);
router.get("/admin/companies", verifyAuth, verifyRoles([0, 1]), listCompanies);

export default router;
