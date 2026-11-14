import type { Categorie } from './centres-interet';
import type { Notification } from './notification';

// Ports : ce dont les cas d'usage ont besoin, sans dire comment c'est fait.
// Ce sont des classes abstraites, et non des interfaces, pour servir de jeton d'injection à NestJS.

export abstract class DepotCentresInteret {
  /** Remplace toute la liste du membre, en une seule transaction. */
  abstract remplacer(membreId: string, categories: Categorie[]): Promise<void>;
  abstract lire(membreId: string): Promise<Categorie[]>;
  abstract membresInteressesPar(categorie: Categorie): Promise<string[]>;
}

export abstract class DepotNotifications {
  /** Ajoute les notifications. Une notification qui existe déjà pour ce membre et cette annonce est ignorée. */
  abstract ajouter(notifications: Notification[]): Promise<void>;
  /** Notifications du membre, de la plus récente à la plus ancienne. */
  abstract listerPour(membreId: string, limite: number): Promise<Notification[]>;
}
