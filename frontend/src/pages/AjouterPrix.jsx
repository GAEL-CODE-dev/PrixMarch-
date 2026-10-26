import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/useAuth.js';
import { aujourdhui, dateIlYa, formatPrix } from '../utils.js';

const CLE_MARCHE = 'prixmarche_dernier_marche';

function lireDernierMarche() {
  try {
    return localStorage.getItem(CLE_MARCHE) || '';
  } catch {
    return '';
  }
}

function ecrireDernierMarche(id) {
  try {
    localStorage.setItem(CLE_MARCHE, String(id));
  } catch {
    // stockage indisponible : ce n'est pas grave
  }
}

export default function AjouterPrix() {
  const { token, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [produits, setProduits] = useState([]);
  const [marches, setMarches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');

  const [dernierMarche] = useState(lireDernierMarche);
  // Préremplissage depuis l'adresse : /ajouter?produit=3&marche=6
  const [produitId, setProduitId] = useState(() => params.get('produit') || '');
  const [marcheId, setMarcheId] = useState(() => params.get('marche') || dernierMarche);
  const [prix, setPrix] = useState('');
  const [date, setDate] = useState(aujourdhui);

  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [lienComparaison, setLienComparaison] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [habituel, setHabituel] = useState({ produitId: null, donnees: null });

  useEffect(() => {
    let annule = false;
    Promise.all([api('/products'), api('/markets')])
      .then(([p, m]) => {
        if (annule) return;
        setProduits(p);
        setMarches(m);
        // un produit ou un marché inconnu (adresse modifiée, marché mémorisé supprimé)
        setProduitId((id) => (p.some((x) => String(x.id) === id) ? id : ''));
        setMarcheId((id) => (m.some((x) => String(x.id) === id) ? id : ''));
      })
      .catch((e) => {
        if (!annule) setErreurChargement(e.message);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, []);

  // Fourchette habituelle du produit choisi
  useEffect(() => {
    if (!produitId) return;

    let annule = false;
    api(`/prices/habituel/${produitId}`)
      .then((data) => {
        if (!annule) setHabituel({ produitId, donnees: data });
      })
      .catch(() => {
        if (!annule) setHabituel({ produitId, donnees: null });
      });

    return () => {
      annule = true;
    };
  }, [produitId]);

  const produit = produits.find((p) => String(p.id) === produitId);
  const marche = marches.find((m) => String(m.id) === marcheId);

  // On n'utilise la fourchette que si elle correspond au produit choisi
  const habituelAJour =
    produitId !== '' && habituel.produitId === produitId && habituel.donnees !== null;
  const fourchette = habituelAJour && habituel.donnees.bas !== null ? habituel.donnees : null;
  const prixSaisi = Number(prix);
  const horsFourchette =
    fourchette !== null &&
    prixSaisi > 0 &&
    (prixSaisi < fourchette.bas || prixSaisi > fourchette.haut);

  async function soumettre(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');

    const prixNum = Number(prix);
    if (!prixNum || prixNum <= 0) {
      setErreur('Saisis un prix supérieur à 0');
      return;
    }

    setEnvoi(true);
    try {
      await api('/prices', {
        methode: 'POST',
        token,
        corps: {
          product_id: Number(produitId),
          market_id: Number(marcheId),
          prix: prixNum,
          date_releve: date,
        },
      });
      ecrireDernierMarche(marcheId);
      setSucces(`Prix enregistré : ${produit.nom}, ${marche.nom}, ${formatPrix(prixNum)} FCFA`);
      setLienComparaison(`/comparer?produit=${produitId}`);
      // on garde le marché et la date pour enchaîner les produits
      setProduitId('');
      setPrix('');
    } catch (err) {
      if (err.status === 401) {
        deconnexion();
        navigate('/compte', {
          replace: true,
          state: { from: '/ajouter', message: 'Ta session a expiré, reconnecte-toi.' },
        });
        return;
      }
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return <p className="info">Chargement...</p>;
  }
  if (erreurChargement) {
    return <p className="info erreur">{erreurChargement}</p>;
  }

  return (
    <section>
      <p className="sous-titre">Brazzaville · contribution rapide</p>

      {succes && (
        <div className="bandeau-info" role="status">
          <p className="bandeau-texte">{succes}</p>
          <p className="bandeau-liens">
            <Link to={lienComparaison}>Comparer ce produit</Link>
            <Link to="/">Voir les derniers prix</Link>
          </p>
        </div>
      )}

      <form className="formulaire" onSubmit={soumettre}>
        <label className="champ">
          <span className="champ-titre">
            <span>
              Produit <span className="requis">*</span>
            </span>
          </span>
          <select value={produitId} onChange={(e) => setProduitId(e.target.value)} required>
            <option value="">Choisir un produit</option>
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>

        <div className="champ">
          <span className="champ-titre">
            <span>Unité de mesure</span>
            <span className="pastille pastille-vert">Automatique</span>
          </span>
          <div className="champ-verrouille">
            {produit ? produit.unite : "Choisis d'abord un produit"}
            <small>Défini automatiquement selon le produit</small>
          </div>
        </div>

        <label className="champ">
          <span className="champ-titre">
            <span>
              Marché concerné <span className="requis">*</span>
            </span>
            {marcheId !== '' && marcheId === dernierMarche && (
              <span className="pastille pastille-vert">Dernier sélectionné</span>
            )}
          </span>
          <select value={marcheId} onChange={(e) => setMarcheId(e.target.value)} required>
            <option value="">Choisir un marché</option>
            {marches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom} ({m.quartier})
              </option>
            ))}
          </select>
        </label>

        <label className="champ">
          <span className="champ-titre">
            <span>
              Prix constaté <span className="requis">*</span>
            </span>
          </span>
          <div className="champ-prix">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              maxLength={7}
              value={prix}
              onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))}
              required
            />
            <span className="devise">FCFA</span>
          </div>
                    {habituelAJour && (
            <span className="indice">
              {fourchette
                ? fourchette.bas === fourchette.haut
                  ? `Prix habituel : environ ${formatPrix(fourchette.bas)} FCFA`
                  : `Prix habituel : ${formatPrix(fourchette.bas)} - ${formatPrix(fourchette.haut)} FCFA`
                : 'Pas encore assez de relevés pour indiquer un prix habituel.'}
            </span>
          )}
          {horsFourchette && (
            <span className="indice indice-alerte">
              Ce prix sort de la fourchette habituelle : vérifie-le avant d'enregistrer.
            </span>
          )}
        </label>

        <label className="champ">
          <span className="champ-titre">
            <span>Date du constat</span>
          </span>
          <input
            type="date"
            value={date}
            min={dateIlYa(89)}
            max={aujourdhui()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        {erreur && (
          <p className="info erreur" role="alert">
            {erreur}
          </p>
        )}

        <button type="submit" className="bouton" disabled={envoi}>
          {envoi ? 'Enregistrement...' : 'Enregistrer le prix'}
        </button>
        <Link to="/" className="lien-annuler">
          Annuler
        </Link>
      </form>
    </section>
  );
}