import { routeMesuree } from './mesure-requetes';
import { Metriques } from './metriques';

// Composante d'observabilité (fiche 0011) : ce que Prometheus lit sur la route interne /metrics.
describe('Metriques — ce que le service expose à Prometheus', () => {
  it('compte une requête et range sa durée dans un histogramme, par méthode, route et code HTTP', async () => {
    const metriques = new Metriques();

    metriques.observerRequete('POST', '/api/annonces', 201, 0.042);

    const texte = await metriques.exposer();
    const etiquettes = 'method="POST",route="/api/annonces",code="201"';
    expect(texte).toContain(`http_request_duration_seconds_count{${etiquettes}} 1`);
    // 42 ms : au-dessus du palier de 25 ms, sous celui de 50 ms.
    expect(texte).toContain(`http_request_duration_seconds_bucket{le="0.025",${etiquettes}} 0`);
    expect(texte).toContain(`http_request_duration_seconds_bucket{le="0.05",${etiquettes}} 1`);
  });

  it('a un palier à 500 ms, le seuil de l’indicateur I2', async () => {
    const metriques = new Metriques();

    metriques.observerRequete('POST', '/api/annonces', 201, 0.6);

    const texte = await metriques.exposer();
    const etiquettes = 'method="POST",route="/api/annonces",code="201"';
    expect(texte).toContain(`http_request_duration_seconds_bucket{le="0.5",${etiquettes}} 0`);
    expect(texte).toContain(`http_request_duration_seconds_bucket{le="1",${etiquettes}} 1`);
  });

  it('expose aussi les métriques du processus Node.js', async () => {
    const texte = await new Metriques().exposer();

    expect(texte).toContain('process_cpu_seconds_total');
    expect(texte).toContain('process_resident_memory_bytes');
    expect(texte).toContain('nodejs_eventloop_lag_seconds');
  });

  it('répond au format texte de Prometheus', () => {
    expect(new Metriques().typeDeContenu).toContain('text/plain');
  });

  it('chaque instance a son registre : deux services dans le même processus ne se gênent pas', async () => {
    const premier = new Metriques();
    const second = new Metriques();

    premier.observerRequete('GET', '/api/annonces', 200, 0.01);

    expect(await second.exposer()).not.toContain('route="/api/annonces"');
  });
});

describe('routeMesuree — l’étiquette « route » d’une requête', () => {
  it('prend le gabarit de la route, jamais le chemin reçu : le nombre de séries reste borné', () => {
    expect(routeMesuree({ route: { path: '/api/annonces/:id' } })).toBe('/api/annonces/:id');
  });

  it('range sous « inconnue » toute requête qui ne correspond à aucune route', () => {
    expect(routeMesuree({})).toBe('inconnue');
  });

  it('ne mesure pas les routes internes : les sondes et la collecte fausseraient le taux de requêtes', () => {
    expect(routeMesuree({ route: { path: '/sante' } })).toBeUndefined();
    expect(routeMesuree({ route: { path: '/sante/pret' } })).toBeUndefined();
    expect(routeMesuree({ route: { path: '/metrics' } })).toBeUndefined();
  });
});
