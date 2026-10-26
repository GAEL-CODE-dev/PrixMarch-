const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/limits');


const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_COST = 10;

// Hash factice : sert à garder un temps de réponse identique si l'email n'existe pas
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', BCRYPT_COST);

router.post('/register', registerLimiter, async (req, res, next) => {
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


router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const motDePasse = typeof body.mot_de_passe === 'string' ? body.mot_de_passe : '';

    if (!email || !motDePasse) {
      return res.status(400).json({ erreur: 'Email et mot de passe obligatoires' });
    }

    const user = db
      .prepare('SELECT id, nom, email, role, mot_de_passe FROM users WHERE email = ?')
      .get(email);

    const hashToCheck = user ? user.mot_de_passe : DUMMY_HASH;
    const valide = await bcrypt.compare(motDePasse, hashToCheck);

    if (!user || !valide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ role: user.role }, JWT_SECRET, {
      subject: String(user.id),
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    });

    res.json({
      token,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;