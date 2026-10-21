# API PrixMarché

Base : `http://localhost:3000/api`

| Méthode | URL | Rôle |
|---|---|---|
| GET | /health | état du serveur |
| GET | /markets | liste des marchés |
| GET | /products | produits (?q=, ?categorie=) |
| GET | /products/categories | catégories |
| GET | /products/:id | un produit |
| GET | /prices | derniers prix (?product_id=, ?market_id=, ?limit=) |
| POST | /prices | ajouter un prix (product_id, market_id, prix, date_releve optionnelle) |
| GET | /prices/compare/:productId | comparaison par marché, du moins cher au plus cher |

Erreurs : réponse JSON `{ "erreur": "message" }` avec le code 400, 404 ou 500.