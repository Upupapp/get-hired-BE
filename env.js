import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.is_staging;

let config = {};

if(isStaging == 'false') {
    config = {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV,
        user: process.env.DB_USER,
        host: isProduction ? `/cloudsql/${process.env.INSTANCE_NAME}` : process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        db_port: process.env.DB_PORT,
        secret: process.env.SECRET,
        bucket_url: process.env.BUCKET_URL,
        app_url: process.env.APP_URL ? process.env.APP_URL : `http://localhost:4200`,
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
        paymongo_sk: process.env.PAYMONGO_SK
    }
} else {
    config = {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV,
        user: process.env.DB_USER_DEV,
        host: process.env.DB_HOST_DEV,
        database: process.env.DB_DATABASE_DEV,
        password: process.env.DB_PASSWORD_DEV,
        db_port: process.env.DB_PORT,
        secret: process.env.SECRET,
        bucket_url: process.env.BUCKET_URL,
        app_url: process.env.APP_URL_DEV ? process.env.APP_URL : `http://localhost:4200`,
        mailerKey: process.env.MAILER_KEY,
        mailerSender: process.env.MAILER_SENDER,
        apiKey: process.env.API_KEY_DEV,
        authDomain: process.env.AUTH_DOMAIN_DEV,
        projectId: process.env.PROJECT_ID_DEV,
        storageBucket: process.env.STORAGE_BUCKET_DEV,
        messagingSenderId: process.env.SENDER_ID_DEV,
        appId: process.env.APP_ID_DEV,
        measurementId: process.env.MEASUREMENT_ID_DEV,
        schema: process.env.SCHEMA_DEV,
        paymongo_sk: process.env.PAYMONGO_SK_DEV
    }
}


export default {
    ...config
}
