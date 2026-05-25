import fs from "fs";

const runningInDocker = fs.existsSync("/.dockerenv");

export const appConfig = Object.freeze({
  port: 3000,
  environment: runningInDocker ? "production" : "development",
  corsOrigins: [],
  dbSync: "alter",
});

export const databaseConfig = Object.freeze({
  name: "scenarijpro",
  user: runningInDocker ? "scenarijpro" : "root",
  password: runningInDocker ? "scenarijpro_password" : "",
  host: runningInDocker ? "db" : "localhost",
  port: 3306,
  dialect: "mysql",
});
