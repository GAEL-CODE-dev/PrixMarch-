// Règles métier pures autour d'un relevé de prix.
// Isolées ici pour être testables sans Express ni base de données.

const PRIX_MAX = 1000000; // garde-fou contre les fautes de frappe
const JOURS_MAX = 90; // un relevé plus vieux est refusé
const FACTEUR_ECART = 5; // prix refusé s'il dépasse 5x la médiane (ou en dessous de 1/5)
const NB_MIN_RELEVES = 5; // nombre de relevés minimum pour activer ce contrôle

// Date AAAA-MM-JJ, à l'heure de Brazzaville
function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' });
}

// Date AAAA-MM-JJ, à l'heure de Brazzaville, il y a N jours
function dateIlYa(jours) {
  return new Date(Date.now() - jours * 86400000).toLocaleDateString('sv-SE', {
    timeZone: 'Africa/Brazzaville',
  });
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

// Jours calendaires écoulés à l'heure de Brazzaville (0 = aujourd'hui).
// On compare des dates (pas des instants) pour éviter le décalage d'un jour
// entre minuit UTC et minuit local.
function joursDepuis(dateStr) {
  const jour = Date.parse(`${dateStr}T00:00:00Z`);
  const aujourdhui = Date.parse(`${today()}T00:00:00Z`);
  return Math.max(0, Math.round((aujourdhui - jour) / 86400000));
}

// Même code couleur que la maquette : vert / orange / gris
function fraicheur(jours) {
  if (jours < 3) return 'recent';
  if (jours <= 14) return 'moyen';
  return 'ancien';
}

function mediane(valeurs) {
  const tri = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[milieu] : Math.round((tri[milieu - 1] + tri[milieu]) / 2);
}

// Valeur sous laquelle se trouve une part q des prix (0.25 = premier quartile)
function quantile(valeurs, q) {
  const tri = [...valeurs].sort((a, b) => a - b);
  const pos = (tri.length - 1) * q;
  const bas = Math.floor(pos);
  const haut = Math.ceil(pos);
  return Math.round(tri[bas] + (tri[haut] - tri[bas]) * (pos - bas));
}

// Un prix est jugé incohérent s'il s'écarte de plus de FACTEUR_ECART fois
// la médiane, dans un sens ou dans l'autre.
function estHorsFourchette(prix, medianeConnue) {
  return prix > medianeConnue * FACTEUR_ECART || prix < medianeConnue / FACTEUR_ECART;
}

module.exports = {
  PRIX_MAX,
  JOURS_MAX,
  FACTEUR_ECART,
  NB_MIN_RELEVES,
  today,
  dateIlYa,
  isValidDate,
  joursDepuis,
  fraicheur,
  mediane,
  quantile,
  estHorsFourchette,
};
