import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles, UtilisateurCourant, type Utilisateur } from '@epouvante/socle';
import { DefinirCentresInteret, LireCentresInteret } from '../application/centres-interet';
import { CentresInteretDto } from './centres-interet.dto';

export interface CentresInteretReponse {
  categories: string[];
}

/** Point d'entrée HTTP de l'US-02. Le membre concerné est toujours celui du jeton. */
@Controller('api/centres-interet')
export class CentresInteretControleur {
  constructor(
    private readonly definir: DefinirCentresInteret,
    private readonly lire: LireCentresInteret,
  ) {}

  @Put()
  @Roles('membre')
  async enregistrer(@Body() corps: CentresInteretDto, @UtilisateurCourant() utilisateur: Utilisateur): Promise<CentresInteretReponse> {
    return { categories: await this.definir.executer(utilisateur.id, corps.categories) };
  }

  @Get()
  @Roles('membre')
  async consulter(@UtilisateurCourant() utilisateur: Utilisateur): Promise<CentresInteretReponse> {
    return { categories: await this.lire.executer(utilisateur.id) };
  }
}
