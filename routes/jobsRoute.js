import express from "express";
import {
  createJobs,
  updateJob,
  deleteJob,
} from "../controllers/jobsController";

import { send } from "../helpers/mailer";

const router = express.Router();

router.post("/jobs/create", createJobs);
router.put("/jobs/updateJobs", updateJob);
router.delete("/jobs/delete", deleteJob);

export default router;
