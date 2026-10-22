require('./config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/limits');

const app = express();
const PORT = process.env.PORT || 3000;

// Derrière un proxy (Render, etc.) : TRUST_PROXY=1 dans les variables d'environnement
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrixMarché API' });
});

app.use('/api/markets', require('./routes/markets'));
app.use('/api/products', require('./routes/products'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/auth', require('./routes/auth'));

// Route inconnue
app.use('/api', (req, res) => {
  res.status(404).json({ erreur: 'Route introuvable' });
});

// Erreurs inattendues
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