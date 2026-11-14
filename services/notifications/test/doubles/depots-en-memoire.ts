import type { Categorie } from '../../src/domaine/centres-interet';
import type { Notification } from '../../src/domaine/notification';
import { DepotCentresInteret, DepotNotifications } from '../../src/domaine/ports';

/** Doubles de test des dépôts : tout est gardé en mémoire. */
export class CentresInteretEnMemoire extends DepotCentresInteret {
  readonly listes = new Map<string, Categorie[]>();

  async remplacer(membreId: string, categories: Categorie[]): Promise<void> {
    this.listes.set(membreId, [...categories]);
  }

  async lire(membreId: string): Promise<Categorie[]> {
    return this.listes.get(membreId) ?? [];
  }

  async membresInteressesPar(categorie: Categorie): Promise<string[]> {
    return [...this.listes.entries()].filter(([, categories]) => categories.includes(categorie)).map(([membreId]) => membreId);
  }
}

export class NotificationsEnMemoire extends DepotNotifications {
  readonly notifications: Notification[] = [];

  /** Comme la contrainte d'unicité de la base : une seule notification par membre et par annonce. */
  async ajouter(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      const existe = this.notifications.some((n) => n.membreId === notification.membreId && n.annonceId === notification.annonceId);
      if (!existe) this.notifications.push(notification);
    }
  }

  async listerPour(membreId: string, limite: number): Promise<Notification[]> {
    return this.notifications
      .filter((n) => n.membreId === membreId)
      .sort((a, b) => b.creeeLe.getTime() - a.creeeLe.getTime())
      .slice(0, limite);
  }
}
