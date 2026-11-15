import { decrireRoutesInternes } from '@epouvante/socle/outils-de-test';
import { demarrerBanc, identifiant } from './banc';

// Sondes de Kubernetes et collecte de Prometheus : le scénario, commun aux deux services, est dans le socle.
// Propre à ce service : ses routes d'API, et l'identifiant d'une annonce, qui ne doit pas devenir une étiquette.
decrireRoutesInternes({
  service: 'annonces',
  demarrerBanc,
  requetes: [
    { appel: (http) => http.get('/api/annonces'), serie: 'method="GET",route="/api/annonces",code="401"' },
    {
      appel: (http) => http.delete(`/api/annonces/${identifiant(1)}`),
      serie: 'method="DELETE",route="/api/annonces/:id",code="401"',
    },
  ],
  absentDesMetriques: identifiant(1),
});
