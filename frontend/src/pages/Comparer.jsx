
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import './Comparer.css';
import {
  Search,
  ArrowDownUp,
  MapPin,
  CalendarDays,
  RefreshCw,
  Trophy,
  AlertCircle,
  LoaderCircle,
  ShoppingBasket,
} from 'lucide-react';

const extraireListe = (data, cles = []) => {
  if (Array.isArray(data)) return data;

  for (const cle of cles) {
    if (Array.isArray(data?.[cle])) return data[cle];
  }

  return [];
};

const lireDate = (prix) =>
  prix.date_releve || prix.dateReleve || prix.created_at || prix.createdAt;

const estAncien = (date) => {
  if (!date) return true;

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return true;

  const jours = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return jours > 14;
};

const formaterDate = (date) => {
  if (!date) return 'Date inconnue';

  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return 'Date inconnue';

  return valeur.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const nomProduit = (prix) =>
  prix.product?.nom ||
  prix.produit?.nom ||
  prix.product_nom ||
  prix.produit_nom ||
  prix.nom_produit ||
  '';

const nomMarche = (prix) =>
  prix.market?.nom ||
  prix.marche?.nom ||
  prix.market_nom ||
  prix.marche_nom ||
  '';

export default function Comparer() {
  const [produits, setProduits] = useState([]);
  const [prix, setPrix] = useState([]);
  const [produitId, setProduitId] = useState('');
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [actualisation, setActualisation] = useState(false);

  const chargerDonnees = async (silencieux = false) => {
    if (silencieux) {
      setActualisation(true);
    } else {
      setChargement(true);
    }

    setErreur('');

    try {
      const [produitsData, prixData] = await Promise.all([
        api('/products'),
        api('/prices'),
      ]);

      const listeProduits = extraireListe(produitsData, [
        'produits',
        'products',
        'data',
      ]);

      const listePrix = extraireListe(prixData, [
        'prix',
        'prices',
        'data',
      ]);

      setProduits(listeProduits);
      setPrix(listePrix);

      setProduitId((ancienId) => {
        if (ancienId && listeProduits.some(
          (p) => String(p.id) === String(ancienId)
        )) {
          return ancienId;
        }

        return listeProduits[0]?.id
          ? String(listeProduits[0].id)
          : '';
      });
    } catch (err) {
      setErreur(err.message || 'Impossible de charger les données.');
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const produitsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return produits.filter((p) =>
      (p.nom || '').toLowerCase().includes(terme)
    );
  }, [produits, recherche]);

  const produitSelectionne = produits.find(
    (p) => String(p.id) === String(produitId)
  );

  const prixComparables = useMemo(() => {
    return prix
      .filter((p) => {
        const idProduit =
          p.product_id ?? p.productId ?? p.produit_id;

        return (
          String(idProduit) === String(produitId) &&
          Number(p.prix) > 0 &&
          nomMarche(p)
        );
      })
      .sort((a, b) => Number(a.prix) - Number(b.prix));
  }, [prix, produitId]);

  const unite =
    produitSelectionne?.unite ||
    produitSelectionne?.unit ||
    '';

  const nombreAnciens = prixComparables.filter((p) =>
    estAncien(lireDate(p))
  ).length;

  if (chargement) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-600">
        <LoaderCircle className="animate-spin" size={24} />
        <span>Chargement des prix des marchés...</span>
      </div>
    );
  }

  return (
    <main className="comparer-page">
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Comparer les prix
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Trouve le marché le plus avantageux pour ton approvisionnement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => chargerDonnees(true)}
          disabled={actualisation}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={actualisation ? 'animate-spin' : ''}
          />
          Actualiser
        </button>
      </header>

      {/* Erreur API */}
      {erreur && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Chargement impossible</p>
            <p className="mt-1">{erreur}</p>
            <button
              type="button"
              onClick={() => chargerDonnees()}
              className="mt-2 font-semibold underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Sélection du produit */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <label
          htmlFor="recherche-produit"
          className="mb-2 block text-sm font-semibold text-gray-800"
        >
          Quel produit veux-tu acheter ?
        </label>

        <div className="relative mb-4">
          <Search
            size={19}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            id="recherche-produit"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit..."
            className="min-h-12 w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {produitsFiltres.map((produit) => (
            <button
              key={produit.id}
              type="button"
              onClick={() => setProduitId(String(produit.id))}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                String(produit.id) === String(produitId)
                  ? 'border-green-700 bg-green-700 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-500'
              }`}
            >
              {produit.nom}
            </button>
          ))}

          {produitsFiltres.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucun produit trouvé.
            </p>
          )}
        </div>
      </section>

      {/* Résumé */}
      <section className="rounded-2xl bg-green-800 p-5 text-white sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <ShoppingBasket size={26} />
          </div>

          <div>
            <p className="text-sm text-green-100">Produit sélectionné</p>
            <h2 className="text-xl font-bold">
              {produitSelectionne?.nom || 'Choisis un produit'}
            </h2>
            {unite && (
              <p className="mt-1 text-sm text-green-100">
                Unité de référence : {unite}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-sm text-green-100">Marchés comparés</p>
            <p className="mt-1 text-2xl font-bold">
              {prixComparables.length}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-sm text-green-100">Prix à vérifier</p>
            <p className="mt-1 text-2xl font-bold">{nombreAnciens}</p>
          </div>
        </div>
      </section>

      {/* Classement des prix */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ArrowDownUp size={20} className="text-green-700" />
          <h2 className="text-lg font-bold text-gray-900">
            Classement des marchés
          </h2>
        </div>

        {prixComparables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
            <MapPin className="mx-auto mb-3 text-gray-400" size={32} />
            <h3 className="font-semibold text-gray-800">
              Aucun prix disponible
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Aucun relevé exploitable n'est disponible pour ce produit.
              Tu peux en ajouter un pour commencer la comparaison.
            </p>
            <a
              href="/ajouter"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
            >
              + Ajouter un prix
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {prixComparables.map((item, index) => {
              const date = lireDate(item);
              const ancien = estAncien(date);

              return (
                <article
                  key={item.id ?? `${nomMarche(item)}-${index}`}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          index === 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index === 0 ? (
                          <Trophy size={22} />
                        ) : (
                          <MapPin size={22} />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-gray-900">
                            {nomMarche(item)}
                          </h3>

                          {index === 0 && (
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                              Moins cher
                            </span>
                          )}
                        </div>

                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                          <CalendarDays size={15} />
                          Relevé : {formaterDate(date)}
                        </p>

                        {ancien && (
                          <p className="mt-2 text-sm font-medium text-amber-700">
                            Prix ancien : à vérifier
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {Number(item.prix).toLocaleString('fr-FR')} FCFA
                      </p>

                      {unite && (
                        <p className="mt-1 text-sm text-gray-500">
                          par {unite}
                        </p>
                      )}

                      {ancien && (
                        <a
                          href="/ajouter"
                          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          <RefreshCw size={15} />
                          Mettre à jour
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Les prix sont indicatifs et proviennent des relevés enregistrés.
        Vérifie leur date avant de te déplacer au marché.
      </p>
    </main>
  );
}
