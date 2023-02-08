import express from "express";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  createProfile,
  getApplicantProfileById,
  updateProfile,
  getUserProfile,
  saveWorkExp,
  saveCert,
  saveEducBg
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
router.get("/applicant/dashboard", verifyAuth, getDashboard);

router.get("/applicant/profile", verifyAuth, getApplicantProfileById);
router.post("/applicant/workexp", verifyAuth, saveWorkExp);
router.post("/applicant/educbg", verifyAuth, saveEducBg);
router.post("/applicant/cert", verifyAuth, saveCert);

export default router;
