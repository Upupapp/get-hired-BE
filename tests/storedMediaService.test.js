/**
 * storedMediaService integration tests — Recruitment Storage accounting.
 *
 * These run against a REAL PostgreSQL instance, because the behaviour under
 * test is mostly enforced by the schema (a partial unique index, CHECK
 * constraints, FK actions). Mocking the database would test the mock.
 *
 * Skipped automatically unless GETHIRED_TEST_DB_HOST is set, so the suite is
 * safe in any environment. To run locally:
 *
 *   initdb + createdb, apply db/20260913_stored_media.sql, then
 *   GETHIRED_TEST_DB_HOST=127.0.0.1 GETHIRED_TEST_DB_PORT=55432 \
 *   GETHIRED_TEST_DB_USER=postgres GETHIRED_TEST_DB_NAME=ghtest npx jest
 *
 * NEVER point these at a production database: they insert and delete rows.
 */

const HAS_DB = !!process.env.GETHIRED_TEST_DB_HOST;
const d = HAS_DB ? describe : describe.skip;

if (HAS_DB) {
  process.env.is_staging = 'false';
  process.env.DB_HOST = process.env.GETHIRED_TEST_DB_HOST;
  process.env.DB_PORT = process.env.GETHIRED_TEST_DB_PORT;
  process.env.DB_USER = process.env.GETHIRED_TEST_DB_USER;
  process.env.DB_DATABASE = process.env.GETHIRED_TEST_DB_NAME;
  process.env.SCHEMA = process.env.GETHIRED_TEST_DB_SCHEMA || 'gethired';
}

const svc = require('../services/storedMediaService.js');
const dbQuery = HAS_DB ? require('../db/dbQuery.js').default : null;

const GB = 1073741824;
const CO = 'TCO1';

d('storedMediaService', () => {
  beforeAll(async () => {
    await dbQuery.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'TCO%';");
    await dbQuery.query("DELETE FROM gethired.companies WHERE company_id LIKE 'TCO%';");
    await dbQuery.query(
      "INSERT INTO gethired.companies(company_id, company_name, company_logo, created_date, created_by) VALUES ($1,$2,'logo.png',now(),'test-uid'),($3,$4,'logo.png',now(),'test-uid');",
      [CO, 'Test Employer', 'TCO2', 'Other Employer']
    );
  });

  afterAll(async () => {
    await dbQuery.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'TCO%';");
    await dbQuery.query("DELETE FROM gethired.companies WHERE company_id LIKE 'TCO%';");
  });

  // ── thresholds ────────────────────────────────────────────────────────────
  describe('getStorageStatus — the boundaries the frontend must not duplicate', () => {
    const L = 100;
    it.each([
      [0,   'normal'],   [69,  'normal'],
      [70,  'notice'],   [79,  'notice'],
      [80,  'warning'],  [89,  'warning'],
      [90,  'critical'], [99,  'critical'],
      [100, 'full'],     [150, 'full'],
    ])('%i%% of limit -> %s', (used, expected) => {
      expect(svc.getStorageStatus(used, L)).toBe(expected);
    });

    it('treats a null limit (Enterprise custom) as unlimited, never full', () => {
      expect(svc.getStorageStatus(999 * GB, null)).toBe('normal');
    });

    it('a zero limit is full, not a division by zero', () => {
      expect(svc.getStorageStatus(0, 0)).toBe('full');
    });
  });

  // ── the ruling ────────────────────────────────────────────────────────────
  describe('per-employer billing (owner ruling)', () => {
    const KEY = 'applicants/A1/documents/D1/original.pdf';

    it('bills each employer separately for the same physical object', async () => {
      const base = {
        mediaType: 'candidate_cv', objectKey: KEY,
        sizeBytes: 100 * 1048576, mimeType: 'application/pdf',
      };
      await svc.recordMedia(Object.assign({}, base, { companyId: CO }));
      await svc.recordMedia(Object.assign({}, base, { companyId: 'TCO2' }));

      const a = await svc.getEmployerStorageUsage(CO, 10 * GB);
      const b = await svc.getEmployerStorageUsage('TCO2', 10 * GB);
      expect(a.usedBytes).toBe(100 * 1048576);
      expect(b.usedBytes).toBe(100 * 1048576);
      expect(await svc.countActiveReferences(KEY)).toBe(2);
    });

    it('is idempotent for the same employer — no double billing', async () => {
      const before = await svc.getEmployerStorageUsage(CO, 10 * GB);
      const res = await svc.recordMedia({
        companyId: CO, mediaType: 'candidate_cv', objectKey: KEY, sizeBytes: 100 * 1048576,
      });
      const after = await svc.getEmployerStorageUsage(CO, 10 * GB);
      expect(res.created).toBe(false);
      expect(after.usedBytes).toBe(before.usedBytes);
    });

    it('unlinking frees one workspace without orphaning the shared object', async () => {
      const { rows } = await dbQuery.query(
        "SELECT id FROM gethired.stored_media WHERE company_id=$1 AND object_key=$2 AND status='active';",
        [CO, KEY]
      );
      const out = await svc.unlinkMedia(CO, rows[0].id);

      expect(out.deleted).toBe(true);
      expect(out.freedBytes).toBe(100 * 1048576);
      expect(out.remainingReferences).toBe(1);
      expect(out.safeToDeleteObject).toBe(false);

      const usage = await svc.getEmployerStorageUsage(CO, 10 * GB);
      expect(usage.usedBytes).toBe(0);
      const other = await svc.getEmployerStorageUsage('TCO2', 10 * GB);
      expect(other.usedBytes).toBe(100 * 1048576);
    });

    it('reports safe-to-delete only once the last employer unlinks', async () => {
      const { rows } = await dbQuery.query(
        "SELECT id FROM gethired.stored_media WHERE company_id='TCO2' AND object_key=$1 AND status='active';",
        [KEY]
      );
      const out = await svc.unlinkMedia('TCO2', rows[0].id);
      expect(out.remainingReferences).toBe(0);
      expect(out.safeToDeleteObject).toBe(true);
    });

    it('refuses to unlink another employer’s media', async () => {
      await svc.recordMedia({
        companyId: 'TCO2', mediaType: 'candidate_video',
        objectKey: 'applicants/A9/video/V9.mp4', sizeBytes: 5 * 1048576,
      });
      const { rows } = await dbQuery.query(
        "SELECT id FROM gethired.stored_media WHERE company_id='TCO2' AND object_key='applicants/A9/video/V9.mp4';"
      );
      const out = await svc.unlinkMedia(CO, rows[0].id); // wrong owner
      expect(out.deleted).toBe(false);
      expect(out.freedBytes).toBe(0);
    });
  });

  // ── accounting shape ──────────────────────────────────────────────────────
  describe('usage breakdown', () => {
    it('splits bytes by media type and computes status against the limit', async () => {
      await svc.recordMedia({ companyId: CO, mediaType: 'candidate_video',    objectKey: 'k/v1', sizeBytes: 7 * GB });
      await svc.recordMedia({ companyId: CO, mediaType: 'candidate_cv',       objectKey: 'k/c1', sizeBytes: 1 * GB });
      await svc.recordMedia({ companyId: CO, mediaType: 'candidate_document', objectKey: 'k/d1', sizeBytes: 0.5 * GB });

      const u = await svc.getEmployerStorageUsage(CO, 10 * GB);
      expect(u.breakdown.videoBytes).toBe(7 * GB);
      expect(u.breakdown.cvBytes).toBe(1 * GB);
      expect(u.breakdown.documentBytes).toBe(0.5 * GB);
      expect(u.usedBytes).toBe(8.5 * GB);
      expect(u.availableBytes).toBe(1.5 * GB);
      expect(u.percentage).toBe(85);
      expect(u.status).toBe('warning');   // 85% -> the tier the old scale lacked
    });

    it('returns nulls, not zeros, for an unlimited (Enterprise) limit', async () => {
      const u = await svc.getEmployerStorageUsage(CO, null);
      expect(u.limitBytes).toBeNull();
      expect(u.availableBytes).toBeNull();
      expect(u.percentage).toBeNull();
      expect(u.status).toBe('normal');
    });
  });

  // ── input validation ──────────────────────────────────────────────────────
  describe('recordMedia rejects unbillable input', () => {
    it('rejects an unmeasured size rather than billing zero', async () => {
      await expect(svc.recordMedia({
        companyId: CO, mediaType: 'candidate_cv', objectKey: 'k/x', sizeBytes: null,
      })).rejects.toThrow(/sizeBytes/);
    });
    it('rejects an unknown media type', async () => {
      await expect(svc.recordMedia({
        companyId: CO, mediaType: 'nope', objectKey: 'k/y', sizeBytes: 1,
      })).rejects.toThrow(/mediaType/);
    });
    it('rejects a missing companyId', async () => {
      await expect(svc.recordMedia({
        mediaType: 'candidate_cv', objectKey: 'k/z', sizeBytes: 1,
      })).rejects.toThrow(/companyId/);
    });
  });
});

/**
 * recordApplicationMedia — the wiring the apply flow uses.
 *
 * This is the function application.service.js calls for every resume, cover
 * letter and government file attached to a job application. It resolves the
 * employer from the job, so these tests need real companies/jobs rows.
 */
const d2 = HAS_DB ? describe : describe.skip;

d2('recordApplicationMedia (apply-flow wiring)', () => {
  const svc2 = require('../services/storedMediaService.js');
  const db2 = require('../db/dbQuery.js').default;

  beforeAll(async () => {
    await db2.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'WCO%';");
    await db2.query("DELETE FROM gethired.jobs WHERE job_id LIKE 'WJOB%';");
    await db2.query("DELETE FROM gethired.companies WHERE company_id LIKE 'WCO%';");
    await db2.query("DELETE FROM gethired.job_applicants WHERE job_application_id LIKE 'APPL%';");
    await db2.query("INSERT INTO gethired.companies(company_id, company_name, company_logo, created_date, created_by) VALUES ('WCO1','A','logo.png',now(),'test-uid'),('WCO2','B','logo.png',now(),'test-uid');");
    await db2.query("INSERT INTO gethired.jobs(job_id, company_id, job_title) VALUES ('WJOB1','WCO1','Test job'),('WJOB2','WCO2','Test job');");
    // Mirrors production ordering: application.service.js inserts the
    // job_applicants row BEFORE uploading any attachment, so application_id is
    // always a live FK target by the time media is recorded. stored_media has a
    // real FK to it, so a fixture that skips this step fails exactly as a
    // wrong-order change in the apply flow would.
    await db2.query("INSERT INTO gethired.job_applicants(job_application_id, job_id, candidate_id) VALUES ('APPL1','WJOB1','test-candidate'),('APPL2','WJOB2','test-candidate');");
  });

  afterAll(async () => {
    await db2.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'WCO%';");
    await db2.query("DELETE FROM gethired.job_applicants WHERE job_application_id LIKE 'APPL%';");
    await db2.query("DELETE FROM gethired.jobs WHERE job_id LIKE 'WJOB%';");
    await db2.query("DELETE FROM gethired.companies WHERE company_id LIKE 'WCO%';");
  });

  it('maps each attachment table to the right media bucket', () => {
    expect(svc2.mediaTypeForTable('applicant_resume')).toBe('candidate_cv');
    expect(svc2.mediaTypeForTable('applicant_covered_letter')).toBe('candidate_document');
    expect(svc2.mediaTypeForTable('applicant_government_files')).toBe('candidate_document');
    expect(svc2.mediaTypeForTable('something_new')).toBe('other_application_media');
  });

  it('resolves the employer from the job', async () => {
    expect(await svc2.resolveCompanyIdForJob('WJOB1')).toBe('WCO1');
    expect(await svc2.resolveCompanyIdForJob('NOPE')).toBeNull();
    expect(await svc2.resolveCompanyIdForJob(null)).toBeNull();
  });

  it('bills the SAME cv to two employers when sent to two jobs', async () => {
    const cv = {
      applicantId: 'WAPP1', tableName: 'applicant_resume',
      objectKey: 'https://storage/Applicant-Documents/cv-1.pdf',
      sizeBytes: 100 * 1048576, mimeType: 'application/pdf', originalFilename: 'cv.pdf',
    };
    const a = await svc2.recordApplicationMedia(Object.assign({}, cv, { jobId: 'WJOB1', applicationId: 'APPL1' }));
    const b = await svc2.recordApplicationMedia(Object.assign({}, cv, { jobId: 'WJOB2', applicationId: 'APPL2' }));

    expect(a.recorded).toBe(true);
    expect(a.companyId).toBe('WCO1');
    expect(b.recorded).toBe(true);
    expect(b.companyId).toBe('WCO2');

    const u1 = await svc2.getEmployerStorageUsage('WCO1', 10 * 1073741824);
    const u2 = await svc2.getEmployerStorageUsage('WCO2', 10 * 1073741824);
    expect(u1.usedBytes).toBe(100 * 1048576);
    expect(u2.usedBytes).toBe(100 * 1048576);
    expect(u1.breakdown.cvBytes).toBe(100 * 1048576);
    // One physical object, two billed employers.
    expect(await svc2.countActiveReferences(cv.objectKey)).toBe(2);
  });

  it('never throws, and never bills, when the job cannot be attributed', async () => {
    const r = await svc2.recordApplicationMedia({
      jobId: 'GHOST-JOB', tableName: 'applicant_resume',
      objectKey: 'https://storage/x.pdf', sizeBytes: 500,
    });
    expect(r.recorded).toBe(false);
    expect(r.reason).toBe('no-company');
  });

  it('never bills an unmeasured upload as zero bytes', async () => {
    const r = await svc2.recordApplicationMedia({
      jobId: 'WJOB1', tableName: 'applicant_resume',
      objectKey: 'https://storage/unmeasured.pdf', sizeBytes: null,
    });
    expect(r.recorded).toBe(false);
    expect(r.reason).toBe('unmeasured');
  });

  it('does not bill, and does not throw, if the application row is missing', async () => {
    // Guards the apply-flow ordering: attachments are recorded only after the
    // job_applicants row exists. If that order ever inverts, this is what it
    // looks like -- silently unbilled rather than a crashed application.
    const r = await svc2.recordApplicationMedia({
      jobId: 'WJOB1', tableName: 'applicant_resume', applicationId: 'GHOST-APPL',
      objectKey: 'https://storage/orphan.pdf', sizeBytes: 4096,
    });
    expect(r.recorded).toBe(false);
    expect(r.reason).toBe('error');
  });

  it('is non-blocking: a bad object key resolves rather than throwing', async () => {
    await expect(svc2.recordApplicationMedia({
      jobId: 'WJOB1', tableName: 'applicant_resume', objectKey: null, sizeBytes: 10,
    })).resolves.toEqual({ recorded: false, reason: 'no-object-key' });
  });
});

// The pg pool is a module-level singleton shared by every suite in this file, so
// it is closed exactly once here rather than in any one suite's afterAll --
// closing it per-suite tears it out from under the suites that run after.
// Without this the runner hangs on an open handle after a green run.
if (HAS_DB) {
  afterAll(async () => {
    await require('../db/dbQuery.js').default.close();
  });
}
