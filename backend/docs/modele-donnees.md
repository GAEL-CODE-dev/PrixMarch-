## users : qui saisit les prix

id
nom
email
mot_de_passe (haché, jamais en clair)
role (user ou admin)
created_at

## markets : où le prix a été relevé

id
nom
quartier

## products : ce qu’on compare

id
nom
unite (kg, tas, litre…)
categorie

## prices : le cœur de l’app, un relevé de prix

id
product_id → products
market_id → markets
user_id → users
prix (entier, en FCFA)
date_releve
created_at

Contrainte : un seul relevé par personne, produit, marché et date
(index unique `idx_prices_unique_releve`). Les relevés de démonstration
(`user_id` NULL) ne sont pas concernés.