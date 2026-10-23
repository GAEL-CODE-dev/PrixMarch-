
import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { api } from '../api';
import './Evolution.css';

function extraireListe(reponse) {
  if (Array.isArray(reponse)) return reponse;

  if (reponse && typeof reponse === 'object') {
    for (const cle of ['data', 'produits', 'products', 'prix', 'prices']) {
      if (Array.isArray(reponse[cle])) return reponse[cle];
    }
  }

  return [];
}

function lirePrix(releve) {
  const valeur = releve.prix ?? releve.price ?? releve.montant;
  const nombre = Number(valeur);

  return Number.isFinite(nombre) && nombre > 0 ? nombre : null;
}

function lireDate(releve) {
  const valeur =
    releve.date_releve ??
    releve.date ??
    releve.created_at ??
    releve.createdAt;

  if (!valeur) return null;

  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

function lireIdProduit(releve) {
  return String(
    releve.product_id ??
    releve.produit_id ??
    releve.id_produit ??
    releve.productId ??
    ''
  );
}

function lireNomProduit(produit) {
  return produit.nom ?? produit.name ?? produit.libelle ?? 'Produit sans nom';
}

function formaterPrix(valeur) {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(valeur)} FCFA`;
}

function formaterDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function Evolution() {
  const [produits, setProduits] = useState([]);
  const [releves, setReleves] = useState([]);
  const [produitId, setProduitId] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  async function chargerDonnees() {
    setChargement(true);
    setErreur('');

    try {
      const [reponseProduits, reponsePrix] = await Promise.all([
        api('/products'),
        api('/prices'),
      ]);

      const listeProduits = extraireListe(reponseProduits);
      const listePrix = extraireListe(reponsePrix);

      setProduits(listeProduits);
      setReleves(listePrix);

      setProduitId((ancienId) => {
        if (ancienId && listeProduits.some(
          (p) => String(p.id) === ancienId
        )) {
          return ancienId;
        }

        return listeProduits.length ? String(listeProduits[0].id) : '';
      });
    } catch (e) {
      setErreur(e.message || 'Impossible de charger les données.');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  
const historique = useMemo(() => {
  return releves
    .filter((releve) => {
      const id = releve.product_id ?? releve.produit_id ?? releve.id_produit;
      return String(id) === String(produitId);
    })
    .map((releve) => {
      const date = new Date(
        releve.date_releve ?? releve.date ?? releve.created_at
      );

      const prix = Number(releve.prix ?? releve.price ?? releve.montant);

      if (Number.isNaN(date.getTime()) || !Number.isFinite(prix)) {
        return null;
      }

      return {
        date,
        dateAffichee: date.toLocaleDateString('fr-FR'),
        dateTri: date.getTime(),
        prix,
        marche: releve.marche ?? releve.market ?? 'Non précisé',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dateTri - b.dateTri);
}, [releves, produitId]);


  const statistiques = useMemo(() => {
    if (!historique.length) {
      return { dernier: null, minimum: null, maximum: null, variation: null };
    }

    const prix = historique.map((item) => item.prix);
    const premier = prix[0];
    const dernier = prix[prix.length - 1];

    return {
      dernier,
      minimum: Math.min(...prix),
      maximum: Math.max(...prix),
      variation:
        premier > 0 ? ((dernier - premier) / premier) * 100 : null,
    };
  }, [historique]);

  if (chargement) {
    return (
      <main className="evolution-page">
        <p className="evolution-message">Chargement de l'historique des prix...</p>
      </main>
    );
  }

  return (
    <main className="evolution-page">
      <header className="evolution-header">
        <div>
          <h1>Évolution des prix</h1>
          <p>Consulte l'historique des prix de tes produits sur les marchés.</p>
        </div>

        <button
          type="button"
          className="evolution-refresh"
          onClick={chargerDonnees}
        >
          <RefreshCw size={17} />
          Actualiser
        </button>
      </header>

      {erreur && (
        <div className="evolution-erreur" role="alert">
          {erreur}
        </div>
      )}

      <section className="evolution-filtre">
        <label htmlFor="choix-produit">Choisir un produit</label>
        <select
          id="choix-produit"
          value={produitId}
          onChange={(e) => setProduitId(e.target.value)}
        >
          {produits.length === 0 && (
            <option value="">Aucun produit disponible</option>
          )}

          {produits.map((produit) => (
            <option key={produit.id} value={String(produit.id)}>
              {lireNomProduit(produit)}
            </option>
          ))}
        </select>
      </section>

      <section className="evolution-statistiques">
        <article className="evolution-stat">
          <span>Dernier prix relevé</span>
          <strong>
            {statistiques.dernier === null
              ? '—'
              : formaterPrix(statistiques.dernier)}
          </strong>
          <small>Selon les relevés disponibles</small>
        </article>

        <article className="evolution-stat">
          <span>Prix minimum</span>
          <strong>
            {statistiques.minimum === null
              ? '—'
              : formaterPrix(statistiques.minimum)}
          </strong>
          <small>Sur l'historique affiché</small>
        </article>

        <article className="evolution-stat">
          <span>Prix maximum</span>
          <strong>
            {statistiques.maximum === null
              ? '—'
              : formaterPrix(statistiques.maximum)}
          </strong>
          <small>Sur l'historique affiché</small>
        </article>

        <article className="evolution-stat">
          <span>Variation globale</span>
          <strong
            className={
              statistiques.variation > 0
                ? 'variation-hausse'
                : statistiques.variation < 0
                  ? 'variation-baisse'
                  : ''
            }
          >
            {statistiques.variation === null
              ? '—'
              : `${statistiques.variation > 0 ? '+' : ''}${statistiques.variation.toFixed(1)} %`}
          </strong>
          <small>
            {statistiques.variation === null
              ? 'Données insuffisantes'
              : statistiques.variation > 0
                ? 'Hausse depuis le premier relevé'
                : statistiques.variation < 0
                  ? 'Baisse depuis le premier relevé'
                  : 'Prix stable'}
          </small>
        </article>
      </section>

      <section className="evolution-graphique">
        <div className="evolution-graphique-entete">
          <div>
            <h2>Historique des prix</h2>
            <p>{historique.length} relevé(s) disponible(s)</p>
          </div>
          <TrendingUp size={25} />
        </div>

        {historique.length < 1 ? (
          <div className="evolution-vide">
            <TrendingDown size={34} />
            <h3>Aucun historique disponible</h3>
            <p>
              Vérifie qu'il existe des relevés pour ce produit et que chaque
              relevé contient un prix, une date et son identifiant de produit.
            </p>
          </div>
        ) : (
          <div className="evolution-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historique}
                margin={{ top: 15, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateAffichee"
                  tick={{ fontSize: 12 }}
                  minTickGap={25}
                />
                <YAxis
                  width={85}
                  tickFormatter={(valeur) =>
                    new Intl.NumberFormat('fr-FR', {
                      notation: 'compact',
                    }).format(valeur)
                  }
                />
                <Tooltip
                  formatter={(valeur) => [formaterPrix(Number(valeur)), 'Prix']}
                  labelFormatter={(label) => `Date : ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="prix"
                  name="Prix"
                  stroke="#B91C1C"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {historique.length > 0 && (
        <section className="evolution-table-section">
          <h2>Derniers relevés</h2>
          <div className="evolution-table-wrapper">
            <table className="evolution-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Marché</th>
                  <th>Prix</th>
                </tr>
              </thead>
              <tbody>
                {[...historique].reverse().slice(0, 10).map((item, index) => (
                  <tr key={`${item.dateTri}-${index}`}>
                    <td>{formaterDate(item.date)}</td>
                    <td>{item.marche || 'Non précisé'}</td>
                    <td>{formaterPrix(item.prix)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
