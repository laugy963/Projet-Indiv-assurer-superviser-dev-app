// Sonde du broker pour les tests « avec un broker réel » (CA-06, CA-14).
// Elle se connecte avec le compte d'administration de l'environnement de test,
// distinct des comptes des services : elle observe et publie sans passer par leur code.
import { connect, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import { lireVariable } from '../src/configuration/variables';

export interface MessageRecu {
  contenu: unknown;
  cleDeRoutage: string;
  persistant: boolean;
  typeDeContenu: string | undefined;
}

/** Les messages reçus sur une file temporaire liée à un exchange. */
export class Ecoute {
  private readonly recus: MessageRecu[] = [];

  recevoir(message: ConsumeMessage): void {
    this.recus.push({
      contenu: JSON.parse(message.content.toString('utf8')),
      cleDeRoutage: message.fields.routingKey,
      persistant: message.properties.deliveryMode === 2,
      typeDeContenu: message.properties.contentType,
    });
  }

  /** Attend le prochain message, ou échoue après le délai. */
  async prochain(delaiMs = 3000): Promise<MessageRecu> {
    const limite = Date.now() + delaiMs;
    while (this.recus.length === 0) {
      if (Date.now() > limite) throw new Error(`Aucun message reçu en ${delaiMs} ms`);
      await new Promise((suite) => setTimeout(suite, 20));
    }
    return this.recus.shift() as MessageRecu;
  }

  /** Laisse au broker le temps de remettre un message, puis rend le nombre de messages reçus. */
  async nombreApres(delaiMs: number): Promise<number> {
    await new Promise((suite) => setTimeout(suite, delaiMs));
    return this.recus.length;
  }
}

export class SondeBroker {
  private constructor(
    private readonly connexion: ChannelModel,
    private readonly canal: ConfirmChannel,
  ) {}

  static async connecter(): Promise<SondeBroker> {
    const motDePasse = encodeURIComponent(lireVariable('AMQP_ADMIN_MOT_DE_PASSE'));
    const connexion = await connect(`amqp://admin-tests:${motDePasse}@127.0.0.1:5672`);
    return new SondeBroker(connexion, await connexion.createConfirmChannel());
  }

  /** Crée une file temporaire, propre à ce test, liée à l'exchange par la clé de routage. */
  async ecouter(exchange: string, cleDeRoutage: string): Promise<Ecoute> {
    const ecoute = new Ecoute();
    const { queue } = await this.canal.assertQueue('', { exclusive: true, autoDelete: true });
    await this.canal.bindQueue(queue, exchange, cleDeRoutage);
    await this.canal.consume(queue, (message) => message && ecoute.recevoir(message), { noAck: true });
    return ecoute;
  }

  /** Publie un message et attend la confirmation du broker. */
  async publier(exchange: string, cleDeRoutage: string, contenu: unknown): Promise<void> {
    this.canal.publish(exchange, cleDeRoutage, Buffer.from(JSON.stringify(contenu)), {
      persistent: true,
      contentType: 'application/json',
    });
    await this.canal.waitForConfirms();
  }

  /** Nombre de messages en attente dans une file : ceux qui ne sont remis à aucun consommateur. */
  async enAttente(file: string): Promise<number> {
    return (await this.canal.checkQueue(file)).messageCount;
  }

  async vider(file: string): Promise<void> {
    await this.canal.purgeQueue(file);
  }

  async fermer(): Promise<void> {
    await this.canal.close();
    await this.connexion.close();
  }
}
