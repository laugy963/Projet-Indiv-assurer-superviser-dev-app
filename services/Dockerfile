# Image d'un service du prototype. Un seul fichier pour les deux services :
#   docker build -f services/Dockerfile --build-arg SERVICE=annonces -t epouvante/annonces .
# Le contexte de construction est la racine du dépôt : le service dépend du socle commun (fiche 0012).
# Version de Node.js figée : la LTS en cours (fiche 0002). Image de base minimale (alpine).
ARG NODE_VERSION=26.13.1

# --- Étape 1 : compilation TypeScript, avec les outils de développement ---
FROM node:${NODE_VERSION}-alpine AS construction
ARG SERVICE
WORKDIR /app
# Les dépendances d'abord : cette couche n'est reconstruite que si elles changent.
COPY package.json package-lock.json ./
COPY libs/socle/package.json libs/socle/
COPY services/annonces/package.json services/annonces/
COPY services/notifications/package.json services/notifications/
COPY tests/acceptation/package.json tests/acceptation/
# « npm ci » installe exactement les versions du verrou.
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY libs/socle libs/socle
COPY services/${SERVICE} services/${SERVICE}
RUN npm run build -w @epouvante/socle && npm run build -w @epouvante/${SERVICE}

# --- Étape 2 : dépendances d'exécution seulement, sans outil de développement ---
FROM node:${NODE_VERSION}-alpine AS dependances
ARG SERVICE
WORKDIR /app
COPY package.json package-lock.json ./
COPY libs/socle/package.json libs/socle/
COPY services/annonces/package.json services/annonces/
COPY services/notifications/package.json services/notifications/
COPY tests/acceptation/package.json tests/acceptation/
RUN npm ci --omit=dev --no-audit --no-fund -w @epouvante/socle -w @epouvante/${SERVICE} && npm cache clean --force

# --- Étape 3 : image livrée. Ni sources, ni compilateur, ni tests, ni secret ---
FROM node:${NODE_VERSION}-alpine
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependances /app/node_modules node_modules
COPY --from=construction /app/libs/socle/package.json libs/socle/package.json
COPY --from=construction /app/libs/socle/dist libs/socle/dist
COPY --from=construction /app/services/${SERVICE}/package.json services/${SERVICE}/package.json
COPY --from=construction /app/services/${SERVICE}/dist services/${SERVICE}/dist
WORKDIR /app/services/${SERVICE}
# Utilisateur non root, désigné par son numéro (1000 = node) : avec un nom, Kubernetes ne peut pas
# vérifier runAsNonRoot et refuse de démarrer le conteneur (difficulté du bac à sable).
USER 1000
EXPOSE 3000
# Node.js est le premier processus du conteneur : il reçoit SIGTERM et s'arrête proprement (voir demarrage.ts).
CMD ["node", "dist/main.js"]
