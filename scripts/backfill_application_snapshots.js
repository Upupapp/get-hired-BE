/**
 * Backfill script: create completeness + match snapshots for existing applications
 * that were submitted before snapshot tracking was enabled.
 *
 * Usage:
 *   node scripts/backfill_application_snapshots.js             # live run
 *   node scripts/backfill_application_snapshots.js --dry-run   # preview only, no writes
 *   node scripts/backfill_application_snapshots.js --limit=20  # process first 20 only
 *
 * Safety:
 *   - Never modifies any existing row — uses ON CONFLICT DO NOTHING throughout.
 *   - Fire-and-forget per application — one failure does not stop the batch.
 *   - Processes in batches of 10 with a 500ms pause between batches.
 *   - DO NOT run against production without first verifying tables exist:
 *       SELECT to_regclass('gethired.application_snapshots');
 *   - The source field is 'backfill_current_data', not 'application_submit',
 *     so these rows do not conflict with any future real submission snapshots.
 *
 * Note: backfill snapshots capture *current* profile state, not the profile at
 * submission time. Employer UI will show "Snapshot not available" for these
 * applications until a real-time snapshot is captured on next submission.
 * The applicant My Applications view does benefit — completeness tips will show.
 */

require = require("esm")(module);

const { createApplicationSnapshots } = require("../services/applicationSnapshotService");
const dbQuery = require("../db/dbQuery").default;
const env = require("../env").default;

const dbSchema = env.schema;
const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm");
const LIMIT_ARG = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : null;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getUnsnapshotedApplications() {
  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : "";
  const { rows } = await dbQuery.query(`
    SELECT
      ja.job_application_id,
      ja.candidate_id,
      ja.job_id,
      j.company_id
    FROM ${dbSchema}.job_applicants ja
    LEFT JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
    LEFT JOIN ${dbSchema}.application_snapshots aps
      ON aps.application_id = ja.job_application_id
    WHERE aps.id IS NULL
      AND j.company_id IS NOT NULL
    ORDER BY ja.date_applied ASC
    ${limitClause}
  `);
  return rows;
}

async function processBatch(batch, batchNum, total) {
  const results = await Promise.allSettled(
    batch.map(async (row) => {
      if (DRY_RUN) {
        return { applicationId: row.job_application_id, status: "dry-run" };
      }

      const result = await createApplicationSnapshots({
        applicationId: row.job_application_id,
        applicantId: row.candidate_id,
        jobId: row.job_id,
        companyId: row.company_id,
        coverLetter: [],
        resume: [],
        governmentFiles: [],
        interviewAnswers: [],
        source: "backfill_current_data",
      });

      return {
        applicationId: row.job_application_id,
        snapshotId: result.snapshotId,
        completenessSnapshotId: result.completenessSnapshotId,
        errors: result.errors,
        status: result.errors.length === 0 ? "ok" : "partial",
      };
    })
  );

  let ok = 0, partial = 0, failed = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const v = r.value;
      if (v.status === "ok" || v.status === "dry-run") ok++;
      else partial++;
      if (v.errors?.length) {
        console.warn(`  [${v.applicationId}] partial errors:`, v.errors);
      }
    } else {
      failed++;
      console.error(`  [${batch[i].job_application_id}] threw:`, r.reason);
    }
  });

  console.log(`  Batch ${batchNum}: ${ok} ok, ${partial} partial, ${failed} failed`);
  return { ok, partial, failed };
}

async function run() {
  // Safety: print the connected DB target so the operator can verify dev-vs-prod
  // before any data is read or written.
  console.log(`\n=== Application Snapshot Backfill ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===`);
  console.log(`  DB host:     ${env.host || "(not set)"}`);
  console.log(`  DB database: ${env.database || "(not set)"}`);
  console.log(`  DB schema:   ${dbSchema || "(not set)"}`);

  if (!DRY_RUN && !CONFIRM) {
    console.error("\n[ABORT] Live run requires --confirm flag to prevent accidental production writes.");
    console.error("  Add --confirm to proceed, or --dry-run to preview without writing.");
    console.error("  Example: node scripts/backfill_application_snapshots.js --confirm\n");
    process.exit(1);
  }

  if (LIMIT) console.log(`  Limit: ${LIMIT} applications`);

  // Pre-flight: confirm the three snapshot tables exist before touching any data.
  // Aborts with a clear message if the DDL hasn't been applied to this environment yet.
  const REQUIRED_TABLES = [
    'application_snapshots',
    'application_completeness_snapshots',
    'match_snapshots',
  ];
  console.log('\nChecking required tables exist...');
  for (const table of REQUIRED_TABLES) {
    const { rows } = await dbQuery.query(
      `SELECT to_regclass($1::text) AS exists`,
      [`${dbSchema}.${table}`]
    );
    if (!rows[0].exists) {
      console.error(`\n[ABORT] Table "${dbSchema}.${table}" does not exist on this DB.`);
      console.error('  Apply the DDL migration before running the backfill.');
      console.error(`  Verify: SELECT to_regclass('${dbSchema}.${table}');`);
      process.exit(1);
    }
    console.log(`  ✓ ${table}`);
  }
  console.log('All required tables present.\n');

  let applications;
  try {
    applications = await getUnsnapshotedApplications();
  } catch (err) {
    console.error("Failed to query applications:", err.message);
    process.exit(1);
  }

  console.log(`Found ${applications.length} applications without backfill snapshots.\n`);
  if (applications.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  let totalOk = 0, totalPartial = 0, totalFailed = 0;
  const batches = [];
  for (let i = 0; i < applications.length; i += BATCH_SIZE) {
    batches.push(applications.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length} (${batches[i].length} applications)...`);
    const { ok, partial, failed } = await processBatch(batches[i], i + 1, applications.length);
    totalOk += ok;
    totalPartial += partial;
    totalFailed += failed;

    if (i < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n=== Backfill complete ===`);
  console.log(`  Total: ${applications.length}`);
  console.log(`  OK:      ${totalOk}`);
  console.log(`  Partial: ${totalPartial}`);
  console.log(`  Failed:  ${totalFailed}`);
  if (DRY_RUN) {
    console.log("\n(Dry run — no rows were written. Re-run without --dry-run to apply.)");
  }
  process.exit(0);
}

run().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
