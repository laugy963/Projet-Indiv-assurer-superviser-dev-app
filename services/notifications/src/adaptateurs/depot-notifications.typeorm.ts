import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Categorie, TypeAnnonce } from '../domaine/centres-interet';
import type { Notification } from '../domaine/notification';
import { DepotNotifications } from '../domaine/ports';
import { NotificationEntite } from './entites';

/** Adaptateur PostgreSQL des notifications. */
@Injectable()
export class DepotNotificationsTypeOrm extends DepotNotifications {
  constructor(private readonly bdd: DataSource) {
    super();
  }

  async ajouter(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) return;
    // « ON CONFLICT DO NOTHING » : la contrainte d'unicité (membre, annonce) fait ignorer une notification
    // déjà créée. Un événement remis deux fois par le broker ne crée donc qu'une notification (critère CA-14).
    await this.bdd.createQueryBuilder().insert().into(NotificationEntite).values(notifications).orIgnore().execute();
  }

  async listerPour(membreId: string, limite: number): Promise<Notification[]> {
    const lignes = await this.bdd.getRepository(NotificationEntite).find({
      where: { membreId },
      order: { creeeLe: 'DESC', id: 'ASC' },
      take: limite,
    });
    return lignes.map((ligne) => ({
      id: ligne.id,
      membreId: ligne.membreId,
      annonceId: ligne.annonceId,
      titreAnnonce: ligne.titreAnnonce,
      categorie: ligne.categorie as Categorie,
      typeAnnonce: ligne.typeAnnonce as TypeAnnonce,
      creeeLe: ligne.creeeLe,
    }));
  }
}
