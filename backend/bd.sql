-- 1. Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des marchés
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    quartier VARCHAR(150) NOT NULL
);

-- 3. Table des produits
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    unite VARCHAR(50) NOT NULL,
    categorie VARCHAR(100) NOT NULL
);

-- 4. Table des relevés de prix
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    market_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    prix INTEGER NOT NULL CHECK (prix >= 0),
    date_releve DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Relations avec les autres tables
    CONSTRAINT fk_prices_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prices_market
        FOREIGN KEY (market_id)
        REFERENCES markets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prices_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 5. Index pour accélérer les recherches de prix
CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_market_id ON prices(market_id);
CREATE INDEX idx_prices_user_id ON prices(user_id);
CREATE INDEX idx_prices_date_releve ON prices(date_releve);