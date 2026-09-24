import express from "express";
import { rateLimit } from "express-rate-limit";
import { postPageview } from "../controllers/pageviewController";

// 60 pageviews per minute per IP. The global write limiter is skipped for
// this path in server.js so navigation beacons do not consume that budget.
// In-memory, same as the other limiters. IP is not written to site_pageviews.
const pageviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// sendBeacon may use text/plain to carry a JSON body. The global JSON parser
// only reads application/json, and it has already consumed that body.
function beaconBody(req, res, next) {
  var ct = (req.headers && req.headers["content-type"]) || "";
  if (ct.indexOf("text/plain") === -1) return next();
  if (req.body && typeof req.body === "object") return next();
  return express.json({
    limit: "8kb",
    type: function () { return true; },
  })(req, res, next);
}

const router = express.Router();

// No auth. Mount this router before billingRoutes so the billing catch-all
// verifyAuth gate does not reject the beacon.
router.post("/public/pageview", pageviewLimiter, beaconBody, postPageview);

export default router;
