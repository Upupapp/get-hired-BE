import express from "express";
import {
    getAllInterviewsOfCompanies,
    getAllInterviewsTemplatesOfCompanies,
    getAllInterviewRecipientsByCompanyId,
    getInterviewTemplateQuestions,
    saveGroupInterview,
    saveQuestionTemplate,
    updateJobInterviewQuestion,
    getListByUser,
    getInterviewHub,
} from "../controllers/interviewController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.get("/interview/getlistbyuser", verifyAuth, getListByUser);
router.get("/interview/getall", verifyAuth, getAllInterviewsOfCompanies);
router.get("/interview/getalltemplates", verifyAuth, getAllInterviewsTemplatesOfCompanies);
// STITCH/security fix (GH-ACT-011): these two routes had no auth
// middleware at all -- fully unauthenticated, anyone could call them.
router.get("/interview/getallrecipients", verifyAuth, getAllInterviewRecipientsByCompanyId);
router.get("/interview/gettemplatequestions", verifyAuth, getInterviewTemplateQuestions);
router.post("/interview/savegroupinterview", verifyAuth, saveGroupInterview);
router.post("/interview/savequestiontemplate", verifyAuth, saveQuestionTemplate);
router.put("/interview/updatejobinterview", verifyAuth, updateJobInterviewQuestion);
// B03: RecruiterInterviewHub — company-scoped interview activity feed.
// Company derived from JWT; never trusts caller-supplied IDs.
router.get("/interview/hub", verifyAuth, getInterviewHub);

export default router;
