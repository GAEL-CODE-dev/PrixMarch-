const test = require('node:test');
const assert = require('node:assert/strict');

const {
  today,
  joursDepuis,
  fraicheur,
  isValidDate,
  mediane,
  quantile,
  estHorsFourchette,
} = require('../src/domain/prix');

test('mediane : valeur centrale, liste triée ou non', () => {
  assert.equal(mediane([3, 1, 2]), 2);
  assert.equal(mediane([5, 1, 4, 2]), 3); // (2 + 4) / 2
  assert.equal(mediane([1500, 1500, 1500]), 1500);
});

test('quantile : interpolation linéaire aux bornes usuelles', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2);
  assert.equal(quantile([1, 2, 3, 4, 5], 0.75), 4);
  assert.equal(quantile([10, 20, 30, 40], 0.25), 18);
  assert.equal(quantile([10, 20, 30, 40], 0.75), 33);
});

test('fraicheur : seuils de la maquette (3 et 14 jours)', () => {
  assert.equal(fraicheur(0), 'recent');
  assert.equal(fraicheur(2), 'recent');
  assert.equal(fraicheur(3), 'moyen');
  assert.equal(fraicheur(14), 'moyen');
  assert.equal(fraicheur(15), 'ancien');
});

test('isValidDate : accepte les dates réelles, refuse le reste', () => {
  assert.equal(isValidDate('2026-10-26'), true);
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('2026-1-1'), false);
  assert.equal(isValidDate('pas une date'), false);
  assert.equal(isValidDate(null), false);
});

test('joursDepuis : aujourd’hui vaut 0, jamais de valeur négative', () => {
  assert.equal(joursDepuis(today()), 0);
  assert.equal(joursDepuis('2999-01-01'), 0);
  assert.equal(joursDepuis('2000-01-01') > 90, true);
});

test('estHorsFourchette : tolère exactement 5x la médiane', () => {
  assert.equal(estHorsFourchette(1000, 1000), false);
  assert.equal(estHorsFourchette(5000, 1000), false);
  assert.equal(estHorsFourchette(5001, 1000), true);
  assert.equal(estHorsFourchette(200, 1000), false);
  assert.equal(estHorsFourchette(199, 1000), true);
});
