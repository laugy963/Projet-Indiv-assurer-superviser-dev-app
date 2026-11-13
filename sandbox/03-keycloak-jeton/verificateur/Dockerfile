# Image du vérificateur de jetons du bac à sable.
FROM node:24.22.3-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY serveur.mjs ./
# Utilisateur non root désigné par son numéro : exigé par runAsNonRoot (constat de l'expérimentation 1).
USER 1000
EXPOSE 8080
CMD ["node", "serveur.mjs"]
