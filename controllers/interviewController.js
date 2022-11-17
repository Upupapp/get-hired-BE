import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import idGenerator from "../helpers/randomNumberForId";

import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const createQuestion = async (questionDetails, jobId) => {
  const { question, answerDuration, retakes } = questionDetails;
  const insertQuery = `INSERT INTO ${dbSchema}.questions
    (question_id, question, answer_duration, retakes, created_at, job_id)
    VALUES($1, $2, $3, $4, $5) returning *;`;

  const questionId = idGenerator(6, "QN");

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      questionId,
      question,
      answerDuration,
      retakes,
      now,
      jobId
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to create Question";
    }

    const dbResponse = mappedQuestion(rows);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedQuestion = (raw) => {
  return {
    questionId: raw.question_id,
    question: raw.question,
    answerDuration: answer_duration,
    retakes: raw.retakes,
    createdAt: raw.created_at,
    updatedAt: raw.updatedAt,
    jobId: raw.job_id
  };
};

export {
    createQuestion
}
