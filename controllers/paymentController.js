import { successMessage, errorMessage, status } from "../helpers/status";
import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;
const now = new Date();

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
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const paymongoWebhook = async (req, res) => {
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
          now,
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
        console.log("I am payment.paid");
        const webHookPaid = data.attributes.data;
        console.log(webHookPaid);
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
            now,
            external_reference_number,
        ]);

        const dbResponse = webhookEvent;
        successMessage.data = dbResponse;
        return res.status(status.success).send(successMessage);
    } else if (webhookEvent == "payment.failed") {
        console.log("Payment Failed");
        console.log(data);
        const dbResponse = webhookEvent;
        successMessage.data = dbResponse;
        return res.status(status.success).send(successMessage);
    }

    
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
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
