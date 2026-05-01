import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const defaultExportPath = path.join(rootDir, "data", "railway-export.json");

const tables = [
  { key: "Users", local: "users", target: "Users" },
  { key: "Scenarios", local: "scenarios", target: "Scenarios" },
  { key: "Lines", local: "lines", target: "Lines" },
  { key: "Delta", local: "delta", target: "Delta" },
  { key: "Checkpoints", local: "checkpoints", target: "Checkpoints" },
  { key: "ScenarioAssignments", local: "scenarioassignments", target: "ScenarioAssignments" },
];

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function required(value, name) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function configFromUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    multipleStatements: false,
    connectTimeout: 30000,
  };
}

function localConfig() {
  return {
    host: required(process.env.DB_HOST, "DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: required(process.env.DB_USER, "DB_USER"),
    password: required(process.env.DB_PASSWORD, "DB_PASSWORD"),
    database: required(process.env.DB_NAME, "DB_NAME"),
    multipleStatements: false,
    connectTimeout: 30000,
  };
}

function targetConfig() {
  const url =
    argValue("target-url") ||
    process.env.TARGET_DATABASE_URL ||
    process.env.RAILWAY_MYSQL_PUBLIC_URL ||
    process.env.RAILWAY_MYSQL_URL;

  if (url) return configFromUrl(url);

  return {
    host: required(process.env.TARGET_DB_HOST, "TARGET_DB_HOST"),
    port: Number(process.env.TARGET_DB_PORT || 3306),
    user: required(process.env.TARGET_DB_USER, "TARGET_DB_USER"),
    password: required(process.env.TARGET_DB_PASSWORD, "TARGET_DB_PASSWORD"),
    database: required(process.env.TARGET_DB_NAME, "TARGET_DB_NAME"),
    multipleStatements: false,
    connectTimeout: 30000,
  };
}

async function withConnection(config, callback) {
  const connection = await mysql.createConnection(config);
  try {
    return await callback(connection);
  } finally {
    await connection.end();
  }
}

async function tableExists(connection, table) {
  const [rows] = await connection.query(`SHOW TABLES LIKE ${connection.escape(table)}`);
  return rows.length > 0;
}

async function exportData(outputPath) {
  const data = {};

  await withConnection(localConfig(), async (connection) => {
    for (const table of tables) {
      if (!(await tableExists(connection, table.local))) {
        data[table.key] = [];
        continue;
      }

      const [rows] = await connection.query(`SELECT * FROM \`${table.local}\``);
      data[table.key] = rows;
      console.log(`${table.key}: ${rows.length}`);
    }
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Export saved: ${outputPath}`);
}

async function insertRows(connection, tableName, rows) {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const escapedColumns = columns.map((column) => `\`${column}\``).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES (${placeholders})`;

  for (const row of rows) {
    await connection.execute(
      sql,
      columns.map((column) => row[column]),
    );
  }
}

async function importData(inputPath) {
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  await syncTargetSchema();

  await withConnection(targetConfig(), async (connection) => {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of [...tables].reverse()) {
      await connection.query(`TRUNCATE TABLE \`${table.target}\``);
    }

    for (const table of tables) {
      const rows = payload[table.key] || [];
      await insertRows(connection, table.target, rows);
      console.log(`${table.key}: imported ${rows.length}`);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  });

  console.log("Import finished.");
}

async function syncTargetSchema() {
  const config = targetConfig();

  process.env.DB_HOST = config.host;
  process.env.DB_PORT = String(config.port || 3306);
  process.env.DB_USER = config.user;
  process.env.DB_PASSWORD = config.password;
  process.env.DB_NAME = config.database;
  process.env.DB_DIALECT = "mysql";
  process.env.DB_SYNC = "alter";

  const { sequelize } = await import("../db.js");
  await import("../models/index.js");
  await sequelize.sync({ alter: true });
  await sequelize.close();
}

async function main() {
  const command = process.argv[2];
  const filePath = path.resolve(argValue("file") || defaultExportPath);

  if (command === "export") {
    await exportData(filePath);
    return;
  }

  if (command === "import") {
    await importData(filePath);
    return;
  }

  if (command === "sync-target") {
    await syncTargetSchema();
    console.log("Target schema synced.");
    return;
  }

  if (command === "migrate") {
    await exportData(filePath);
    await importData(filePath);
    return;
  }

  console.log("Usage:");
  console.log("  npm run db:export -- --file=data/railway-export.json");
  console.log("  npm run db:import -- --file=data/railway-export.json --target-url=mysql://user:pass@host:port/db");
  console.log("  npm run db:migrate -- --target-url=mysql://user:pass@host:port/db");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
