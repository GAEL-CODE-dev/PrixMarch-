const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { priceLimiter } = require('../middleware/limits');

const router = express.Router();

const PRIX_MAX = 1000000; // garde-fou contre les fautes de frappe

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' });
}

function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

function joursDepuis(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// Même code couleur que la maquette : vert / orange / gris
function fraicheur(jours) {
  if (jours < 3) return 'recent';
  if (jours <= 14) return 'moyen';
  return 'ancien';
}

// Derniers prix ajoutés
router.get('/', (req, res) => {
  const { product_id, market_id } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  let sql = `
    SELECT p.id, p.product_id, pr.nom AS produit, pr.unite,
           p.market_id, m.nom AS marche, p.prix, p.date_releve, p.created_at
    FROM prices p
    JOIN products pr ON pr.id = p.product_id
    JOIN markets m ON m.id = p.market_id
    WHERE 1 = 1`;
  const params = [];

  if (product_id) {
    sql += ' AND p.product_id = ?';
    params.push(Number(product_id));
  }
  if (market_id) {
    sql += ' AND p.market_id = ?';
    params.push(Number(market_id));
  }
  sql += ' ORDER BY p.date_releve DESC, p.id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  res.json(
    rows.map((r) => {
      const jours = joursDepuis(r.date_releve);
      return { ...r, jours_depuis: jours, fraicheur: fraicheur(jours) };
    })
  );
});

// Ajouter un prix
router.post('/', requireAuth, priceLimiter, (req, res) => {
  const { product_id, market_id, prix, date_releve } = req.body;

  const productId = Number(product_id);
  const marketId = Number(market_id);
  const prixNum = Number(prix);
  const date = date_releve || today();

  if (!Number.isInteger(productId) || !Number.isInteger(marketId)) {
    return res.status(400).json({ erreur: 'Produit et marché obligatoires' });
  }
  if (!Number.isInteger(prixNum) || prixNum <= 0 || prixNum > PRIX_MAX) {
    return res
      .status(400)
      .json({ erreur: `Le prix doit être un entier entre 1 et ${PRIX_MAX} FCFA` });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({ erreur: 'Date invalide (format AAAA-MM-JJ)' });
  }
  if (date > today()) {
    return res.status(400).json({ erreur: 'La date ne peut pas être dans le futur' });
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  const market = db.prepare('SELECT id FROM markets WHERE id = ?').get(marketId);
  if (!product) return res.status(400).json({ erreur: 'Produit inconnu' });
  if (!market) return res.status(400).json({ erreur: 'Marché inconnu' });

    const result = db
    .prepare(
      'INSERT INTO prices (product_id, market_id, user_id, prix, date_releve) VALUES (?, ?, ?, ?, ?)'
    )
    .run(productId, marketId, req.user.id, prixNum, date);

  const created = db
    .prepare(
      'SELECT id, product_id, market_id, user_id, prix, date_releve, created_at FROM prices WHERE id = ?'
    )
    .get(result.lastInsertRowid);
});

// Comparer un produit entre les marchés (dernier relevé de chaque marché)
router.get('/compare/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ erreur: 'Identifiant invalide' });
  }

  const produit = db
    .prepare('SELECT id, nom, unite, categorie FROM products WHERE id = ?')
    .get(productId);
  if (!produit) {
    return res.status(404).json({ erreur: 'Produit introuvable' });
  }

  const rows = db
    .prepare(
      `SELECT m.id AS market_id, m.nom AS marche, m.quartier, p.prix, p.date_releve
       FROM prices p
       JOIN markets m ON m.id = p.market_id
       WHERE p.product_id = ?
         AND p.id = (
           SELECT p2.id FROM prices p2
           WHERE p2.product_id = p.product_id AND p2.market_id = p.market_id
           ORDER BY p2.date_releve DESC, p2.id DESC
           LIMIT 1
         )
       ORDER BY p.prix ASC, p.date_releve DESC`
    )
    .all(productId);

  const prixMin = rows.length ? rows[0].prix : null;
  const resultats = rows.map((r) => {
    const jours = joursDepuis(r.date_releve);
    return {
      ...r,
      jours_depuis: jours,
      fraicheur: fraicheur(jours),
      est_le_moins_cher: r.prix === prixMin,
    };
  });

  res.json({ produit, resultats });
});

module.exports = router;