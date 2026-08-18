/**
 * Legacy GET /job/published tests — TAB 04 fix (2026-08-18)
 *
 * Regression coverage for services/job.service.js's getPublishedJobs():
 * c.company_logo was never selected despite mappedBasicJob() reading
 * raw.company_logo, so every job card from this endpoint had an undefined
 * companyLogoUrl. Also had no LIMIT at all (relied solely on a 2-minute
 * response cache to bound an otherwise-unbounded result set).
 *
 * Same convention as tests/sitemap.test.js and the TAB 12 spec files: the
 * BE has no Jest config or test runner in package.json yet. These are
 * written as executable Jest tests and serve as an accurate, runnable spec
 * once test infra is added (see tests/sitemap.test.js for setup steps).
 */

const mockQuery = jest.fn();
jest.mock('../db/dbQuery.js', () => ({
  default: { query: mockQuery },
}));

jest.mock('../env.js', () => ({
  default: { schema: 'gethired' },
}));

const { getPublishedJobs } = require('../services/job.service.js');

describe('getPublishedJobs (TAB 04)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('selects c.company_logo so companyLogoUrl is populated, not undefined', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        job_id: 1, job_banner: null, job_title: 'Backend Engineer',
        company_id: 'c1', job_type_id: 1, work_setup_id: 1,
        job_country: 'PH', job_city: 'Manila',
        salary_minimum: null, salary_maximum: null, salary_currency: null,
        company_name: 'Acme', company_logo: 'https://cdn.example.com/acme-logo.png',
        job_type_name: 'Full-time', work_setup_name: 'Remote',
      }],
    });

    const jobs = await getPublishedJobs();

    expect(jobs).toHaveLength(1);
    expect(jobs[0].companyLogoUrl).toBe('https://cdn.example.com/acme-logo.png');

    // Assert the actual SQL text requests the column -- catches a
    // regression even if a future mock happens to return the field anyway.
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/c\.company_logo/);
  });

  it('applies a bounded LIMIT even with no companyId filter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await getPublishedJobs();

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/LIMIT \$1/);
    expect(params[0]).toBeGreaterThan(0);
    expect(Number.isFinite(params[0])).toBe(true);
  });

  it('still parameterizes the optional companyId filter (no SQL injection regression)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await getPublishedJobs("'; DROP TABLE jobs; --");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(params).toContain("'; DROP TABLE jobs; --");
  });
});
