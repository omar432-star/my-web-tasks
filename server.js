const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// تخزين مؤقت في الرامات عشان Vercel يوافق يشغل الكود
let events = [];

app.post("/api/collect", (req, res) => {
  const { type, path, visitorId, sessionId, seconds } = req.body;
  
  if (type && visitorId && sessionId) {
    events.push({
      type,
      path: path || "/",
      visitorId,
      sessionId,
      seconds: seconds || 0,
      ts: Date.now()
    });
  }
  
  // حفظ آخر 1000 حدث فقط عشان الرامات ماتتمليش
  if (events.length > 1000) events.shift();
  
  res.status(204).end();
});

app.get("/api/stats", (req, res) => {
  const visitors = new Set(events.map(e => e.visitorId));
  const sessions = new Set(events.map(e => e.sessionId));
  const pageViews = events.filter(e => e.type === "pageview");
  
  const pagesMap = {};
  pageViews.forEach(pv => {
    pagesMap[pv.path] = (pagesMap[pv.path] || 0) + 1;
  });

  const stats = {
    uniqueVisitors: visitors.size,
    sessions: sessions.size,
    totalPageviews: pageViews.length,
    pages: Object.entries(pagesMap).map(([path, views]) => ({ path, views })),
    eventCount: events.length
  };
  
  res.json(stats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
