import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("running.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distance REAL,
    duration INTEGER,
    steps INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/runs", (req, res) => {
    const { distance, duration, steps } = req.body;
    const stmt = db.prepare("INSERT INTO runs (distance, duration, steps) VALUES (?, ?, ?)");
    const info = stmt.run(distance, duration, steps);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/runs", (req, res) => {
    const runs = db.prepare("SELECT * FROM runs ORDER BY timestamp DESC").all();
    res.json(runs);
  });

  app.get("/api/stats", (req, res) => {
    const stats = {
      daily: db.prepare("SELECT date(timestamp) as date, SUM(distance) as distance, SUM(steps) as steps FROM runs GROUP BY date(timestamp) ORDER BY date DESC LIMIT 7").all(),
      weekly: db.prepare("SELECT strftime('%Y-%W', timestamp) as week, SUM(distance) as distance, SUM(steps) as steps FROM runs GROUP BY week ORDER BY week DESC LIMIT 4").all(),
      monthly: db.prepare("SELECT strftime('%Y-%m', timestamp) as month, SUM(distance) as distance, SUM(steps) as steps FROM runs GROUP BY month ORDER BY month DESC LIMIT 12").all(),
      yearly: db.prepare("SELECT strftime('%Y', timestamp) as year, SUM(distance) as distance, SUM(steps) as steps FROM runs GROUP BY year ORDER BY year DESC").all()
    };
    res.json(stats);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
