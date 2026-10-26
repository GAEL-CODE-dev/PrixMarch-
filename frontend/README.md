# Interface PrixMarché

Interface React (Vite) de l'application PrixMarché. Voir le [README principal](../README.md)
pour le contexte, le démarrage complet et le déploiement.

```powershell
npm install
npm run dev     # http://localhost:5173, proxy /api vers http://localhost:3000
npm run lint
npm run build   # génère dist/, servi automatiquement par le backend
```

Routes :

| Adresse | Écran |
|---|---|
| `/` | derniers prix, recherche, catégories |
| `/comparer?produit=3` | comparaison entre marchés |
| `/evolution?produit=3&jours=30&marche=1` | graphique d'évolution |
| `/ajouter` | ajout d'un prix (connexion requise) |
| `/compte` | connexion, inscription, profil |

Variable optionnelle : `VITE_API_URL` (par défaut `/api`).
