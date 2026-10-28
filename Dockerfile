# syntax=docker/dockerfile:1
#
# Image unique : l'API Express sert l'interface React déjà compilée.
# Utilisable telle quelle sur Render, Railway, Fly.io ou un VPS.

# --- 1. Compilation de l'interface React ---
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- 2. API + dépendances de production ---
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend

# better-sqlite3 est un module natif : la chaîne de compilation reste
# nécessaire quand aucun binaire précompilé ne correspond à la plateforme.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 && apt-get purge -y --auto-remove python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Pas de USER dédié : les disques persistants des hébergeurs sont montés en
# root, et un utilisateur non root n'y aurait pas accès en écriture sans un
# chown au démarrage. Un conteneur par application, sans autre processus.
RUN mkdir -p /app/backend/data

ENV PORT=3000 \
    DB_PATH=/app/backend/data/prixmarche.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
