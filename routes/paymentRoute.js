import express from "express";
import {
  paymongoPaymentLink,
  paymongoWebhook,
} from "../controllers/paymentController";

const router = express.Router();

router.post("/payment/paymongopaymentlink", paymongoPaymentLink);
router.post("/payment/paymongowebhook", paymongoWebhook);

export default router;
