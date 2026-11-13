import { Controller, Get } from '@nestjs/common';
import { RouteInterne } from '@epouvante/socle';

/** Route interne : hors de /api, donc jamais exposée par l'Ingress. Les sondes de Kubernetes arrivent à l'étape 7. */
@Controller('sante')
export class SanteControleur {
  @Get()
  @RouteInterne()
  lire(): { etat: string } {
    return { etat: 'ok' };
  }
}
