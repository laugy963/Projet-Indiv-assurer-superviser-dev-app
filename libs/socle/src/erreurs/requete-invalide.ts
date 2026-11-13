import { BadRequestException } from '@nestjs/common';

export interface ChampEnErreur {
  champ: string;
  erreurs: string[];
}

/** Requête refusée par la validation : elle nomme les champs en erreur (critère CA-05). */
export class RequeteInvalide extends BadRequestException {
  constructor(readonly champs: ChampEnErreur[]) {
    super('Requête invalide');
  }
}
