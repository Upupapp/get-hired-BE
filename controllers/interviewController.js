import { successMessage, errorMessage, status } from '../helpers/status'
import {
  getAllInterviews,
  getAllInterviewTemplates,
  getInterviewRecipients,
  getTemplateQuestions,
  getTemplateCompanyId,
  createGroupInterview,
  createInterviewTemplateQuestions,
  createQuestion,
  // getInterviewsOfUser
} from '../services/interview.service'
import { getUserCompany } from './companiesController'
import dbQuery from '../db/dbQuery'

import env from '../env'

const dbSchema = env.schema

const now = new Date()

// Confirms the authenticated caller actually belongs to companyId, rather
// than trusting the client-supplied query param directly.
// STITCH/security fix (GH-ACT-008 -- object-level authorization).
const callerBelongsToCompany = async (uid, companyId) => {
  const userCompany = await getUserCompany(uid)
  return userCompany && userCompany.companyId === companyId
}

const getAllInterviewsOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getAllInterviews(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewsTemplatesOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getAllInterviewTemplates(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewRecipientsByCompanyId = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getInterviewRecipients(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getInterviewTemplateQuestions = async (req, res) => {
  const { templateId } = req.query
  try {
    const templateCompanyId = await getTemplateCompanyId(templateId)
    if (!templateCompanyId || !(await callerBelongsToCompany(req.user.uid, templateCompanyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getTemplateQuestions(templateId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const saveGroupInterview = async (req, res) => {
  const { uid } = req.user

  try {
    const dbResponse = await createGroupInterview(req.body, uid)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const saveQuestionTemplate = async (req, res) => {
  const { uid } = req.user
  const { jobId, templateName, interviewQuestions } = req.body
  try {
    // QA9 FIX-4 BOLA: derive companyId from JWT, never from req.body —
    // any employer could otherwise create a template attributed to a
    // different company by supplying a spoofed companyId.
    const callerCompany = await getUserCompany(uid)
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const companyId = callerCompany.companyId

    let questionTemplate = null

    const template = await createInterviewTemplateQuestions(
      jobId,
      templateName,
      companyId,
      uid
    )

    if (interviewQuestions && interviewQuestions.length != 0) {
      const questionPromises = Promise.all(
        interviewQuestions.map(async (question, index) => {
          return await createQuestion(
            {
              ...question,
              sequence: question.sequence ? question.sequence : index + 1
            },
            template.jobInterviewTemplateId
          )
        })
      )

      questionTemplate = {
        ...template,
        interviewQuestions: await questionPromises
      }
    }

    successMessage.data = questionTemplate
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const updateJobInterviewQuestion = async (req, res) => {
  try {
    const { questionId } = req.body
    // QA9 FIX-5 BOLA: verify the question belongs to the caller's company
    // before allowing an update. interview_template_question has no company_id
    // directly — join through job_interview_template to check ownership.
    const callerCompany = await getUserCompany(req.user.uid)
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    // OPT-QA9-1: fold ownership check into the UPDATE WHERE via a subquery —
    // eliminates the separate SELECT round-trip (was 3 calls, now 2).
    // Zero rows returned = question not found OR company mismatch → 403.
    const updateResult = await dbQuery.query(
      `UPDATE ${dbSchema}.interview_template_question
         SET template_question=$1,
             template_answer_duration=$2,
             template_question_retakes=$3,
             updated_at=now(),
             sequence=$4
       WHERE template_question_id=$5
         AND job_interview_template_id IN (
               SELECT job_interview_template_id
               FROM ${dbSchema}.job_interview_template
               WHERE company_id=$6
             )
       RETURNING *`,
      [
        req.body.question,
        req.body.answerDuration,
        req.body.retakes,
        req.body.sequence,
        questionId,
        callerCompany.companyId,
      ]
    )
    if (!updateResult.rows || updateResult.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }

    // Map the row directly from the UPDATE RETURNING result — no second DB call.
    const { rows: [raw] } = updateResult
    const question = {
      questionId: raw.template_question_id,
      question: raw.template_question,
      answerDuration: raw.template_answer_duration,
      retakes: raw.template_question_retakes,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      templateId: raw.job_interview_template_id,
      sequence: raw.sequence,
    }
    successMessage.data = question
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getListByUser = async (req, res) => {
  const { uid } = req.user
  try {
    // const dbResponse = await getInterviewsOfUser(uid)
    successMessage.data = null
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

export {
  getAllInterviewsOfCompanies,
  getAllInterviewsTemplatesOfCompanies,
  getAllInterviewRecipientsByCompanyId,
  getInterviewTemplateQuestions,
  saveGroupInterview,
  saveQuestionTemplate,
  updateJobInterviewQuestion,
  getListByUser
}
