const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Liste, avec recherche (?q=) et filtre par catégorie (?categorie=)
router.get('/', (req, res) => {
  const { q, categorie } = req.query;

  let sql = 'SELECT id, nom, unite, categorie FROM products WHERE 1 = 1';
  const params = [];

  if (q) {
    sql += ' AND nom LIKE ?';
    params.push(`%${q}%`);
  }
  if (categorie) {
    sql += ' AND categorie = ?';
    params.push(categorie);
  }
  sql += ' ORDER BY nom';

  res.json(db.prepare(sql).all(...params));
});

// Catégories (doit rester AVANT la route /:id)
router.get('/categories', (req, res) => {
  const rows = db
    .prepare('SELECT DISTINCT categorie FROM products ORDER BY categorie')
    .all();
  res.json(rows.map((r) => r.categorie));
});

// Un produit
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erreur: 'Identifiant invalide' });
  }

  const product = db
    .prepare('SELECT id, nom, unite, categorie FROM products WHERE id = ?')
    .get(id);

  if (!product) {
    return res.status(404).json({ erreur: 'Produit introuvable' });
  }
  res.json(product);
});

module.exports = router;