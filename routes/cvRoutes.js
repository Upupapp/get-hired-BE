import express from "express";
import {
  createCV,
  updateCV,
  deleteCV,
  getUserCVlist,
  getCvById,
} from "../controllers/cvController";

const router = express.Router();

router.post("/cv/add", createCV);
router.put("/cv/update", updateCV);
router.delete("/cv/delete", deleteCV);
router.get("/cv/getall", getUserCVlist);
router.get("/cv/get", getCvById);

export default router;
