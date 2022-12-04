const jobApply = async (jobApplication) => {
  try {
    const insertQuery = `INSERT INTO gethired.job_applicants
          (job_applicant_id, job_id, date_applied, updated_at, candidate_id, application_status_id, is_archived)
          VALUES('', '', '', now(), '', 0, false) returning *;`;
    const { rows } = await dbQuery.query(insertQuery, []);
    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};
