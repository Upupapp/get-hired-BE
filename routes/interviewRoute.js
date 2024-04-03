import express from "express";
import {
    getAllInterviewsOfCompanies,
    getAllInterviewsTemplatesOfCompanies,
    getAllInterviewRecipientsByCompanyId,
    getInterviewTemplateQuestions,
    saveGroupInterview,
    saveQuestionTemplate,
    updateJobInterviewQuestion,
    getListByUser
} from "../controllers/interviewController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.get("/interview/getlistbyuser", verifyAuth, getListByUser);
router.get("/interview/getall", verifyAuth, getAllInterviewsOfCompanies);
router.get("/interview/getalltemplates", verifyAuth, getAllInterviewsTemplatesOfCompanies);
router.get("/interview/getallrecipients", getAllInterviewRecipientsByCompanyId);
router.get("/interview/gettemplatequestions", getInterviewTemplateQuestions);
router.post("/interview/savegroupinterview", verifyAuth, saveGroupInterview);
router.post("/interview/savequestiontemplate", verifyAuth, saveQuestionTemplate);
router.put("/interview/updatejobinterview", verifyAuth, updateJobInterviewQuestion);

export default router;
