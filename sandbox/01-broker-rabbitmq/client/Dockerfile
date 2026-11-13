# Image du client AMQP du bac à sable : producteur et consommateur de test.
# Version de Node.js figée ; image de base minimale (alpine).
FROM node:24.22.3-alpine
WORKDIR /app
# Les dépendances d'abord : cette couche n'est reconstruite que si elles changent.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY commun.js producteur.js consommateur.js ./
# Utilisateur non root de l'image officielle, désigné par son numéro (1000 = node).
# Avec un nom (« USER node »), Kubernetes ne peut pas vérifier runAsNonRoot et refuse de démarrer le conteneur.
USER 1000
CMD ["node", "consommateur.js"]
