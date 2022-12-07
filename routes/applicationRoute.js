import express from "express";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  createProfile,
  getApplicantProfileById,
  updateProfile,
  getUserProfile
} from "../controllers/applicantsController";
import {
  submitApplication
} from "../controllers/applicationController";
import { getDashboard } from "../controllers/applicantsController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// application
router.post("/application/create", createApplication);
router.put("/application/updateJobs", updateApplication);
router.delete("/application/delete", deleteApplication);
router.post("/application/apply", submitApplication)
// applicant
router.put("/applicant/updateprofile", verifyAuth, updateProfile);
router.post("/applicant/createprofile", verifyAuth, createProfile);
router.get("/applicant/userprofile", verifyAuth, getUserProfile);
router.get("/applicant/userprofile", verifyAuth, getDashboard);

router.get("/applicant/profile", verifyAuth, getApplicantProfileById);

export default router;
