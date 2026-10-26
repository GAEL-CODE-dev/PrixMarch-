const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'JWT_SECRET manquant ou trop court (32 caractères minimum). Voir backend/.env.example'
  );
  process.exit(1);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // Origines autorisées pour l'interface, séparées par des virgules.
  // « * » ouvre à tout le monde (à éviter en production).
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
