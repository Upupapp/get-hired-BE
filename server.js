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
import publicRoutes from "./routes/publicRoute";
import imageRoutes from "./routes/imageRoutes";
import searchRoutes from "./routes/searchRoutes";
import easyJobPostRoutes from "./routes/easyJobPostRoutes";
import subscriptionGuardrailsRoutesV4 from "./routes/subscriptionGuardrailsRoutesV4";
import subscriptionLifecycleRoutesV4 from "./routes/subscriptionLifecycleRoutesV4";
import subscriptionUpgradeRecommendationRoutesV4 from "./routes/subscriptionUpgradeRecommendationRoutesV4";
import recruiterDashboardAnalyticsRoutes from "./routes/recruiterDashboardAnalyticsRoutes";
import billingRoutes from "./routes/billingRoutes";
import publicJobPreviewRoutes from "./routes/publicJobPreviewRoutes";

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

// Tier 1 — Global catch-all (every route, generous).
// Authenticated requests (Authorization header present) bypass this ceiling —
// they are already covered by writeLimiter + sensitiveLimiter per endpoint.
// The global limit exists to stop unauthenticated scrapers/DDoS, not to
// gate logged-in employers who may be on shared office NAT IPs.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,               // raised from 500 — handles multi-user NAT + refresh storms
  standardHeaders: true,   // RFC 6585 RateLimit-* headers
  legacyHeaders: false,    // suppress deprecated X-RateLimit-* headers
  message: { message: "Too many requests. Please try again later." },
  skip: function(req) {
    // Authenticated sessions bypass the global cap; per-endpoint tiers
    // (writeLimiter, sensitiveLimiter) still apply to their routes.
    return !!(req.headers && req.headers['authorization']);
  },
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
  limit: "6mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));
app.set("trust proxy", 1);

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
app.use("/api/auth/account/change-password", sensitiveLimiter);

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
app.use("/api", publicRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api", easyJobPostRoutes);
app.use("/api", subscriptionGuardrailsRoutesV4);
app.use("/api", subscriptionLifecycleRoutesV4);
app.use("/api", subscriptionUpgradeRecommendationRoutesV4);
app.use("/api", recruiterDashboardAnalyticsRoutes);
app.use("/api", billingRoutes);
app.use("/api", publicJobPreviewRoutes);


// SEO: sitemap.xml endpoint — returns XML with all published jobs + static pages.
// No auth required; only published (job_status_id=2) jobs are included.
// Served from the BE because job IDs are dynamic.
// In-memory cache: rebuild XML at most once per hour (3600 s) so the DB is
// never hit on every bot crawl.  Cache-Control header additionally lets
// reverse-proxies and CDN edge nodes cache the response client-side.
let _sitemapCache = { xml: null, builtAt: 0 };
// SEO-AUDIT-V3: reduced from 60min to 15min so newly published jobs appear in
// Google's sitemap crawl sooner.  DB query is cheap (indexed job_status_id).
const SITEMAP_TTL_MS = 15 * 60 * 1000; // 15 minutes

// STITCH-V2 FIX: XML-encode a value so any special character in job_id
// (job_id is a varchar with no server-enforced format constraint) cannot
// produce malformed sitemap XML.  Encodes the five XML predefined entities.
const xmlEscape = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

app.get("/sitemap.xml", async (req, res) => {
  try {
    const now = Date.now();
    if (_sitemapCache.xml && (now - _sitemapCache.builtAt) < SITEMAP_TTL_MS) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=900");
      return res.send(_sitemapCache.xml);
    }

    const { default: dbQuery } = await import("./db/dbQuery.js");
    const { default: envConfig } = await import("./env.js");
    const schema = envConfig.schema;
    const BASE_URL = "https://gethiredonline.app";
    const today = new Date().toISOString().split("T")[0];

    const { rows } = await dbQuery.query(
      `SELECT job_id, updated_at FROM ${schema}.jobs WHERE job_status_id = 2 ORDER BY updated_at DESC;`,
      []
    );

    // Company pages: one URL per company that has at least one published job.
    // Uses MAX(updated_at) across that company's active listings as lastmod.
    // Joins companies table to get company_slug for clean URLs.
    const { rows: companyRows } = await dbQuery.query(
      `SELECT j.company_id, c.company_slug, MAX(j.updated_at) AS last_updated
       FROM ${schema}.jobs j
       JOIN ${schema}.companies c ON c.company_id = j.company_id
       WHERE j.job_status_id = 2 AND j.company_id IS NOT NULL
       GROUP BY j.company_id, c.company_slug
       ORDER BY last_updated DESC;`,
      []
    );

    const staticPages = [
      { loc: `${BASE_URL}/home`, changefreq: "weekly", priority: "1.0" },
      { loc: `${BASE_URL}/jobs`, changefreq: "daily", priority: "0.9" },
      { loc: `${BASE_URL}/companies`, changefreq: "weekly", priority: "0.7" },
      { loc: `${BASE_URL}/job-seekers`, changefreq: "monthly", priority: "0.6" },
      { loc: `${BASE_URL}/employers`, changefreq: "monthly", priority: "0.6" },
    ];

    const jobUrls = rows.map(row => {
      const lastmod = xmlEscape(
        row.updated_at
          ? new Date(row.updated_at).toISOString().split("T")[0]
          : today
      );
      const safeJobId = xmlEscape(row.job_id);
      return `  <url>\n    <loc>${BASE_URL}/jobs/details/${safeJobId}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    });

    const companyUrls = companyRows.map(row => {
      const lastmod = xmlEscape(
        row.last_updated
          ? new Date(row.last_updated).toISOString().split("T")[0]
          : today
      );
      const companyPath = row.company_slug
        ? xmlEscape(row.company_slug)
        : 'details?id=' + xmlEscape(row.company_id);
      return `  <url>\n    <loc>${BASE_URL}/companies/${companyPath}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
    });

    const staticUrls = staticPages.map(p =>
      `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls.join("\n")}\n${jobUrls.join("\n")}\n${companyUrls.join("\n")}\n</urlset>`;

    // Store in process-level cache for SITEMAP_TTL_MS
    _sitemapCache = { xml, builtAt: Date.now() };

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    // Return 503 (not 500) so Google treats this as a temporary failure
    // and retries rather than de-indexing existing sitemap entries.
    // Retry-After: 3600 signals crawlers to retry in 1 hour.
    res.setHeader("Retry-After", "3600");
    res.status(503).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  }
});

app.get("/", (req, res) => res.send(`Welcome to ${env.projectName} API`));

app.listen(env.port).on("listening", () => {
  console.log(`running server on port ${env.port}`);
});

// dbQuery.connect();

export default app;
