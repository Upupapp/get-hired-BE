import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.is_staging;

let config = {};

if (isStaging == "false") {
  config = {
    projectName: process.env.PROJECT_NAME,
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV,
    user: process.env.DB_USER,
    host: isProduction
      ? `/cloudsql/${process.env.INSTANCE_NAME}`
      : process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    db_port: process.env.DB_PORT,
    secret: process.env.SECRET,
    bucket_url: process.env.BUCKET_URL,
    app_url: process.env.APP_URL
      ? process.env.APP_URL
      : `http://localhost:4200`,
    mailerKey: process.env.MAILER_KEY,
    mailerSender: process.env.MAILER_SENDER,
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID,
    schema: process.env.SCHEMA,
    paymongo_sk: process.env.PAYMONGO_SK,
  };
} else {
  console.log(process.env.PROJECT_NAME_DEV)

  switch (process.env.PROJECT_NAME_DEV) {
    case "jobhunt":
      config = {
        projectName: process.env.PROJECT_NAME_DEV,
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV,
        user: process.env.DB_USER_DEV,
        host: isProduction
          ? `/cloudsql/${process.env.INSTANCE_NAME_DEV}`
          : process.env.DB_HOST_DEVs,
        database: process.env.DB_DATABASE_DEV,
        password: process.env.DB_PASSWORD_DEV,
        db_port: process.env.DB_PORT,
        secret: process.env.SECRET,
        bucket_url: process.env.BUCKET_URL,
        app_url: process.env.APP_URL_DEV
          ? process.env.APP_URL
          : `http://localhost:4200`,
        mailerKey: process.env.MAILER_KEY_DEV,
        mailerSender: process.env.MAILER_SENDER_DEV,
        apiKey: process.env.API_KEY_DEV,
        authDomain: process.env.AUTH_DOMAIN_DEV,
        projectId: process.env.PROJECT_ID_DEV,
        storageBucket: process.env.STORAGE_BUCKET_DEV,
        messagingSenderId: process.env.SENDER_ID_DEV,
        appId: process.env.APP_ID_DEV,
        measurementId: process.env.MEASUREMENT_ID_DEV,
        schema: process.env.SCHEMA_DEV,
        paymongo_sk: process.env.PAYMONGO_SK_DEV,
      };
      break;
    case "eucannajobs":
      config = {
        projectName: process.env.PROJECT_NAME_EUCANNAJOBS,
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV,
        user: process.env.DB_USER_EUCANNAJOBS,
        host: process.env.DB_HOST_EUCANNAJOBSs,
        database: process.env.DB_DATABASE_EUCANNAJOBS,
        password: process.env.DB_PASSWORD_EUCANNAJOBS,
        db_port: process.env.DB_PORT,
        secret: process.env.SECRET,
        bucket_url: process.env.BUCKET_URL,
        app_url: process.env.APP_URL_EUCANNAJOBS
          ? process.env.APP_URL
          : `http://localhost:4200`,
        mailerKey: process.env.MAILER_KEY_EUCANNAJOBS,
        mailerSender: process.env.MAILER_SENDER_EUCANNAJOBS,
        apiKey: process.env.API_KEY_EUCANNAJOBS,
        authDomain: process.env.AUTH_DOMAIN_EUCANNAJOBS,
        projectId: process.env.PROJECT_ID_EUCANNAJOBS,
        storageBucket: process.env.STORAGE_BUCKET_EUCANNAJOBS,
        messagingSenderId: process.env.SENDER_ID_EUCANNAJOBS,
        appId: process.env.APP_ID_EUCANNAJOBS,
        measurementId: process.env.MEASUREMENT_ID_EUCANNAJOBS,
        schema: process.env.SCHEMA_EUCANNAJOBS,
        paymongo_sk: process.env.PAYMONGO_SK_EUCANNAJOBS,
      };
      break;
  }
}

export default {
  ...config,
};
