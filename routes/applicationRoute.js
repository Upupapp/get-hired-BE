import express from "express";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  createProfile,
  getApplicantProfileById,
  updateProfile
} from "../controllers/applicantsController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// application
router.post("/application/create", createApplication);
router.put("/application/updateJobs", updateApplication);
router.delete("/application/delete", deleteApplication);

// applicant
router.put("/applicant/updateprofile", verifyAuth, updateProfile);
router.post("/applicant/createprofile", verifyAuth, createProfile);
router.get("/applicant/profile", getApplicantProfileById);

export default router;
