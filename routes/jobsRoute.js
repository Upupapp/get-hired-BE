import express from "express";
import {
  createJobs,
  updateJob,
  deleteJob,
  getIndustryList,
  getBadgeList,
  getJobRoleList,
  getSetupList,
  getTypeList,
  getLevelList,
  getCategoryList,
  getJobBasicListOfCompany
} from "../controllers/jobsController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();


// router.delete("/jobs/delete", deleteJob);

// job
router.post("/jobs/create", createJobs);
router.put("/jobs/updateJobs", updateJob);
router.get("/job/basiclist", verifyAuth, getJobBasicListOfCompany);
router.get("/job/categories", verifyAuth, getCategoryList);
router.get("/job/industries", verifyAuth, getIndustryList);
router.get("/job/badges", verifyAuth, getBadgeList);
router.get("/job/rolelist", verifyAuth, getJobRoleList);
router.get("/job/setuplist", verifyAuth, getSetupList);
router.get("/job/type", verifyAuth, getTypeList);
router.get("/job/levels", verifyAuth, getLevelList);


export default router;
