import { Module, type DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocleModule, type Reglages } from '@epouvante/socle';
import { optionsBaseDeDonnees } from './adaptateurs/base-de-donnees';
import { DepotCentresInteretTypeOrm } from './adaptateurs/depot-centres-interet.typeorm';
import { DepotNotificationsTypeOrm } from './adaptateurs/depot-notifications.typeorm';
import { DefinirCentresInteret, LireCentresInteret } from './application/centres-interet';
import { ListerNotifications } from './application/lister-notifications';
import { DepotCentresInteret, DepotNotifications } from './domaine/ports';
import { CentresInteretControleur } from './entrees/centres-interet.controleur';
import { NotificationsControleur } from './entrees/notifications.controleur';

/** Assemble le service : c'est ici, et seulement ici, que chaque port reçoit son adaptateur. */
@Module({})
export class NotificationsModule {
  static configurer(reglages: Reglages): DynamicModule {
    return {
      module: NotificationsModule,
      imports: [SocleModule.configurer(reglages.oidc), TypeOrmModule.forRoot(optionsBaseDeDonnees(reglages.bdd))],
      controllers: [CentresInteretControleur, NotificationsControleur],
      providers: [
        DefinirCentresInteret,
        LireCentresInteret,
        ListerNotifications,
        { provide: DepotCentresInteret, useClass: DepotCentresInteretTypeOrm },
        { provide: DepotNotifications, useClass: DepotNotificationsTypeOrm },
      ],
    };
  }
}
