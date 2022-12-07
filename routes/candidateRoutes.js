import express from "express";
import { createCandidate, deleteCandidate, list, multipleCandidate, updateCandidate } from "../controllers/candidateController";

import { getJobApplicantDetails } from "../controllers/jobsController";

// import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();
router.post("/candidates/addcandidate", createCandidate);
router.post("/candidates/multiplecandidate", multipleCandidate);
router.delete("/candidates/deletecandidate", deleteCandidate);
router.put("/candidates/updatecandidate", updateCandidate);
router.get("/candidates/list", list)
router.get("/candidates/applicantdetails", getJobApplicantDetails);

export default router;