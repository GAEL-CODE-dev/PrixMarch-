import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
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

  const [produits, setProduits] = useState([]);
  const [marches, setMarches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');

  const [dernierMarche] = useState(lireDernierMarche);
  const [produitId, setProduitId] = useState('');
  const [marcheId, setMarcheId] = useState(dernierMarche);
  const [prix, setPrix] = useState('');
  const [date, setDate] = useState(aujourdhui);

  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    Promise.all([api('/products'), api('/markets')])
      .then(([p, m]) => {
        if (annule) return;
        setProduits(p);
        setMarches(m);
        // le marché mémorisé n'existe peut-être plus
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

  const produit = produits.find((p) => String(p.id) === produitId);
  const marche = marches.find((m) => String(m.id) === marcheId);

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
          <Link to="/">Voir les derniers prix</Link>
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