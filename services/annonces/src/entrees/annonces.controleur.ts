import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Roles, UtilisateurCourant, type Utilisateur } from '@epouvante/socle';
import { ListerAnnonces } from '../application/lister-annonces';
import { PublierAnnonce } from '../application/publier-annonce';
import { AnnonceIntrouvable, RetirerAnnonce } from '../application/retirer-annonce';
import { versReponse, type AnnonceReponse, type PageAnnoncesReponse } from './annonce.reponse';
import { IdentifiantAnnonceDto } from './identifiant-annonce.dto';
import { ListerAnnoncesDto } from './lister-annonces.dto';
import { PublierAnnonceDto } from './publier-annonce.dto';

/** Point d'entrée HTTP : lit l'entrée, appelle le cas d'usage, met la réponse en forme. Aucune règle métier ici. */
@Controller('api/annonces')
export class AnnoncesControleur {
  constructor(
    private readonly publierAnnonce: PublierAnnonce,
    private readonly listerAnnonces: ListerAnnonces,
    private readonly retirerAnnonce: RetirerAnnonce,
  ) {}

  @Post()
  @Roles('membre')
  async publier(@Body() corps: PublierAnnonceDto, @UtilisateurCourant() utilisateur: Utilisateur): Promise<AnnonceReponse> {
    return versReponse(await this.publierAnnonce.executer(corps, utilisateur.id));
  }

  @Get()
  @Roles('membre', 'moderateur')
  async lister(@Query() requete: ListerAnnoncesDto): Promise<PageAnnoncesReponse> {
    const page = await this.listerAnnonces.executer(requete.page ?? 1);
    return { ...page, annonces: page.annonces.map(versReponse) };
  }

  @Delete(':id')
  @Roles('moderateur')
  @HttpCode(204)
  async retirer(@Param() parametres: IdentifiantAnnonceDto, @UtilisateurCourant() utilisateur: Utilisateur): Promise<void> {
    try {
      await this.retirerAnnonce.executer(parametres.id, utilisateur.id);
    } catch (erreur) {
      if (erreur instanceof AnnonceIntrouvable) throw new NotFoundException();
      throw erreur;
    }
  }
}
