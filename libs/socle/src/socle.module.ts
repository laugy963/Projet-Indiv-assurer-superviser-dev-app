import { Module, type DynamicModule, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FiltreErreurs } from './erreurs/filtre-erreurs';
import { MesureRequetes } from './metriques/mesure-requetes';
import { Metriques } from './metriques/metriques';
import { MetriquesControleur } from './metriques/metriques.controleur';
import { Disponibilite } from './sante/disponibilite';
import { SanteControleur } from './sante/sante.controleur';
import { GardeAcces } from './securite/garde-acces';
import { VerificateurJeton } from './securite/verificateur-jeton';
import { VerificateurJetonOidc, type ReglagesOidc } from './securite/verificateur-jeton-oidc';
import { creerTuyauValidation } from './validation/tuyau-validation';

/**
 * Socle technique commun aux services (fiche 0012). Un service qui l'importe reçoit, sur toutes ses routes :
 * la garde d'accès, le filtre d'erreurs, la validation par liste blanche et la mesure des requêtes,
 * plus les routes internes /sante, /sante/pret et /metrics.
 * Aucune règle métier ici.
 */
@Module({})
export class SocleModule implements NestModule {
  static configurer(oidc: ReglagesOidc): DynamicModule {
    return {
      module: SocleModule,
      controllers: [SanteControleur, MetriquesControleur],
      providers: [
        { provide: VerificateurJeton, useValue: new VerificateurJetonOidc(oidc) },
        { provide: APP_GUARD, useClass: GardeAcces },
        { provide: APP_FILTER, useClass: FiltreErreurs },
        { provide: APP_PIPE, useFactory: creerTuyauValidation },
        Metriques,
        MesureRequetes,
        {
          // Sonde « prêt » : la base de données du service, s'il en a une, doit répondre.
          // Le broker n'y figure pas : les services s'y reconnectent seuls, et une panne du broker
          // ne doit pas fermer les routes de lecture.
          provide: Disponibilite,
          useFactory: (bdd?: DataSource) => new Disponibilite(bdd ? [() => bdd.query('SELECT 1')] : []),
          inject: [{ token: DataSource, optional: true }],
        },
      ],
    };
  }

  /** La mesure s'applique à toutes les routes, avant la garde : un refus est une réponse comme une autre. */
  configure(consommateur: MiddlewareConsumer): void {
    consommateur.apply(MesureRequetes).forRoutes('{*chemin}');
  }
}
