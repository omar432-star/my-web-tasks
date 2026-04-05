const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 3847;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendEvent(event) {
  ensureDataDir();
  const line = JSON.stringify({ ...event, _receivedAt: Date.now() }) + "\n";
  fs.appendFileSync(EVENTS_FILE, line, "utf8");
}

function readEvents() {
  return []; 
}

function aggregateStats(events) {
  const visitors = new Set();
  const sessions = new Set();
  const pageViewsByPath = new Map();
  const timeBySession = new Map();

  for (const e of events) {
    if (e.visitorId) visitors.add(e.visitorId);
    if (e.sessionId) sessions.add(e.sessionId);

    if (e.type === "pageview" && e.path) {
      pageViewsByPath.set(e.path, (pageViewsByPath.get(e.path) || 0) + 1);
    }

    if (e.type === "time" && e.sessionId && typeof e.seconds === "number") {
      timeBySession.set(
        e.sessionId,
        (timeBySession.get(e.sessionId) || 0) + e.seconds
      );
    }
  }

  const durations = [...timeBySession.values()];
  const totalSeconds = durations.reduce((a, b) => a + b, 0);
  const avgSessionSeconds =
    durations.length > 0 ? Math.round(totalSeconds / durations.length) : 0;

  const pages = [...pageViewsByPath.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views);

  const totalPageviews = pages.reduce((s, p) => s + p.views, 0);

  return {
    uniqueVisitors: visitors.size,
    sessions: sessions.size,
    totalPageviews,
    avgSessionSeconds,
    pages,
    eventCount: events.length,
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));

app.use(express.static(path.join(ROOT, "public")));

app.post("/api/collect", (req, res) => {
  const body = req.body;
  const items = Array.isArray(body?.events) ? body.events : [body];

  for (const ev of items) {
    if (!ev || typeof ev !== "object") continue;
    const { type, path, referrer, visitorId, sessionId, seconds, title } = ev;
    if (!type || !visitorId || !sessionId) continue;
    appendEvent({
      type,
      path: typeof path === "string" ? path.slice(0, 2048) : undefined,
      referrer: typeof referrer === "string" ? referrer.slice(0, 2048) : undefined,
      title: typeof title === "string" ? title.slice(0, 500) : undefined,
      visitorId: String(visitorId).slice(0, 64),
      sessionId: String(sessionId).slice(0, 64),
      seconds: typeof seconds === "number" ? Math.min(86400, Math.max(0, Math.round(seconds))) : undefined,
    });
  }

  res.status(204).end();
});

app.get("/api/stats", (_req, res) => {
  try {
    const stats = aggregateStats(readEvents());
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`Analytics server http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
});
