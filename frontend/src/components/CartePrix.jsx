import { Link } from 'react-router-dom';
import { formatPrix, texteFraicheur, libelleUnite } from '../utils.js';

export default function CartePrix({ prix }) {
  return (
    <Link to={`/comparer?produit=${prix.product_id}`} className="carte-prix carte-lien">
      <div className="carte-haut">
        <div>
          <h4 className="carte-produit">
            {prix.produit}
            <span className="unite">{libelleUnite(prix.unite)}</span>
          </h4>
          <p className="carte-marche">{prix.marche}</p>
        </div>
        <span className={`fraicheur fraicheur-${prix.fraicheur}`}>
          <span className="point" aria-hidden="true" />
          {texteFraicheur(prix.jours_depuis)}
        </span>
      </div>
      <p className="carte-montant">
        <strong>{formatPrix(prix.prix)}</strong> FCFA
      </p>
      <span className="carte-comparer">Comparer les marchés ›</span>
    </Link>
  );
}