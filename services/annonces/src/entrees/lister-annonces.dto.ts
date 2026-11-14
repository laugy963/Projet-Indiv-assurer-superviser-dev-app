import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Paramètres de GET /api/annonces. Liste blanche : seul « page » est accepté, la taille de page n'est pas réglable. */
export class ListerAnnoncesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La page est un nombre entier' })
  @Min(1, { message: 'La page vaut au moins 1' })
  page?: number;
}
