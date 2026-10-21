const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db/database');

app.use('/api/markets', require('./routes/markets'));
app.use('/api/products', require('./routes/products'));
app.use('/api/prices', require('./routes/prices'));

// Route inconnue
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// Erreurs inattendues
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'JSON invalide' });
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrixMarché API' });
});

app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});