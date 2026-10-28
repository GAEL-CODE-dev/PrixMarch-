const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// En production, DB_PATH pointe vers le disque persistant (ex. /var/data).
// Sans variable, on garde le chemin de développement habituel.
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'prixmarche.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
// WAL : les lectures ne bloquent plus les écritures, ce qui évite les erreurs
// « database is locked » quand plusieurs relevés arrivent en même temps.
// À éviter seulement si DB_PATH est sur un partage réseau (NFS/CIFS).
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migration : un seul relevé par personne, produit, marché et date.
// L'application vérifie déjà ce doublon, mais l'index protège des envois
// simultanés et des écritures directes en base. Les relevés de démonstration
// ont user_id NULL : SQLite considère les NULL comme distincts, ils sont donc
// préservés sans conflit.
const INDEX_UNIQUE = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_unique_releve
    ON prices (user_id, product_id, market_id, date_releve);
`;

try {
  db.exec(INDEX_UNIQUE);
} catch (err) {
  if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;

  // Base existante contenant déjà des doublons : on garde le relevé le plus
  // récent de chaque groupe, puis on recrée l'index.
  db.exec(`
    DELETE FROM prices
    WHERE user_id IS NOT NULL
      AND id NOT IN (
        SELECT MAX(id) FROM prices
        WHERE user_id IS NOT NULL
        GROUP BY user_id, product_id, market_id, date_releve
      )
  `);
  db.exec(INDEX_UNIQUE);
}

module.exports = db;
