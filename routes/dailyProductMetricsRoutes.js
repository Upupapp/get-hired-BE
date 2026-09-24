import express from "express";
import { handlers } from "../controllers/dailyProductMetricsController";

const router = express.Router();

// Cron-secret only. No Firebase auth and no role gate.
// Mount this router before billingRoutes so the request does not enter
// billing's router-wide verifyAuth gate.
router.get("/internal/daily-product-metrics", handlers.getMetrics);

export default router;
