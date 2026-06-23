import express from "express";
import { createCandidate, deleteCandidate, list, multipleCandidate, updateCandidate, getJobAppliedList } from "../controllers/candidateController";

import { getJobApplicantDetails } from "../controllers/jobsController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();
// STITCH/security fix (GH-ACT-011): this entire route file had no auth
// middleware -- any candidate record, applicant details, or applied-jobs
// list could be read/created/edited/deleted by anyone.
router.post("/candidates/addcandidate", verifyAuth, createCandidate);
router.post("/candidates/multiplecandidate", verifyAuth, multipleCandidate);
router.delete("/candidates/deletecandidate", verifyAuth, deleteCandidate);
router.put("/candidates/updatecandidate", verifyAuth, updateCandidate);
router.get("/candidates/list", verifyAuth, list)
router.get("/candidates/applicantdetails", verifyAuth, getJobApplicantDetails);

router.get("/candidates/appliedjobslist", verifyAuth, getJobAppliedList);

export default router;