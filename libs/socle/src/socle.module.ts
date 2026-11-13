import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { FiltreErreurs } from './erreurs/filtre-erreurs';
import { SanteControleur } from './sante/sante.controleur';
import { GardeAcces } from './securite/garde-acces';
import { VerificateurJeton } from './securite/verificateur-jeton';
import { VerificateurJetonOidc, type ReglagesOidc } from './securite/verificateur-jeton-oidc';
import { creerTuyauValidation } from './validation/tuyau-validation';

/**
 * Socle technique commun aux services (fiche 0012). Un service qui l'importe reçoit, sur toutes ses routes :
 * la garde d'accès, le filtre d'erreurs et la validation par liste blanche, plus la route interne /sante.
 * Aucune règle métier ici.
 */
@Module({})
export class SocleModule {
  static configurer(oidc: ReglagesOidc): DynamicModule {
    return {
      module: SocleModule,
      controllers: [SanteControleur],
      providers: [
        { provide: VerificateurJeton, useValue: new VerificateurJetonOidc(oidc) },
        { provide: APP_GUARD, useClass: GardeAcces },
        { provide: APP_FILTER, useClass: FiltreErreurs },
        { provide: APP_PIPE, useFactory: creerTuyauValidation },
      ],
    };
  }
}
