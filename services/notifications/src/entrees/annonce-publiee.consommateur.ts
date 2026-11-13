import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { NotifierMembresInteresses } from '../application/notifier-membres-interesses';
import { CLE_ANNONCE_PUBLIEE, lireEvenement, type EvenementAnnoncePubliee } from '../domaine/evenement-annonce-publiee';

interface Canal {
  ack(message: unknown): void;
  nack(message: unknown, tousLesPrecedents: boolean, remettreEnFile: boolean): void;
}

/**
 * Point d'entrée des messages du broker : le pendant d'un contrôleur HTTP.
 * Livraison « au moins une fois » (architecture, paragraphe 6.3) : l'accusé de réception est manuel,
 * et envoyé seulement après l'enregistrement des notifications.
 */
@Controller()
export class AnnoncePublieeConsommateur {
  private readonly journal = new Logger(AnnoncePublieeConsommateur.name);

  constructor(private readonly notifier: NotifierMembresInteresses) {}

  // <string> : choisit la signature classique du décorateur, celle où le second paramètre est le contexte du message.
  @EventPattern<string>(CLE_ANNONCE_PUBLIEE)
  async traiter(@Payload() brut: unknown, @Ctx() contexte: RmqContext): Promise<void> {
    const canal = contexte.getChannelRef() as Canal;
    const message = contexte.getMessage();
    const dejaRemis = message.fields?.redelivered === true;

    let evenement: EvenementAnnoncePubliee;
    try {
      evenement = lireEvenement(brut);
    } catch (erreur) {
      // Message défectueux : le rejouer ne le réparera pas. Refusé sans remise en file,
      // il part vers la file des messages en échec, où il peut être examiné.
      this.journal.warn({ etat: 'evenement-refuse', motif: erreur instanceof Error ? erreur.message : 'inconnu' });
      canal.nack(message, false, false);
      return;
    }

    try {
      const notifies = await this.notifier.executer(evenement);
      // Accusé de réception APRÈS l'enregistrement : si le service tombe avant, le broker remet le message.
      canal.ack(message);
      this.journal.log({ etat: 'evenement-traite', evenementId: evenement.id, annonceId: evenement.donnees.annonceId, notifies, dejaRemis });
    } catch (erreur) {
      // Panne du traitement (base injoignable…) : une seconde chance, puis la file des messages en échec.
      this.journal.error(
        { etat: 'traitement-en-echec', evenementId: evenement.id, dejaRemis },
        erreur instanceof Error ? erreur.stack : String(erreur),
      );
      canal.nack(message, false, !dejaRemis);
    }
  }
}
