import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import { getDashboardAnalytics } from '../controllers/recruiterDashboardAnalyticsController';

const router = express.Router();

// GET /api/recruiter/dashboard/analytics?range=7d|30d|90d
// Auth: employer/recruiter JWT required.
// Company always resolved from auth — never from query params.
router.get('/recruiter/dashboard/analytics', verifyAuth, getDashboardAnalytics);

export default router;
