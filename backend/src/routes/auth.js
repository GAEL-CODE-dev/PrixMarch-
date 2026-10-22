const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_COST = 10;

router.post('/register', async (req, res, next) => {
  try {
    const body = req.body || {};
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const motDePasse = typeof body.mot_de_passe === 'string' ? body.mot_de_passe : '';

    if (nom.length < 2 || nom.length > 60) {
      return res.status(400).json({ erreur: 'Le nom doit contenir entre 2 et 60 caractères' });
    }
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ erreur: 'Adresse email invalide' });
    }
    if (motDePasse.length < 8 || Buffer.byteLength(motDePasse, 'utf8') > 72) {
      return res
        .status(400)
        .json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères (72 octets maximum)' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ erreur: 'Un compte existe déjà avec cet email' });
    }

    const hash = await bcrypt.hash(motDePasse, BCRYPT_COST);

    const result = db
      .prepare('INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)')
      .run(nom, email, hash);

    const user = db
      .prepare('SELECT id, nom, email, role, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erreur: 'Un compte existe déjà avec cet email' });
    }
    next(err);
  }
});

module.exports = router;