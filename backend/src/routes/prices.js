const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { priceLimiter } = require('../middleware/limits');
const {
  PRIX_MAX,
  JOURS_MAX,
  NB_MIN_RELEVES,
  today,
  dateIlYa,
  isValidDate,
  joursDepuis,
  fraicheur,
  mediane,
  quantile,
  estHorsFourchette,
} = require('../domain/prix');

const router = express.Router();

// Les 30 derniers prix relevés pour un produit
function prixRecents(productId) {
  return db
    .prepare('SELECT prix FROM prices WHERE product_id = ? ORDER BY date_releve DESC, id DESC LIMIT 30')
    .all(productId)
    .map((r) => r.prix);
}

// Derniers prix ajoutés (filtres : product_id, market_id, q, categorie, limit)
router.get('/', (req, res) => {
  const { product_id, market_id, q, categorie } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  let sql = `
    SELECT p.id, p.product_id, pr.nom AS produit, pr.unite, pr.categorie,
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
  if (q) {
    sql += ' AND pr.nom LIKE ?';
    params.push(`%${String(q)}%`);
  }
  if (categorie) {
    sql += ' AND pr.categorie = ?';
    params.push(String(categorie));
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

// Ajouter un prix (connexion obligatoire)
router.post('/', requireAuth, priceLimiter, (req, res) => {
  const { product_id, market_id, prix, date_releve } = req.body || {};

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
  if (joursDepuis(date) > JOURS_MAX) {
    return res
      .status(400)
      .json({ erreur: `La date ne peut pas remonter à plus de ${JOURS_MAX} jours` });
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  const market = db.prepare('SELECT id FROM markets WHERE id = ?').get(marketId);
  if (!product) return res.status(400).json({ erreur: 'Produit inconnu' });
  if (!market) return res.status(400).json({ erreur: 'Marché inconnu' });

  // Doublon : même personne, même produit, même marché, même date
  const doublon = db
    .prepare(
      'SELECT id FROM prices WHERE user_id = ? AND product_id = ? AND market_id = ? AND date_releve = ?'
    )
    .get(req.user.id, productId, marketId, date);
  if (doublon) {
    return res.status(409).json({
      erreur: 'Tu as déjà enregistré un prix pour ce produit dans ce marché à cette date',
    });
  }

  // Prix incohérent par rapport aux derniers relevés du produit
  const recents = prixRecents(productId);

  if (recents.length >= NB_MIN_RELEVES) {
    const med = mediane(recents);
    if (estHorsFourchette(prixNum, med)) {
      return res.status(422).json({
        erreur: `Ce prix (${prixNum} FCFA) est très éloigné des prix habituels (environ ${med} FCFA). Vérifie le montant.`,
        mediane: med,
      });
    }
  }

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

  res.status(201).json(created);
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

// Fourchette habituelle d'un produit (quartiles des 30 derniers relevés)
router.get('/habituel/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ erreur: 'Identifiant invalide' });
  }

  const produit = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!produit) {
    return res.status(404).json({ erreur: 'Produit introuvable' });
  }

  const valeurs = prixRecents(productId);

  // Pas assez de relevés : on ne donne pas de fourchette
  if (valeurs.length < NB_MIN_RELEVES) {
    return res.json({ product_id: productId, nb_releves: valeurs.length, mediane: null, bas: null, haut: null });
  }

  res.json({
    product_id: productId,
    nb_releves: valeurs.length,
    mediane: mediane(valeurs),
    bas: quantile(valeurs, 0.25),
    haut: quantile(valeurs, 0.75),
  });
});

// Historique des prix d'un produit (écran Évolution)
router.get('/history/:productId', (req, res) => {
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

  const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 30, 1), 365);
  const debut = dateIlYa(jours);

  const lignes = db
    .prepare(
      `SELECT p.id, p.market_id, m.nom AS marche, p.prix, p.date_releve
       FROM prices p
       JOIN markets m ON m.id = p.market_id
       WHERE p.product_id = ? AND p.date_releve >= ?
       ORDER BY p.date_releve ASC, p.id ASC`
    )
    .all(productId, debut);

  // Les marchés qui ont des relevés sur la période (pour les boutons de filtre)
  const vus = new Set();
  const marches = [];
  for (const l of lignes) {
    if (!vus.has(l.market_id)) {
      vus.add(l.market_id);
      marches.push({ id: l.market_id, nom: l.marche });
    }
  }
  marches.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  // Filtre éventuel sur un seul marché
  const marcheId = req.query.marche ? Number(req.query.marche) : null;
  const selection = marcheId ? lignes.filter((l) => l.market_id === marcheId) : lignes;

  // Un seul prix par marché et par jour : le dernier saisi
  const parJour = new Map();
  for (const l of selection) {
    parJour.set(`${l.date_releve}|${l.market_id}`, l);
  }
  const points = [...parJour.values()].map((l) => ({
    date: l.date_releve,
    market_id: l.market_id,
    marche: l.marche,
    prix: l.prix,
  }));

  if (points.length === 0) {
    return res.json({ produit, jours, marches, points: [], stats: null });
  }

  // Premier et dernier prix de chaque marché sur la période (points en ordre chronologique)
  const parMarche = new Map();
  for (const p of points) {
    const e = parMarche.get(p.market_id) || { premier: p, dernier: p, n: 0 };
    e.dernier = p;
    e.n += 1;
    parMarche.set(p.market_id, e);
  }
  const entrees = [...parMarche.values()];
  const moyenne = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const actuel = Math.round(moyenne(entrees.map((e) => e.dernier.prix)));

  // Variation : seulement les marchés qui ont au moins deux relevés sur la période
  const evolutifs = entrees.filter((e) => e.n >= 2);
  let variation = null;
  if (evolutifs.length > 0) {
    const avant = moyenne(evolutifs.map((e) => e.premier.prix));
    const apres = moyenne(evolutifs.map((e) => e.dernier.prix));
    variation = Math.round(((apres - avant) / avant) * 1000) / 10;
  }

  const bas = points.reduce((m, p) => (p.prix < m.prix ? p : m), points[0]);
  const haut = points.reduce((m, p) => (p.prix > m.prix ? p : m), points[0]);

  res.json({
    produit,
    jours,
    marches,
    points,
    stats: {
      actuel,
      nb_marches: entrees.length,
      variation_pct: variation,
      bas: { prix: bas.prix, date: bas.date, marche: bas.marche },
      haut: { prix: haut.prix, date: haut.date, marche: haut.marche },
    },
  });
});

module.exports = router;