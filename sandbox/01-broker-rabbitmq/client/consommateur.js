// Consommateur de test : lit la file et accuse réception après traitement.
// Il joue le rôle du service notifications.
//
// MODE=normal          : traite chaque message, puis accuse réception.
// MODE=panne-une-fois  : s'arrête AVANT l'accusé de réception à la première remise d'un message,
//                        pour vérifier que le broker le remet après le redémarrage.
// Dans les deux modes, un message marqué « defectueux » est refusé sans remise en file :
// il doit partir vers la file des messages en échec.
'use strict';

const { EXCHANGE, CLE, FILE, EXCHANGE_ECHECS, FILE_ECHECS, connecter, journal } = require('./commun');

const MODE = process.env.MODE || 'normal';

async function principal() {
  const connexion = await connecter();
  const canal = await connexion.createChannel();

  // Topologie : déclarée par le client, de façon idempotente.
  await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
  await canal.assertQueue(FILE, { durable: true });            // la file survit à un redémarrage du broker
  await canal.bindQueue(FILE, EXCHANGE, CLE);
  await canal.assertExchange(EXCHANGE_ECHECS, 'fanout', { durable: true });
  await canal.assertQueue(FILE_ECHECS, { durable: true });
  await canal.bindQueue(FILE_ECHECS, EXCHANGE_ECHECS, '');

  await canal.prefetch(1);                                      // un message à la fois
  journal({ etat: 'pret', mode: MODE });

  await canal.consume(
    FILE,
    (message) => {
      if (message === null) return;
      const evenement = JSON.parse(message.content.toString());
      const dejaRemis = message.fields.redelivered;            // vrai si le broker remet ce message
      journal({ etat: 'recu', id: evenement.id, dejaRemis });

      if (evenement.donnees && evenement.donnees.defectueux) {
        canal.nack(message, false, false);                      // refus sans remise en file
        journal({ etat: 'refuse', id: evenement.id });
        return;
      }

      if (MODE === 'panne-une-fois' && !dejaRemis) {
        journal({ etat: 'panne-simulee', id: evenement.id });
        process.exit(1);                                        // arrêt brutal, sans accusé de réception
      }

      canal.ack(message);                                       // accusé de réception manuel, après traitement
      journal({ etat: 'traite', id: evenement.id, dejaRemis });
    },
    { noAck: false },                                           // accusé de réception manuel
  );

  // Arrêt propre. Kubernetes envoie le signal SIGTERM avant de supprimer un pod.
  // Sans ce traitement, Node.js, premier processus du conteneur, ignore le signal :
  // le pod met 30 secondes à s'arrêter et continue de consommer pendant ce temps (mesuré le 13 novembre 2026).
  const arreter = async () => {
    journal({ etat: 'arret' });
    await canal.close();          // les messages non accusés retournent dans la file
    await connexion.close();
    process.exit(0);
  };
  process.on('SIGTERM', arreter);
  process.on('SIGINT', arreter);
}

principal().catch((erreur) => {
  journal({ etat: 'erreur', message: erreur.message });
  process.exit(1);
});
