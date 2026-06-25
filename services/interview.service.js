import dbQuery from '../db/dbQuery'
import idGenerator from '../helpers/randomNumberForId'

import env from '../env'

const dbSchema = env.schema

import { groupList, contactList, checkContacts } from './contact.service'

import { listOfAllUniqueApplicantsByCompany } from './applicant.service'
import { getCompanyNameByCompanyId } from './company.service'
import { send } from '../helpers/mailer'

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
      new Date(),
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

const createInterviewTemplateQuestions = async (jobId, templateName, companyId = null, createdBy = null) => {
  const templateId = idGenerator(6, 'ITPL')

  const insertQuery = `INSERT INTO ${dbSchema}.job_interview_template
  (job_interview_template_id, job_interview_template_name, created_at, job_id, company_id, created_by)
  VALUES($1, $2, $3, $4, $5, $6) returning *;`

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      templateId,
      templateName,
      new Date(),
      jobId,
      companyId,
      createdBy
    ])

    if (!rows || rows.length == 0) {
      throw 'Failed to create template'
    }

    const dbResponse = mappedQuestionTemplate(rows[0]);

    return dbResponse
  } catch (error) {
    throw error
  }
}

// F-08 child-table hardening: updateQuestionById is always called from
// interviewQuestionsUpdate, which is itself called only after the parent
// updateJob ownership check succeeds (WHERE job_id=$19 AND company_id=$20).
// That gate provides the primary protection. As an additional defence-in-depth
// layer, if a companyId is supplied here (passed through from the controller
// caller scope), the UPDATE is further scoped via a subquery that joins back
// through job_interview_template.company_id. When companyId is null (legacy
// callers that have no company context), the plain WHERE falls back to
// question_id only — which is acceptable because those callers are already
// behind the parent ownership gate.
const updateQuestionById = async (interviewQuestion, companyId = null) => {
  const { questionId, question, answerDuration, retakes, sequence } =
    interviewQuestion

  // Build the WHERE clause: if companyId provided, join through template for
  // an additional ownership scope; otherwise use question_id only.
  let updateQuery
  let params
  if (companyId) {
    updateQuery = `UPDATE ${dbSchema}.interview_template_question itq
      SET template_question=$1, template_answer_duration=$2,
        template_question_retakes=$3, updated_at=$4, sequence=$5
      WHERE itq.template_question_id=$6
        AND itq.job_interview_template_id IN (
          SELECT job_interview_template_id
          FROM ${dbSchema}.job_interview_template
          WHERE company_id=$7
        )
      returning *;`
    params = [question, answerDuration, retakes, new Date(), sequence, questionId, companyId]
  } else {
    updateQuery = `UPDATE ${dbSchema}.interview_template_question
      SET template_question=$1, template_answer_duration=$2,
        template_question_retakes=$3, updated_at=$4, sequence=$5
      WHERE template_question_id=$6 returning *;`
    params = [question, answerDuration, retakes, new Date(), sequence, questionId]
  }

  try {
    const { rows } = await dbQuery.query(updateQuery, params)

    if (!rows || rows.length == 0) {
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

// Used to authorize getInterviewTemplateQuestions by company ownership
// rather than trusting templateId alone. STITCH/security fix (GH-ACT-008).
const getTemplateCompanyId = async interviewTemplateId => {
  const searchQuery = `select company_id from ${dbSchema}.job_interview_template
    where job_interview_template_id = $1`

  try {
    const { rows } = await dbQuery.query(searchQuery, [interviewTemplateId])
    return rows && rows.length != 0 ? rows[0].company_id : null
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
      return await Promise.all(
        rows.map(async row => await mappedGroupInterview(row))
      )
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
    where j.company_id = $1 or jit.company_id = $1 order by jit.created_at DESC`

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
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *`

  let thisIsRecipient = []
  let recipients2 = []
  let recipientsList = []
  let numberOfRecipient = 0
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
      new Date(),
      userId,
      new Date(),
      recipients,
      companyId,
      externalJobLink
    ])

    if (!rows || rows.length == 0) {
      throw 'Failed to save group interview'
    }

    if (recipients && recipients.length != 0) {
      recipientsList = recipients
    }

    if (groups && groups.length != 0) {
      const recipeintsFromGroups = getEmailFromNestedGroupDetails(groups)
      recipients2 = recipeintsFromGroups.flat()
    }

    const removeDuplicates = merge(recipientsList, recipients2)
    const companyName = await getCompanyNameByCompanyId(companyId)
    let multiple = new Promise((resolve, reject) => {
      removeDuplicates.forEach(async recipient => {
        const sendEmail = await sendEmailInterview(recipient, companyName)

        thisIsRecipient.push(recipient)
        if (thisIsRecipient.length == removeDuplicates.length) resolve()
      })
    })
    multiple.then(() => {
      numberOfRecipient = thisIsRecipient.length
    })

    const dbResponse = await Promise.all(
      rows.map(async row => {
        const mappedGrouped = await mappedGroupInterview(row)
        return {
          ...mappedGrouped,
          numberOfRecipient
        }
      })
    )
    return dbResponse
  } catch (error) {
    throw error
  }
}

const sendEmailInterview = async (email, companyName) => {
  const userData = {
    company_name: companyName,
    app_url: `${env.app_url}/signup`
  }
  send(email, 'interview', userData)
  return { msg: 'Email has been sent', link: `${env.app_url}/signup` }
}

function merge (array1, array2) {
  let arrayMerge = array1.concat(array2)
  return arrayMerge.filter((item, index) => arrayMerge.indexOf(item) == index)
}

const getGroupRecipients = async groupIds => {
  try {
    let groups = []
    if (groupIds && groupIds.length != 0) {
      return (groups = await Promise.all(
        groupIds.map(async id => await checkContacts({ group_id: id }))
      ))
    }

    return groups
  } catch (error) {
    throw error
  }
}

const getEmailFromNestedGroupDetails = groupArr => {
  return groupArr.map(group => {
    return group.details.map(detail => detail.email)
  })
}

const mappedQuestionTemplate = raw => {
  return {
    jobInterviewTemplateId: raw.job_interview_template_id,
    jobInterviewTemplateName: raw.job_interview_template_name,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    jobId: raw.job_id,
    companyId: raw.company_id
  }
}

const mappedGroupInterview = async raw => {
  const group = await getGroupRecipients(raw.group_ids)
  const recipeintsFromGroups = getEmailFromNestedGroupDetails(group)
  const recipients2 = recipeintsFromGroups.flat()

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
    companyId: raw.company_id,
    groups: recipeintsFromGroups,
    numberOfRecipient: merge(raw.recipients, recipients2).length,
    recipientOpened: [], // TODO
    recipientAnswered: [] // TODO
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
  createGroupInterview,
  getTemplateCompanyId
}
