# API PrixMarché

Base : `http://localhost:3000/api`

## Routes publiques (lecture)

| Méthode | URL | Rôle |
|---|---|---|
| GET | /health | état du serveur |
| GET | /markets | liste des marchés |
| GET | /products | produits (?q=, ?categorie=) |
| GET | /products/categories | catégories |
| GET | /products/:id | un produit |
| GET | /prices | derniers prix (?product_id=, ?market_id=, ?q=, ?categorie=, ?limit=), avec le champ `categorie` |
| GET | /prices/compare/:productId | comparaison par marché, du moins cher au plus cher |

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