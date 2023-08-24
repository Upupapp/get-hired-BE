import dbQuery from '../db/dbQuery'
import uploadInStorage from '../helpers/uploader'
import idGenerator from '../helpers/randomNumberForId'

import env from '../env'

const dbSchema = env.schema
const now = new Date()

import { groupList, contactList } from './contact.service'

import { listOfAllUniqueApplicantsByCompany } from './applicant.service'

const createQuestion = async (questionDetails, templateId) => {
  const { question, answerDuration, retakes, sequence } = questionDetails
  const insertQuery = `INSERT INTO ${dbSchema}.interview_template_question
  (template_question_id, template_question, template_answer_duration, template_question_retakes, job_interview_template_id, created_at, sequence)  
    VALUES($1, $2, $3, $4, $5, $6, $7) returning *;`

  const questionId = idGenerator(6, 'QN')

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      questionId,
      question,
      answerDuration,
      retakes,
      templateId,
      now,
      sequence
    ])

    if (!rows || rows.length == 0) {
      throw 'Failed to create Question'
    }

    const dbResponse = mappedQuestion(rows)
    return dbResponse
  } catch (error) {
    throw error
  }
}

const createInterviewTemplateQuestions = async (jobId, templateName) => {
  const templateId = idGenerator(6, 'ITPL')

  const insertQuery = `INSERT INTO ${dbSchema}.job_interview_template
  (job_interview_template_id, job_interview_template_name, created_at, job_id)
  VALUES($1, $2, $3, $4) returning *;`

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      templateId,
      templateName,
      now,
      jobId
    ])

    if (!rows || rows.length == 0) {
      throw 'Failed to create template'
    }

    const dbResponse = {
      jobInterviewTemplateId: rows[0].job_interview_template_id,
      jobInterviewTemplateName: rows[0].job_interview_template_name,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      jobId: rows[0].job_id
    }

    return dbResponse
  } catch (error) {
    throw error
  }
}

const updateQuestionById = async interviewQuestion => {
  const { questionId, question, answerDuration, retakes, sequence } =
    interviewQuestion

  const updateQuery = `UPDATE ${dbSchema}.interview_template_question
  SET template_question=$1, template_answer_duration=$2, 
    template_question_retakes=$3, updated_at=$4, sequence=$5
  WHERE template_question_id=$6 returning *; `

  try {
    const { rows } = await dbQuery.query(updateQuery, [
      question,
      answerDuration,
      retakes,
      now,
      sequence,
      questionId
    ])

    if (!rows && rows.length == 0) {
      throw 'Failed to update question'
    }
    const dbResponse = mappedQuestion(rows[0])
    return dbResponse
  } catch (error) {
    throw error
  }
}

const changeQuestionSequence = async (questionId, sequence) => {
  const updateQuery = `UPDATE ${dbSchema}.interview_template_question
    SET sequence = $1 WHERE template_question_id = $2 returning *;`
  try {
    const { rows } = await dbQuery.query(updateQuery, [sequence, questionId])

    if (!rows && rows.length == 0) {
      throw 'Failed to Update Questions'
    }

    const dbResponse = mappedQuestion(rows[0])
    return dbResponse
  } catch (error) {
    throw error
  }
}

const getTemplateQuestions = async interviewTemplateId => {
  const searchQuery = `select * from ${dbSchema}.interview_template_question itq 
        where itq.job_interview_template_id = $1 `

  try {
    const { rows } = await dbQuery.query(searchQuery, [interviewTemplateId])
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async row => mappedQuestion(row)))
    } else {
      return []
    }
  } catch (error) {
    throw error
  }
}

const getAllInterviews = async companyId => {
  const searchQuery = `select i.*, j.job_title from ${dbSchema}.group_interviews i
    left join ${dbSchema}.jobs j 
    on i.job_id = j.job_id 
    where i.company_id = $1`

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId])
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async row => mappedInterviews(row)))
    } else {
      return []
    }
  } catch (error) {
    throw error
  }
}

const getAllInterviewTemplates = async companyId => {
  const searchQuery = `select jit.*, j.job_title, 
        (select count(*) 
        from ${dbSchema}.interview_template_question itq 
        where itq.job_interview_template_id = jit.job_interview_template_id) as number_of_questions
    from ${dbSchema}.job_interview_template jit
    left join ${dbSchema}.jobs j 
    on jit.job_id = j.job_id 
    where j.company_id = $1`

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId])
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async row => mappedTemplateList(row)))
    } else {
      return []
    }
  } catch (error) {
    throw error
  }
}

const getInterviewRecipients = async companyId => {
  try {
    const dbResponse = {
      groupContact: await groupList(companyId),
      emailByJobPost: await listOfAllUniqueApplicantsByCompany(companyId),
      individualEmails: await contactList(companyId)
    }
    return dbResponse
  } catch (error) {
    throw error
  }
}

const createGroupInterview = async (groupInterview, userId) => {
  const insertQuery = `INSERT INTO ${dbSchema}.group_interviews
    (group_interview_id, group_interview_name, interview_template_question_id, job_id, group_ids, created_at, created_by, updated_at, recipients, company_id, external_job_link)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *`;

  const {
    groupInterviewName,
    interviewTemplateQuestionId,
    jobId,
    groupIds,
    recipients,
    companyId,
    externalJobLink,
    groups
  } = groupInterview

  try {
    const groupInterviewId = idGenerator(6, 'GRP-INT')
    const { rows } = await dbQuery.query(insertQuery, [
      groupInterviewId,
      groupInterviewName,
      interviewTemplateQuestionId,
      jobId,
      groupIds,
      now,
      userId,
      now,
      recipients,
      companyId,
      externalJobLink
    ])

    if (!rows || rows.length == 0) {
      throw 'Failed to save group interview'
    }

    if(recipients && recipients.length != 0) {
         // TODO get detail property, get email, send interview details
    }

    if(groups && groups.length != 0) {
        // TODO get detail property, get email, send interview details
    }

    const dbResponse = await Promise.all(
      rows.map(row => mappedGroupInterview(row))
    )
    return dbResponse
  } catch (error) {
    throw error
  }
}

const mappedGroupInterview = raw => {
  return {
    groupInterviewId: raw.group_interview_id,
    groupInterviewName: raw.group_interview_name,
    interviewTemplateQuestionId: raw.interview_template_question_id,
    // interviewTemplateQuestionName:raw.group_interview_id,
    jobId: raw.job_id,
    // jobName:raw.group_interview_id,
    externalJobLink: raw.external_job_link,
    recipients: raw.recipients,
    groupIds: raw.group_ids,
    createdAt: raw.created_at,
    createdBy: raw.created_by,
    updatedAt: raw.updated_at,
    companyId: raw.company_id
    // groups:raw.group_interview_id,
  }
}

const mappedTemplateList = raw => {
  const templateName =
    raw.job_interview_template_name == 'default' && raw.job_id
      ? `[default] - ${raw.job_title}`
      : raw.job_interview_template_name
  return {
    jobInterviewTemplateId: raw.job_interview_template_id,
    jobInterviewTemplateName: templateName,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    jobId: raw.job_id,
    numberOfQuestions: raw.number_of_questions,
    jobTitle: raw.job_title
  }
}

const mappedInterviews = raw => {
  return {
    groupInterviewId: raw.group_interview_id,
    groupInterviewName: raw.group_interview_name,
    interviewTemplateQuestionId: raw.interview_template_question_id,
    jobId: raw.job_id,
    jobName: raw.job_title,
    groupId: raw.group_id,
    groupRecipientName: raw.group_name,
    externalJobLink: raw.external_job_link,
    recipients: raw.recipients,
    createdAt: raw.created_at,
    createdBy: raw.created_by,
    updatedAt: raw.updated_at,
    companyId: raw.company_id
  }
}

const mappedQuestion = raw => {
  return {
    questionId: raw.template_question_id,
    question: raw.template_question,
    answerDuration: raw.template_answer_duration,
    retakes: raw.template_question_retakes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    templateId: raw.job_interview_template_id,
    sequence: raw.sequence
  }
}

export {
  createQuestion,
  createInterviewTemplateQuestions,
  updateQuestionById,
  changeQuestionSequence,
  getAllInterviews,
  getAllInterviewTemplates,
  getInterviewRecipients,
  getTemplateQuestions,
  createGroupInterview
}
