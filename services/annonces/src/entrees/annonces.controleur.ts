import { Body, Controller, Post } from '@nestjs/common';
import { Roles, UtilisateurCourant, type Utilisateur } from '@epouvante/socle';
import { PublierAnnonce } from '../application/publier-annonce';
import { versReponse, type AnnonceReponse } from './annonce.reponse';
import { PublierAnnonceDto } from './publier-annonce.dto';

/** Point d'entrée HTTP : lit l'entrée, appelle le cas d'usage, met la réponse en forme. Aucune règle métier ici. */
@Controller('api/annonces')
export class AnnoncesControleur {
  constructor(private readonly publierAnnonce: PublierAnnonce) {}

  @Post()
  @Roles('membre')
  async publier(@Body() corps: PublierAnnonceDto, @UtilisateurCourant() utilisateur: Utilisateur): Promise<AnnonceReponse> {
    return versReponse(await this.publierAnnonce.executer(corps, utilisateur.id));
  }
}
