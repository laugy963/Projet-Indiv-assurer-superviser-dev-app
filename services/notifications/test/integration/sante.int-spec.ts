import { decrireRoutesInternes } from '@epouvante/socle/outils-de-test';
import { demarrerBanc } from './banc';

// Sondes de Kubernetes et collecte de Prometheus : le scénario, commun aux deux services, est dans le socle.
// Propre à ce service : ses deux routes d'API.
decrireRoutesInternes({
  service: 'notifications',
  demarrerBanc,
  requetes: [
    { appel: (http) => http.get('/api/notifications'), serie: 'method="GET",route="/api/notifications",code="401"' },
    {
      appel: (http) => http.put('/api/centres-interet').send({ categories: ['bd'] }),
      serie: 'method="PUT",route="/api/centres-interet",code="401"',
    },
  ],
});
