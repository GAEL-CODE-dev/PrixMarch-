const db = require('./database');

const markets = [
  ['Total', 'Bacongo'],
  ['Poto-Poto', 'Poto-Poto'],
  ['Moungali', 'Moungali'],
  ['Ouenzé', 'Ouenzé'],
  ['Talangaï', 'Talangaï'],
  ['Mfilou', 'Mfilou'],
];

// [nom, unité, catégorie, prix de base fictif pour la démo]
const products = [
  ['Manioc', 'tas', 'Tubercules', 1000],
  ['Banane plantain', 'tas', 'Fruits et tubercules', 1500],
  ['Tomates', 'tas', 'Légumes', 1500],
  ['Oignons', 'tas', 'Légumes', 1000],
  ['Riz', 'kg', 'Céréales', 800],
  ['Huile de palme', 'litre', 'Huiles', 1500],
  ["Pâte d'arachide", 'verre', 'Condiments', 500],
  ['Poulet local abattu', 'kg', 'Viandes', 3500],
  ['Poisson capitaine', 'kg', 'Poissons', 4000],
  ['Poisson silure', 'kg', 'Poissons', 3000],
];

const insertMarket = db.prepare('INSERT OR IGNORE INTO markets (nom, quartier) VALUES (?, ?)');
const insertProduct = db.prepare(
  'INSERT OR IGNORE INTO products (nom, unite, categorie) VALUES (?, ?, ?)'
);

db.transaction(() => {
  markets.forEach(([nom, quartier]) => insertMarket.run(nom, quartier));
  products.forEach(([nom, unite, categorie]) => insertProduct.run(nom, unite, categorie));
})();

console.log('Marchés et produits insérés.');

// Prix de démonstration (fictifs), seulement avec l'option --demo
if (process.argv.includes('--demo')) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM prices').get();

  if (n > 0) {
    console.log('La table prices contient déjà des données : démo ignorée.');
  } else {
    const productRows = db.prepare('SELECT id, nom FROM products').all();
    const marketRows = db.prepare('SELECT id FROM markets').all();
    const baseByName = Object.fromEntries(products.map((p) => [p[0], p[3]]));
    const insertPrice = db.prepare(
      'INSERT INTO prices (product_id, market_id, prix, date_releve) VALUES (?, ?, ?, ?)'
    );
    const daysAgoList = [0, 3, 7, 10, 14, 21, 28];

    db.transaction(() => {
      productRows.forEach((product, p) => {
        marketRows.forEach((market, m) => {
          daysAgoList.forEach((daysAgo, d) => {
            const offset = (m * 2) % 5; // chaque marché a un dernier relevé différent
            const date = new Date(Date.now() - (daysAgo + offset) * 86400000)
              .toISOString()
              .slice(0, 10);
            const variation = (((p * 7 + m * 3 + d * 5) % 11) - 5) * 0.03;
            const prix = Math.round((baseByName[product.nom] * (1 + variation)) / 50) * 50;
            insertPrice.run(product.id, market.id, prix, date);
          });
        });
      });
    })();

    console.log('Prix de démonstration insérés.');
  }
}