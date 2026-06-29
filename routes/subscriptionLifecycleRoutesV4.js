/**
 * Subscription Lifecycle Routes V4
 * Payment status polling, lifecycle state, dunning check, notifications.
 * Mounted under /api in server.js.
 * Node 14 / ESM safe.
 */

import express from 'express';
import verifyAuth from '../middleware/verifyAuth';
import {
  getLifecycleStatus,
  getCheckoutReturnStatus,
  getSubscriptionNotifications,
  markNotificationAsRead,
  triggerDunningCheck,
} from '../controllers/subscriptionLifecycleControllerV4';

const router = express.Router();

// GET /api/subscriptions/lifecycle/status
router.get('/subscriptions/lifecycle/status', verifyAuth, getLifecycleStatus);

// GET /api/subscriptions/checkout-intent/:id/return-status
// Checkout return polling — never activates subscription from URL params
router.get('/subscriptions/checkout-intent/:id/return-status', verifyAuth, getCheckoutReturnStatus);

// GET /api/subscriptions/notifications
router.get('/subscriptions/notifications', verifyAuth, getSubscriptionNotifications);

// POST /api/subscriptions/notifications/:id/read
router.post('/subscriptions/notifications/:id/read', verifyAuth, markNotificationAsRead);

// POST /api/subscriptions/dunning/check
// Fires due notifications on subscription page visit (observe mode)
router.post('/subscriptions/dunning/check', verifyAuth, triggerDunningCheck);

export default router;
