import { Controller, Get, Logger, Res } from '@nestjs/common';
import { RouteInterne } from '../securite/decorateurs';
import { Disponibilite } from './disponibilite';

interface ReponseHttp {
  status(code: number): unknown;
}

/**
 * Routes internes lues par les sondes de Kubernetes : hors de /api, donc jamais exposées par l'Ingress.
 *   /sante       sonde « vivant » : le processus répond-il ? En cas d'échec, Kubernetes redémarre le conteneur.
 *   /sante/pret  sonde « prêt » : peut-il servir ? En cas d'échec, le pod sort du Service, sans redémarrage.
 */
@Controller('sante')
export class SanteControleur {
  private readonly journal = new Logger(SanteControleur.name);

  constructor(private readonly disponibilite: Disponibilite) {}

  /** Ne teste aucune dépendance : une panne de la base ne doit pas faire redémarrer tous les pods en boucle. */
  @Get()
  @RouteInterne()
  lire(): { etat: string } {
    return { etat: 'ok' };
  }

  @Get('pret')
  @RouteInterne()
  async pret(@Res({ passthrough: true }) reponse: ReponseHttp): Promise<{ etat: string }> {
    try {
      await this.disponibilite.verifier();
      return { etat: 'pret' };
    } catch (erreur) {
      // Le motif reste dans le journal : la réponse n'en dit rien.
      this.journal.warn({ etat: 'non-pret', motif: erreur instanceof Error ? erreur.message : String(erreur) });
      reponse.status(503);
      return { etat: 'indisponible' };
    }
  }
}
