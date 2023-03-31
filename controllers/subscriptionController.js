import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";

import { insertLogs } from "../services/user.service";
import { getPublishedJobsWithinDateRange } from "./jobsController";
import { companyUsers } from "../services/company.service";
import { getAllVideoResponsesByJobIds } from '../services/job.service';

const dbSchema = env.schema;
const now = Date.now();

const getAllSubscription = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}."subscription"`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse =
      !rows || rows.length == 0
        ? []
        : rows.map((row) => mappedSubscription(row));
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getCompanySubscriptions = async (req, res) => {
  const { companyId } = req.query;
  const seachrQuery = `select cs.company_id, cs.created_at, cs.is_paid, cs.payment_date, s.* from ${dbSchema}.companies_subscription cs
left join ${dbSchema}."subscription" s 
on s.subscription_id = cs.subscription_id 
where cs.company_id = $1 order by created_at DESC`;

  try {
    const { rows } = await dbQuery.query(seachrQuery, [companyId]);

    if (!rows || rows.length == 0) {
      throw "User does not have Subscription";
    }

    const formattedSubs = Promise.all(
      rows.map(async (row) => {
        const endAt = getEndDate(
          row.created_at,
          row.subscription_id == 1 ? 7 : 30
        );
        const count = await getCompanyUsage(companyId, row.created_at, endAt);
        return {
          ...mappedUserSubscription(row),
          ...mappedSubscription(row),
          ...count,
          endAt,
        };
      })
    );

    const allSubs = await formattedSubs;

    successMessage.data = allSubs;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getCompanyUsage = async (companyId, startRange, endRange) => {
  let videoCount = 0;

  try {
    const jobPost = await getPublishedJobsWithinDateRange(
      companyId,
      startRange,
      endRange
    );

    if(jobPost.length != 0) {
        const jobIds = jobPost.map(job => job.jobId);
        videoCount = await getAllVideoResponsesByJobIds(jobIds)

    }

    const users = await companyUsers(companyId);

    const dbResponse = {
      jobPostCount: jobPost.length,
      adminCount: users.length,
      videoResponseCount: videoCount.length
    };
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getEndDate = (startDate, numberOfDays) => {
  return new Date(startDate.getTime() + numberOfDays * 24 * 60 * 60 * 1000);
};

const mappedUserSubscription = (raw) => {
  return {
    companyId: raw.company_id,
    createdAt: raw.created_at,
    isPaid: raw.is_paid,
    paymentDate: raw.payment_date,
  };
};

const mappedSubscription = (raw) => {
  return {
    subscriptionId: raw.subscription_id,
    jobPost: raw.job_post,
    admin: raw.admin,
    videoResponse: raw.video_response,
    withCustomerCare: raw.with_customer_care,
    price: raw.price,
    priceCurrency: raw.price_currency,
    subscriptionName: raw.subscription_name,
    paymentOccurence: raw.payment_occurence,
  };
};

export { getAllSubscription, getCompanySubscriptions };
