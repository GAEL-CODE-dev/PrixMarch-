// Sauvegarde à chaud de la base SQLite (l'API peut rester allumée).
// Le fichier est écrit dans <dossier de la base>/backups/.
//
// Attention : une sauvegarde sur le même disque ne protège pas d'une perte du
// disque. Copie régulièrement ces fichiers ailleurs (stockage objet, autre
// serveur) ou télécharge-les depuis l'hébergeur.
const fs = require('fs');
const path = require('path');
const db = require('./database');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'prixmarche.db');

const dossier = path.join(path.dirname(dbPath), 'backups');
fs.mkdirSync(dossier, { recursive: true });

const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
const cible = path.join(dossier, `prixmarche-${horodatage}.db`);

db.backup(cible)
  .then(() => {
    console.log(`Sauvegarde créée : ${cible}`);
  })
  .catch((err) => {
    console.error('Sauvegarde impossible :', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
