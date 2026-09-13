/**
 * storedMediaService contracts, proven without a database: error handling and the
 * storage status labels.
 *
 * The DB-backed suite skips itself when no test database is configured, and a
 * skipped test "passes" whatever the code does. These cases force each failure
 * through a mocked dbQuery, so they run everywhere, and each asserts the query
 * that fails was actually reached, so the catch under test really executes.
 */

jest.mock('../db/dbQuery', () => ({ __esModule: true, default: { query: jest.fn() } }));

const dbQuery = require('../db/dbQuery').default;
const svc = require('../services/storedMediaService');

function pgError(message, code) {
  return Object.assign(new Error(message), code ? { code: code } : {});
}

const RESUME = {
  jobId: 'JOB-1',
  applicantId: 'APPLICANT-1',
  applicationId: 'APPL-1',
  tableName: 'applicant_resume',
  objectKey: 'https://storage.example/cv.pdf',
  sizeBytes: 4096,
};

beforeEach(() => {
  dbQuery.query.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('recordApplicationMedia never throws: its catch is exercised', () => {
  it('resolves { recorded: false, reason: "error" } when the stored_media insert fails', async () => {
    dbQuery.query
      .mockResolvedValueOnce({ rows: [{ company_id: 'CO-1' }] })
      .mockRejectedValueOnce(pgError('insert or update on table "stored_media" violates foreign key constraint "stored_media_application_fk"', '23503'));
    await expect(svc.recordApplicationMedia(RESUME)).resolves.toEqual({ recorded: false, reason: 'error' });
    // Two queries: the employer lookup, then the insert that failed inside the try.
    expect(dbQuery.query).toHaveBeenCalledTimes(2);
    expect(dbQuery.query.mock.calls[1][0]).toMatch(/INSERT INTO\s+\S*stored_media/i);
    expect(console.error).toHaveBeenCalled();
  });

  it('resolves { recorded: false, reason: "error" } when the employer lookup itself fails', async () => {
    dbQuery.query.mockRejectedValueOnce(pgError('Connection terminated unexpectedly'));
    await expect(svc.recordApplicationMedia(RESUME)).resolves.toEqual({ recorded: false, reason: 'error' });
    expect(dbQuery.query).toHaveBeenCalledTimes(1);
  });
});

describe('getRecruitmentStorageUsed tells a missing table apart from a failure', () => {
  it('stored_media missing (42P01) → unavailable, logged as a warning', async () => {
    dbQuery.query.mockRejectedValueOnce(pgError('relation "gethired.stored_media" does not exist', '42P01'));
    await expect(svc.getRecruitmentStorageUsed('CO-1'))
      .resolves.toEqual({ count: 0, source: 'stored_media.active', confidence: 'unavailable' });
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    ['a statement timeout', pgError('canceling statement due to statement timeout', '57014')],
    ['a permission error', pgError('permission denied for table stored_media', '42501')],
    ['a dropped connection (no SQLSTATE)', pgError('Connection terminated unexpectedly')],
  ])('%s → error, logged as an error, never "unavailable"', async (_label, failure) => {
    dbQuery.query.mockRejectedValueOnce(failure);
    await expect(svc.getRecruitmentStorageUsed('CO-1'))
      .resolves.toEqual({ count: 0, source: 'stored_media.active', confidence: 'error' });
    expect(console.error).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('success → confirmed, with active bytes summed across media types', async () => {
    dbQuery.query.mockResolvedValueOnce({ rows: [
      { media_type: 'candidate_video', file_count: '2', bytes: '3000' },
      { media_type: 'candidate_cv', file_count: '1', bytes: '500' },
    ] });
    await expect(svc.getRecruitmentStorageUsed('CO-1'))
      .resolves.toEqual({ count: 3500, source: 'stored_media.active', confidence: 'confirmed' });
  });
});

describe('getStorageStatus labels', () => {
  const GB = 1073741824;

  it.each([
    ['nothing stored', 0],
    ['bytes stored anyway', 5 * GB],
  ])('an employer with no plan (limit 0) is no_plan, never full: %s', (_label, used) => {
    expect(svc.getStorageStatus(used, 0)).toBe('no_plan');
    expect(svc.getStorageStatus(used, 0)).toBe(svc.NO_PLAN_STORAGE_STATUS);
  });

  it('an unlimited limit is normal: null, absent, or negative (as buildEntitlementUsage reads < 0)', () => {
    expect(svc.getStorageStatus(900 * GB, null)).toBe('normal');
    expect(svc.getStorageStatus(900 * GB, undefined)).toBe('normal');
    expect(svc.getStorageStatus(900 * GB, -1)).toBe('normal');
  });

  it('a real limit keeps its bands, and full still means 100%', () => {
    expect(svc.getStorageStatus(69, 100)).toBe('normal');
    expect(svc.getStorageStatus(80, 100)).toBe('warning');
    expect(svc.getStorageStatus(100, 100)).toBe('full');
  });
});

describe('mediaTypeForTable', () => {
  it('meters a recorded interview answer as candidate video', () => {
    expect(svc.mediaTypeForTable('interview_answers')).toBe('candidate_video');
  });

  it('keeps the attachment mappings, and files an unknown table under other media', () => {
    expect(svc.mediaTypeForTable('applicant_resume')).toBe('candidate_cv');
    expect(svc.mediaTypeForTable('applicant_government_files')).toBe('candidate_document');
    expect(svc.mediaTypeForTable('something_new')).toBe('other_application_media');
  });
});
