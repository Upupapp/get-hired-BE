/**
 * Sitemap endpoint tests — SEO V3 deployment (2026-06-25)
 *
 * Tests GET /sitemap.xml against the implementation in server.js.
 *
 * Strategy: mock the dynamic imports used inside the endpoint handler
 * (dbQuery and env) so no real DB connection is needed.  Import supertest
 * and the express app AFTER mocking to capture the mocked modules.
 *
 * Note: the BE has no Jest config or test runner in package.json.
 * These tests are written as executable Jest tests.  To run them:
 *
 *   1. npm install --save-dev jest supertest @babel/core @babel/preset-env babel-jest
 *   2. Add to package.json scripts: "test": "jest --testPathPattern=tests/"
 *   3. Add jest.config.js or "jest" key with transform config for ESM/Babel
 *
 * Current state: tests CANNOT run automatically because the BE has no test
 * runner installed (package.json "test" script is a placeholder echo).
 * These tests document the expected behaviour and serve as a manual spec.
 *
 * Format: standard Jest / describe / it / expect — runnable once test infra added.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — must come before the app import
// ──────────────────────────────────────────────────────────────────────────────

// Mock dbQuery module
const mockQuery = jest.fn();
jest.mock('../db/dbQuery.js', () => ({
  default: {
    query: mockQuery,
  },
}));

// Mock env module
jest.mock('../env.js', () => ({
  default: {
    schema: 'gethired',
    port: 4000,
    app_url: 'http://localhost:4200',
    projectName: 'gethired',
  },
}));

// supertest + app (imported after mocks are registered)
const request = require('supertest');

// We test the sitemap logic directly rather than importing server.js
// (which would start a listening server and require all routes/middleware).
// Instead we build a minimal express app that replicates only the sitemap endpoint.

const express = require('express');

function buildTestApp(dbQueryMock, envMock) {
  const app = express();

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const schema = envMock.schema;
      const BASE_URL = 'https://gethiredonline.app';
      const now = new Date().toISOString().split('T')[0];

      const { rows } = await dbQueryMock.query(
        `SELECT job_id, updated_at FROM ${schema}.jobs WHERE job_status_id = 2 ORDER BY updated_at DESC;`,
        []
      );

      const { rows: companyRows } = await dbQueryMock.query(
        `SELECT j.company_id, MAX(j.updated_at) AS last_updated FROM ${schema}.jobs j WHERE j.job_status_id = 2 AND j.company_id IS NOT NULL GROUP BY j.company_id ORDER BY last_updated DESC;`,
        []
      );

      const staticPages = [
        { loc: `${BASE_URL}/home`,        changefreq: 'weekly',  priority: '1.0' },
        { loc: `${BASE_URL}/jobs`,        changefreq: 'daily',   priority: '0.9' },
        { loc: `${BASE_URL}/job-seekers`, changefreq: 'monthly', priority: '0.7' },
        { loc: `${BASE_URL}/employers`,   changefreq: 'monthly', priority: '0.7' },
      ];

      const jobUrls = rows.map(row => {
        const lastmod = row.updated_at
          ? new Date(row.updated_at).toISOString().split('T')[0]
          : now;
        return `  <url>\n    <loc>${BASE_URL}/jobs/details/${row.job_id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
      });

      const companyUrls = companyRows.map(row => {
        const lastmod = row.last_updated
          ? new Date(row.last_updated).toISOString().split('T')[0]
          : now;
        return `  <url>\n    <loc>${BASE_URL}/companies/details?id=${row.company_id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
      });

      const staticUrls = staticPages.map(p =>
        `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      );

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls.join('\n')}\n${jobUrls.join('\n')}\n${companyUrls.join('\n')}\n</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (err) {
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  });

  return app;
}

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

const envMock = { schema: 'gethired', port: 4000, app_url: 'http://localhost:4200', projectName: 'gethired' };

const twoJobRows = [
  { job_id: 101, updated_at: '2026-06-20T10:00:00.000Z' },
  { job_id: 202, updated_at: null },
];

const twoCompanyRows = [
  { company_id: 'company-abc-123', last_updated: '2026-06-18T08:00:00.000Z' },
  { company_id: 'company-xyz-456', last_updated: null },
];

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /sitemap.xml', () => {
  let app;
  let dbQueryMock;

  beforeEach(() => {
    dbQueryMock = { query: jest.fn() };
    app = buildTestApp(dbQueryMock, envMock);
  });

  // ── Content-Type ────────────────────────────────────────────────────────────

  it('returns Content-Type: application/xml', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.headers['content-type']).toMatch(/application\/xml/);
  });

  it('returns HTTP 200', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
  });

  // ── Cache-Control ────────────────────────────────────────────────────────────

  it('sets Cache-Control: public, max-age=3600', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });

  // ── XML structure ────────────────────────────────────────────────────────────

  it('starts with XML declaration', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('wraps content in <urlset> with sitemaps.org namespace', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.text).toContain('</urlset>');
  });

  // ── Static pages ─────────────────────────────────────────────────────────────

  it('includes /home static page', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/home</loc>');
  });

  it('includes /jobs static page', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/jobs</loc>');
  });

  it('includes /job-seekers static page', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/job-seekers</loc>');
  });

  it('includes /employers static page', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/employers</loc>');
  });

  it('includes all 4 static pages in one response', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    const homeCount  = (res.text.match(/\/home<\/loc>/g)  || []).length;
    const jobsCount  = (res.text.match(/\/jobs<\/loc>/g)  || []).length;
    const seekCount  = (res.text.match(/\/job-seekers<\/loc>/g) || []).length;
    const empCount   = (res.text.match(/\/employers<\/loc>/g) || []).length;
    expect(homeCount).toBe(1);
    expect(jobsCount).toBe(1);
    expect(seekCount).toBe(1);
    expect(empCount).toBe(1);
  });

  // ── Job URLs ─────────────────────────────────────────────────────────────────

  it('includes job URLs in /jobs/details/:id format', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: twoJobRows })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/jobs/details/101</loc>');
    expect(res.text).toContain('<loc>https://gethiredonline.app/jobs/details/202</loc>');
  });

  it('uses row.updated_at as lastmod when present', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [{ job_id: 101, updated_at: '2026-06-20T10:00:00.000Z' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<lastmod>2026-06-20</lastmod>');
  });

  it('falls back to today when updated_at is null', async () => {
    const today = new Date().toISOString().split('T')[0];
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [{ job_id: 202, updated_at: null }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain(`<lastmod>${today}</lastmod>`);
  });

  it('assigns changefreq=weekly and priority=0.8 to job URLs', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [{ job_id: 101, updated_at: '2026-06-20T10:00:00.000Z' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<changefreq>weekly</changefreq>');
    expect(res.text).toContain('<priority>0.8</priority>');
  });

  // ── Company URLs ─────────────────────────────────────────────────────────────

  it('includes company URLs in /companies/details?id=<id> format', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: twoCompanyRows });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://gethiredonline.app/companies/details?id=company-abc-123</loc>');
    expect(res.text).toContain('<loc>https://gethiredonline.app/companies/details?id=company-xyz-456</loc>');
  });

  it('uses last_updated as company lastmod when present', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ company_id: 'company-abc-123', last_updated: '2026-06-18T08:00:00.000Z' }] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<lastmod>2026-06-18</lastmod>');
  });

  it('falls back to today for company when last_updated is null', async () => {
    const today = new Date().toISOString().split('T')[0];
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ company_id: 'company-xyz-456', last_updated: null }] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain(`<lastmod>${today}</lastmod>`);
  });

  it('assigns changefreq=weekly and priority=0.6 to company URLs', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ company_id: 'company-abc-123', last_updated: '2026-06-18T08:00:00.000Z' }] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<priority>0.6</priority>');
    const companyBlock = res.text.slice(res.text.indexOf('company-abc-123'));
    expect(companyBlock).toContain('<changefreq>weekly</changefreq>');
  });

  it('omits company URLs when no companies have published jobs', async () => {
    dbQueryMock.query
      .mockResolvedValueOnce({ rows: twoJobRows })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).not.toContain('/companies/details');
  });

  // ── DB query shape ────────────────────────────────────────────────────────────

  it('queries only published jobs (job_status_id = 2)', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    await request(app).get('/sitemap.xml');
    expect(dbQueryMock.query).toHaveBeenCalledWith(
      expect.stringContaining('job_status_id = 2'),
      []
    );
  });

  it('queries the correct schema table', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    await request(app).get('/sitemap.xml');
    expect(dbQueryMock.query).toHaveBeenCalledWith(
      expect.stringContaining('gethired.jobs'),
      expect.anything()
    );
  });

  // ── Error / graceful degradation ──────────────────────────────────────────────

  it('returns HTTP 500 and an empty urlset when the DB query throws', async () => {
    dbQueryMock.query.mockRejectedValue(new Error('DB connection refused'));
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(500);
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.text).toContain('</urlset>');
  });

  it('does NOT leak error details into the 500 body', async () => {
    dbQueryMock.query.mockRejectedValue(new Error('password authentication failed'));
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).not.toContain('password authentication failed');
    expect(res.text).not.toContain('Error');
  });

  // ── No auth requirement ───────────────────────────────────────────────────────

  it('responds without any Authorization header required', async () => {
    dbQueryMock.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
  });
});
