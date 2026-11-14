import { IsIn, IsString, Length } from 'class-validator';
import { RequeteInvalide } from '../erreurs/requete-invalide';
import { creerTuyauValidation } from './tuyau-validation';

class Exemple {
  @IsString({ message: 'Le titre est un texte' })
  @Length(3, 10, { message: 'Le titre compte entre 3 et 10 caractères' })
  titre!: string;

  @IsIn(['troc', 'don'], { message: 'Le type vaut « troc » ou « don »' })
  type!: string;
}

// Bonne pratique de sécurité n° 2 : validation des entrées par liste blanche.
describe('tuyau de validation', () => {
  const tuyau = creerTuyauValidation();
  const valider = (corps: unknown) => tuyau.transform(corps, { type: 'body', metatype: Exemple });

  async function champsEnErreur(corps: unknown) {
    const erreur = await valider(corps).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(erreur).toBeInstanceOf(RequeteInvalide);
    return (erreur as RequeteInvalide).champs;
  }

  it('accepte une entrée conforme', async () => {
    await expect(valider({ titre: 'Figurine', type: 'don' })).resolves.toEqual({ titre: 'Figurine', type: 'don' });
  });

  it('nomme chaque champ en erreur, avec un message lisible', async () => {
    expect(await champsEnErreur({ titre: 'ab', type: 'vente' })).toEqual([
      { champ: 'titre', erreurs: ['Le titre compte entre 3 et 10 caractères'] },
      { champ: 'type', erreurs: ['Le type vaut « troc » ou « don »'] },
    ]);
  });

  it('signale un champ obligatoire absent', async () => {
    const champs = await champsEnErreur({ type: 'don' });
    expect(champs.map((c) => c.champ)).toEqual(['titre']);
  });

  it('refuse un champ non prévu (liste blanche)', async () => {
    expect(await champsEnErreur({ titre: 'Figurine', type: 'don', statut: 'retiree' })).toEqual([
      { champ: 'statut', erreurs: ['Champ non prévu'] },
    ]);
  });

  it('refuse un corps qui n’est pas un objet', async () => {
    await expect(valider('texte')).rejects.toBeInstanceOf(RequeteInvalide);
  });
});
