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
├── Dockerfile            image unique : API + interface compilée
├── render.yaml           blueprint Render (disque persistant inclus)
├── backend/
│   ├── src/domain/       règles métier pures (médiane, quartiles, dates)
│   ├── src/routes/       auth, markets, products, prices
│   ├── src/db/           schéma, connexion, seed, sauvegarde
│   ├── test/             tests unitaires et d'intégration (node:test)
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
npm test            # tout : règles métier + API
npm run test:unit   # règles métier : médiane, quartiles, fraîcheur, dates, seuils
npm run test:api    # API : santé, auth, marchés, produits, prix (base temporaire)

cd frontend
npm run lint
npm run build
```

Les tests d'API démarrent le serveur sur un port aléatoire avec une base SQLite
temporaire : ils ne touchent pas aux données de développement. La CI
(`.github/workflows/ci.yml`) lance `npm test` avec `NODE_ENV=test`.

Les scripts PowerShell restent disponibles pour tester une instance déjà lancée :

```powershell
cd backend
./scripts/test-api.ps1
./scripts/test-limits.ps1
```

## Production

Le plus simple : **un seul service**, l'API Express sert l'interface React
compilée (`frontend/dist`). Le `Dockerfile` à la racine construit les deux.
La base SQLite doit vivre sur un **disque persistant**, sinon les comptes et les
prix disparaissent à chaque redéploiement.

### Render (déploiement clé en main)

1. Pousse le dépôt sur GitHub (les changements ne sont pas encore commités).
2. Render → **New** → **Blueprint** → choisis le dépôt : `render.yaml` est détecté.
3. Garde le plan **Starter** : les disques persistants ne sont pas disponibles
   sur le plan gratuit.
4. Déploie, puis vérifie `https://<service>.onrender.com/api/health`.

`render.yaml` configure le disque (1 Go monté sur `/var/data`), `DB_PATH`,
`TRUST_PROXY=1`, un `JWT_SECRET` généré, et `SEED_ON_START=true` pour insérer
marchés et produits sur un volume vide. Un `git push` redéploie sans toucher
aux données.

### Railway

1. **New Project** → **Deploy from GitHub repo** (Dockerfile détecté).
2. Variables : `NODE_ENV=production`, `JWT_SECRET`, `TRUST_PROXY=1`,
   `DB_PATH=/var/data/prixmarche.db`, `SEED_ON_START=true`.
3. **Volumes** → ajoute un volume monté sur `/var/data`.
4. Healthcheck : `/api/health`.

### Fly.io

```powershell
fly launch --no-deploy          # fly.toml généré depuis le Dockerfile
fly volumes create prixmarche_data --size 1 --region cdg
fly secrets set JWT_SECRET=<secret de 32 caractères minimum>
fly deploy
```

Dans `fly.toml`, ajoute :

```toml
[env]
  NODE_ENV = "production"
  DB_PATH = "/var/data/prixmarche.db"
  SEED_ON_START = "true"
  TRUST_PROXY = "1"

[mounts]
  source = "prixmarche_data"
  destination = "/var/data"
```

### VPS / Docker

```powershell
docker build -t prixmarche .
docker run -d --name prixmarche -p 3000:3000 `
  -v prixmarche-data:/var/data `
  -e DB_PATH=/var/data/prixmarche.db `
  -e JWT_SECRET=<secret> `
  -e TRUST_PROXY=1 `
  -e SEED_ON_START=true `
  prixmarche
```

Place ensuite Nginx/Caddy devant, en HTTPS.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `NODE_ENV` | `production` en ligne |
| `JWT_SECRET` | **obligatoire**, 32 caractères minimum (le serveur refuse de démarrer sinon) |
| `JWT_EXPIRES_IN` | durée du jeton, `7d` par défaut |
| `PORT` | port d'écoute (fourni par la plupart des hébergeurs) |
| `DB_PATH` | chemin de la base, à pointer vers le disque persistant |
| `TRUST_PROXY` | nombre de proxies (1 derrière Render/Railway/Fly/Nginx) |
| `CORS_ORIGIN` | origines autorisées, séparées par des virgules. **Vide = même origine** (cas normal). `*` refusé en production |
| `SEED_ON_START` | `true` pour insérer marchés et produits au démarrage (idempotent) |
| `RATE_LIMIT` | `off` uniquement en développement |

### Sauvegardes

```powershell
cd backend
npm run backup      # écrit data/backups/prixmarche-<date>.db
```

Copie ces fichiers hors du serveur (stockage objet, autre machine) : une
sauvegarde sur le même disque ne survit pas à une perte du disque.

### Limites connues

- **Une seule instance** : SQLite ne supporte pas plusieurs conteneurs sur le
  même volume. Pas de scale horizontal, pas de disque partagé entre instances.
- **Pas de récupération de compte** : un mot de passe perdu est définitif.
- Logs sur la sortie standard uniquement, pas de remontée d'erreurs.
- Pour une charge réelle ou plusieurs instances, migrer vers Postgres.

Si `frontend/dist` existe, le backend sert directement l'interface et renvoie
`index.html` sur les routes inconnues (rechargement de `/comparer`, etc.).
La route `GET /api/health` vérifie aussi l'accès à la base (503 en cas de
problème) et renvoie la version, l'environnement et l'heure du serveur.
L'arrêt du conteneur (`SIGTERM`) ferme proprement le serveur puis la base.

### Sans Docker

1. `cd frontend && npm ci && npm run build`
2. `cd backend && npm ci --omit=dev`
3. Renseigner les variables ci-dessus, puis `npm run seed` (première fois)
4. `npm start`

## Documentation

- [API](backend/docs/api.md)
- [Modèle de données](backend/docs/modele-donnees.md)
- [Captures des écrans](docs/maquettes)
