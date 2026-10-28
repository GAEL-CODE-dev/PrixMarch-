require('./config');

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db/database');
const { CORS_ORIGIN } = require('./config');
const { generalLimiter } = require('./middleware/limits');
const pkg = require('../package.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Derrière un proxy (Render, Railway, Fly.io, Nginx) : TRUST_PROXY=1, c'est-à-dire
// le nombre de proxies de confiance. Une valeur non numérique est ignorée pour
// éviter qu'Express n'interprète n'importe quelle chaîne comme une adresse IP.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  const sauts = Number(trustProxy);
  if (Number.isInteger(sauts) && sauts > 0) {
    app.set('trust proxy', sauts);
  } else {
    console.warn(
      `TRUST_PROXY ignoré (attendu : un nombre de proxies, ex. 1) : « ${trustProxy} »`
    );
  }
}

// Origines autorisées : liste séparée par des virgules, ou * pour tout ouvrir
const origines = CORS_ORIGIN.split(',')
  .map((origine) => origine.trim())
  .filter(Boolean);

// CSP adaptée à l'interface servie en statique (aucune ressource externe).
// Les styles inline sont autorisés car React en utilise pour la mise en page.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        // Évite de forcer HTTPS sur un serveur local en HTTP.
        upgradeInsecureRequests: null,
      },
    },
  })
);
// Sans origine configurée, on n'active pas CORS : l'interface est servie par
// l'API et les requêtes sont de même origine (aucun en-tête CORS nécessaire).
if (origines.length > 0) {
  app.use(cors({ origin: origines.includes('*') ? true : origines }));
}
// Pas de corps compressé : l'API n'en reçoit pas et cela évite toute
// décompression inutile (surface d'attaque et coût CPU).
app.use(express.json({ limit: '10kb', inflate: false }));
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      app: 'PrixMarché API',
      version: pkg.version,
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'error',
      app: 'PrixMarché API',
      version: pkg.version,
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
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
  // Erreurs client connues de body-parser (encodage refusé, gzip invalide...)
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ erreur: 'Requête invalide' });
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur' });
});

if (require.main === module) {
  // Données initiales (marchés + produits) sur un volume vide. Le seed est
  // idempotent : le relancer ne crée pas de doublon.
  if (process.env.SEED_ON_START === 'true') {
    require('./db/seed');
  }

  const server = app.listen(PORT, () => {
    console.log(`API lancée sur http://localhost:${PORT}`);
  });

  // Arrêt propre : on laisse les requêtes en cours se terminer, puis on ferme
  // SQLite (indispensable avec un journal WAL pour ne rien perdre).
  let arretEnCours = false;
  function arreter(signal) {
    if (arretEnCours) return;
    arretEnCours = true;
    console.log(`${signal} reçu : arrêt du serveur...`);

    const forcer = setTimeout(() => {
      console.error('Arrêt forcé après 10 s.');
      process.exit(1);
    }, 10000);
    forcer.unref();

    server.close(() => {
      try {
        db.close();
      } catch (err) {
        console.error('Fermeture de la base impossible :', err);
      }
      clearTimeout(forcer);
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => arreter('SIGTERM'));
  process.on('SIGINT', () => arreter('SIGINT'));
}

module.exports = app;
