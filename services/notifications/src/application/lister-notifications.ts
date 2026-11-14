import { Injectable } from '@nestjs/common';
import type { Notification } from '../domaine/notification';
import { DepotNotifications } from '../domaine/ports';

/** La liste est bornée par le service : elle ne peut pas le saturer (risque R8). */
export const LIMITE_NOTIFICATIONS = 100;

/** Cas d'usage de l'US-03. Le membre est toujours celui du jeton : il n'existe aucun autre moyen de le désigner. */
@Injectable()
export class ListerNotifications {
  constructor(private readonly depot: DepotNotifications) {}

  executer(membreId: string): Promise<Notification[]> {
    return this.depot.listerPour(membreId, LIMITE_NOTIFICATIONS);
  }
}
