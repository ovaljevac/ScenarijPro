import fs from "fs";

const runningInDocker = fs.existsSync("/.dockerenv");

export const appConfig = Object.freeze({
  port: 3000,
  environment: runningInDocker ? "production" : "development",
  corsOrigins: [],
  dbSync: "alter",
});

export const databaseConfig = Object.freeze({
  name: process.env.DB_NAME ?? "scenarijpro",
  user: process.env.DB_USER ?? (runningInDocker ? "scenarijpro" : "root"),
  password: process.env.DB_PASSWORD ?? (runningInDocker ? "scenarijpro_password" : ""),
  host: process.env.DB_HOST ?? (runningInDocker ? "db" : "localhost"),
  port: Number(process.env.DB_PORT ?? 3306),
  dialect: "mysql",
});
