const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('production catalog matches every approved subscription capacity', () => {
  const source = read('services/planCatalogServiceV4.js');
  const expected = [
    ['free_trial', 1, 1, 1, 1, 5],
    ['starter', 5, 2, 10, 3, 25],
    ['growth', 15, 5, 50, 5, 100],
    ['business', 40, 15, 200, 10, 400],
  ];

  for (const [slug, jobs, users, storageGb, questions, responses] of expected) {
    const start = source.indexOf(`slug: '${slug}'`);
    const end = source.indexOf('\n  },', start);
    const plan = source.slice(start, end);
    assert.ok(start >= 0, `${slug} exists`);
    assert.match(plan, new RegExp(`active_job_posts: ${jobs},`));
    assert.match(plan, new RegExp(`admin_users: ${users},`));
    assert.match(plan, new RegExp(`recruitment_storage_bytes: ${storageGb} \\* GB,`));
    assert.match(plan, new RegExp(`video_questions_per_job: ${questions},`));
    assert.match(plan, new RegExp(`video_responses: ${responses},`));
  }

  assert.match(source, /slug: 'enterprise'[\s\S]*?active_job_posts: null,[\s\S]*?recruitment_storage_bytes: null/);
  assert.match(source, /slug: 'business'[\s\S]*?priceMonthlyPHP: 5990,[\s\S]*?priceAnnualPHP: 59900,/);
});

test('all employer mutation paths call the authoritative plan guards', () => {
  const jobs = read('controllers/jobsController.js');
  const companies = read('controllers/companiesController.js');
  const interviews = read('controllers/interviewController.js');
  const applications = read('services/application.service.js');

  assert.match(jobs, /guardJobLive\([\s\S]*?publish/);
  assert.ok((jobs.match(/guardJobLive\(/g) || []).length >= 3, 'create, update, and status publishing are guarded');
  assert.match(companies, /guardTeamSeats\(/);
  assert.match(interviews, /guardQuestionsOnJob\(/);
  assert.match(applications, /guardApplication\(/);
});

test('public pricing and legacy subscription summary use the authoritative catalog', () => {
  const routes = read('routes/subscriptionGuardrailsRoutesV4.js');
  const legacy = read('controllers/subscriptionController.js');
  assert.match(routes, /router\.get\('\/subscriptions\/pricing-catalog',\s*getPricingCatalogEndpoint\)/);
  assert.doesNotMatch(routes, /pricing-catalog',\s*verifyAuth/);
  assert.match(legacy, /getPlanBySlug\(planCode\)/);
  assert.match(legacy, /authoritativeEntitlements\.active_job_posts/);
  assert.match(legacy, /authoritativeEntitlements\.admin_users/);
  assert.match(legacy, /authoritativeEntitlements\.video_responses/);
});

test('storage accounting migration is additive and usage recording cannot reject applications', () => {
  const migration = read('db/20260913_stored_media.sql');
  const application = read('services/application.service.js');
  const storage = read('services/storedMediaService.js');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS gethired\.stored_media/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS stored_media_company_object_active_uidx/);
  assert.match(application, /recordApplicationMedia\(/);
  assert.match(storage, /recordApplicationMedia[\s\S]*?catch/);
});
