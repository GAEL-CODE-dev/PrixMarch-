const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
// En production, CORS_ORIGIN doit être fourni explicitement : pas de valeur
// par défaut, sinon le serveur écouterait des origines de développement.
const CORS_ORIGIN =
  (process.env.CORS_ORIGIN || '').trim() ||
  (NODE_ENV === 'production' ? '' : 'http://localhost:5173');

// Vérification stricte du secret JWT
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'JWT_SECRET manquant ou trop court (32 caractères minimum). Voir backend/.env.example'
  );
  process.exit(1);
}

// Avertissement/renforcement CORS en production
if (NODE_ENV === 'production') {
  const origines = CORS_ORIGIN.split(',')
    .map((origine) => origine.trim())
    .filter(Boolean);
  if (origines.includes('*')) {
    console.error(
      "CORS_ORIGIN ne doit pas être '*' en production. Définis des origines explicites."
    );
    process.exit(1);
  }
  if (origines.length === 0) {
    console.error("CORS_ORIGIN doit être défini en production.");
    process.exit(1);
  }
} else if (CORS_ORIGIN.split(',').map((o) => o.trim()).includes('*')) {
  console.warn(
    "Attention : CORS_ORIGIN='*' est ouvert à toutes les origines. À éviter en production."
  );
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // Origines autorisées pour l'interface, séparées par des virgules.
  // « * » ouvre à tout le monde (à éviter en production).
  CORS_ORIGIN,
  NODE_ENV,
};
