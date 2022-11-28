import express from "express";
import { createCandidate, deleteCandidate, list, multipleCandidate, updateCandidate } from "../controllers/candidateController";


// import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();
router.post("/candidates/addcandidate", createCandidate);
router.post("/candidates/multiplecandidate", multipleCandidate);
router.delete("/candidates/deletecandidate", deleteCandidate);
router.put("/candidates/updatecandidate", updateCandidate);
router.get("/candidates/list", list)

export default router;