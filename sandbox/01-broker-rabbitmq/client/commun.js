// Éléments partagés par le producteur et le consommateur de test.
// La topologie reprend celle de la fiche 0007.
'use strict';

const amqp = require('amqplib');

const EXCHANGE = 'annonces';                               // point d'aiguillage, de type topic
const CLE = 'annonce.publiee';                             // clé de routage = type de l'événement
const FILE = 'notifications.annonce-publiee';              // file du service abonné
const EXCHANGE_ECHECS = 'annonces.echecs';                 // reçoit les messages refusés
const FILE_ECHECS = 'notifications.annonce-publiee.echecs';

// Le mot de passe vient d'un Secret Kubernetes, jamais du code.
function url() {
  const utilisateur = encodeURIComponent(process.env.AMQP_UTILISATEUR);
  const motDePasse = encodeURIComponent(process.env.AMQP_MOT_DE_PASSE);
  const hote = process.env.AMQP_HOTE || 'rabbitmq';
  return `amqp://${utilisateur}:${motDePasse}@${hote}:5672`;
}

// Le broker peut démarrer après le client : on réessaie quelques fois.
async function connecter() {
  for (let essai = 1; ; essai++) {
    try {
      return await amqp.connect(url());
    } catch (erreur) {
      if (essai >= 30) throw erreur;
      await new Promise((suite) => setTimeout(suite, 2000));
    }
  }
}

// Une ligne JSON par événement : facile à compter avec grep.
function journal(objet) {
  console.log(JSON.stringify(objet));
}

module.exports = { EXCHANGE, CLE, FILE, EXCHANGE_ECHECS, FILE_ECHECS, connecter, journal };
