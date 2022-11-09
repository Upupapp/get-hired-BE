import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import {
    getEmployerCompany,
    getEmployerProfile,
} from '../controllers/employerController';

const router = express.Router();

router.get('/employer/profile', verifyAuth, getEmployerProfile);
router.get('/employer/company', verifyAuth, getEmployerCompany);
// router.get('/faq/:id', getFaqid);

export default router;