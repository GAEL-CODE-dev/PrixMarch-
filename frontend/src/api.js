const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(chemin, { methode = 'GET', corps, token } = {}) {
  const headers = {};
  if (corps) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let reponse;
  try {
    reponse = await fetch(`${BASE}${chemin}`, {
      method: methode,
      headers,
      body: corps ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. V\u00e9rifie ta connexion.');
  }

  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    // r\u00e9ponse vide ou qui n'est pas du JSON
  }

  if (!reponse.ok) {
    const erreur = new Error((donnees && donnees.erreur) || 'Une erreur est survenue');
    erreur.status = reponse.status;
    throw erreur;
  }
  return donnees;
}