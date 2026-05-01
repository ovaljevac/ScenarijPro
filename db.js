import { Sequelize } from "sequelize";
import { requireEnv } from "./config/env.js";

export const sequelize = new Sequelize(
  requireEnv("DB_NAME"),
  requireEnv("DB_USER"),
  requireEnv("DB_PASSWORD"),
  {
  host: requireEnv("DB_HOST"),
  dialect: requireEnv("DB_DIALECT"),
  logging: false,
  }
);
