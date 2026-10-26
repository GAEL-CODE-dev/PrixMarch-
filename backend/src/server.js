require('./config');

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db/database');
const { CORS_ORIGIN } = require('./config');
const { generalLimiter } = require('./middleware/limits');

const app = express();
const PORT = process.env.PORT || 3000;

// Derrière un proxy (Render, etc.) : TRUST_PROXY=1 dans les variables d'environnement
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// Origines autorisées : liste séparée par des virgules, ou * pour tout ouvrir
const origines = CORS_ORIGIN.split(',')
  .map((origine) => origine.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origines.includes('*') ? true : origines }));
app.use(express.json({ limit: '10kb' }));
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', app: 'PrixMarché API' });
  } catch {
    res.status(503).json({ status: 'error', app: 'PrixMarché API' });
  }
});

app.use('/api/markets', require('./routes/markets'));
app.use('/api/products', require('./routes/products'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/auth', require('./routes/auth'));

// Route inconnue
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// Build de l'interface (frontend/dist) : sert l'application React et laisse
// React Router gérer les adresses inconnues (rechargement de /comparer, etc.)
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
const indexHtml = path.join(dist, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(indexHtml);
  });
}

// Erreurs inattendues (en dernier pour couvrir aussi le service des fichiers)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'JSON invalide' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erreur: 'Requête trop volumineuse' });
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});
