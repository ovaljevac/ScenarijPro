import { Sequelize } from "sequelize";
import { databaseConfig } from "./config/app-config.js";

export const sequelize = new Sequelize(
  databaseConfig.name,
  databaseConfig.user,
  databaseConfig.password,
  {
    host: databaseConfig.host,
    port: databaseConfig.port,
    dialect: databaseConfig.dialect,
    logging: false,
  }
);
