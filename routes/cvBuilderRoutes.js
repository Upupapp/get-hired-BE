import express from "express";
import { uploadCv } from "../controllers/cvBuilderController";
import verifyAuth from "../middleware/verifyAuth";

// CVCOACH (v2 Product OS) -- route group. Every route requires verifyAuth
// from the start (unlike several routes found and fixed this session that
// had none) -- this is new code, built with this session's SECURE
// findings already applied, not retrofitted after the fact.
const router = express.Router();

router.post("/cv-builder/upload", verifyAuth, uploadCv);

export default router;
