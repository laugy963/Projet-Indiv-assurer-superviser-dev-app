import { Injectable, type NestMiddleware } from '@nestjs/common';
import { Metriques } from './metriques';

interface RequeteHttp {
  method?: string;
  /** Route trouvée par Express : son gabarit, par exemple « /api/annonces/:id ». Absente si aucune route ne correspond. */
  route?: { path?: unknown };
}

interface ReponseHttp {
  statusCode: number;
  on(evenement: 'finish', suite: () => void): unknown;
}

/**
 * Étiquette « route » d'une requête mesurée, ou rien si la requête ne doit pas l'être.
 * - Le gabarit de la route, jamais le chemin reçu : un identifiant dans l'étiquette créerait une série par annonce.
 * - « inconnue » pour tout chemin sans route : un balayage d'adresses ne crée qu'une série.
 * - Les routes internes (sondes, collecte) ne sont pas mesurées : on mesure ce que vit le client.
 */
export function routeMesuree(requete: RequeteHttp): string | undefined {
  const gabarit = requete.route?.path;
  if (typeof gabarit !== 'string') return 'inconnue';
  return gabarit.startsWith('/api') ? gabarit : undefined;
}

/**
 * Mesure la durée de chaque requête, de son arrivée à l'envoi de la réponse.
 * Placé avant la garde d'accès : les refus (401, 403) et les erreurs (500) sont comptés comme les réussites.
 */
@Injectable()
export class MesureRequetes implements NestMiddleware {
  constructor(private readonly metriques: Metriques) {}

  use(requete: RequeteHttp, reponse: ReponseHttp, suite: () => void): void {
    const depart = process.hrtime.bigint();
    reponse.on('finish', () => {
      const route = routeMesuree(requete);
      if (route === undefined) return;
      const dureeSecondes = Number(process.hrtime.bigint() - depart) / 1e9;
      this.metriques.observerRequete(requete.method ?? 'INCONNUE', route, reponse.statusCode, dureeSecondes);
    });
    suite();
  }
}
