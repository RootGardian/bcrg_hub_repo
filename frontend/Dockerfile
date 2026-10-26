# ==========================================
# 🐳 BCRG HUB — Frontend Dockerfile (Vite + Nginx)
# ==========================================

# --- Étape 1 : Construction de l'Application React (Build) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Déclaration de l'URL d'API relative (pour que Nginx relaye les requêtes /api)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Copie des manifestes de dépendances
COPY package*.json ./

# Installation complète des dépendances
RUN npm install

# Copie explicite des sources applicatives (évite qu'un node_modules hôte n'écrase celui du conteneur)
COPY vite.config.js index.html ./
COPY src ./src
COPY public ./public

# Export de node_modules/.bin dans le PATH pour garantir l'exécution de vite
ENV PATH="/app/node_modules/.bin:$PATH"

# Compilation de production Vite
RUN npm run build

# --- Étape 2 : Serveur Web de Production Nginx ---
FROM nginx:1.25-alpine AS runner

# Suppression des configurations et fichiers par défaut
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copie des fichiers statiques générés depuis l'étape de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de la configuration Nginx sur mesure (avec reverse-proxy vers le backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port HTTP 80
EXPOSE 80

# Sonde de santé du serveur Web
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Démarrage de Nginx au premier plan
CMD ["nginx", "-g", "daemon off;"]
