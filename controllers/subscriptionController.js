import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";

import { insertLogs } from "../services/user.service";
import {
  getPublishedJobsWithinDateRange,
  getBasicJobList,
} from "./jobsController";
import { companyUsers } from "../services/company.service";
import { getAllVideoResponsesByJobIds } from "../services/job.service";

import { getUserCompanyForRequest } from "./companiesController";
import { createPaymongoLink } from "./paymentController";
const dbSchema = env.schema;


const createPaymentIntent = async (req, res) => {
  const { subscriptionId, price } = req.body;

  const cartId = idGenerator(6, "SUBS");

  const insertQuery = `INSERT INTO ${dbSchema}.cart_table
    (cart_id, company_id, created_at, subscription_id, price)
    VALUES($1, $2, $3, $4, $5) returning *`;

  try {
    // Derive the company from the authenticated caller, not a
    // client-supplied email -- STITCH/security fix (GH-ACT-003/GH-ACT-009).
    const userCompany = await getUserCompanyForRequest(req, req.user.uid);
    const companyId = userCompany && userCompany.companyId;

    if (!companyId) {
      throw "User not registered in any Company";
    }

    const amnt = parseFloat(price * 55).toFixed(2);

    const { rows } = await dbQuery.query(insertQuery, [
      cartId,
      companyId,
      new Date(),
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

    return res.status(status.success).json(successResponse(link.attributes.checkout_url));
  } catch (error) {
    console.error('[subscriptionController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const createCompanySubscription = async (companyId, subscriptionId) => {
  // NOTIFY-P1 FIX: idempotency guard — check before insert to prevent duplicate
  // subscription rows from PayMongo webhook retries.
  // A unique DB constraint on (company_id, subscription_id) would give stronger
  // concurrency safety; apply db/payment_webhook_events_ddl.sql step 5 for that.
  const checkQuery = `SELECT company_id FROM ${dbSchema}.companies_subscription
    WHERE company_id = $1 AND subscription_id = $2 LIMIT 1`;

  try {
    const existing = await dbQuery.query(checkQuery, [companyId, subscriptionId]);
    if (existing.rows && existing.rows.length > 0) {
      console.log('[subscriptionController] PAYMONGO_SUBSCRIPTION_DUPLICATE_NOOP: already activated');
      return existing.rows[0];
    }
  } catch (checkErr) {
    // Non-blocking — if check fails, proceed to INSERT attempt
    console.warn('[subscriptionController] createCompanySubscription existence check error:', checkErr.code);
  }

  const insertQuery = `INSERT INTO ${dbSchema}.companies_subscription
  (company_id, subscription_id, created_at, is_paid, payment_date)
  VALUES($1, $2, $3, $4, $5) returning *`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      companyId,
      subscriptionId,
      new Date(),
      true,
      new Date(),
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to create Subscription";
    }

    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    // 23505 = duplicate key: race condition between check and insert.
    // Treat as already-activated — idempotent no-op.
    if (error.code === '23505') {
      console.log('[subscriptionController] PAYMONGO_SUBSCRIPTION_DUPLICATE_NOOP: race condition duplicate, already activated');
      return null;
    }
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
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[subscriptionController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getCompanySubscriptions = async (req, res) => {
  const { companyId } = req.query;
  try {
    // Confirm the caller actually belongs to companyId rather than
    // trusting the query param directly. STITCH/security fix (GH-ACT-009).
    const userCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (!userCompany || userCompany.companyId !== companyId) {
      return res.status(403).send("Forbidden");
    }
    const subList = await companySubscriptions(companyId);

    return res.status(status.success).json(successResponse(subList));
  } catch (error) {
    console.error('[subscriptionController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

// ---------------------------------------------------------------------------
// PlanOS V6: /api/recruiter/subscription-summary
// Returns EmployerSubscriptionSummary shape for the billing command center.
// Scoped entirely to the authenticated caller's company — never trusts
// any client-supplied company/subscription ID.
// No ?. or ?? — uses && / || guards (Acorn 6/7 compatibility).
// ---------------------------------------------------------------------------
const getSubscriptionSummary = async (req, res) => {
  try {
    const uid = req.user && req.user.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userCompany = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(userCompany) || !userCompany || !userCompany.companyId) {
      return res.status(403).json({ success: false, message: 'No company context.' });
    }

    const companyId = userCompany.companyId;

    // --- Company details ---
    const companyRow = await (function() {
      const q = `SELECT company_id, company_name, company_logo, company_email
        FROM ${dbSchema}.companies WHERE company_id = $1 LIMIT 1`;
      return dbQuery.query(q, [companyId]);
    })();

    const companyData = (companyRow.rows && companyRow.rows[0]) || {};

    // --- Current subscription ---
    const subRows = await (function() {
      const q = `SELECT cs.company_id, cs.created_at, cs.is_paid, cs.payment_date,
        s.subscription_id, s.job_post, s.admin, s.video_response,
        s.with_customer_care, s.price, s.price_currency,
        s.subscription_name, s.payment_occurence
        FROM ${dbSchema}.companies_subscription cs
        LEFT JOIN ${dbSchema}."subscription" s ON s.subscription_id = cs.subscription_id
        WHERE cs.company_id = $1
        ORDER BY cs.created_at DESC
        LIMIT 1`;
      return dbQuery.query(q, [companyId]);
    })();

    const latestSub = (subRows.rows && subRows.rows[0]) || null;

    // --- All available plans ---
    const allPlansRows = await (function() {
      const q = `SELECT * FROM ${dbSchema}."subscription" ORDER BY subscription_id ASC`;
      return dbQuery.query(q, []);
    })();
    const allPlans = (allPlansRows.rows) || [];

    // --- Usage ---
    let jobPostCount = 0;
    let adminCount = 0;
    let videoResponseCount = 0;

    try {
      const jobPost = await getBasicJobList(companyId, 2);
      jobPostCount = (jobPost && jobPost.length) || 0;

      if (jobPostCount > 0) {
        const jobIds = jobPost.map(function(j) { return j.jobId; });
        const videoRows = await getAllVideoResponsesByJobIds(jobIds);
        videoResponseCount = (videoRows && videoRows.length) || 0;
      }

      const users = await companyUsers(companyId);
      adminCount = (users && users.length) || 0;
    } catch (usageErr) {
      console.warn('[subscriptionController] getSubscriptionSummary usage error (non-fatal):', usageErr && usageErr.message);
    }

    // --- Derive plan status ---
    var planStatus = 'none';
    var planCode = null;
    var planName = 'No plan';
    var planPeriodEnd = null;
    var planStartedAt = null;
    var planHealth = 'unknown';
    var priceAmount = null;
    var priceCurrency = null;
    var paymentProvider = 'paymongo';

    if (latestSub) {
      planCode = latestSub.subscription_id === 1 ? 'free_trial' :
                 latestSub.subscription_id === 2 ? 'starter' :
                 latestSub.subscription_id === 3 ? 'growth' :
                 latestSub.subscription_id === 4 ? 'premium' : 'enterprise';

      planName = (latestSub.subscription_name) || 'Plan';
      priceAmount = latestSub.price || 0;
      priceCurrency = latestSub.price_currency || 'PHP';

      var daysForPlan = latestSub.subscription_id === 1 ? 7
                       : latestSub.payment_occurence === 'annually' ? 365
                       : 30;
      var createdAt = latestSub.created_at ? new Date(latestSub.created_at) : null;
      planStartedAt = createdAt ? createdAt.toISOString() : null;
      planPeriodEnd = createdAt
        ? new Date(createdAt.getTime() + daysForPlan * 24 * 60 * 60 * 1000).toISOString()
        : null;

      var now = new Date();
      var endDate = planPeriodEnd ? new Date(planPeriodEnd) : null;

      if (latestSub.subscription_id === 1) {
        // Free trial
        if (endDate && now > endDate) {
          planStatus = 'expired';
          planHealth = 'action_needed';
        } else if (endDate && (endDate - now) < 2 * 24 * 60 * 60 * 1000) {
          planStatus = 'trial_ending_soon';
          planHealth = 'action_needed';
        } else {
          planStatus = 'trialing';
          planHealth = 'healthy';
        }
      } else {
        // Paid plan
        if (!latestSub.is_paid) {
          planStatus = 'pending';
          planHealth = 'payment_issue';
        } else if (endDate && now > endDate) {
          planStatus = 'expired';
          planHealth = 'action_needed';
        } else {
          planStatus = 'active';
          planHealth = 'healthy';
        }
        paymentProvider = 'paymongo';
      }
    }

    // --- Job post entitlement ---
    var jobPostIncluded = null;
    var videoResponseIncluded = null;
    var adminIncluded = null;
    var videoResponseBool = false;

    if (latestSub) {
      jobPostIncluded = latestSub.job_post < 0 ? 'unlimited' : latestSub.job_post;
      adminIncluded = latestSub.admin < 0 ? 'unlimited' : latestSub.admin;
      // video_response column may be boolean (legacy) or numeric. Boolean true/false
      // maps to a BooleanEntitlement (null = not included), not a numeric meter.
      var vrRaw = latestSub.video_response;
      if (typeof vrRaw === 'boolean') {
        videoResponseIncluded = vrRaw ? null : null; // boolean: no numeric limit tracked; FE reads videoResponseBool
        videoResponseBool = vrRaw;
      } else {
        videoResponseIncluded = vrRaw < 0 ? 'unlimited' : (vrRaw || null);
        videoResponseBool = !!(vrRaw > 0 || vrRaw < 0);
      }
    }

    // --- Billing actions ---
    var billingActions = [];
    if (planStatus === 'none' || planStatus === 'expired') {
      billingActions.push({ type: 'choose_plan', label: 'Choose a plan', priority: 'high' });
    } else if (planStatus === 'trialing' || planStatus === 'trial_ending_soon') {
      billingActions.push({ type: 'upgrade', label: 'Upgrade now', priority: 'high' });
    } else if (planStatus === 'payment_failed' || planStatus === 'past_due') {
      billingActions.push({ type: 'fix_payment', label: 'Fix payment', priority: 'high' });
    } else if (planStatus === 'active') {
      billingActions.push({ type: 'upgrade', label: 'Manage plan', priority: 'medium' });
    }
    billingActions.push({ type: 'contact_support', label: 'Contact support', priority: 'low' });

    // --- Available plans mapped ---
    var planOrder = ['free_trial', 'starter', 'growth', 'premium', 'enterprise'];
    var currentPlanIdx = planOrder.indexOf(planCode);

    var availablePlans = allPlans.map(function(p) {
      var code = p.subscription_id === 1 ? 'free_trial' :
                 p.subscription_id === 2 ? 'starter' :
                 p.subscription_id === 3 ? 'growth' :
                 p.subscription_id === 4 ? 'premium' : 'enterprise';
      var isCurrent = code === planCode;
      var targetIdx = planOrder.indexOf(code);
      var ctaAction = isCurrent ? 'current' :
                      code === 'enterprise' ? 'contact_sales' :
                      (targetIdx > currentPlanIdx) ? 'upgrade' : 'downgrade';

      return {
        id: p.subscription_id,
        code: code,
        name: p.subscription_name || code,
        description: '',
        audience: code === 'free_trial' ? 'Try GetHired with limited hiring tools.' :
                  code === 'starter' ? 'For small employers hiring occasionally.' :
                  code === 'growth' ? 'For active hiring teams.' :
                  code === 'premium' ? 'For frequent hiring and larger teams.' :
                  'For large employers and custom hiring operations.',
        priceMonthly: p.price || 0,
        currency: p.price_currency || 'PHP',
        recommended: p.subscription_id === 3,
        current: isCurrent,
        trial: p.subscription_id === 1,
        enterprise: p.subscription_id >= 5,
        features: [],
        limits: {
          activeJobs: p.job_post < 0 ? 'unlimited' : p.job_post,
          adminUsers: p.admin < 0 ? 'unlimited' : p.admin,
          videoResponses: p.video_response < 0 ? 'unlimited' : p.video_response,
        },
        ctaLabel: isCurrent ? 'Current plan' :
                  code === 'enterprise' ? 'Contact sales' :
                  (targetIdx > currentPlanIdx) ? 'Upgrade' : 'Switch plan',
        ctaAction: ctaAction,
      };
    });

    // --- Assemble summary ---
    var summary = {
      company: {
        id: companyData.company_id || companyId,
        name: companyData.company_name || '',
        logoUrl: companyData.company_logo || null,
        email: companyData.company_email || null,
      },
      currentPlan: {
        id: latestSub ? (latestSub.subscription_id || null) : null,
        code: planCode,
        name: planName,
        status: planStatus,
        billingInterval: 'monthly',
        currency: priceCurrency,
        priceAmount: priceAmount,
        startedAt: planStartedAt,
        currentPeriodStart: planStartedAt,
        currentPeriodEnd: planPeriodEnd,
        // trialEndsAt = period end for trial plans; null for paid plans.
        trialEndsAt: (planStatus === 'trialing' || planStatus === 'trial_ending_soon') ? planPeriodEnd : null,
        cancelAtPeriodEnd: false,
        paymentProvider: paymentProvider,
        planHealth: planHealth,
      },
      usage: {
        recruitment: {
          activeJobs: {
            used: jobPostCount,
            included: jobPostIncluded,
            period: 'month',
          },
          adminUsers: {
            used: adminCount,
            included: adminIncluded,
            period: 'plan',
          },
          videoResponses: {
            used: videoResponseCount,
            // When DB column is boolean, included is null — FE falls back to
            // videoResponseBool to decide whether to show "Included"/"Not included".
            included: videoResponseIncluded,
            booleanIncluded: videoResponseBool,
            period: 'plan',
          },
          interviewQuestions: { included: true },
          messaging: { included: !!(latestSub && latestSub.subscription_id >= 3) },
        },
        branding: {
          companyPage: { included: true },
          publicProfile: { included: !!(latestSub && latestSub.subscription_id >= 3) },
          logoAndBanner: { included: !!(latestSub && latestSub.subscription_id >= 2) },
        },
      },
      recommendedPlan: planCode !== 'growth' ? {
        planCode: 'growth',
        planName: 'Growth',
        reason: 'Best fit for growing teams.',
        benefits: ['15 active jobs', '3 admin users', 'Video responses', 'Public profile'],
        ctaLabel: 'Upgrade to Growth',
      } : null,
      availablePlans: availablePlans,
      invoices: [],
      paymentMethod: null,
      billingActions: billingActions,
    };

    // --- Invoices from companies_subscription history ---
    try {
      const invoiceRows = await (function() {
        const q = `SELECT cs.company_id, cs.created_at, cs.is_paid, cs.payment_date,
          s.subscription_id, s.subscription_name, s.price, s.price_currency
          FROM ${dbSchema}.companies_subscription cs
          LEFT JOIN ${dbSchema}."subscription" s ON s.subscription_id = cs.subscription_id
          WHERE cs.company_id = $1
          ORDER BY cs.created_at DESC`;
        return dbQuery.query(q, [companyId]);
      })();

      summary.invoices = ((invoiceRows.rows) || []).map(function(inv) {
        var isPaid = inv.is_paid;
        var invStatus = isPaid ? 'paid' : 'pending';
        if (inv.subscription_id === 1) { invStatus = 'trial'; }

        return {
          id: (inv.company_id || '') + '-' + (inv.created_at ? new Date(inv.created_at).getTime() : 0),
          date: inv.payment_date ? new Date(inv.payment_date).toISOString() : (inv.created_at ? new Date(inv.created_at).toISOString() : new Date().toISOString()),
          description: (inv.subscription_name || 'Subscription') + ' plan',
          planName: inv.subscription_name || null,
          amount: inv.price || 0,
          currency: inv.price_currency || 'PHP',
          status: invStatus,
          paymentMethodLabel: null,
          receiptUrl: null,
        };
      });
    } catch (invErr) {
      console.warn('[subscriptionController] invoice fetch error (non-fatal):', invErr && invErr.message);
    }

    return res.status(status.success).json(successResponse(summary));
  } catch (err) {
    console.error('[subscriptionController] getSubscriptionSummary error:', err);
    return res.status(status.error).json(errorResponse('Could not load subscription summary.'));
  }
};

export {
  getAllSubscription,
  getCompanySubscriptions,
  companySubscriptions,
  createPaymentIntent,
  createCompanySubscription,
  getSubscriptionSummary,
};
