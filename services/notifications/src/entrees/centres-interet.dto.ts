import { IsArray, IsIn } from 'class-validator';
import { CATEGORIES } from '../domaine/centres-interet';

/** Corps de PUT /api/centres-interet. Liste blanche : seul « categories » est accepté ; le membre vient du jeton. */
export class CentresInteretDto {
  @IsArray({ message: 'Les catégories forment une liste' })
  @IsIn(CATEGORIES, { each: true, message: `Chaque catégorie est l'une de : ${CATEGORIES.join(', ')}` })
  categories!: string[];
}
