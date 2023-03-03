import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import idGenerator from "../helpers/randomNumberForId";

import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const createQuestion = async (questionDetails, templateId) => {
  const { question, answerDuration, retakes, sequence } = questionDetails;
  const insertQuery = `INSERT INTO ${dbSchema}.interview_template_question
  (template_question_id, template_question, template_answer_duration, template_question_retakes, job_interview_template_id, created_at, sequence)  
    VALUES($1, $2, $3, $4, $5, $6, $7) returning *;`;

  const questionId = idGenerator(6, "QN");

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      questionId,
      question,
      answerDuration,
      retakes,
      templateId,
      now,
      sequence,
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

const createInterviewTemplateQuestions = async (jobId, templateName) => {
  const templateId = idGenerator(6, "ITPL");

  const insertQuery = `INSERT INTO ${dbSchema}.job_interview_template
  (job_interview_template_id, job_interview_template_name, created_at, job_id)
  VALUES($1, $2, $3, $4) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      templateId,
      templateName,
      now,
      jobId,
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to create template";
    }

    const dbResponse = {
      jobInterviewTemplateId: rows[0].job_interview_template_id,
      jobInterviewTemplateName: rows[0].job_interview_template_name,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      jobId: rows[0].job_id,
    };

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const updateQuestionById = async (interviewQuestion) => {
  const { questionId, question, answerDuration, retakes, sequence } =
    interviewQuestion;

  const updateQuery = `UPDATE ${dbSchema}.interview_template_question
  SET template_question=$1, template_answer_duration=$2, 
    template_question_retakes=$3, updated_at=$4, sequence=$5
  WHERE template_question_id=$6 returning *; `;

  try {
    const { rows } = await dbQuery.query(updateQuery, [
      question,
      answerDuration,
      retakes,
      now,
      sequence,
      questionId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to update question";
    }
    const dbResponse = mappedQuestion(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const changeQuestionSequence = async (questionId, sequence) => {
  const updateQuery = `UPDATE ${dbSchema}.interview_template_question
    SET sequence = $1 WHERE template_question_id = $2 returning *;`;
  try {
    const { rows } = await dbQuery.query(updateQuery, [sequence, questionId]);

    if (!rows && rows.length == 0) {
      throw "Failed to Update Questions";
    }

    const dbResponse = mappedQuestion(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedQuestion = (raw) => {
  return {
    questionId: raw.template_question_id,
    question: raw.template_question,
    answerDuration: raw.template_answer_duration,
    retakes: raw.template_question_retakes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    templateId: raw.job_interview_template_id,
    sequence: raw.sequence,
  };
};

export {
  createQuestion,
  createInterviewTemplateQuestions,
  updateQuestionById,
  changeQuestionSequence,
};
