import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";

import { sequelize } from "./db.js";
import { Scenario, Line, Delta, Checkpoint } from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
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

function linesToContent(lines) {
  return lines.map(l => ({
    lineId: l.lineId,
    nextLineId: l.nextLineId,
    text: l.text
  }));
}

/**
 * SPIRALA 3 RUTE (identicne, ali koriste MySQL)
 */
app.post("/api/scenarios", async (req, res) => {
  let { title } = req.body || {};
  if (!title || String(title).trim() === "") title = "Neimenovani scenarij";

  const base = [{ lineId: 1, nextLineId: null, text: "" }];

  const created = await Scenario.create({
    title: String(title),
    baseContent: JSON.stringify(base),
  });

  await Line.create({
    scenarioId: created.id,
    lineId: 1,
    nextLineId: null,
    text: "",
  });

  return res.status(200).json({ id: created.id, title: created.title, content: base });
});

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;
  const newText = req.body?.newText;

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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

  return res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const characterName = req.body?.characterName;

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const oldName = String(req.body?.oldName ?? "");
  const newName = String(req.body?.newName ?? "");

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const since = parseInt(req.query.since ?? "0", 10);

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const deltas = await Delta.findAll({
    where: { scenarioId, timestamp: { [Op.gt]: since } },
    order: [["timestamp", "ASC"], ["id", "ASC"]],
  });

  return res.status(200).json({ deltas });
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const lines = await getAllLines(scenarioId);
  const ordered = orderLines(linesToContent(lines));
  return res.status(200).json({ id: scenario.id, title: scenario.title, content: ordered });
});


app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  await Checkpoint.create({ scenarioId, timestamp: nowUnixSeconds() });
  return res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
});

app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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

app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);
  const checkpointId = parseInt(req.params.checkpointId, 10);

  const scenario = await getScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

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
  }

  const ordered = orderLines(content);
  return res.status(200).json({ id: scenario.id, title: scenario.title, content: ordered });
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

try {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
} catch (e) {
  console.error("DB init failed:", e);
  process.exit(1);
}

app.listen(PORT, () => console.log(`WT Spirala 4 server running on http://localhost:${PORT}`));
