import express from "express";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  createProfile,
  getApplicantProfileById,
  getApplicantProfileCompleteness,
  updateProfile,
  getUserProfile,
  saveWorkExp,
  saveCert,
  saveEducBg,
  saveSkillsArray,
  saveDocuments,
  saveVideoCV,
  updateBasicProfileInfo
} from "../controllers/applicantsController";
import {
  submitApplication
} from "../controllers/applicationController";
import { getDashboard } from "../controllers/applicantsController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// application
// SECURE fix: these 3 routes had no auth middleware at all. Zero frontend
// consumers found in this repo (the live apply flow uses
// /application/apply below), so adding auth here breaks no existing caller.
router.post("/application/create", verifyAuth, createApplication);

router.put("/application/updateJobs", verifyAuth, updateApplication);
router.delete("/application/delete", verifyAuth, deleteApplication);
router.post("/application/apply", verifyAuth, submitApplication)


// applicant
router.post("/applicant/createprofile", verifyAuth, createProfile);

router.put("/applicant/updateprofile", verifyAuth, updateProfile);
router.put("/applicant/updatebasicinfo", verifyAuth, updateBasicProfileInfo);

router.get("/applicant/userprofile", verifyAuth, getUserProfile);
router.get("/applicant/dashboard", verifyAuth, getDashboard);

router.get("/applicant/profile", verifyAuth, getApplicantProfileById);
router.get("/applicant/profile/completeness", verifyAuth, getApplicantProfileCompleteness);
router.post("/applicant/workexp", verifyAuth, saveWorkExp);
router.post("/applicant/educbg", verifyAuth, saveEducBg);
router.post("/applicant/cert", verifyAuth, saveCert);
router.post("/applicant/skills", verifyAuth, saveSkillsArray);
router.post("/applicant/docs", verifyAuth, saveDocuments);
router.put("/applicant/savevideocv", verifyAuth, saveVideoCV);


export default router;
