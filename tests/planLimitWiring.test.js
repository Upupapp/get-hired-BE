/**
 * Plan limit wiring: every gated handler consults the guard BEFORE it writes, and a
 * refusal becomes HTTP 402 with the refusal as the body (SPRINT-01 A3).
 *
 * The real controllers and services run. Only the database, the guard's four checks,
 * access control, storage uploads and Firebase account calls are mocked, so each test
 * can force a refusal and prove that no INSERT or UPDATE follows. No DB needed.
 */

jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));
jest.mock('@sendgrid/mail', () => ({ setApiKey: jest.fn(), send: jest.fn() }));
jest.mock('../db/dbQuery', () => ({
  __esModule: true,
  default: { query: jest.fn(), withTransaction: jest.fn(), close: jest.fn() },
}));
// The guard's own imports lead back to jobsController, which imports the guard. Calling
// requireActual inside this factory would re-enter it and hand the controllers a second,
// unconfigured mock, so the real helpers are reached lazily, at call time.
jest.mock('../services/planLimitGuard', () => {
  const real = () => jest.requireActual('../services/planLimitGuard');
  return {
    __esModule: true,
    guardJobLive: jest.fn(),
    guardQuestionsOnJob: jest.fn(),
    guardTeamSeats: jest.fn(),
    guardApplication: jest.fn(),
    sendPlanLimitRefusal: (...args) => real().sendPlanLimitRefusal(...args),
    isPlanLimitError: (...args) => real().isPlanLimitError(...args),
    planLimitError: (...args) => real().planLimitError(...args),
    measureApplicationUploadBytes: (...args) => real().measureApplicationUploadBytes(...args),
  };
});
jest.mock('../services/accessControl.service', () => {
  const actual = jest.requireActual('../services/accessControl.service');
  return Object.assign({}, actual, {
    __esModule: true,
    getAccessContextForRequest: jest.fn(async () => ({ companyId: 'CO-1', permissions: [] })),
    hasPermission: jest.fn(() => true),
    canAccessJob: jest.fn(() => true),
  });
});
jest.mock('../helpers/uploader', () => ({
  __esModule: true,
  default: jest.fn(async () => 'https://storage.example/file'),
  uploadImageWithOptimization: jest.fn(async () => 'https://storage.example/banner'),
}));
jest.mock('../helpers/firebaseFunctions', () => ({
  __esModule: true,
  checkUserIfExistInFirebase: jest.fn(async () => []),
  registerNewUserInFirebase: jest.fn(async () => ({ uid: 'NEW', email: 'n@x' })),
  createDynamicLink: jest.fn(),
  getForgetPwLinkInFirebase: jest.fn(async () => 'https://reset'),
}));
jest.mock('../services/job.service', () => {
  const actual = jest.requireActual('../services/job.service');
  return Object.assign({}, actual, {
    __esModule: true,
    jobDetails: jest.fn(async () => ({ jobId: 'JOB-1', jobStatusId: 2, companyId: 'CO-1', expirationDate: null })),
  });
});

const dbQuery = require('../db/dbQuery').default;
const guard = require('../services/planLimitGuard');
const actualGuard = jest.requireActual('../services/planLimitGuard');
const uploader = require('../helpers/uploader');
const firebaseFunctions = require('../helpers/firebaseFunctions');
const jobsController = require('../controllers/jobsController');
const interviewController = require('../controllers/interviewController');
const companiesController = require('../controllers/companiesController');
const applicationController = require('../controllers/applicationController');

const EMPLOYER_REFUSAL = actualGuard.buildEmployerRefusal({ entitlementKey: 'active_job_posts', used: 1, limit: 1, requested: 1, currentSlug: 'free_trial' });
const CANDIDATE_REFUSAL = actualGuard.buildCandidateRefusal('recruitment_storage_bytes');
const REFUSED = (refusal) => async () => ({ allowed: false, wouldBlock: true, refusal: refusal });
const ALLOWED = async () => ({ allowed: true, wouldBlock: false, refusal: null });

function request(body, uid) {
  const u = uid || 'U1';
  return {
    body: body,
    query: {},
    headers: {},
    user: { uid: u, email: 'owner@example.com' },
    // getUserCompanyForRequest() reads this per-request cache first: the caller's company.
    getHiredRequestCache: new Map([['getUserCompany:' + u, Promise.resolve({ companyId: 'CO-1' })]]),
  };
}

function response() {
  return {
    statusCode: null,
    body: null,
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (body) { this.body = body; return this; }),
    send: jest.fn(function (body) { this.body = body; return this; }),
  };
}

const writes = (pattern) => dbQuery.query.mock.calls.map((c) => String(c[0])).filter((sql) => pattern.test(sql));

beforeEach(() => {
  jest.clearAllMocks();
  dbQuery.query.mockReset();
  dbQuery.query.mockResolvedValue({ rows: [], rowCount: 0 });
  ['guardJobLive', 'guardQuestionsOnJob', 'guardTeamSeats', 'guardApplication'].forEach((fn) => guard[fn].mockReset());
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
});

describe('POST /job/create', () => {
  it('publishing past the limit: 402, the refusal as the body, and no job row or banner upload', async () => {
    guard.guardJobLive.mockImplementation(REFUSED(EMPLOYER_REFUSAL));
    const res = response();
    await jobsController.createJobs(request({ jobTitle: 'Chef', jobStatusId: 2, bannerFile: [{ file: 'data:image/png;base64,AAAA' }], interviewQuestions: [{ question: 'a' }, { question: 'b' }] }), res);
    expect(res.statusCode).toBe(402);
    expect(res.body).toEqual(EMPLOYER_REFUSAL);
    expect(guard.guardJobLive).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'CO-1', jobId: null, requestedStatusId: 2, questionsAdded: 2 }));
    expect(writes(/INSERT INTO\s+\S*jobs\b/i)).toEqual([]);
    expect(uploader.uploadImageWithOptimization).not.toHaveBeenCalled();
  });

  it('a draft goes straight through the real guard to the insert', async () => {
    guard.guardJobLive.mockImplementation(actualGuard.guardJobLive);
    const res = response();
    await jobsController.createJobs(request({ jobTitle: 'Chef', jobStatusId: 1 }), res);
    expect(res.statusCode).not.toBe(402);
    expect(writes(/INSERT INTO\s+\S*jobs\b/i)).toHaveLength(1);
  });
});

describe('PUT /job/updatejobs', () => {
  it('a save that would go live past the limit: 402 before any update or banner upload', async () => {
    guard.guardJobLive.mockImplementation(REFUSED(EMPLOYER_REFUSAL));
    const res = response();
    await jobsController.updateJob(request({ jobId: 'JOB-1', jobStatusId: 2, bannerFile: [{ file: 'x' }], interviewQuestions: [{ questionId: 'Q1' }, { question: 'new' }] }), res);
    expect(res.statusCode).toBe(402);
    // Only questions without an id are new.
    expect(guard.guardJobLive).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'JOB-1', requestedStatusId: 2, questionsAdded: 1 }));
    expect(writes(/UPDATE\s+\S*jobs\b/i)).toEqual([]);
    expect(uploader.default).not.toHaveBeenCalled();
  });
});

describe('PUT /job/changestatus', () => {
  it('reopening past the limit: 402 and no status change', async () => {
    guard.guardJobLive.mockImplementation(REFUSED(EMPLOYER_REFUSAL));
    const res = response();
    await jobsController.updateStatusOfJob(request({ jobId: 'JOB-1', status: 2 }), res);
    expect(res.statusCode).toBe(402);
    expect(writes(/UPDATE\s+\S*jobs\s+SET\s+job_status_id/i)).toEqual([]);
  });

  it('archiving goes through the real guard to the update, never 402', async () => {
    guard.guardJobLive.mockImplementation(actualGuard.guardJobLive);
    const res = response();
    await jobsController.updateStatusOfJob(request({ jobId: 'JOB-1', status: 4 }), res);
    expect(res.statusCode).not.toBe(402);
    expect(writes(/UPDATE\s+\S*jobs\s+SET\s+job_status_id/i)).toHaveLength(1);
  });
});

describe('POST /interview/savequestiontemplate', () => {
  it("questions for a live job's default template past the cap: 402 and no template row", async () => {
    guard.guardQuestionsOnJob.mockImplementation(REFUSED(EMPLOYER_REFUSAL));
    const res = response();
    await interviewController.saveQuestionTemplate(request({ jobId: 'JOB-1', templateName: 'default', interviewQuestions: [{ question: 'a' }, { question: 'b' }, { question: 'c' }] }), res);
    expect(res.statusCode).toBe(402);
    expect(guard.guardQuestionsOnJob).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'CO-1', jobId: 'JOB-1', questionsAdded: 3 }));
    expect(writes(/INSERT INTO\s+\S*job_interview_template\b/i)).toEqual([]);
  });

  it('a template candidates never see is not gated', async () => {
    const res = response();
    await interviewController.saveQuestionTemplate(request({ jobId: 'JOB-1', templateName: 'library', interviewQuestions: [{ question: 'a' }] }), res);
    expect(guard.guardQuestionsOnJob).not.toHaveBeenCalled();
    expect(res.statusCode).not.toBe(402);
  });
});

describe('POST /company/addcompanyuser', () => {
  it('past the seat limit: 402 for the whole request, and no account is created', async () => {
    guard.guardTeamSeats.mockImplementation(REFUSED(EMPLOYER_REFUSAL));
    const res = response();
    await companiesController.addCompanyUser(request({ emails: [{ email: 'a@x' }, { email: 'b@x' }, { email: 'c@x' }] }), res);
    expect(res.statusCode).toBe(402);
    expect(guard.guardTeamSeats).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'CO-1', requested: 3 }));
    expect(firebaseFunctions.checkUserIfExistInFirebase).not.toHaveBeenCalled();
    expect(firebaseFunctions.registerNewUserInFirebase).not.toHaveBeenCalled();
    expect(writes(/INSERT INTO\s+\S*company_employees\b/i)).toEqual([]);
  });
});

describe('POST /application/apply', () => {
  it('an employer out of capacity: 402 with the candidate-safe body, and no application row', async () => {
    dbQuery.query.mockImplementation(async (sql) => (/applicants_profile/i.test(sql) ? { rows: [{ applicant_profile_id: 'AP1' }] } : { rows: [] }));
    guard.guardApplication.mockImplementation(REFUSED(CANDIDATE_REFUSAL));
    const res = response();
    // A real PDF signature: the apply flow checks file bytes before anything else.
    const resume = 'data:application/pdf;base64,' + Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2039, 32)]).toString('base64');
    await applicationController.submitApplication(request({ jobId: 'JOB-1', resume: [{ file: resume, filename: 'cv', type: 'application/pdf' }] }, 'CAND-1'), res);
    expect(res.statusCode).toBe(402);
    expect(res.body).toEqual(CANDIDATE_REFUSAL);
    expect(guard.guardApplication).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'CO-1', jobId: 'JOB-1', incomingBytes: 2048 }));
    expect(writes(/INSERT INTO\s+\S*job_applicants\b/i)).toEqual([]);
    expect(uploader.default).not.toHaveBeenCalled();
  });
});
