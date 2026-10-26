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

// Date au format AAAA-MM-JJ, à l'heure de Brazzaville, il y a N jours
export function dateIlYa(jours) {
  const d = new Date(Date.now() - jours * 86400000);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' });
}

export function aujourdhui() {
  return dateIlYa(0);
}

// "2026-10-21" -> "21 oct."
export function formatDateCourte(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

// "2026-10-21" -> "21 octobre 2026"
export function formatDateLongue(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
