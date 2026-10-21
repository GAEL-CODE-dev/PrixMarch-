const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db/database');

app.get('/api/db-check', (req, res) => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();
  res.json({tables: tables.map((t)  => t.name) });
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrixMarché API' });
});

app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});