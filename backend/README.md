# PrixMarché Brazzaville — API

## Problème

À Brazzaville, les revendeuses perdent du temps et de l'argent à faire le tour des marchés
pour trouver où s'approvisionner au meilleur prix.

## Utilisateur principal

La revendeuse de produits de base (légumes, poisson, céréales...). Elle veut savoir, en moins
d'une minute et depuis son téléphone, dans quel marché acheter un produit le moins cher, et
ajouter un prix en quelques secondes.

## Promesse

Avant d'aller au marché, vérifie les prix.

## Fonctionnalités du MVP

1. Liste des produits et des marchés
2. Ajouter un prix
3. Comparer un produit entre marchés
4. Graphique d'évolution
5. Connexion simple

## Hors périmètre

- Paiement
- Messagerie
- Application mobile native
- Notifications

## Démarrage

```powershell
npm install
copy .env.example .env      # puis renseigne JWT_SECRET (32 caractères minimum)
npm run seed:demo
npm run dev                 # http://localhost:3000
```

## Tests

```powershell
npm test                    # tout (règles métier + API)
npm run test:unit           # règles métier uniquement
npm run test:api            # API d'intégration (base SQLite temporaire)
```

Les tests d'intégration démarrent l'application sur un port aléatoire et
n'utilisent ni la base ni les données de développement. Les scripts PowerShell
restent disponibles pour tester un serveur déjà démarré :

```powershell
./scripts/test-api.ps1      # serveur allumé
./scripts/test-limits.ps1
```

## Production

- `npm start` (le serveur sert aussi `frontend/dist` s'il existe)
- Variables utiles : `NODE_ENV`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `TRUST_PROXY`
- En `NODE_ENV=production` : `CORS_ORIGIN` obligatoire, `*` refusé au démarrage
- Ne pas laisser `RATE_LIMIT=off`

Documentation : [API](docs/api.md) · [Modèle de données](docs/modele-donnees.md)
