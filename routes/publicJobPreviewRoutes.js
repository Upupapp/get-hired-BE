/**
 * Public Job Preview Routes
 * GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1
 *
 * Routes:
 *   POST /api/public/employer/ai-preview-generate  — anonymous, rate-limited per-IP in controller
 *   POST /api/recruiter/job-post-assistant/claim-preview — authenticated employers only
 *
 * Security: anonymous endpoint has per-IP rate limit (5/15min) enforced in controller.
 * The global writeLimiter in server.js applies to both routes.
 * verifyAuth on claim-preview ensures no anonymous job draft creation.
 */

import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import { generateAnonPreview, claimPreview } from '../controllers/publicJobPreviewController';

const router = express.Router();

// Anonymous endpoint — no auth required
// Rate limited per-IP inside publicJobPreviewController.generateAnonPreview
router.post('/public/employer/ai-preview-generate', generateAnonPreview);

// Authenticated claim — verifyAuth enforced; company resolved from JWT inside controller
router.post('/recruiter/job-post-assistant/claim-preview', verifyAuth, claimPreview);

export default router;
