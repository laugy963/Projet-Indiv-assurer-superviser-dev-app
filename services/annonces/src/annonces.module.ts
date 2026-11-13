import { Module, type DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocleModule } from '@epouvante/socle';
import { AnnonceEntite } from './adaptateurs/annonce.entite';
import { optionsBaseDeDonnees } from './adaptateurs/base-de-donnees';
import { DepotAnnoncesTypeOrm } from './adaptateurs/depot-annonces.typeorm';
import { CLIENT_BROKER, EmetteurEvenementsRabbitMq, serialiseurContrat } from './adaptateurs/emetteur-evenements.rabbitmq';
import { ListerAnnonces } from './application/lister-annonces';
import { PublierAnnonce } from './application/publier-annonce';
import { RetirerAnnonce } from './application/retirer-annonce';
import { EXCHANGE_ANNONCES } from './domaine/evenements';
import { DepotAnnonces, EmetteurEvenements } from './domaine/ports';
import { AnnoncesControleur } from './entrees/annonces.controleur';
import { SanteControleur } from './entrees/sante.controleur';
import { urlBroker, type Reglages } from './reglages';

/** Assemble le service : c'est ici, et seulement ici, que chaque port reçoit son adaptateur. */
@Module({})
export class AnnoncesModule {
  static configurer(reglages: Reglages): DynamicModule {
    return {
      module: AnnoncesModule,
      imports: [
        SocleModule.configurer(reglages.oidc),
        TypeOrmModule.forRoot(optionsBaseDeDonnees(reglages.bdd)),
        TypeOrmModule.forFeature([AnnonceEntite]),
        ClientsModule.register([
          {
            name: CLIENT_BROKER,
            transport: Transport.RMQ,
            options: {
              urls: [urlBroker(reglages.broker)],
              // Exchange de type topic : la clé de routage est le type de l'événement (fiche 0007).
              exchange: EXCHANGE_ANNONCES,
              exchangeType: 'topic',
              wildcards: true,
              // Message persistant : écrit sur disque par le broker.
              persistent: true,
              serializer: serialiseurContrat,
            },
          },
        ]),
      ],
      controllers: [AnnoncesControleur, SanteControleur],
      providers: [
        PublierAnnonce,
        ListerAnnonces,
        RetirerAnnonce,
        { provide: DepotAnnonces, useClass: DepotAnnoncesTypeOrm },
        { provide: EmetteurEvenements, useClass: EmetteurEvenementsRabbitMq },
      ],
    };
  }
}
