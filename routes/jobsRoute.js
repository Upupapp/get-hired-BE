import express from "express";
import {
  createJobs,
  updateJob,
  deleteJob,
  getIndustryList,
  getBadgeList,
  getJobRoleList,
  getCategoryList,
  getJobBasicListOfCompany,
  getExpiredJobListOfCompany,
  updateStatusOfJob,
  getAllPublishedJobs,
  getJobDetails,
  getJobShareableLink,
  getAllApplicantOfJob,
  getJobApplicantDetails,
  updateJobInterviewQuestion,
  deleteInterviewQuestion
} from "../controllers/jobsController";

import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// router.delete("/jobs/delete", deleteJob);

// job
router.post("/job/create", verifyAuth, createJobs);
router.put("/job/updatejobs", verifyAuth, updateJob);
router.get("/job/basiclist", verifyAuth, getJobBasicListOfCompany);
router.get("/job/expiredlist", verifyAuth, getExpiredJobListOfCompany);
router.get("/job/categories", verifyAuth, getCategoryList);
router.get("/job/industries", verifyAuth, getIndustryList);
router.get("/job/badges", verifyAuth, getBadgeList);
router.get("/job/rolelist", verifyAuth, getJobRoleList);
router.put("/job/changestatus", verifyAuth, updateStatusOfJob);
router.get("/job/applicants", getAllApplicantOfJob);
router.get("/job/applicantdetails", verifyAuth, getJobApplicantDetails);
router.put("/job/updatejobinterview", verifyAuth, updateJobInterviewQuestion);
router.delete("/job/deleteinterviewquestion", verifyAuth, deleteInterviewQuestion);

// public api
router.get("/job/published", getAllPublishedJobs);
router.get("/job/details", getJobDetails);
router.get("/job/sharelink", getJobShareableLink);



export default router;
