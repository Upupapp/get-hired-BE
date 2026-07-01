import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { submitPrivacyRequest } from '../controllers/privacyController.js';

const router = express.Router();

// Privacy request endpoint: strict limit (5 per IP per hour) to prevent abuse.
// No auth required — visitors without accounts must be able to submit requests.
const privacyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many privacy requests. Please try again in an hour or email us directly.' },
});

router.post('/privacy/request', privacyLimiter, submitPrivacyRequest);

export default router;
