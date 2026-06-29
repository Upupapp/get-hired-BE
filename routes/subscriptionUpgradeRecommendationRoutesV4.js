/**
 * Subscription Upgrade Recommendation Routes V4
 * Mounted under /api in server.js.
 * Node 14 / ESM safe.
 */

import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import { getRecommendation, recordAnalyticsEvent } from '../controllers/subscriptionUpgradeRecommendationControllerV4';

const router = express.Router();

// GET /api/subscriptions/upgrade-recommendation?trigger=xxx&surface=xxx
router.get('/subscriptions/upgrade-recommendation', verifyAuth, getRecommendation);

// POST /api/subscriptions/upgrade-analytics
// Safe event recording — no PII, no payment secrets
router.post('/subscriptions/upgrade-analytics', verifyAuth, recordAnalyticsEvent);

export default router;
