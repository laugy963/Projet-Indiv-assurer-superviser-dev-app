/** Vérification d'une dépendance : elle échoue par une exception. */
export type Verification = () => Promise<unknown>;

/**
 * Dit si le service peut servir : c'est la question de la sonde « prêt » de Kubernetes.
 * Chaque dépendance sans laquelle aucune route ne répond est interrogée, avec un délai maximum :
 * une base injoignable ne répond pas « non », elle ne répond pas du tout.
 */
export class Disponibilite {
  constructor(
    private readonly verifications: Verification[],
    private readonly delaiMaxMs = 2000,
  ) {}

  /** Rend la main si toutes les dépendances répondent à temps ; sinon, échoue avec le motif. */
  async verifier(): Promise<void> {
    await Promise.all(this.verifications.map((verification) => this.borner(verification)));
  }

  private async borner(verification: Verification): Promise<void> {
    let minuterie: NodeJS.Timeout | undefined;
    const delai = new Promise<never>((_, echec) => {
      minuterie = setTimeout(() => echec(new Error(`Délai dépassé : ${this.delaiMaxMs} ms`)), this.delaiMaxMs);
    });
    try {
      await Promise.race([verification(), delai]);
    } finally {
      clearTimeout(minuterie);
    }
  }
}
