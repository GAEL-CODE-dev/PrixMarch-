const rateLimit = require('express-rate-limit');

// En développement, on peut désactiver les limites avec RATE_LIMIT=off dans .env
// (le script de test fait beaucoup d'appels). Par défaut, elles sont ACTIVES.
const desactive = () => process.env.RATE_LIMIT === 'off';

function creerLimiteur({ windowMs, limit, message, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    skip: desactive,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erreur: message }),
    ...options,
  });
}

const generalLimiter = creerLimiteur({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Trop de requêtes, réessaie dans quelques minutes',
});

// Seuls les essais ratés comptent : une connexion réussie ne consomme rien
const loginLimiter = creerLimiteur({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, réessaie dans 15 minutes',
});

const registerLimiter = creerLimiteur({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Trop de créations de compte depuis cette adresse, réessaie plus tard',
});

// Placé APRÈS requireAuth : la limite se compte par utilisateur
const priceLimiter = creerLimiteur({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => 'user-' + req.user.id,
  message: "Trop de prix ajoutés en une heure, réessaie plus tard",
});

module.exports = { generalLimiter, loginLimiter, registerLimiter, priceLimiter };