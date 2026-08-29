// One-off backfill: renames existing duplicate-name companies and flags
// them, per explicit product decision (2026-08-30):
//   - Within each group of companies sharing the same name (case/whitespace
//     -insensitive), the OLDEST (by created_at) keeps its exact name.
//   - Every newer duplicate is renamed "<Original Name> #2", "#3", ... and
//     flagged is_duplicate = true (drives the public-page banner).
//   - Nothing is merged or deleted -- every duplicate stays a fully
//     independent company with its own real jobs/applicants/profile data.
//
// Requires db/20260830_company_duplicate_flag.sql to have been applied
// first (adds the is_duplicate column) -- this script will fail loudly if
// it hasn't.
//
// Run modes:
//   node ... --dry-run   (default if no flag given) -- reports only, no writes
//   node ... --apply     -- actually renames + flags rows
//
// Usage (matches this repo's other one-off SSH scripts):
//   node -e "require=require('esm')(module); require('/path/to/this/file.js')" -- --dry-run

const dbQuery = require('/var/www/_work/get-hired-BE/db/dbQuery').default;
const dbSchema = 'gethired';

// Same normalization generateSlug() uses, duplicated here (not imported)
// so this standalone script has no dependency on the app's module graph.
function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function slugTaken(slug, excludeId, usedInThisRun) {
  if (usedInThisRun.has(slug)) return true;
  const { rows } = await dbQuery.query(
    `SELECT company_id FROM ${dbSchema}.companies WHERE company_slug = $1 AND company_id != $2 LIMIT 1`,
    [slug, excludeId]
  );
  return rows && rows.length > 0;
}

async function uniqueSlugFor(name, companyId, usedInThisRun) {
  const base = generateSlug(name);
  let candidate = base;
  let n = 2;
  while (await slugTaken(candidate, companyId, usedInThisRun)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  usedInThisRun.add(candidate);
  return candidate;
}

(async () => {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'MODE=APPLY (will write changes)' : 'MODE=DRY-RUN (report only, no writes)');

  const { rows } = await dbQuery.query(
    `SELECT company_id, company_name, company_slug, created_at
     FROM ${dbSchema}.companies
     ORDER BY created_at ASC NULLS LAST`
  );

  const groups = new Map();
  for (const row of rows) {
    const key = (row.company_name || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const usedSlugsThisRun = new Set();
  let groupCount = 0;
  let renameCount = 0;

  for (const [key, members] of groups.entries()) {
    if (members.length < 2) continue;
    groupCount += 1;

    const original = members[0]; // oldest by created_at, unchanged
    console.log(`\nGROUP "${original.company_name}" (${members.length} companies):`);
    console.log(`  KEEP  ${original.company_id}  "${original.company_name}"  slug=${original.company_slug}  created=${original.created_at}`);

    for (let i = 1; i < members.length; i++) {
      const dup = members[i];
      const newName = `${original.company_name} #${i + 1}`;
      const newSlug = await uniqueSlugFor(newName, dup.company_id, usedSlugsThisRun);
      console.log(`  RENAME ${dup.company_id}  "${dup.company_name}" -> "${newName}"  slug=${dup.company_slug} -> ${newSlug}  created=${dup.created_at}`);
      renameCount += 1;

      if (apply) {
        await dbQuery.query(
          `UPDATE ${dbSchema}.companies SET company_name = $1, company_slug = $2, is_duplicate = true WHERE company_id = $3`,
          [newName, newSlug, dup.company_id]
        );
      }
    }
  }

  console.log(`\nSUMMARY: ${groupCount} duplicate-name group(s), ${renameCount} compan(y/ies) ${apply ? 'renamed' : 'would be renamed'}.`);
  console.log(apply ? 'DONE (applied).' : 'DRY-RUN complete -- re-run with --apply to actually write these changes.');
  process.exit(0);
})().catch((e) => {
  console.error('BACKFILL_FAILED', e);
  process.exit(1);
});
