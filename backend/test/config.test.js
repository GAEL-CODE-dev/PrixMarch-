const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const configPath = path.join(__dirname, '..', 'src', 'config.js');
const SECRET = 'secret-de-test-suffisamment-long-1234567890';

// Exécute la configuration dans un processus séparé : process.exit() ne doit
// pas arrêter le lanceur de tests.
function chargerConfig(env) {
  return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(configPath)})`], {
    env: { ...process.env, JWT_SECRET: SECRET, ...env },
    encoding: 'utf8',
  });
}

test('production : refuse CORS_ORIGIN=*', () => {
  const res = chargerConfig({ NODE_ENV: 'production', CORS_ORIGIN: '*' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /CORS_ORIGIN/);
});

test('production : CORS_ORIGIN vide = même origine uniquement', () => {
  const res = chargerConfig({ NODE_ENV: 'production', CORS_ORIGIN: '' });
  assert.equal(res.status, 0);
  assert.match(res.stderr, /même origine/);
});

test('production : accepte des origines explicites', () => {
  const res = chargerConfig({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://prixmarche.example,https://www.prixmarche.example',
  });
  assert.equal(res.status, 0);
});

test('développement : accepte * avec un avertissement', () => {
  const res = chargerConfig({ NODE_ENV: 'development', CORS_ORIGIN: '*' });
  assert.equal(res.status, 0);
  assert.match(res.stderr, /Attention/);
});

test('refuse un JWT_SECRET trop court', () => {
  const res = chargerConfig({
    NODE_ENV: 'development',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: 'trop-court',
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /JWT_SECRET/);
});
