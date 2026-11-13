import { EvenementInvalide, lireEvenement } from './evenement-annonce-publiee';

// L'exemple du document d'architecture (paragraphe 6.2) : le contrat entre les deux services.
const EXEMPLE = {
  id: '5f0c2a9e-3b7d-4c1a-9e2f-8a6b4d1c7e90',
  type: 'annonce.publiee',
  version: 1,
  date: '2027-02-01T10:15:30Z',
  donnees: {
    annonceId: 'c1d2e3f4-a5b6-4789-8abc-def012345678',
    titre: 'Figurine Evil Ed, édition limitée',
    categorie: 'figurines',
    typeAnnonce: 'don',
    auteurId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  },
};

describe('lireEvenement — contrat « annonce.publiee » version 1', () => {
  it('accepte l’exemple du document d’architecture', () => {
    expect(lireEvenement(EXEMPLE)).toEqual(EXEMPLE);
  });

  it('ne garde que les champs du contrat', () => {
    const evenement = lireEvenement({ ...EXEMPLE, inconnu: 1, donnees: { ...EXEMPLE.donnees, courriel: 'a@b.test' } });
    expect(evenement).toEqual(EXEMPLE);
  });

  it.each([
    ['un texte au lieu d’un objet', 'pas du JSON'],
    ['une valeur nulle', null],
    ['un autre type d’événement', { ...EXEMPLE, type: 'annonce.retiree' }],
    ['une version inconnue', { ...EXEMPLE, version: 2 }],
    ['un identifiant d’événement absent', { ...EXEMPLE, id: undefined }],
    ['des données absentes', { ...EXEMPLE, donnees: undefined }],
    ['un identifiant d’annonce qui n’est pas un UUID', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, annonceId: '42' } }],
    ['un auteur qui n’est pas un UUID', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, auteurId: 'admin' } }],
    ['un titre vide', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, titre: '' } }],
    ['un titre trop long', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, titre: 'a'.repeat(101) } }],
    ['une catégorie hors liste', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, categorie: 'voitures' } }],
    ['un type d’annonce hors liste', { ...EXEMPLE, donnees: { ...EXEMPLE.donnees, typeAnnonce: 'vente' } }],
  ])('refuse %s', (_cas, brut) => {
    expect(() => lireEvenement(brut)).toThrow(EvenementInvalide);
  });
});
