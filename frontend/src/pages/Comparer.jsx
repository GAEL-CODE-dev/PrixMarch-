import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatPrix, texteFraicheur } from '../utils.js';

export default function Comparer() {
  const [params, setParams] = useSearchParams();
  const [produits, setProduits] = useState([]);
  const [produitsCharges, setProduitsCharges] = useState(false);
  const [erreurProduits, setErreurProduits] = useState('');
  const [resultat, setResultat] = useState({ id: null, comparaison: null, erreur: '' });
  const chipActif = useRef(null);

  // La liste des produits, une seule fois
  useEffect(() => {
    let annule = false;
    api('/products')
      .then((p) => {
        if (!annule) setProduits(p);
      })
      .catch((e) => {
        if (!annule) setErreurProduits(e.message);
      })
      .finally(() => {
        if (!annule) setProduitsCharges(true);
      });
    return () => {
      annule = true;
    };
  }, []);

  // Produit choisi : celui de l'adresse (?produit=3), sinon le premier de la liste
  const idDemande = Number(params.get('produit'));
  const produitChoisi = produits.find((p) => p.id === idDemande) || produits[0] || null;
  const idChoisi = produitChoisi ? produitChoisi.id : null;

  // La comparaison du produit choisi
  useEffect(() => {
    if (idChoisi === null) return;

    let annule = false;
    api(`/prices/compare/${idChoisi}`)
      .then((data) => {
        if (!annule) setResultat({ id: idChoisi, comparaison: data, erreur: '' });
      })
      .catch((e) => {
        if (!annule) setResultat({ id: idChoisi, comparaison: null, erreur: e.message });
      });

    return () => {
      annule = true;
    };
  }, [idChoisi]);

  // Fait défiler la rangée jusqu'au produit choisi
  useEffect(() => {
    if (chipActif.current) {
      chipActif.current.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [idChoisi, produitsCharges]);

  function choisir(id) {
    setParams({ produit: String(id) }, { replace: true });
  }

  if (!produitsCharges) {
    return <p className="info">Chargement...</p>;
  }
  if (produits.length === 0) {
    return <p className="info erreur">{erreurProduits || 'Aucun produit disponible.'}</p>;
  }

  // On n'affiche que la comparaison qui correspond au produit choisi
  const aJour = idChoisi !== null && resultat.id === idChoisi;
  const chargement = idChoisi !== null && !aJour;
  const erreur = aJour ? resultat.erreur : '';
  const affichable = aJour && resultat.erreur === '' && resultat.comparaison !== null;
  const resultats = affichable ? resultat.comparaison.resultats : [];
  const n = resultats.length;
  const meilleur = resultats[0];
  const ecartMax = n > 1 ? resultats[n - 1].prix - meilleur.prix : 0;

  return (
    <section>
      <p className="etiquette">Sélection du produit</p>
      <div className="chips" role="group" aria-label="Produit à comparer">
        {produits.map((p) => (
          <button
            key={p.id}
            ref={p.id === idChoisi ? chipActif : null}
            type="button"
            className={p.id === idChoisi ? 'chip actif' : 'chip'}
            aria-pressed={p.id === idChoisi}
            onClick={() => choisir(p.id)}
          >
            {p.nom} ({p.unite})
          </button>
        ))}
      </div>

      {erreur && (
        <p className="info erreur" role="alert">
          {erreur}
        </p>
      )}
      {chargement && <p className="info">Chargement...</p>}

      {affichable && n === 0 && (
        <div className="carte-profil">
          <p className="profil-nom">Aucun prix relevé</p>
          <p className="profil-email">
            Personne n'a encore relevé le prix de ce produit. Sois la première personne à le faire.
          </p>
        </div>
      )}

      {n > 0 && (
        <>
          <h3 className="titre-liste">Prix par marché</h3>
          <p className="info">
            {n} marché{n > 1 ? 's' : ''} comparé{n > 1 ? 's' : ''}, du moins cher au plus cher
          </p>

          {resultats.map((r) => (
            <article
              key={r.market_id}
              className={r.est_le_moins_cher ? 'carte-prix meilleur' : 'carte-prix'}
            >
              <div className="carte-haut">
                <div>
                  <h4 className="carte-produit">{r.marche}</h4>
                  <p className="carte-marche">{r.quartier}</p>
                </div>
                {r.est_le_moins_cher ? (
                  <span className="badge-meilleur">Le moins cher</span>
                ) : (
                  <span className="badge-ecart">
                    +{formatPrix(r.prix - meilleur.prix)} FCFA vs {meilleur.marche}
                  </span>
                )}
              </div>

              <div className="ligne-prix">
                <p className="carte-montant">
                  <strong>{formatPrix(r.prix)}</strong> FCFA <span>/ {produitChoisi.unite}</span>
                </p>
                <span className={`fraicheur fraicheur-${r.fraicheur}`}>
                  <span className="point" aria-hidden="true" />
                  {texteFraicheur(r.jours_depuis)}
                </span>
              </div>

              {r.est_le_moins_cher && ecartMax > 0 && (
                <p className="economie">
                  Économie jusqu'à {formatPrix(ecartMax)} FCFA par rapport aux autres marchés
                </p>
              )}

              {r.fraicheur === 'ancien' && (
                <div className="a-actualiser">
                  <span>Prix à actualiser (plus de 14 jours)</span>
                  <Link to={`/ajouter?produit=${produitChoisi.id}&marche=${r.market_id}`}>
                    Mettre à jour
                  </Link>
                </div>
              )}
            </article>
          ))}
        </>
      )}

      <div className="legende">
        <p className="etiquette">Fiabilité et fraîcheur des prix</p>
        <div className="legende-ligne fraicheur-recent">
          <span className="point" aria-hidden="true" />
          <span>
            <strong>Moins de 3 jours</strong>
            Très récent, fiable
          </span>
        </div>
        <div className="legende-ligne fraicheur-moyen">
          <span className="point" aria-hidden="true" />
          <span>
            <strong>3 à 14 jours</strong>
            Indicatif
          </span>
        </div>
        <div className="legende-ligne fraicheur-ancien">
          <span className="point" aria-hidden="true" />
          <span>
            <strong>Plus de 14 jours</strong>
            À actualiser
          </span>
        </div>
      </div>

      <Link to="/ajouter" className="bouton-flottant">
        + Ajouter un prix constaté
      </Link>
    </section>
  );
}
