import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import {
    getEmployerCompany
} from '../controllers/employerController';

const router = express.Router();


router.get('/employer/company', getEmployerCompany);
// router.get('/faq/:id', getFaqid);

export default router;