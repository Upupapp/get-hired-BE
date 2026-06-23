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
  updateQuestionById,
  // getInterviewsOfUser
} from '../services/interview.service'
import { getUserCompany } from './companiesController'

import env from '../env'

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
      return res.status(403).send('Forbidden')
    }
    const dbResponse = await getAllInterviews(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewsTemplatesOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      return res.status(403).send('Forbidden')
    }
    const dbResponse = await getAllInterviewTemplates(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewRecipientsByCompanyId = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      return res.status(403).send('Forbidden')
    }
    const dbResponse = await getInterviewRecipients(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getInterviewTemplateQuestions = async (req, res) => {
  const { templateId } = req.query
  try {
    const templateCompanyId = await getTemplateCompanyId(templateId)
    if (!templateCompanyId || !(await callerBelongsToCompany(req.user.uid, templateCompanyId))) {
      return res.status(403).send('Forbidden')
    }
    const dbResponse = await getTemplateQuestions(templateId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
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
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const saveQuestionTemplate = async (req, res) => {
  const { uid } = req.user
  const { companyId, jobId, templateName, interviewQuestions } = req.body
  try {
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
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const updateJobInterviewQuestion = async (req, res) => {
  try {
    const question = await updateQuestionById(req.body)
    successMessage.data = question
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
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
    errorMessage.error = 'ERROR: ' + error
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
