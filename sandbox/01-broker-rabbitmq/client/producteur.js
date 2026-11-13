// Producteur de test : publie NB événements « annonce.publiee », puis s'arrête.
// Il joue le rôle du service annonces.
'use strict';

const { EXCHANGE, CLE, connecter, journal } = require('./commun');

const NB = Number(process.env.NB || 1);
const PREFIXE = process.env.PREFIXE || 'test';
const DEFECTUEUX = process.env.DEFECTUEUX === '1';   // message que le consommateur refusera

async function principal() {
  const connexion = await connecter();
  // Canal « avec confirmation » : le broker confirme chaque message qu'il a pris en charge.
  const canal = await connexion.createConfirmChannel();
  await canal.assertExchange(EXCHANGE, 'topic', { durable: true });

  for (let i = 1; i <= NB; i++) {
    const id = `${PREFIXE}-${String(i).padStart(3, '0')}`;
    const evenement = {
      id,
      type: CLE,
      version: 1,
      date: new Date().toISOString(),
      donnees: { titre: `Annonce ${id}`, categorie: 'figurines', defectueux: DEFECTUEUX },
    };
    canal.publish(EXCHANGE, CLE, Buffer.from(JSON.stringify(evenement)), {
      persistent: true,                 // le message est écrit sur disque par le broker
      messageId: id,
      contentType: 'application/json',
    });
  }

  // Attend que le broker ait confirmé tous les messages ; échoue si l'un est refusé.
  await canal.waitForConfirms();
  journal({ etat: 'publies', prefixe: PREFIXE, nombre: NB, confirmesParLeBroker: true });

  await canal.close();
  await connexion.close();
}

principal().catch((erreur) => {
  journal({ etat: 'erreur', message: erreur.message });
  process.exit(1);
});
