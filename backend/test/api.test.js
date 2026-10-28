const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const Database = require('better-sqlite3');
const { dateIlYa } = require('../src/domain/prix');

// Configuration pour tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-very-long-minimum-32-chars-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT = 'off';

// Créer une base de données temporaire
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prixmarche-test-'));
const dbPath = path.join(tmpDir, 'test.db');

// Initialiser la base directement
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
const schema = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8');
db.exec(schema);

// Créer index unique comme dans database.js
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_unique_releve
    ON prices (user_id, product_id, market_id, date_releve);
`);

// Remplacer le module database par notre instance de test
require.cache[require.resolve('../src/db/database')] = {
  id: require.resolve('../src/db/database'),
  filename: require.resolve('../src/db/database'),
  loaded: true,
  exports: db,
};

// Charger l'app après avoir mocké la base
const app = require('../src/server');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    db.close();
  } catch {}
  try {
    fs.unlinkSync(dbPath);
  } catch {}
  try {
    fs.rmdirSync(tmpDir);
  } catch {}
});

async function request(method, path, { body, token } = {}) {
  const url = new URL(path, baseUrl);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  let data = null;
  const text = await res.text();
  try {
    if (text) data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { status: res.status, data, headers: res.headers };
}

test('GET /api/health retourne ok', async () => {
  const { status, data } = await request('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.app, 'PrixMarché API');
  assert.ok(data.version);
  assert.equal(data.env, 'test');
  assert.ok(!Number.isNaN(Date.parse(data.time)));
});

test('GET /api/markets retourne un tableau', async () => {
  // Insérer un marché pour le test
  db.prepare('INSERT INTO markets (nom, quartier) VALUES (?, ?)').run('Marché Test', 'Centre');
  const { status, data } = await request('GET', '/api/markets');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 1);
});

test('GET /api/products retourne un tableau', async () => {
  db.prepare('INSERT INTO products (nom, unite, categorie) VALUES (?, ?, ?)').run('Manioc', 'kg', 'Tubercules');
  const { status, data } = await request('GET', '/api/products');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('POST /api/auth/register crée un compte', async () => {
  const { status, data } = await request('POST', '/api/auth/register', {
    body: { nom: 'Test User', email: 'test@example.com', mot_de_passe: 'motdepasse123' },
  });
  assert.equal(status, 201);
  assert.equal(data.email, 'test@example.com');
  assert.equal(data.nom, 'Test User');
  assert.ok(!data.mot_de_passe);
});

test('POST /api/auth/register refuse mot de passe trop court', async () => {
  const { status, data } = await request('POST', '/api/auth/register', {
    body: { nom: 'Test2', email: 'test2@example.com', mot_de_passe: 'court' },
  });
  assert.equal(status, 400);
  assert.ok(data.erreur);
});

test('POST /api/auth/login retourne un token', async () => {
  const { status, data } = await request('POST', '/api/auth/login', {
    body: { email: 'test@example.com', mot_de_passe: 'motdepasse123' },
  });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.email, 'test@example.com');
});

test('GET /api/auth/me nécessite authentification', async () => {
  const { status, data } = await request('GET', '/api/auth/me');
  assert.equal(status, 401);
  assert.ok(data.erreur);
});

test('POST /api/prices nécessite authentification', async () => {
  const market = db.prepare('SELECT id FROM markets LIMIT 1').get();
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  const { status, data } = await request('POST', '/api/prices', {
    body: { product_id: product.id, market_id: market.id, prix: 500 },
  });
  assert.equal(status, 401);
  assert.ok(data.erreur);
});

test('POST /api/prices refuse prix invalide', async () => {
  // Login
  const loginRes = await request('POST', '/api/auth/login', {
    body: { email: 'test@example.com', mot_de_passe: 'motdepasse123' },
  });
  const token = loginRes.data.token;
  
  const market = db.prepare('SELECT id FROM markets LIMIT 1').get();
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  
  const { status, data } = await request('POST', '/api/prices', {
    token,
    body: { product_id: product.id, market_id: market.id, prix: 0 },
  });
  assert.equal(status, 400);
  assert.ok(data.erreur);
});

test('POST /api/prices accepte un prix valide', async () => {
  const loginRes = await request('POST', '/api/auth/login', {
    body: { email: 'test@example.com', mot_de_passe: 'motdepasse123' },
  });
  const token = loginRes.data.token;
  
  const market = db.prepare('SELECT id FROM markets LIMIT 1').get();
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  
  const { status, data } = await request('POST', '/api/prices', {
    token,
    body: { product_id: product.id, market_id: market.id, prix: 450, date_releve: dateIlYa(1) },
  });
  assert.equal(status, 201);
  assert.equal(data.prix, 450);
});

test('POST /api/prices refuse un doublon', async () => {
  const loginRes = await request('POST', '/api/auth/login', {
    body: { email: 'test@example.com', mot_de_passe: 'motdepasse123' },
  });
  const token = loginRes.data.token;

  const market = db.prepare('SELECT id FROM markets LIMIT 1').get();
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();

  const { status, data } = await request('POST', '/api/prices', {
    token,
    body: { product_id: product.id, market_id: market.id, prix: 460, date_releve: dateIlYa(1) },
  });
  assert.equal(status, 409);
  assert.ok(data.erreur);
});

test('GET /api/prices/compare/:id classe les marchés', async () => {
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  const { status, data } = await request('GET', `/api/prices/compare/${product.id}`);
  assert.equal(status, 200);
  assert.equal(data.produit.id, product.id);
  assert.ok(Array.isArray(data.resultats));
});

test('GET /api/prices/history/:id retourne les points', async () => {
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  const { status, data } = await request('GET', `/api/prices/history/${product.id}`);
  assert.equal(status, 200);
  assert.equal(data.produit.id, product.id);
  assert.ok(Array.isArray(data.points));
  assert.ok(data.stats);
});
