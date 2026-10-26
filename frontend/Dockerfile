# ==========================================
# 🐳 BCRG HUB — Frontend Dockerfile (Vite + Nginx)
# Mode : utilise le dossier dist/ pré-compilé en local
# ==========================================

# --- Étape 1 : Serveur Web de Production Nginx ---
FROM nginx:1.25-alpine AS runner

# Suppression des configurations et fichiers par défaut
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copie des fichiers statiques pré-compilés (dist/ buildé en local)
COPY dist /usr/share/nginx/html

# Copie de la configuration Nginx sur mesure (avec reverse-proxy vers le backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port HTTP 80
EXPOSE 80

# Sonde de santé du serveur Web
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Démarrage de Nginx au premier plan
CMD ["nginx", "-g", "daemon off;"]
