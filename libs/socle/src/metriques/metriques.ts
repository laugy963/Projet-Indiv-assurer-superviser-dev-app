import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from '@prometheus-io/client';

/**
 * Métriques du service, lues par Prometheus sur la route interne /metrics (fiche 0011).
 *   http_request_duration_seconds : durée des requêtes de l'API, par méthode, route et code HTTP.
 *     Prometheus en tire le temps de réponse au 95e centile (indicateur I2), le débit, et le taux
 *     de requêtes réussies (indicateur I4).
 *   process_*, nodejs_* : processeur, mémoire et boucle d'événements du processus Node.js.
 */
@Injectable()
export class Metriques {
  // Un registre par instance, et non le registre global de la bibliothèque :
  // les tests créent plusieurs services dans le même processus.
  private readonly registre = new Registry();

  private readonly dureeRequetes = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP de l’API, en secondes',
    labelNames: ['method', 'route', 'code'] as const,
    // Paliers resserrés autour de 500 ms, le seuil de l'indicateur I2.
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registre],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registre });
  }

  observerRequete(methode: string, route: string, code: number, dureeSecondes: number): void {
    this.dureeRequetes.observe({ method: methode, route, code: String(code) }, dureeSecondes);
  }

  get typeDeContenu(): string {
    return this.registre.contentType;
  }

  exposer(): Promise<string> {
    return this.registre.metrics();
  }
}
