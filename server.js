const fs = require("fs");
const path = require("path");
const readline = require("readline");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 3847;
const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const collectorLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP" }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

async function getStats() {
  const visitors = new Set();
  const sessions = new Set();
  const pageViews = new Map();
  const timeBySession = new Map();
  let eventCount = 0;

  if (!fs.existsSync(EVENTS_FILE)) return null;

  const fileStream = fs.createReadStream(EVENTS_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const e = JSON.parse(line);
      eventCount++;
      if (e.visitorId) visitors.add(e.visitorId);
      if (e.sessionId) sessions.add(e.sessionId);
      if (e.type === "pageview" && e.path) {
        pageViews.set(e.path, (pageViews.get(e.path) || 0) + 1);
      }
      if (e.type === "time" && e.sessionId && e.seconds) {
        timeBySession.set(e.sessionId, (timeBySession.get(e.sessionId) || 0) + e.seconds);
      }
    } catch (err) { continue; }
  }

  const durations = [...timeBySession.values()];
  const avgSession = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    uniqueVisitors: visitors.size,
    sessions: sessions.size,
    totalPageviews: [...pageViews.values()].reduce((a, b) => a + b, 0),
    avgSessionSeconds: avgSession,
    pages: [...pageViews.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views),
    eventCount
  };
}

app.post("/api/collect", collectorLimit, (req, res) => {
  const { type, path, visitorId, sessionId, seconds } = req.body;
  if (!type || !visitorId || !sessionId) return res.status(400).end();

  const entry = JSON.stringify({
    type,
    path: String(path || "/").slice(0, 500),
    visitorId: String(visitorId).slice(0, 64),
    sessionId: String(sessionId).slice(0, 64),
    seconds: Number(seconds) || 0,
    ts: Date.now()
  }) + "\n";

  fs.appendFile(EVENTS_FILE, entry, (err) => {
    if (err) console.error("Save error:", err);
  });
  res.status(204).end();
});

app.get("/api/stats", async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats || { uniqueVisitors: 0, sessions: 0, totalPageviews: 0, avgSessionSeconds: 0, pages: [], eventCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Analytics running on http://localhost:${PORT}`));
