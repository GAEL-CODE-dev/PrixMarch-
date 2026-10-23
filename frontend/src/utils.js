const formatteur = new Intl.NumberFormat('fr-FR');

// 1500 -> "1 500"
export function formatPrix(n) {
  return formatteur.format(n);
}

// Ancienneté du relevé, en toutes lettres
export function texteFraicheur(jours) {
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

// "le tas", "au kg", "au litre"
export function libelleUnite(unite) {
  return unite === 'kg' || unite === 'litre' ? `au ${unite}` : `le ${unite}`;
}