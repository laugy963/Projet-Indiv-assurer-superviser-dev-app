import { destinataires } from './correspondance';

const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const MEMBRE_B = '2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d';
const MEMBRE_C = '3c4d5e6f-7081-4b2c-8d3e-4f5a6b7c8d9e';

describe('destinataires d’une annonce', () => {
  it('notifie les membres intéressés par la catégorie', () => {
    expect(destinataires(AUTEUR, [MEMBRE_B, MEMBRE_C])).toEqual([MEMBRE_B, MEMBRE_C]);
  });

  it("ne notifie pas l'auteur de sa propre annonce (hypothèse H4)", () => {
    expect(destinataires(AUTEUR, [AUTEUR, MEMBRE_B])).toEqual([MEMBRE_B]);
  });

  it('ne notifie personne quand aucun membre n’est intéressé', () => {
    expect(destinataires(AUTEUR, [])).toEqual([]);
  });

  it('ne notifie un membre qu’une fois', () => {
    expect(destinataires(AUTEUR, [MEMBRE_B, MEMBRE_B])).toEqual([MEMBRE_B]);
  });
});
