import express from "express";
import {
  paymongoPaymentLink,
  paymongoWebhook,
} from "../controllers/paymentController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// SECURE fix: had no auth middleware -- anyone could create a real
// PayMongo payment link unauthenticated. Zero frontend consumers found in
// this repo, so adding auth here breaks no existing caller (same pattern
// as the earlier subscriptionController fix this session).
router.post("/payment/paymongopaymentlink", verifyAuth, paymongoPaymentLink);
// Webhook intentionally NOT auth-gated -- PayMongo calls this directly and
// cannot supply a Firebase token. It needs signature verification instead,
// which is still missing (see GETHIRED_PAYMENT_WEBHOOK_SECURITY_AUDIT.md).
router.post("/payment/paymongowebhook", paymongoWebhook);

export default router;
