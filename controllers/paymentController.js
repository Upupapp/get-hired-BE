import crypto from "crypto";
import { successMessage, errorMessage, status } from "../helpers/status";
import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

import { createCompanySubscription } from "./subscriptionController";

const axios = require("axios").default;
const token = `${env.paymongo_sk}:''`;
const encodedToken = Buffer.from(token).toString("base64");

const createPaymongoLink = async (cartId, itemDesc, amount) => {
  const reqAmount = amount * 100;

  try {
    const options = {
      method: "POST",
      url: "https://api.paymongo.com/v1/links",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedToken}`,
      },
      data: {
        data: {
          attributes: {
            amount: reqAmount,
            description: itemDesc,
            remarks: "GetHired-" + cartId,
          },
        },
      },
    };

    const paymentLink = await axios.request(options);
    const { data } = paymentLink.data;
    return data;
  } catch (error) {
    throw error;
  }
};

const paymongoPaymentLink = async (req, res) => {
  const { cartId, itemDesc, amount } = req.body;

  try {
    const link = await createPaymongoLink(cartId, itemDesc, amount);
    successMessage.data = link;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[paymentController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const verifyPaymongoSignature = (req) => {
  const secret = env.paymongo_webhook_secret;
  if (!secret) return false;

  const sigHeader = req.headers["paymongo-signature"];
  if (!sigHeader) return false;

  const parts = {};
  sigHeader.split(",").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq > -1) parts[part.slice(0, eq)] = part.slice(eq + 1);
  });

  const timestamp = parts.t;
  if (!timestamp) return false;

  // Reject replayed requests older than 5 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 300) return false;

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const sig = parts.li || parts.te; // live sig preferred; fall back to test
  if (!sig) return false;

  try {
    const a = Buffer.from(sig.padEnd(expected.length, "0"), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

const paymongoWebhook = async (req, res) => {
  if (!verifyPaymongoSignature(req)) {
    console.warn("[paymentController] Webhook signature verification failed — request rejected");
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const { data } = req.body;
  const webhookEvent = data.attributes.type;

  try {
    if (webhookEvent == "link.payment.paid") {
      const webHookUrl = data.attributes.data;
      const { id, attributes } = webHookUrl;
      const { checkout_url, reference_number, remarks, status } = attributes;

      const insertTrans = await insertTransactionTable(
        id,
        checkout_url,
        reference_number
      );

      const cartId = remarks.slice(9);
      const updateMyCart = await updateCart(status, id, cartId);

      if (status == "paid") {
        const { payments } = data.attributes.data.attributes;
        const {
          amount,
          billing,
          currency,
          description,
          external_reference_number,
          fee,
          net_amount,
          source,
        } = payments[0].data.attributes;

        const { email, name, phone } = billing;
        const { type } = source;

        const updateQuery = `UPDATE ${dbSchema}.transaction_table
        SET gross_amount=$1, transaction_fee=$2, currency=$3, description=$4, status=$5, payment_id=$6, net_amount=$7, email=$8, name=$9, phone=$10, payment_type=$11, paid_at=$12
        WHERE reference_number=$13 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [
          amount / 100,
          fee / 100,
          currency,
          description,
          status,
          id,
          net_amount / 100,
          email,
          name,
          phone,
          type,
          new Date(),
          external_reference_number,
        ]);
        const output = {
          ...status,
        };

        const companyId = remarks.slice(0, 13);
        const subscriptionId = remarks.slice(14);


        const subs = await createCompanySubscription(companyId, subscriptionId);

        successMessage.data = output;
        return res.status(status.success).send(successMessage);
      }
    }  else if (webhookEvent == "payment.paid") {
        // QA11 FIX-03 LOGGING: removed console.log(webHookPaid) which wrote
        // PII (billing name, email, phone) to be_out.log in plaintext.
        const webHookPaid = data.attributes.data;
        console.log('[paymentController] payment.paid event received, id:', webHookPaid && webHookPaid.id);
        const { id, attributes } = webHookPaid;
        const {
            amount,
            currency,
            description,
            status,
            fee,
            external_reference_number,
            billing,
            net_amount,
            source,
        } = attributes;
        const { type } = source;
        const { email, name, phone } = billing;

        const updateQuery = `UPDATE ${dbSchema}.transaction_table
    SET gross_amount=$1, transaction_fee=$2, currency=$3, description=$4, status=$5, payment_id=$6, net_amount=$7, email=$8, name=$9, phone=$10, payment_type=$11, 
    paid_at=$12
    WHERE reference_number=$13 returning *;`;

        const { rows } = await dbQuery.query(updateQuery, [
            amount / 100,
            fee / 100,
            currency,
            description,
            status,
            id,
            net_amount / 100,
            email,
            name,
            phone,
            type,
            new Date(),
            external_reference_number,
        ]);

        const dbResponse = webhookEvent;
        successMessage.data = dbResponse;
        return res.status(status.success).send(successMessage);
    } else if (webhookEvent == "payment.failed") {
        // NOTIFY-FIX-01: removed console.log(data) which wrote the full
        // PayMongo webhook payload — including billing name, email, phone — to
        // be_out.log in plaintext. Log only the event type and payment id.
        console.log('[paymentController] payment.failed event received, id:', data && data.id);
        const dbResponse = webhookEvent;
        successMessage.data = dbResponse;
        return res.status(status.success).send(successMessage);
    }

    
  } catch (error) {
    console.error('[paymentController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const insertTransactionTable = async (id, checkout_url, reference_number) => {
  const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3) returning *`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      id,
      checkout_url,
      reference_number,
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to insert transaction";
    }

    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const updateCart = async (stat, transaction_id, cartId) => {
  try {
    const updateQuery = `UPDATE ${dbSchema}.cart_table
          SET status=$1, transaction_id=$2
          WHERE cart_id=$3 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      stat,
      transaction_id,
      cartId,
    ]);

    const dbResponse = rows[0];
    if (!dbResponse) {
      throw Error("Failed to Update Cart");
    }

    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

export { paymongoPaymentLink, paymongoWebhook, createPaymongoLink };
