/* eslint-disable camelcase */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../env";

/**
 * Hash Password Method
 * @param {string} password
 * @returns {string} returns hashed password
 */
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);
const hashPassword = (password) => bcrypt.hashSync(password, salt);

/**
 * comparePassword
 * @param {string} hashPassword
 * @param {string} password
 * @returns {Boolean} return True or False
 */
const comparePassword = (hashedPassword, password) => {
  return bcrypt.compareSync(password, hashedPassword);
};

/**
 * isValidEmail helper method
 * @param {string} email
 * @returns {Boolean} True or False
 */
// GETHIRED_QA_REMEDIATION V1 Phase 5 (EM-17, P2): neither this validator
// nor the database column (users/user_credentials.email is `varchar` with
// no length specified -- functionally unbounded in Postgres) enforced any
// maximum length at all, so an arbitrarily long "email" (500+ chars) still
// matched this loose regex and was accepted end to end. No other
// backend/provider/DB limit was found anywhere in this codebase to defer
// to, so this uses the conventional RFC 5321 practical maximum (254 chars)
// as the evidence-based fallback.
const MAX_EMAIL_LENGTH = 254;

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) return false;
  const regEx = /\S+@\S+\.\S+/;
  return regEx.test(email);
};

/**
 * validatePassword helper method
 * @param {string} password
 * @returns {Boolean} True or False
 */
const validatePassword = (password) => {
  if (password.length <= 5 || password === "") {
    return false;
  }
  return true;
};
/**
 * isEmpty helper method
 * @param {string, integer} input
 * @returns {Boolean} True or False
 */
const isEmpty = (input) => {
  if (input === undefined || input === "") {
    return true;
  }
  if (input.toString().replace(/\s/g, "").length) {
    return false;
  }
  return true;
};

/**
 * empty helper method
 * @param {string, integer} input
 * @returns {Boolean} True or False
 */
const empty = (input) => {
  if (input === undefined || input === "") {
    return true;
  }
};

/**
 * Generate Token
 * @param {string} id
 * @returns {string} token
 */

const generateUserToken = (uid, email, firstname, lastname, is_activated) => {
  try {
    const token = jwt.sign(
      {
        uid,
        email,
        firstname,
        lastname,
        is_activated,
      },
      env.secret,
      { expiresIn: "4h" }
    );

    return token;
  } catch (err) {
    console.log(err);
  }
};

export {
  hashPassword,
  comparePassword,
  isValidEmail,
  validatePassword,
  isEmpty,
  empty,
  generateUserToken,
};
