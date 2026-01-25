import { Sequelize } from "sequelize";

export const sequelize = new Sequelize("wt26", "root", "password", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});
