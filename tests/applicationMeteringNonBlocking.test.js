/**
 * Recruitment Storage metering must never stop an application attachment, or a
 * recorded video answer, from saving.
 *
 * uploadApplicationAttachment() saves the attachment row, then meters it into
 * stored_media. Metering can fail in production for ordinary reasons: the migration has
 * not been applied (deploys run none), the job's employer cannot be resolved, or a
 * constraint rejects the row. None of those may fail the applicant's submission, and
 * the row must already be saved before metering is attempted.
 *
 * Unit test: the database and object storage are mocked, so each failure mode can be
 * forced deterministically. No DB, no network.
 */

jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));
jest.mock('../helpers/uploader', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../helpers/mailer', () => ({ __esModule: true, send: jest.fn() }));
jest.mock('../helpers/userDetails', () => ({ __esModule: true, getUserProfileById: jest.fn() }));
jest.mock('../services/job.service', () => ({ __esModule: true, jobDetails: jest.fn() }));
jest.mock('../services/applicationSnapshotService', () => ({ __esModule: true, createApplicationSnapshots: jest.fn() }));
jest.mock('../services/documentUploadValidationService', () => ({ __esModule: true, validateDocumentFile: jest.fn() }));
jest.mock('../services/accessControl.service', () => ({ __esModule: true, canAccessJob: jest.fn() }));
jest.mock('../services/notification.service', () => ({ __esModule: true, createNotification: jest.fn() }));
jest.mock('../db/dbQuery', () => ({ __esModule: true, default: { query: jest.fn() } }));

const dbQuery = require('../db/dbQuery').default;
const uploadInStorage = require('../helpers/uploader').default;
const { uploadApplicationAttachment, saveInterviewAnswer } = require('../services/application.service');

const STORED_URL = 'https://storage.example/applicant-documents/cv.pdf';
const SAVED_ROW = { id: 'att-1', fileurl: STORED_URL, filename: 'cv' };

function pdfDataUrl(bytes) {
  return 'data:application/pdf;base64,' + Buffer.alloc(bytes, 3).toString('base64');
}

// Routes every SQL statement by what it touches, and records the order they ran in.
function routeQueries(handlers) {
  const log = [];
  dbQuery.query.mockImplementation((sql, params) => {
    if (/INSERT INTO\s+\S*applicant_resume/i.test(sql)) { log.push('attachment'); return handlers.attachment(params); }
    if (/stored_media/i.test(sql)) { log.push('stored_media'); return handlers.storedMedia(params); }
    if (/FROM\s+\S*jobs\b/i.test(sql)) { log.push('employer_lookup'); return handlers.employerLookup(params); }
    log.push('unexpected'); return Promise.reject(new Error('unexpected query: ' + sql));
  });
  return log;
}

const ok = (rows) => () => Promise.resolve({ rows: rows });
const fail = (message, code) => () => Promise.reject(Object.assign(new Error(message), code ? { code: code } : {}));

function attachCv(overrides) {
  return uploadApplicationAttachment(
    Object.assign({ file: pdfDataUrl(2048), size: 2048, type: 'application/pdf', filename: 'cv' }, overrides || {}),
    'APPLICANT-1', 'applicant_resume', 'applicant_id', 'JOB-1', 'APPL-1'
  );
}

function attachmentParams() {
  const call = dbQuery.query.mock.calls.filter((c) => /INSERT INTO\s+\S*applicant_resume/i.test(c[0]))[0];
  return call ? call[1] : null;
}

beforeEach(() => {
  dbQuery.query.mockReset();
  uploadInStorage.mockReset();
  uploadInStorage.mockResolvedValue(STORED_URL);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a metering failure never fails the attachment', () => {
  it('saves when stored_media does not exist yet (migration not applied)', async () => {
    const order = routeQueries({
      attachment: ok([SAVED_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: fail('relation "gethired.stored_media" does not exist', '42P01'),
    });
    await expect(attachCv()).resolves.toEqual(SAVED_ROW);
    // The failure path really ran, and only after the row was saved.
    expect(order).toEqual(['attachment', 'employer_lookup', 'stored_media']);
    expect(attachmentParams()[2]).toBe(2048);
  });

  it('saves when the job\'s employer cannot be resolved', async () => {
    const order = routeQueries({
      attachment: ok([SAVED_ROW]),
      employerLookup: fail('Connection terminated unexpectedly'),
      storedMedia: ok([]),
    });
    await expect(attachCv()).resolves.toEqual(SAVED_ROW);
    expect(order[0]).toBe('attachment');
    expect(order).toContain('employer_lookup');
    expect(order).not.toContain('stored_media');
  });

  it('saves when stored_media rejects the row (constraint violation)', async () => {
    const order = routeQueries({
      attachment: ok([SAVED_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: fail('insert or update on table "stored_media" violates foreign key constraint "stored_media_application_fk"', '23503'),
    });
    await expect(attachCv()).resolves.toEqual(SAVED_ROW);
    expect(order).toEqual(['attachment', 'employer_lookup', 'stored_media']);
  });

  it('saves a re-attached file with no measurable size, and does not meter it as zero', async () => {
    const order = routeQueries({
      attachment: ok([SAVED_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: ok([]),
    });
    await expect(attachCv({ file: undefined, size: undefined, fileurl: STORED_URL })).resolves.toEqual(SAVED_ROW);
    expect(uploadInStorage).not.toHaveBeenCalled();
    expect(attachmentParams()[0]).toBe(STORED_URL);
    expect(attachmentParams()[2]).toBeNull();
    expect(order).toEqual(['attachment']);
  });
});

describe('control: the test can see a real failure', () => {
  it('a failure saving the attachment row itself still fails the submission, and nothing is metered', async () => {
    const order = routeQueries({
      attachment: fail('insert failed'),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: ok([]),
    });
    await expect(attachCv()).rejects.toThrow('insert failed');
    expect(order).toEqual(['attachment']);
  });
});

// ── Recorded video answers ──────────────────────────────────────────────────────
const ANSWER_URL = 'https://storage.example/applicant-interview-answers/JOB-1-Q1-APPLICANT-1';
const ANSWER_ROW = { question_id: 'Q1', answer_url: ANSWER_URL, created_at: new Date(0), job_id: 'JOB-1', applicant_id: 'APPLICANT-1' };

function webmDataUrl(bytes) {
  return 'data:video/webm;codecs=vp9;base64,' + Buffer.alloc(bytes, 5).toString('base64');
}

function routeAnswerQueries(handlers) {
  const log = [];
  dbQuery.query.mockImplementation((sql, params) => {
    if (/INSERT INTO\s+\S*interview_answers/i.test(sql)) { log.push('answer'); return handlers.answer(params); }
    if (/stored_media/i.test(sql)) { log.push('stored_media'); return handlers.storedMedia(params); }
    if (/FROM\s+\S*jobs\b/i.test(sql)) { log.push('employer_lookup'); return handlers.employerLookup(params); }
    log.push('unexpected'); return Promise.reject(new Error('unexpected query: ' + sql));
  });
  return log;
}

function saveAnswer(overrides) {
  return saveInterviewAnswer(Object.assign({
    questionId: 'Q1', answerFile: webmDataUrl(3000), jobId: 'JOB-1', applicantId: 'APPLICANT-1', applicationId: 'APPL-1',
  }, overrides || {}));
}

describe('recorded video answers are metered, and metering never fails the answer', () => {
  beforeEach(() => {
    uploadInStorage.mockResolvedValue(ANSWER_URL);
  });

  it('meters a saved answer as candidate_video, with its measured size, after the row is saved', async () => {
    const order = routeAnswerQueries({
      answer: ok([ANSWER_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: ok([{ id: 'sm-1' }]),
    });
    await expect(saveAnswer()).resolves.toMatchObject({ questionId: 'Q1', answerUrl: ANSWER_URL });
    expect(order).toEqual(['answer', 'employer_lookup', 'stored_media']);
    const params = dbQuery.query.mock.calls.filter((c) => /stored_media/i.test(c[0]))[0][1];
    expect(params).toEqual(expect.arrayContaining(['CO-1', 'APPLICANT-1', 'APPL-1', 'JOB-1', 'candidate_video', ANSWER_URL, 'video/webm', 3000]));
  });

  it('still saves the answer when stored_media does not exist yet', async () => {
    const order = routeAnswerQueries({
      answer: ok([ANSWER_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: fail('relation "gethired.stored_media" does not exist', '42P01'),
    });
    await expect(saveAnswer()).resolves.toMatchObject({ questionId: 'Q1' });
    expect(order).toEqual(['answer', 'employer_lookup', 'stored_media']);
  });

  it('does not meter an answer that carries no uploaded file', async () => {
    const order = routeAnswerQueries({
      answer: ok([ANSWER_ROW]),
      employerLookup: ok([{ company_id: 'CO-1' }]),
      storedMedia: ok([]),
    });
    await expect(saveAnswer({ answerFile: '' })).resolves.toMatchObject({ questionId: 'Q1' });
    expect(uploadInStorage).not.toHaveBeenCalled();
    expect(order).toEqual(['answer']);
  });
});
