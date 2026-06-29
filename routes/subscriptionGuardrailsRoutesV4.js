/**
 * Subscription Guardrails Routes V4
 * New routes alongside existing /api/subscription/* — do not replace legacy routes.
 * Node 14 / ESM safe: no ?. or ??
 */

import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import { validateCheckoutIntent, billingCycleDisclosure } from '../middleware/subscriptionGuardrailsMiddlewareV4';
import {
  getPricingCatalogEndpoint,
  getEmployerSubscriptionSummary,
  createCheckoutIntent,
  getCheckoutIntentStatus,
} from '../controllers/subscriptionGuardrailsControllerV4';

const router = express.Router();

// GET /api/subscriptions/pricing-catalog
// Public (optionally authenticated for current-plan highlighting)
router.get('/subscriptions/pricing-catalog', verifyAuth, getPricingCatalogEndpoint);

// GET /api/subscriptions/employer/summary
// Authenticated employer only
router.get('/subscriptions/employer/summary', verifyAuth, getEmployerSubscriptionSummary);

// POST /api/subscriptions/checkout-intent
// Authenticated employer only.
// Chain: verifyAuth -> validateCheckoutIntent -> billingCycleDisclosure -> createCheckoutIntent
router.post(
  '/subscriptions/checkout-intent',
  verifyAuth,
  validateCheckoutIntent,
  billingCycleDisclosure,
  createCheckoutIntent
);

// GET /api/subscriptions/checkout-intent/:id/status
// Authenticated employer only. BOLA-enforced: company_id matched to JWT.
router.get('/subscriptions/checkout-intent/:id/status', verifyAuth, getCheckoutIntentStatus);

export default router;
