import { IsUUID } from 'class-validator';

/** Paramètre d'URL de DELETE /api/annonces/{id} : refusé avant toute requête à la base s'il n'est pas un UUID. */
export class IdentifiantAnnonceDto {
  @IsUUID(undefined, { message: "L'identifiant est un UUID" })
  id!: string;
}
