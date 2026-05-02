import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import crypto from "crypto";
import bcrypt from "bcrypt";

import { sequelize } from "./db.js";
import { Scenario, Line, Delta, Checkpoint, User, ScenarioAssignment } from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const rateBuckets = new Map();

app.use((req, res, next) => {
  const allowedOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  const requestHost = req.headers.host;
  const sameOrigin = origin && requestHost && (() => {
    try {
      return new URL(origin).host === requestHost;
    } catch {
      return false;
    }
  })();
  const allowAnyOrigin = process.env.NODE_ENV !== "production" && allowedOrigins.length === 0;
  const allowedOrigin = allowAnyOrigin ? "*" : (sameOrigin || allowedOrigins.includes(origin)) ? origin : "";

  if (allowedOrigin) res.header("Access-Control-Allow-Origin", allowedOrigin);
  if (!allowedOrigin && origin) return res.sendStatus(403);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function clientKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${clientKey(req)}`;
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Previse pokusaja. Pokusajte ponovo kasnije." });
    }

    bucket.count += 1;
    next();
  };
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    itemsPerPage: user.itemsPerPage,
    contactPreference: user.contactPreference,
    notificationFrequency: user.notificationFrequency,
    twoFactorEnabled: !!user.twoFactorEnabled,
  };
}

function validatePassword(password) {
  const value = String(password || "");
  return value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function hashPassword(password) {
  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  return {
    passwordHash,
    passwordParams: JSON.stringify({ algorithm: "bcrypt", rounds: BCRYPT_ROUNDS }),
  };
}

async function verifyPassword(password, user) {
  let params = {};
  try {
    params = JSON.parse(user.passwordParams || "{}");
  } catch {
    params = {};
  }

  if (params.algorithm === "bcrypt" || String(user.passwordHash || "").startsWith("$2")) {
    return bcrypt.compare(String(password), user.passwordHash);
  }
  return false;
}

async function issueToken(user) {
  const token = crypto.randomBytes(48).toString("base64url");
  user.sessionTokenHash = hashToken(token);
  user.sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await user.save();
  return token;
}

async function upgradePasswordHashIfNeeded(password, user) {
  let params = {};
  try {
    params = JSON.parse(user.passwordParams || "{}");
  } catch {
    params = {};
  }

  if (params.algorithm === "bcrypt" && Number(params.rounds) >= BCRYPT_ROUNDS) return;
  const passwordData = await hashPassword(password);
  user.passwordHash = passwordData.passwordHash;
  user.passwordParams = passwordData.passwordParams;
  await user.save();
}

async function getAuthUser(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const tokenHash = hashToken(match[1]);
  const user = await User.findOne({ where: { sessionTokenHash: tokenHash } });
  if (!user) return null;
  if (!user.sessionExpiresAt || new Date(user.sessionExpiresAt).getTime() <= Date.now()) {
    user.sessionTokenHash = null;
    user.sessionExpiresAt = null;
    await user.save();
    return null;
  }
  return user;
}

async function requireAuth(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return null;
  }
  return user;
}

function orderLines(content) {
  const map = new Map();
  const pointed = new Set();
  for (const l of content) {
    map.set(l.lineId, l);
    if (l.nextLineId !== null && l.nextLineId !== undefined) pointed.add(l.nextLineId);
  }
  let start = 1;
  if (!map.has(start)) {
    for (const l of content) {
      if (!pointed.has(l.lineId)) { start = l.lineId; break; }
    }
  }
  const ordered = [];
  const visited = new Set();
  let cur = start;
  while (cur !== null && cur !== undefined && map.has(cur) && !visited.has(cur)) {
    visited.add(cur);
    const line = map.get(cur);
    ordered.push(line);
    cur = line.nextLineId;
  }
  return ordered;
}

function wordMatches(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)];
}

function wrapTextBy20Words(text) {
  if (text === null || text === undefined) text = "";
  text = String(text);
  const words = wordMatches(text);
  if (words.length <= 20) return [text];

  const cutStarts = [];
  for (let i = 20; i < words.length; i += 20) {
    cutStarts.push(words[i].index);
  }

  const chunks = [];
  let prev = 0;
  for (const cut of cutStarts) {
    const part = text.slice(prev, cut).trim();
    chunks.push(part);
    prev = cut;
  }
  const tail = text.slice(prev).trim();
  chunks.push(tail);
  return chunks;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeWord(text, oldName, newName) {
  if (!oldName) return text;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(oldName)})(?=[^\\p{L}\\p{N}]|$)`, "gu");
  return String(text).replace(re, (m, p1) => `${p1}${newName}`);
}

function parsePositiveInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function estimatePageCount(lines) {
  const text = lines.map(l => l.text || "").join(" ");
  const words = wordMatches(text).length;
  return Math.max(1, Math.ceil(words / 250));
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Nema izmjena";
  const seconds = Math.max(0, nowUnixSeconds() - Number(timestamp));
  if (seconds < 60) return "Upravo sada";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Prije ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Prije ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Prije ${days} d`;
}

async function createScenarioWithInitialLine(title, ownerId = null) {
  const cleanTitle = String(title || "").trim() || "Neimenovani scenarij";
  const base = [{ lineId: 1, nextLineId: null, text: "" }];

  const created = await Scenario.create({
    title: cleanTitle,
    ownerId,
    baseContent: JSON.stringify(base),
  });

  await Line.create({
    scenarioId: created.id,
    lineId: 1,
    nextLineId: null,
    text: "",
  });

  if (ownerId) {
    await ScenarioAssignment.create({
      scenarioId: created.id,
      userId: ownerId,
      role: "owner",
    });
  }

  return { id: created.id, title: created.title, content: base, canDelete: !!ownerId };
}

/**
 * LOCKING (ostaje u memoriji, kao i u Spirali 3)
 */
const lineLocks = new Map();      // "scenarioId:lineId" -> userId
const userLineLock = new Map();   // userId -> { scenarioId, lineId }
const charLocks = new Map();      // "scenarioId:name" -> userId

function lineKey(scenarioId, lineId) {
  return `${scenarioId}:${lineId}`;
}
function charKey(scenarioId, name) {
  return `${scenarioId}:${name}`;
}

function unlockUserLineIfAny(userId) {
  const locked = userLineLock.get(userId);
  if (!locked) return;
  const k = lineKey(locked.scenarioId, locked.lineId);
  const owner = lineLocks.get(k);
  if (owner === userId) {
    lineLocks.delete(k);
  }
  userLineLock.delete(userId);
}

function clearScenarioLocks(scenarioId) {
  const prefix = `${scenarioId}:`;
  for (const key of lineLocks.keys()) {
    if (key.startsWith(prefix)) lineLocks.delete(key);
  }
  for (const [userId, locked] of userLineLock.entries()) {
    if (locked.scenarioId === scenarioId) userLineLock.delete(userId);
  }
  for (const key of charLocks.keys()) {
    if (key.startsWith(prefix)) charLocks.delete(key);
  }
}

/**
 * DB helpers
 */
async function getScenarioOrNull(scenarioId) {
  return Scenario.findByPk(scenarioId);
}

async function getLineOrNull(scenarioId, lineId) {
  return Line.findOne({ where: { scenarioId, lineId } });
}

async function getAllLines(scenarioId) {
  return Line.findAll({ where: { scenarioId } });
}

async function userCanAccessScenario(user, scenarioId) {
  if (!user) return false;
  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return false;
  if (scenario.ownerId === user.id) return true;
  const assignment = await ScenarioAssignment.findOne({
    where: { scenarioId, userId: user.id },
  });
  return !!assignment;
}

function linesToContent(lines) {
  return lines.map(l => ({
    lineId: l.lineId,
    nextLineId: l.nextLineId,
    text: l.text
  }));
}

function normalizeContentLines(content) {
  let values = [];

  if (Array.isArray(content)) {
    values = content.map(item => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.text ?? "";
      return "";
    });
  } else if (typeof content === "string") {
    values = content.split(/\r?\n/);
  }

  values = values.map(value => String(value ?? ""));
  if (values.length === 0) values = [""];
  return values;
}

function buildLineRows(scenarioId, contentLines) {
  return contentLines.map((text, index) => ({
    scenarioId,
    lineId: index + 1,
    nextLineId: index < contentLines.length - 1 ? index + 2 : null,
    text,
  }));
}

/**
 * SPIRALA 3 RUTE (identicne, ali koriste MySQL)
 */
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "auth" });
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: "login" });

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "Ime, prezime, email i sifra su obavezni." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Email adresa nije ispravna." });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({
      message: "Sifra mora imati najmanje 8 znakova, veliko i malo slovo, broj i specijalni znak.",
    });
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Korisnik sa tim emailom vec postoji." });
  }

  try {
    const passwordData = await hashPassword(password);
    const user = await User.create({ firstName, lastName, email, ...passwordData });
    const token = await issueToken(user);
    return res.status(200).json({ user: safeUser(user), token });
  } catch {
    return res.status(500).json({ message: "Greska pri registraciji." });
  }
});

app.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Pogresan email ili sifra." });
  }

  const ok = await verifyPassword(password, user);
  if (!ok) {
    return res.status(401).json({ message: "Pogresan email ili sifra." });
  }

  await upgradePasswordHashIfNeeded(password, user);
  const token = await issueToken(user);
  return res.status(200).json({ user: safeUser(user), token });
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getAuthUser(req);
  return res.status(200).json({ user: safeUser(user) });
});

app.post("/api/auth/logout", async (req, res) => {
  const user = await getAuthUser(req);
  if (user) {
    user.sessionTokenHash = null;
    user.sessionExpiresAt = null;
    await user.save();
  }
  return res.status(200).json({ message: "Odjavljeni ste." });
});

app.put("/api/users/me", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const email = normalizeEmail(req.body?.email);
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: "Ime, prezime i email su obavezni." });
  }

  const existing = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
  if (existing) {
    return res.status(409).json({ message: "Email vec koristi drugi korisnik." });
  }

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.itemsPerPage = Math.min(100, Math.max(1, parseInt(req.body?.itemsPerPage || "25", 10) || 25));
  user.contactPreference = ["email", "sms", "none"].includes(req.body?.contactPreference)
    ? req.body.contactPreference
    : "email";
  user.notificationFrequency = ["daily", "weekly", "monthly", "never"].includes(req.body?.notificationFrequency)
    ? req.body.notificationFrequency
    : "daily";
  user.twoFactorEnabled = !!req.body?.twoFactorEnabled;

  if (newPassword) {
    const currentOk = await verifyPassword(currentPassword, user);
    if (!currentOk) {
      return res.status(401).json({ message: "Trenutna sifra nije ispravna." });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Nova sifra mora imati najmanje 8 znakova, veliko i malo slovo, broj i specijalni znak.",
      });
    }
    const passwordData = await hashPassword(newPassword);
    user.passwordHash = passwordData.passwordHash;
    user.passwordParams = passwordData.passwordParams;
  }

  await user.save();
  return res.status(200).json({ user: safeUser(user), message: "Postavke su spremljene." });
});

app.get("/api/scenarios", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(200).json({
        projects: [],
        message: "Prijavite se da vidite svoje scenarije.",
      });
    }

    const assignments = await ScenarioAssignment.findAll({ where: { userId: user.id } });
    const assignedIds = assignments.map(a => a.scenarioId);
    const where = {
      [Op.or]: [
        { ownerId: user.id },
        { id: assignedIds.length ? assignedIds : [-1] },
      ],
    };

    const scenarios = await Scenario.findAll({
      attributes: ["id", "title", "ownerId"],
      where,
      order: [["id", "DESC"]],
    });

    const projects = [];
    for (const scenario of scenarios) {
      const lines = await getAllLines(scenario.id);
      const latestDelta = await Delta.findOne({
        where: { scenarioId: scenario.id },
        order: [["timestamp", "DESC"], ["id", "DESC"]],
      });

      projects.push({
        id: scenario.id,
        title: scenario.title,
        type: "Scenarij",
        status: lines.length > 1 || (lines[0]?.text || "").trim() ? "U izradi" : "Prazan projekat",
        pageCount: estimatePageCount(lines),
        lineCount: lines.length,
        updatedAt: latestDelta?.timestamp || null,
        updatedLabel: formatRelativeTime(latestDelta?.timestamp),
        canDelete: scenario.ownerId === user.id,
      });
    }

    return res.status(200).json({ projects });
  } catch {
    return res.status(500).json({ message: "Greska pri ucitavanju projekata." });
  }
});

app.post("/api/scenarios", async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const created = await createScenarioWithInitialLine(req.body?.title, user.id);
    return res.status(200).json(created);
  } catch {
    return res.status(500).json({ message: "Greska pri kreiranju scenarija." });
  }
});

app.post("/api/scenarios/:scenarioId/assign", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const scenarioId = parsePositiveInt(req.params.scenarioId);
  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (scenario.ownerId !== user.id) {
    return res.status(403).json({ message: "Samo vlasnik moze dodijeliti scenario." });
  }

  const email = normalizeEmail(req.body?.email);
  const target = await User.findOne({ where: { email } });
  if (!target) return res.status(404).json({ message: "Korisnik sa tim emailom ne postoji." });

  await ScenarioAssignment.findOrCreate({
    where: { scenarioId, userId: target.id },
    defaults: { role: "editor" },
  });

  return res.status(200).json({ message: "Scenario je dodijeljen korisniku.", user: safeUser(target) });
});

app.delete("/api/scenarios/:scenarioId", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const scenarioId = parsePositiveInt(req.params.scenarioId);
  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (scenario.ownerId !== user.id) {
    return res.status(403).json({ message: "Samo vlasnik moze obrisati scenario." });
  }

  await sequelize.transaction(async (t) => {
    await ScenarioAssignment.destroy({ where: { scenarioId }, transaction: t });
    await Checkpoint.destroy({ where: { scenarioId }, transaction: t });
    await Delta.destroy({ where: { scenarioId }, transaction: t });
    await Line.destroy({ where: { scenarioId }, transaction: t });
    await Scenario.destroy({ where: { id: scenarioId }, transaction: t });
  });
  clearScenarioLocks(scenarioId);

  return res.status(200).json({ message: "Scenario je obrisan." });
});

app.put("/api/scenarios/:scenarioId/content", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const contentLines = normalizeContentLines(req.body?.content);
  const rows = buildLineRows(scenarioId, contentLines);
  const ts = nowUnixSeconds();

  try {
    await sequelize.transaction(async (t) => {
      if (typeof req.body?.title === "string" && req.body.title.trim()) {
        scenario.title = req.body.title.trim();
        await scenario.save({ transaction: t });
      }

      await Line.destroy({ where: { scenarioId }, transaction: t });
      await Line.bulkCreate(rows, { transaction: t });

      await Delta.create({
        scenarioId,
        type: "scenario_save",
        content: JSON.stringify(linesToContent(rows)),
        timestamp: ts,
      }, { transaction: t });
    });

    return res.status(200).json({
      id: scenario.id,
      title: scenario.title,
      content: linesToContent(rows),
      canDelete: scenario.ownerId === user.id,
      message: "Scenario je uspjesno spremljen u bazu.",
    });
  } catch {
    return res.status(500).json({ message: "Greska pri spremanju scenarija." });
  }
});

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const lineId = parsePositiveInt(req.params.lineId);
  const userId = user.id;

  if (!scenarioId || !lineId) return res.status(400).json({ message: "Neispravan scenarioId ili lineId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const line = await getLineOrNull(scenarioId, lineId);
  if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

  unlockUserLineIfAny(userId);

  const k = lineKey(scenarioId, lineId);
  const owner = lineLocks.get(k);

  if (owner !== undefined && owner !== userId) {
    return res.status(409).json({ message: "Linija je vec zakljucana!" });
  }

  lineLocks.set(k, userId);
  userLineLock.set(userId, { scenarioId, lineId });
  return res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
});

app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const lineId = parsePositiveInt(req.params.lineId);
  const userId = authUser.id;
  const newText = req.body?.newText;

  if (!scenarioId || !lineId) return res.status(400).json({ message: "Neispravan scenarioId ili lineId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(authUser, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const existingLine = await getLineOrNull(scenarioId, lineId);
  if (!existingLine) return res.status(404).json({ message: "Linija ne postoji!" });

  if (!Array.isArray(newText) || newText.length === 0) {
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
  }

  const k = lineKey(scenarioId, lineId);
  const owner = lineLocks.get(k);
  if (owner === undefined) {
    return res.status(409).json({ message: "Linija nije zakljucana!" });
  }
  if (owner !== userId) {
    return res.status(409).json({ message: "Linija je vec zakljucana!" });
  }

  const flattened = [];
  for (const s of newText) {
    const chunks = wrapTextBy20Words(s);
    for (const c of chunks) flattened.push(c);
  }
  const firstText = flattened[0] ?? "";
  const remaining = flattened.slice(1);
  const insertedLineIds = [];

  const ts = nowUnixSeconds();

  try {
    await sequelize.transaction(async (t) => {
      // Reload inside transaction
      const line = await Line.findOne({ where: { scenarioId, lineId }, transaction: t, lock: t.LOCK.UPDATE });
      if (!line) throw new Error("LINE_MISSING");

      const oldNext = line.nextLineId;

      // Find max lineId in scenario
      const maxRow = await Line.findOne({
        where: { scenarioId },
        order: [["lineId", "DESC"]],
        attributes: ["lineId"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      let maxLineId = maxRow ? Number(maxRow.lineId) : 0;

      const deltas = [];

      if (remaining.length > 0) {
        // Update first line
        const firstInsertedId = maxLineId + 1;
        line.text = firstText;
        line.nextLineId = firstInsertedId;
        await line.save({ transaction: t });

        deltas.push({
          scenarioId,
          type: "line_update",
          lineId: line.lineId,
          nextLineId: line.nextLineId,
          content: line.text,
          timestamp: ts,
        });

        // Create inserted lines chained
        const insertedRows = [];
        for (let i = 0; i < remaining.length; i++) {
          const newId = ++maxLineId;
          const nextId = (i < remaining.length - 1) ? (newId + 1) : oldNext;
          insertedLineIds.push(newId);
          insertedRows.push({
            scenarioId,
            lineId: newId,
            nextLineId: nextId,
            text: remaining[i],
          });

          deltas.push({
            scenarioId,
            type: "line_update",
            lineId: newId,
            nextLineId: nextId,
            content: remaining[i],
            timestamp: ts,
          });
        }
        await Line.bulkCreate(insertedRows, { transaction: t });
      } else {
        // Only update content, keep nextLineId unchanged
        line.text = firstText;
        await line.save({ transaction: t });

        deltas.push({
          scenarioId,
          type: "line_update",
          lineId: line.lineId,
          nextLineId: line.nextLineId,
          content: line.text,
          timestamp: ts,
        });
      }

      await Delta.bulkCreate(deltas, { transaction: t });
    });
  } catch (e) {
    // Defensive: keep original behavior and surface as 500 (tests shouldn't hit)
    return res.status(500).json({ message: "Greska na serveru!" });
  }

  // Unlock (outside transaction)
  lineLocks.delete(k);
  const userLocked = userLineLock.get(userId);
  if (userLocked && userLocked.scenarioId === scenarioId && userLocked.lineId === lineId) {
    userLineLock.delete(userId);
  }

  const lines = await getAllLines(scenarioId);
  const ordered = orderLines(linesToContent(lines));
  return res.status(200).json({
    message: "Linija je uspjesno azurirana!",
    insertedLineIds,
    content: ordered,
  });
});

app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const userId = authUser.id;
  const characterName = req.body?.characterName;

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(authUser, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const name = String(characterName ?? "");
  const k = charKey(scenarioId, name);
  const owner = charLocks.get(k);

  if (owner !== undefined && owner !== userId) {
    return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
  }

  charLocks.set(k, userId);
  return res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const userId = authUser.id;
  const oldName = String(req.body?.oldName ?? "");
  const newName = String(req.body?.newName ?? "");

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(authUser, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const k = charKey(scenarioId, oldName);
  const owner = charLocks.get(k);
  if (owner !== undefined && owner !== userId) {
    return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
  }

  const ts = nowUnixSeconds();

  try {
    await sequelize.transaction(async (t) => {
      const lines = await Line.findAll({ where: { scenarioId }, transaction: t, lock: t.LOCK.UPDATE });
      for (const l of lines) {
        const updated = replaceWholeWord(l.text, oldName, newName);
        if (updated !== l.text) {
          l.text = updated;
          await l.save({ transaction: t });
        }
      }

      await Delta.create({
        scenarioId,
        type: "char_rename",
        oldName,
        newName,
        timestamp: ts,
      }, { transaction: t });
    });
  } catch {
    return res.status(500).json({ message: "Greska na serveru!" });
  }

  if (owner === userId) charLocks.delete(k);

  return res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});

app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const since = parseInt(req.query.since ?? "0", 10);

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const deltas = await Delta.findAll({
    where: { scenarioId, timestamp: { [Op.gt]: since } },
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });

  return res.status(200).json({ deltas });
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const lines = await getAllLines(scenarioId);
  const ordered = orderLines(linesToContent(lines));
  return res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: ordered,
    canDelete: scenario.ownerId === user.id,
  });
});


app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  await Checkpoint.create({ scenarioId, timestamp: nowUnixSeconds() });
  return res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
});

app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);

  if (!scenarioId) return res.status(400).json({ message: "Neispravan scenarioId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const cps = await Checkpoint.findAll({
    where: { scenarioId },
    attributes: ["id", "timestamp"],
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });

  return res.status(200).json(cps);
});

function applyLineUpdate(content, delta) {
  const lineId = Number(delta.lineId);
  const idx = content.findIndex(l => l.lineId === lineId);
  const obj = {
    lineId,
    nextLineId: delta.nextLineId === null || delta.nextLineId === undefined ? null : Number(delta.nextLineId),
    text: delta.content ?? "",
  };
  if (idx >= 0) content[idx] = { ...content[idx], ...obj };
  else content.push(obj);
}

function applyCharRename(content, delta) {
  const oldName = String(delta.oldName ?? "");
  const newName = String(delta.newName ?? "");
  for (const l of content) {
    l.text = replaceWholeWord(l.text, oldName, newName);
  }
}

function applyScenarioSave(delta) {
  try {
    const saved = JSON.parse(delta.content || "[]");
    if (!Array.isArray(saved)) return null;
    return saved.map(l => ({
      lineId: Number(l.lineId),
      nextLineId: l.nextLineId === null || l.nextLineId === undefined ? null : Number(l.nextLineId),
      text: String(l.text ?? ""),
    }));
  } catch {
    return null;
  }
}

app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
  const user = await getAuthUser(req);
  const scenarioId = parsePositiveInt(req.params.scenarioId);
  const checkpointId = parsePositiveInt(req.params.checkpointId);

  if (!scenarioId || !checkpointId) return res.status(400).json({ message: "Neispravan scenarioId ili checkpointId!" });

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });
  if (!(await userCanAccessScenario(user, scenarioId))) {
    return res.status(403).json({ message: "Nemate pristup ovom scenariju." });
  }

  const cp = await Checkpoint.findOne({ where: { id: checkpointId, scenarioId } });
  if (!cp) return res.status(404).json({ message: "Checkpoint ne postoji!" });

  let base;
  try {
    base = JSON.parse(scenario.baseContent);
    if (!Array.isArray(base)) base = [{ lineId: 1, nextLineId: null, text: "" }];
  } catch {
    base = [{ lineId: 1, nextLineId: null, text: "" }];
  }

  const deltas = await Delta.findAll({
    where: { scenarioId, timestamp: { [Op.lte]: cp.timestamp } },
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });

  const content = base.map(l => ({
    lineId: Number(l.lineId),
    nextLineId: l.nextLineId === null || l.nextLineId === undefined ? null : Number(l.nextLineId),
    text: String(l.text ?? ""),
  }));

  for (const d of deltas) {
    if (d.type === "line_update") applyLineUpdate(content, d);
    else if (d.type === "char_rename") applyCharRename(content, d);
    else if (d.type === "scenario_save") {
      const saved = applyScenarioSave(d);
      if (saved) {
        content.length = 0;
        content.push(...saved);
      }
    }
  }

  const ordered = orderLines(content);
  return res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: ordered,
    canDelete: scenario.ownerId === user.id,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "ScenarijPro",
    timestamp: new Date().toISOString(),
  });
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

try {
  await sequelize.authenticate();
  const syncMode = String(process.env.DB_SYNC || "none").toLowerCase();
  if (syncMode === "alter") {
    await sequelize.sync({ alter: true });
  } else if (syncMode === "force") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DB_SYNC=force is not allowed in production.");
    }
    await sequelize.sync({ force: true });
  } else if (syncMode !== "none") {
    throw new Error("DB_SYNC must be one of: none, alter, force.");
  }
} catch (e) {
  console.error("DB init failed:", e);
  process.exit(1);
}

app.listen(PORT, () => console.log(`WT Spirala 4 server running on http://localhost:${PORT}`));
