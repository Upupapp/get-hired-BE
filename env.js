import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV == "production";

export default {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  db_port: process.env.DB_PORT,
  secret: process.env.SECRET,
  instance: process.env.INSTANCE_NAME,
  dynamicDomain: process.env.DYNAMIC_DOMAIN,
  schema: process.env.SCHEMA_DEV,
};
