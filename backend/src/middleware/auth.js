const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ erreur: 'Connexion requise' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Session expirée, reconnecte-toi' : 'Jeton invalide';
    return res.status(401).json({ erreur: message });
  }

  const user = db
    .prepare('SELECT id, nom, email, role FROM users WHERE id = ?')
    .get(Number(payload.sub));

  if (!user) {
    return res.status(401).json({ erreur: 'Compte introuvable' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };