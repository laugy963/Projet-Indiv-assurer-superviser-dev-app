import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { CATEGORIES, LONGUEURS, TYPES_ANNONCE, type Categorie, type TypeAnnonce } from '../domaine/annonce';

const sansEspacesAutour = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Corps de POST /api/annonces. Liste blanche : seuls ces quatre champs sont acceptés.
 * L'auteur n'en fait pas partie : il vient du jeton.
 */
export class PublierAnnonceDto {
  @Transform(sansEspacesAutour)
  @IsString({ message: 'Le titre est un texte' })
  @Length(LONGUEURS.titre.min, LONGUEURS.titre.max, {
    message: `Le titre compte entre ${LONGUEURS.titre.min} et ${LONGUEURS.titre.max} caractères`,
  })
  titre!: string;

  @Transform(sansEspacesAutour)
  @IsString({ message: 'La description est un texte' })
  @Length(LONGUEURS.description.min, LONGUEURS.description.max, {
    message: `La description compte entre ${LONGUEURS.description.min} et ${LONGUEURS.description.max} caractères`,
  })
  description!: string;

  @IsIn(CATEGORIES, { message: `La catégorie est l'une de : ${CATEGORIES.join(', ')}` })
  categorie!: Categorie;

  @IsIn(TYPES_ANNONCE, { message: `Le type est l'un de : ${TYPES_ANNONCE.join(', ')}` })
  type!: TypeAnnonce;
}
