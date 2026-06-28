import dbQuery from "../db/dbQuery";

// Returns true if the applicant has saved this job.
export const getSavedJobStatus = async (applicantUid, jobId) => {
  const result = await dbQuery.query(
    "SELECT 1 FROM gethired.saved_jobs WHERE applicant_uid = $1 AND job_id = $2",
    [applicantUid, String(jobId)]
  );
  return result.rows.length > 0;
};

// Toggles the saved state atomically: insert if absent, delete if present.
// Returns the new saved state (true = now saved, false = now unsaved).
export const toggleSavedJob = async (applicantUid, jobId) => {
  const existing = await dbQuery.query(
    "SELECT 1 FROM gethired.saved_jobs WHERE applicant_uid = $1 AND job_id = $2",
    [applicantUid, String(jobId)]
  );
  if (existing.rows.length > 0) {
    await dbQuery.query(
      "DELETE FROM gethired.saved_jobs WHERE applicant_uid = $1 AND job_id = $2",
      [applicantUid, String(jobId)]
    );
    return false;
  }
  await dbQuery.query(
    "INSERT INTO gethired.saved_jobs (applicant_uid, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [applicantUid, String(jobId)]
  );
  return true;
};
