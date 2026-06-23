import express from "express";
import {
  createCV,
  updateCV,
  deleteCV,
  getUserCVlist,
  getCvById,
} from "../controllers/cvController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// STITCH/security fix (GH-ACT-011): this entire route file had no auth
// middleware -- any CV could be read, edited, or deleted by anyone.
router.post("/cv/add", verifyAuth, createCV);
router.put("/cv/update", verifyAuth, updateCV);
router.delete("/cv/delete", verifyAuth, deleteCV);
router.get("/cv/getall", verifyAuth, getUserCVlist);
router.get("/cv/get", verifyAuth, getCvById);

export default router;
