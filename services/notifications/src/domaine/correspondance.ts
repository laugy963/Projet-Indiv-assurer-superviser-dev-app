/**
 * Règle métier de l'US-04 : qui notifier d'une annonce ?
 * Les membres qui ont choisi sa catégorie, chacun une fois, sauf son auteur (hypothèse H4).
 */
export function destinataires(auteurId: string, membresInteresses: readonly string[]): string[] {
  return [...new Set(membresInteresses)].filter((membreId) => membreId !== auteurId);
}
