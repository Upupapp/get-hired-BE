import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";

import { insertLogs } from "../services/user.service";
import {
  getPublishedJobsWithinDateRange,
  getBasicJobList,
} from "./jobsController";
import { companyUsers } from "../services/company.service";
import { getAllVideoResponsesByJobIds } from "../services/job.service";

import { getUserCompany } from "./companiesController";
import { createPaymongoLink } from "./paymentController";
const dbSchema = env.schema;

const now = new Date();

const createPaymentIntent = async (req, res) => {
  const { subscriptionId, price } = req.body;

  const cartId = idGenerator(6, "SUBS");

  const insertQuery = `INSERT INTO ${dbSchema}.cart_table
    (cart_id, company_id, created_at, subscription_id, price)
    VALUES($1, $2, $3, $4, $5) returning *`;

  try {
    // Derive the company from the authenticated caller, not a
    // client-supplied email -- STITCH/security fix (GH-ACT-003/GH-ACT-009).
    const userCompany = await getUserCompany(req.user.uid);
    const companyId = userCompany && userCompany.companyId;

    if (!companyId) {
      throw "User not registered in any Company";
    }

    const amnt = parseFloat(price * 55).toFixed(2);
    console.log(amnt);

    const { rows } = await dbQuery.query(insertQuery, [
      cartId,
      companyId,
      now,
      subscriptionId,
      amnt,
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to create Cart";
    }

    const dbResponse = rows.map((row) => {
      return {
        cartId: row.cart_id,
        companyId: row.company_id,
        createdAt: row.created_at,
        subscriptionId: row.subscription_id,
        price: row.price,
      };
    });

    const link = await createPaymongoLink(
      dbResponse[0].cartId,
      dbResponse[0].companyId + "-" + dbResponse[0].subscriptionId,
      dbResponse[0].price
    );

    // TODO insert logs here

    if (!link) {
      throw "Failed to create payment link";
    }

    successMessage.data = link.attributes.checkout_url;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[subscriptionController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const createCompanySubscription = async (companyId, subscriptionId) => {
  const insertQuery = `INSERT INTO ${dbSchema}.companies_subscription
  (company_id, subscription_id, created_at, is_paid, payment_date)
  VALUES($1, $2, $3, $4, $5) returning *`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      companyId,
      subscriptionId,
      now,
      true,
      now,
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to create Subscription";
    }

    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

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
    console.error('[subscriptionController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getCompanySubscriptions = async (req, res) => {
  const { companyId } = req.query;
  try {
    // Confirm the caller actually belongs to companyId rather than
    // trusting the query param directly. STITCH/security fix (GH-ACT-009).
    const userCompany = await getUserCompany(req.user.uid);
    if (!userCompany || userCompany.companyId !== companyId) {
      return res.status(403).send("Forbidden");
    }
    const subList = await companySubscriptions(companyId);

    successMessage.data = subList;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[subscriptionController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const companySubscriptions = async (companyId) => {
  const seachrQuery = `select cs.company_id, cs.created_at, cs.is_paid, cs.payment_date, s.* from ${dbSchema}.companies_subscription cs
    left join ${dbSchema}."subscription" s 
    on s.subscription_id = cs.subscription_id 
    where cs.company_id = $1 order by created_at DESC`;

  try {
    const { rows } = await dbQuery.query(seachrQuery, [companyId]);

    if (!rows && rows.length == 0) {
      return null;
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

    return allSubs;
  } catch (error) {
    throw error;
  }
};

const getCompanyUsage = async (companyId, startRange, endRange) => {
  let videoCount = 0;

  try {
    const jobPost = await getBasicJobList(companyId, 2);

    if (jobPost.length != 0) {
      const jobIds = jobPost.map((job) => job.jobId);
      videoCount = await getAllVideoResponsesByJobIds(jobIds);
    }

    const users = await companyUsers(companyId);

    const dbResponse = {
      jobPostCount: jobPost.length,
      adminCount: users.length,
      videoResponseCount: videoCount.length,
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

export {
  getAllSubscription,
  getCompanySubscriptions,
  companySubscriptions,
  createPaymentIntent,
  createCompanySubscription
};
