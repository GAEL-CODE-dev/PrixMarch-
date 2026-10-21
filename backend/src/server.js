const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db/database');

app.use('/api/markets', require('./routes/markets'));
app.use('/api/products', require('./routes/products'));

app.get('/api/db-check', (req, res) => {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  res.json({
    users: count('users'),
    markets: count('markets'),
    products: count('products'),
    prices: count('prices'),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrixMarché API' });
});

app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});