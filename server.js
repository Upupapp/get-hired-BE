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
    req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" ||
    req.path === "/payment/paymongowebhook",
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
app.use(cors({ origin: env.app_url }));
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.enable("trust proxy");

// QA11 FIX-04 HEADERS: add baseline security headers.
// Closes the long-open nosniff item (tracked across QA8-QA10 as SEC-03).
// X-Frame-Options: DENY — prevents clickjacking.
// X-Content-Type-Options: nosniff — prevents MIME sniffing (complements
//   the magic-byte upload check in helpers/fileSignature.js).
// X-XSS-Protection: 0 — disable legacy IE XSS filter (modern browsers
//   rely on CSP instead; the old filter can be exploited in some cases).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  next();
});

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


// SEO: sitemap.xml endpoint — returns XML with all published jobs + static pages.
// No auth required; only published (job_status_id=2) jobs are included.
// Served from the BE because job IDs are dynamic.
app.get("/sitemap.xml", async (req, res) => {
  try {
    const { default: dbQuery } = await import("./db/dbQuery.js");
    const { default: envConfig } = await import("./env.js");
    const schema = envConfig.schema;
    const BASE_URL = "https://gethiredonline.app";
    const now = new Date().toISOString().split("T")[0];

    const { rows } = await dbQuery.query(
      `SELECT job_id, updated_at FROM ${schema}.jobs WHERE job_status_id = 2 ORDER BY updated_at DESC;`,
      []
    );

    const staticPages = [
      { loc: `${BASE_URL}/home`, changefreq: "weekly", priority: "1.0" },
      { loc: `${BASE_URL}/jobs`, changefreq: "daily", priority: "0.9" },
      { loc: `${BASE_URL}/job-seekers`, changefreq: "monthly", priority: "0.7" },
      { loc: `${BASE_URL}/employers`, changefreq: "monthly", priority: "0.7" },
    ];

    const jobUrls = rows.map(row => {
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().split("T")[0]
        : now;
      return `  <url>\n    <loc>${BASE_URL}/jobs/details/${row.job_id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    });

    const staticUrls = staticPages.map(p =>
      `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls.join("\n")}\n${jobUrls.join("\n")}\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  }
});

app.get("/", (req, res) => res.send(`Welcome to ${env.projectName} API`));

app.listen(env.port).on("listening", () => {
  console.log(`running server on port ${env.port}`);
});

// dbQuery.connect();

export default app;
