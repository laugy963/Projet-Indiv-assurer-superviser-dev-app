import { Controller, Get } from '@nestjs/common';
import { Roles, UtilisateurCourant, type Utilisateur } from '@epouvante/socle';
import { ListerNotifications } from '../application/lister-notifications';
import type { Notification } from '../domaine/notification';

export interface NotificationReponse {
  id: string;
  annonceId: string;
  titre: string;
  categorie: string;
  typeAnnonce: string;
  date: string;
}

/**
 * Point d'entrée HTTP de l'US-03. La route ne lit aucun paramètre :
 * rien dans la requête ne permet de désigner un autre membre que celui du jeton (critère CA-10).
 */
@Controller('api/notifications')
export class NotificationsControleur {
  constructor(private readonly lister: ListerNotifications) {}

  @Get()
  @Roles('membre')
  async consulter(@UtilisateurCourant() utilisateur: Utilisateur): Promise<{ notifications: NotificationReponse[] }> {
    return { notifications: (await this.lister.executer(utilisateur.id)).map(versReponse) };
  }
}

/** Le membre destinataire n'est pas recopié dans la réponse : le client le connaît déjà. */
function versReponse(notification: Notification): NotificationReponse {
  return {
    id: notification.id,
    annonceId: notification.annonceId,
    titre: notification.titreAnnonce,
    categorie: notification.categorie,
    typeAnnonce: notification.typeAnnonce,
    date: notification.creeeLe.toISOString(),
  };
}
