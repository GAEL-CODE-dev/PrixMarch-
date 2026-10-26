# PrixMarché

Application mobile-first pour comparer les prix des vivres entre les marchés de Brazzaville.

> Avant d'aller au marché, vérifie les prix.

## Fonctionnalités

- **Accueil** : derniers prix ajoutés, recherche instantanée, filtre par catégorie
- **Comparer** : classement des marchés du moins cher au plus cher, fraîcheur de chaque relevé
- **Évolution** : graphique des prix sur 7, 30 ou 90 jours, par marché
- **Ajouter un prix** : produit, unité automatique, fourchette habituelle, marché mémorisé (connexion requise)
- **Compte** : inscription, connexion, déconnexion

## Stack

| Côté | Technologies |
|---|---|
| API | Node.js, Express 5, better-sqlite3, JWT, bcrypt, express-rate-limit, helmet |
| Interface | React 19, Vite 8, React Router 7, Recharts |
| Données | SQLite (`backend/data/prixmarche.db`, créée automatiquement) |

## Structure

```
prixmarche/
├── backend/
│   ├── src/domain/       règles métier pures (médiane, quartiles, dates)
│   ├── src/routes/       auth, markets, products, prices
│   ├── src/db/           schéma, connexion, données de démonstration
│   ├── test/             tests unitaires (node:test)
│   └── docs/             API et modèle de données
├── frontend/
│   └── src/
│       ├── auth/         contexte et garde de route
│       ├── components/    mise en page, carte de prix, erreurs
│       └── pages/         Accueil, Comparer, Évolution, Compte, AjouterPrix
└── docs/maquettes/       captures des écrans
```

## Démarrage rapide

Prérequis : Node.js LTS (22 ou plus récent).

### 1. API

```powershell
cd backend
npm install
```

Crée `backend/.env` à partir de `backend/.env.example`, puis renseigne `JWT_SECRET` :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Avec une version récente de npm, autorise le script d'installation de better-sqlite3 :

```powershell
npm install-scripts approve better-sqlite3
npm rebuild better-sqlite3
```

Puis :

```powershell
npm run seed:demo   # marchés, produits et prix de démonstration
npm run dev         # http://localhost:3000
```

### 2. Interface

```powershell
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Le serveur de développement redirige `/api` vers `http://localhost:3000` (voir `vite.config.js`).
Pour viser une autre API : `VITE_API_URL=https://mon-api/api npm run build`.

## Tests et qualité

```powershell
cd backend
npm test            # règles métier : médiane, quartiles, fraîcheur, dates, seuils

cd frontend
npm run lint
npm run build
```

Les tests de bout en bout de l'API sont des scripts PowerShell à lancer serveur allumé :

```powershell
cd backend
./scripts/test-api.ps1
./scripts/test-limits.ps1
```

## Production

1. Construire l'interface : `cd frontend && npm run build`
2. Renseigner les variables d'environnement du backend :
   - `JWT_SECRET` (32 caractères minimum, obligatoire)
   - `JWT_EXPIRES_IN` (par défaut `7d`)
   - `CORS_ORIGIN` (origine publique de l'interface, séparée par des virgules)
   - `TRUST_PROXY=1` derrière un proxy (Render, Nginx, etc.)
   - ne pas laisser `RATE_LIMIT=off`
3. Démarrer : `cd backend && npm start`

Si `frontend/dist` existe, le backend sert directement l'interface et renvoie `index.html`
sur les routes inconnues (rechargement de `/comparer`, etc.). La route `GET /api/health`
vérifie aussi l'accès à la base (503 en cas de problème).

## Documentation

- [API](backend/docs/api.md)
- [Modèle de données](backend/docs/modele-donnees.md)
- [Captures des écrans](docs/maquettes)
