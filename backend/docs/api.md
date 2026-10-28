# API PrixMarché

Base : `http://localhost:3000/api`

## Routes publiques (lecture)

| Méthode | URL | Rôle |
|---|---|---|
| GET | /health | état du serveur et accès à la base (503 si la base est indisponible) |
| GET | /markets | liste des marchés |
| GET | /products | produits (?q=, ?categorie=) |
| GET | /products/categories | catégories |
| GET | /products/:id | un produit |
| GET | /prices | derniers prix (?product_id=, ?market_id=, ?q=, ?categorie=, ?limit=), avec le champ `categorie` |
| GET | /prices/compare/:productId | comparaison par marché, du moins cher au plus cher |

### Réponse de /health

```json
{
  "status": "ok",
  "app": "PrixMarché API",
  "version": "1.0.0",
  "env": "production",
  "time": "2026-10-28T12:00:00.000Z"
}
```

En cas d'échec de la base : code `503` et `status: "error"`. Les autres champs
restent identiques, ce qui permet de surveiller le service (uptime, version
déployée, environnement).

## Authentification

| Méthode | URL | Corps | Réponse |
|---|---|---|---|
| POST | /auth/register | nom, email, mot_de_passe (8 caractères min.) | 201 + utilisateur |
| POST | /auth/login | email, mot_de_passe | 200 + `token` et `user` |
| GET | /auth/me | (en-tête Authorization) | 200 + utilisateur connecté |

Le jeton se envoie dans chaque requête protégée : `Authorization: Bearer <token>` (valable 7 jours).

## Routes protégées

| Méthode | URL | Corps |
|---|---|---|
| POST | /prices | product_id, market_id, prix (entier, FCFA), date_releve (AAAA-MM-JJ, optionnelle) |

## Règles sur l'ajout d'un prix

- Date : pas dans le futur, pas plus de 90 jours dans le passé
- Un seul prix par personne, produit, marché et date (sinon 409)
- Prix refusé (422) s'il est plus de 5 fois au-dessus ou en dessous de la médiane des relevés du produit

## Codes d'erreur

Réponse JSON `{ "erreur": "message" }`.

| Code | Signification |
|---|---|
| 400 | données invalides |
| 401 | non connecté, jeton invalide ou expiré |
| 404 | ressource ou route introuvable |
| 409 | doublon (email déjà utilisé, prix déjà enregistré) |
| 413 | requête trop volumineuse (10 ko max) |
| 422 | prix incohérent |
| 429 | trop de requêtes |
| 500 | erreur interne |

## Environnement et CORS

- `CORS_ORIGIN` : origines autorisées, séparées par des virgules
  (ex. `https://prixmarche.example,https://www.prixmarche.example`).
- En `NODE_ENV=production`, le serveur refuse de démarrer si `CORS_ORIGIN`
  est vide ou vaut `*`.
- En développement, `*` est accepté mais un avertissement est affiché.
- `TRUST_PROXY=1` doit être défini derrière un reverse proxy (Render, Nginx...)
  pour que les limites de requêtes comptent la bonne adresse IP.
