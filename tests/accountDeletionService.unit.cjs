const assert = require('assert');
const loadEsm = require('esm')(module);
const { buildAccountDeletionService } = loadEsm('../services/accountDeletionPlan.js');

async function run() {
  const calls = [];
  let step = 0;
  const client = {
    async query(sql) {
      calls.push(String(sql).replace(/\s+/g, ' ').trim());
      step += 1;
      if (step === 1) return { rows: [{ applicant_profile_id: 'APP-1' }] };
      if (step === 2) return { rows: [{ company_id: 'COM-1' }] };
      if (step === 3) return { rows: [{ job_id: 'JOB-1' }] };
      if (step === 4) return { rows: [{ url: 'gs://bucket/cv.pdf' }] };
      if (step === 15) return { rows: [{ url: 'gs://bucket/video.mp4' }] };
      return { rows: [], rowCount: 1 };
    },
  };
  const firebaseCalls = [];
  const storageCalls = [];
  const remove = buildAccountDeletionService({
    db: { withTransaction: (fn) => fn(client) },
    dbSchema: 'gethired',
    deleteFirebaseUser: async (uid) => firebaseCalls.push(uid),
    deleteStorageUrl: async (url) => storageCalls.push(url),
  });
  const result = await remove('USER-1');
  assert.deepStrictEqual(result, { deleted: true, applicantProfiles: 1, companies: 1, jobs: 1, storedFiles: 2 });
  assert.deepStrictEqual(firebaseCalls, ['USER-1']);
  assert.deepStrictEqual(storageCalls.sort(), ['gs://bucket/cv.pdf', 'gs://bucket/video.mp4']);
  assert(calls.some((sql) => sql.includes('DELETE FROM gethired.applicants_profile')));
  assert(calls.some((sql) => sql.includes('DELETE FROM gethired.jobs')));
  assert(calls.some((sql) => sql.includes('DELETE FROM gethired.companies')));
  assert(calls.at(-1).includes('DELETE FROM gethired.user_credentials'));

  let firebaseAttempted = false;
  const failBeforeFirebase = buildAccountDeletionService({
    db: { withTransaction: async () => { throw new Error('foreign key violation'); } },
    dbSchema: 'gethired',
    deleteFirebaseUser: async () => { firebaseAttempted = true; },
  });
  await assert.rejects(() => failBeforeFirebase('USER-1'), /foreign key violation/);
  assert.strictEqual(firebaseAttempted, false);

  let emptyStep = 0;
  const idempotent = buildAccountDeletionService({
    db: { withTransaction: (fn) => fn({ query: async () => {
      emptyStep += 1;
      return { rows: [], rowCount: 0 };
    } }) },
    dbSchema: 'gethired',
    deleteFirebaseUser: async () => { throw { code: 'auth/user-not-found' }; },
  });
  const retry = await idempotent('USER-1');
  assert.strictEqual(retry.deleted, false);
  assert(emptyStep > 0);

  console.log('account deletion service: 3 tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
