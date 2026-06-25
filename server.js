import express from "express";
import "babel-polyfill";
import cors from "cors";
import env from "./env.js";
import compression from "compression";
import { rateLimit } from "express-rate-limit";

import userRoutes from "./routes/userRoute";
import applicationRoutes from "./routes/applicationRoute";
import cvRoutes from "./routes/cvRoutes";
import jobsRoutes from "./routes/jobsRoute";
import companiesRoute from "./routes/companiesRoute";
import employerRoute from "./routes/employerRoute";
import contactRoutes from "./routes/contactRoutes"
import optionsRoutes from "./routes/optionsRoute";
import candidateRoutes from "./routes/candidateRoutes";
import adminRoutes from "./routes/adminRoute";
import subscriptionRoutes from "./routes/subscriptionRoute";
import paymentRoutes from "./routes/paymentRoute";
import interviewRoute from "./routes/interviewRoute";
import cvBuilderRoutes from "./routes/cvBuilderRoutes";
import messageRoutes from "./routes/messageRoutes";

const isProduction = process.env.NODE_ENV === "production";

const whitelist = ["http://localhost:4200", "http://localhost:3000"];

// const corsOption = {
//     origin: function (origin, callback) {
//         if (whitelist.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error(`Not allowed by CORS, origin: ${origin}`))
//         }
//     }
// };

// ---------------------------------------------------------------------------
// Rate limiters — in-memory store, appropriate for single-server Linode deploy.
// Deferred: swap to a Redis store (e.g. rate-limit-redis) if/when horizontally
// scaling to multiple nodes.
// ---------------------------------------------------------------------------

// Tier 1 — Global catch-all (every route, generous)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,  // RFC 6585 RateLimit-* headers
  legacyHeaders: false,   // suppress deprecated X-RateLimit-* headers
  message: { message: "Too many requests. Please try again later." },
});

// Tier 2 — Auth endpoints: signin, signup, password reset, email verify
// Tight limit to defend against brute-force and credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
});

// Tier 3 — Write operations across all /api routes (POST/PUT/DELETE only)
// Prevents mass creation / bulk modification abuse.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
  skip: (req) =>
    req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
});

// Tier 4 — Sensitive endpoints: password change, password reset link,
// account deletion. Strictest — 10 attempts per hour.
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in an hour." },
});

// ---------------------------------------------------------------------------

const app = express();
app.use(compression());
// if(isProduction) { //bring back if fix
app.use(cors());
// }
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.enable("trust proxy");

// --- Rate-limit middleware (applied before route mounting) ---

// Tier 1: global
app.use(globalLimiter);

// Tier 2: auth routes (signin, signup, email verify, resend, pw reset, logout)
app.use("/api/auth", authLimiter);

// Tier 3: write operations on all /api routes
app.use("/api", writeLimiter);

// Tier 4: sensitive individual endpoints
app.use("/api/auth/changepassword", sensitiveLimiter);
app.use("/api/auth/getpwresetlink", sensitiveLimiter);
app.use("/api/auth/archive", sensitiveLimiter);

// --- Route mounting ---
app.use("/api", userRoutes);
app.use("/api", applicationRoutes);
app.use("/api", cvRoutes);
app.use("/api", jobsRoutes);
app.use("/api", companiesRoute);
app.use("/api", employerRoute);
app.use("/api", contactRoutes);
app.use("/api", optionsRoutes);
app.use("/api", candidateRoutes);
app.use("/api", adminRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", interviewRoute);
app.use("/api", cvBuilderRoutes);
app.use("/api", messageRoutes);


app.get("/", (req, res) => res.send(`Welcome to ${env.projectName} API`));

app.listen(env.port).on("listening", () => {
  console.log(`running server on port ${env.port}`);
});

// dbQuery.connect();

export default app;
