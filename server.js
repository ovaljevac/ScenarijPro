import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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

const DATA_DIR = path.join(__dirname, "data");
const SCENARIOS_DIR = path.join(DATA_DIR, "scenarios");
const DELTAS_FILE = path.join(DATA_DIR, "deltas.json");

async function ensureStorage() {
  await fs.mkdir(SCENARIOS_DIR, { recursive: true });
  try { await fs.access(DELTAS_FILE); }
  catch { await fs.writeFile(DELTAS_FILE, "[]\n", "utf-8"); }
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function scenarioPath(id) {
  return path.join(SCENARIOS_DIR, `scenario-${id}.json`);
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function writeJson(filePath, obj) {
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2), "utf-8");
}

async function getNextScenarioId() {
  const files = await readJsonDirSafe(SCENARIOS_DIR);
  let maxId = 0;
  for (const f of files) {
    const m = /^scenario-(\d+)\.json$/i.exec(f);
    if (m) maxId = Math.max(maxId, parseInt(m[1], 10));
  }
  return maxId + 1;
}

async function readJsonDirSafe(dirPath) {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
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
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeWord(text, oldName, newName) {
  if (!oldName) return text;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(oldName)})(?=[^\\p{L}\\p{N}]|$)`, "gu");
  return String(text).replace(re, (m, p1, p2) => `${p1}${newName}`);
}

const lineLocks = new Map();      
const userLineLock = new Map();   
const charLocks = new Map();   

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

async function loadScenarioOrNull(scenarioId) {
  const p = scenarioPath(scenarioId);
  const sc = await readJson(p, null);
  return sc;
}

async function saveScenario(scenario) {
  await writeJson(scenarioPath(scenario.id), scenario);
}

async function appendDeltas(deltas) {
  const arr = await readJson(DELTAS_FILE, []);
  const next = Array.isArray(arr) ? arr : [];
  for (const d of deltas) next.push(d);
  await writeJson(DELTAS_FILE, next);
}


app.post("/api/scenarios", async (req, res) => {
  await ensureStorage();
  let { title } = req.body || {};
  if (!title || String(title).trim() === "") title = "Neimenovani scenarij";

  const id = await getNextScenarioId();
  const scenario = {
    id,
    title: String(title),
    content: [
      { lineId: 1, nextLineId: null, text: "" }
    ]
  };
  await saveScenario(scenario);
  return res.status(200).json(scenario);
});

app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;

  const scenario = await loadScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const lineExists = (scenario.content || []).some(l => l.lineId === lineId);
  if (!lineExists) return res.status(404).json({ message: "Linija ne postoji!" });

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
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const lineId = parseInt(req.params.lineId, 10);
  const userId = req.body?.userId;
  const newText = req.body?.newText;

  const scenario = await loadScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const content = Array.isArray(scenario.content) ? scenario.content : [];
  const line = content.find(l => l.lineId === lineId);
  if (!line) return res.status(404).json({ message: "Linija ne postoji!" });

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

  const oldNext = line.nextLineId;

  line.text = firstText;

  let maxLineId = 0;
  for (const l of content) maxLineId = Math.max(maxLineId, l.lineId);

  const inserted = [];
  if (remaining.length > 0) {
    let prevId = line.lineId;
    for (let i = 0; i < remaining.length; i++) {
      const newId = ++maxLineId;
      const obj = { lineId: newId, nextLineId: null, text: remaining[i] };
      inserted.push(obj);
      content.push(obj);

      const prevLine = content.find(x => x.lineId === prevId);
      if (prevLine) prevLine.nextLineId = newId;

      prevId = newId;
    }
    const last = inserted[inserted.length - 1];
    last.nextLineId = oldNext;
  } else {
    line.nextLineId = oldNext;
  }


  const ts = nowUnixSeconds();

  const deltas = [];
  deltas.push({
    scenarioId,
    type: "line_update",
    lineId: line.lineId,
    nextLineId: line.nextLineId,
    content: line.text,
    timestamp: ts
  });
  for (const nl of inserted) {
    deltas.push({
      scenarioId,
      type: "line_update",
      lineId: nl.lineId,
      nextLineId: nl.nextLineId,
      content: nl.text,
      timestamp: ts
    });
  }
  await appendDeltas(deltas);

  await saveScenario(scenario);

  lineLocks.delete(k);
  const userLocked = userLineLock.get(userId);
  if (userLocked && userLocked.scenarioId === scenarioId && userLocked.lineId === lineId) {
    userLineLock.delete(userId);
  }

  return res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const characterName = req.body?.characterName;

  const scenario = await loadScenarioOrNull(scenarioId);
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
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const userId = req.body?.userId;
  const oldName = String(req.body?.oldName ?? "");
  const newName = String(req.body?.newName ?? "");

  const scenario = await loadScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const k = charKey(scenarioId, oldName);
  const owner = charLocks.get(k);
  if (owner !== undefined && owner !== userId) {
    return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
  }

  const content = Array.isArray(scenario.content) ? scenario.content : [];
  for (const l of content) {
    l.text = replaceWholeWord(l.text, oldName, newName);
  }

  const ts = nowUnixSeconds();
  await appendDeltas([{
    scenarioId,
    type: "char_rename",
    oldName,
    newName,
    timestamp: ts
  }]);

  await saveScenario(scenario);

  if (owner === userId) charLocks.delete(k);

  return res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});

app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const since = parseInt(req.query.since ?? "0", 10);

  const scenario = await loadScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const all = await readJson(DELTAS_FILE, []);
  const arr = Array.isArray(all) ? all : [];
  const deltas = arr
    .filter(d => d && d.scenarioId === scenarioId && Number(d.timestamp) > since)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  return res.status(200).json({ deltas });
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  await ensureStorage();

  const scenarioId = parseInt(req.params.scenarioId, 10);
  const scenario = await loadScenarioOrNull(scenarioId);
  if (!scenario) return res.status(404).json({ message: "Scenario ne postoji!" });

  const ordered = orderLines(Array.isArray(scenario.content) ? scenario.content : []);
  return res.status(200).json({ id: scenario.id, title: scenario.title, content: ordered });
});

app.use("/", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
await ensureStorage();
app.listen(PORT, () => console.log(`WT Spirala 3 server running on http://localhost:${PORT}`));
