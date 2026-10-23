import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CartePrix from '../components/CartePrix.jsx';

export default function Accueil() {
  const [nbMarches, setNbMarches] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categorie, setCategorie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [prix, setPrix] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Marchés et catégories : une seule fois au chargement
  useEffect(() => {
    api('/markets')
      .then((m) => setNbMarches(m.length))
      .catch(() => {});
    api('/products/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Petite pause avant d'envoyer la recherche (évite une requête à chaque lettre)
  useEffect(() => {
    const t = setTimeout(() => setRechercheEnvoyee(recherche.trim()), 300);
    return () => clearTimeout(t);
  }, [recherche]);

  // Derniers prix, selon la catégorie et la recherche
  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur('');

    const params = new URLSearchParams({ limit: '20' });
    if (categorie) params.set('categorie', categorie);
    if (rechercheEnvoyee) params.set('q', rechercheEnvoyee);

    api(`/prices?${params}`)
      .then((data) => {
        if (!annule) setPrix(data);
      })
      .catch((e) => {
        if (!annule) setErreur(e.message);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [categorie, rechercheEnvoyee]);

  return (
    <section>
      <div className="pastilles">
        <span className="pastille">Brazzaville · en direct</span>
        {nbMarches !== null && (
          <span className="pastille pastille-vert">{nbMarches} marchés actifs</span>
        )}
      </div>

      <h2 className="accroche">
        Avant d'aller au marché, <span className="vert">vérifie les prix</span>.
      </h2>
      <p className="sous-titre">
        Économise sur ton panier du jour grâce aux relevés de la communauté.
      </p>

      <input
        className="recherche"
        type="search"
        placeholder="Chercher un produit (manioc, tomates...)"
        aria-label="Chercher un produit"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      <div className="chips" role="group" aria-label="Catégories">
        <button
          type="button"
          className={categorie === '' ? 'chip actif' : 'chip'}
          onClick={() => setCategorie('')}
        >
          Tous
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={categorie === c ? 'chip actif' : 'chip'}
            onClick={() => setCategorie(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <h3 className="titre-liste">Derniers prix ajoutés</h3>

      {chargement && prix.length === 0 && <p className="info">Chargement...</p>}
      {erreur && <p className="info erreur">{erreur}</p>}
      {!chargement && !erreur && prix.length === 0 && (
        <p className="info">Aucun prix trouvé.</p>
      )}
      {!erreur && prix.map((p) => <CartePrix key={p.id} prix={p} />)}

      <Link to="/ajouter" className="bouton-flottant">
        + Ajouter un prix
      </Link>
    </section>
  );
}