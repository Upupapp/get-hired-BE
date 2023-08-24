import express from "express";
import {
    getAllInterviewsOfCompanies,
    getAllInterviewsTemplatesOfCompanies,
    getAllInterviewRecipientsByCompanyId,
    getInterviewTemplateQuestions,
    saveGroupInterview
} from "../controllers/interviewController";

import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.get("/interview/getall", verifyAuth, getAllInterviewsOfCompanies);
router.get("/interview/getalltemplates", verifyAuth, getAllInterviewsTemplatesOfCompanies);
router.get("/interview/getallrecipients", getAllInterviewRecipientsByCompanyId);
router.get("/interview/gettemplatequestions", getInterviewTemplateQuestions);
router.post("/interview/savegroupinterview", verifyAuth, saveGroupInterview);

export default router;
