const BASE = import.meta.env.VITE_API_URL || '/api';
const DELAI_MAX = 15000;

export async function api(chemin, { methode = 'GET', corps, token } = {}) {
  const headers = {};
  if (corps) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  // Ne jamais laisser l'interface bloquée sur une requête sans réponse
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX);

  let reponse;
  try {
    reponse = await fetch(`${BASE}${chemin}`, {
      method: methode,
      headers,
      body: corps ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre. Réessaie.', { cause: e });
    }
    throw new Error('Impossible de joindre le serveur. Vérifie ta connexion.', { cause: e });
  } finally {
    clearTimeout(minuteur);
  }

  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    // réponse vide ou qui n'est pas du JSON
  }

  if (!reponse.ok) {
    const erreur = new Error((donnees && donnees.erreur) || 'Une erreur est survenue');
    erreur.status = reponse.status;
    throw erreur;
  }
  return donnees;
}
