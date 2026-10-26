import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api.js';
import { formatDateCourte, formatDateLongue, formatPrix } from '../utils.js';

const PERIODES = [
  { jours: 7, label: '7 jours' },
  { jours: 30, label: '30 jours' },
  { jours: 90, label: '3 mois' },
];

const COULEURS = ['#006629', '#f39c12', '#1f78b4', '#8a4a00', '#7b3fa0', '#d6336c'];
const couleur = (marcheId) => COULEURS[(marcheId - 1) % COULEURS.length];

// Une ligne par date, une colonne par marché : { date, m1: 1500, m2: 1650 }
function construireSerie(points) {
  const lignes = new Map();
  for (const p of points) {
    const ligne = lignes.get(p.date) || { date: p.date };
    ligne[`m${p.market_id}`] = p.prix;
    lignes.set(p.date, ligne);
  }
  return [...lignes.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export default function Evolution() {
  const [params, setParams] = useSearchParams();
  const [produits, setProduits] = useState([]);
  const [produitsCharges, setProduitsCharges] = useState(false);
  const [erreurProduits, setErreurProduits] = useState('');
  const [resultat, setResultat] = useState({ cle: null, historique: null, erreur: '' });
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

  // Sélection lue dans l'adresse
  const idDemande = Number(params.get('produit'));
  const produitChoisi = produits.find((p) => p.id === idDemande) || produits[0] || null;
  const idChoisi = produitChoisi ? produitChoisi.id : null;
  const joursDemandes = Number(params.get('jours'));
  const jours = PERIODES.some((p) => p.jours === joursDemandes) ? joursDemandes : 30;
  const marcheId = Number(params.get('marche')) || null;

  // Clé de la requête : le résultat n'est affiché que s'il correspond
  // encore au produit, à la période et au marché sélectionnés.
  const cle = idChoisi === null ? null : `${idChoisi}|${jours}|${marcheId ?? ''}`;

  // L'historique du produit, de la période et du marché choisis
  useEffect(() => {
    if (cle === null) return;

    let annule = false;
    const q = new URLSearchParams({ jours: String(jours) });
    if (marcheId) q.set('marche', String(marcheId));

    api(`/prices/history/${idChoisi}?${q}`)
      .then((data) => {
        if (!annule) setResultat({ cle, historique: data, erreur: '' });
      })
      .catch((e) => {
        if (!annule) setResultat({ cle, historique: null, erreur: e.message });
      });

    return () => {
      annule = true;
    };
  }, [cle, idChoisi, jours, marcheId]);

  // Fait défiler la rangée jusqu'au produit choisi
  useEffect(() => {
    if (chipActif.current) {
      chipActif.current.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [idChoisi, produitsCharges]);

  // Modifie un ou plusieurs éléments de l'adresse (null = supprimer)
  function maj(changements) {
    const suivant = new URLSearchParams(params);
    for (const [cleParam, valeur] of Object.entries(changements)) {
      if (valeur === null) suivant.delete(cleParam);
      else suivant.set(cleParam, String(valeur));
    }
    setParams(suivant, { replace: true });
  }

  if (!produitsCharges) {
    return <p className="info">Chargement...</p>;
  }
  if (produits.length === 0) {
    return <p className="info erreur">{erreurProduits || 'Aucun produit disponible.'}</p>;
  }

  const aJour = cle !== null && resultat.cle === cle;
  const chargement = cle !== null && !aJour;
  const erreur = aJour ? resultat.erreur : '';
  const historique = aJour ? resultat.historique : null;
  const marches = historique ? historique.marches : [];
  const points = historique ? historique.points : [];
  const serie = construireSerie(points);
  const marchesTraces = marcheId ? marches.filter((m) => m.id === marcheId) : marches;

  return (
    <section>
      <p className="etiquette">Baromètre des vivres</p>
      <div className="chips" role="group" aria-label="Produit">
        {produits.map((p) => (
          <button
            key={p.id}
            ref={p.id === idChoisi ? chipActif : null}
            type="button"
            className={p.id === idChoisi ? 'chip actif' : 'chip'}
            aria-pressed={p.id === idChoisi}
            onClick={() => maj({ produit: p.id, marche: null })}
          >
            {p.nom} ({p.unite})
          </button>
        ))}
      </div>

      {marches.length > 0 && (
        <div className="chips" role="group" aria-label="Marché">
          <button
            type="button"
            className={marcheId === null ? 'chip actif' : 'chip'}
            aria-pressed={marcheId === null}
            onClick={() => maj({ marche: null })}
          >
            Tous les marchés
          </button>
          {marches.map((m) => (
            <button
              key={m.id}
              type="button"
              className={marcheId === m.id ? 'chip chip-marche actif' : 'chip chip-marche'}
              aria-pressed={marcheId === m.id}
              onClick={() => maj({ marche: m.id })}
            >
              <span
                className="pastille-couleur"
                style={{ background: couleur(m.id) }}
                aria-hidden="true"
              />
              {m.nom}
            </button>
          ))}
        </div>
      )}

      <div className="periodes" role="group" aria-label="Période">
        {PERIODES.map((p) => (
          <button
            key={p.jours}
            type="button"
            className={p.jours === jours ? 'periode actif' : 'periode'}
            aria-pressed={p.jours === jours}
            onClick={() => maj({ jours: p.jours })}
          >
            {p.label}
          </button>
        ))}
      </div>

      {erreur && (
        <p className="info erreur" role="alert">
          {erreur}
        </p>
      )}
      {chargement && <p className="info">Chargement...</p>}

      {historique && points.length === 0 && (
        <div className="carte-profil">
          <p className="profil-nom">Aucun relevé sur cette période</p>
          <p className="profil-email">
            Essaie une période plus longue, ou choisis « Tous les marchés ».
          </p>
        </div>
      )}

      {historique && points.length > 0 && (
        <div className="carte-graphique">
          <h3>Prix en FCFA / {produitChoisi.unite}</h3>
          <div role="img" aria-label={`Évolution du prix de ${produitChoisi.nom}`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateCourte} minTickGap={28} />
                <YAxis
                  width={56}
                  allowDecimals={false}
                  tickFormatter={formatPrix}
                  domain={[
                    (min) => Math.floor((min - 50) / 100) * 100,
                    (max) => Math.ceil((max + 50) / 100) * 100,
                  ]}
                />
                <Tooltip
                  labelFormatter={formatDateLongue}
                  formatter={(valeur, nom) => [`${formatPrix(valeur)} FCFA`, nom]}
                />
                {marchesTraces.map((m) => (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={`m${m.id}`}
                    name={m.nom}
                    stroke={couleur(m.id)}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
