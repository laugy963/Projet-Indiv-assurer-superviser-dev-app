import { Controller, Get, Res } from '@nestjs/common';
import { RouteInterne } from '../securite/decorateurs';
import { Metriques } from './metriques';

interface ReponseHttp {
  type(typeDeContenu: string): unknown;
}

/**
 * Route interne lue par Prometheus : hors de /api, donc jamais exposée par l'Ingress.
 * Dans le cluster, une NetworkPolicy ne laisse que Prometheus l'atteindre.
 */
@Controller('metrics')
export class MetriquesControleur {
  constructor(private readonly metriques: Metriques) {}

  @Get()
  @RouteInterne()
  async lire(@Res({ passthrough: true }) reponse: ReponseHttp): Promise<string> {
    reponse.type(this.metriques.typeDeContenu);
    return this.metriques.exposer();
  }
}
