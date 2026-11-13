import { Logger } from '@nestjs/common';
import type { EvenementAnnoncePubliee } from '../domaine/evenements';
import { EmetteurEvenements } from '../domaine/ports';
import { DepotEnMemoire } from '../../test/doubles/depot-en-memoire';
import { PublierAnnonce } from './publier-annonce';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const CONTENU = {
  titre: 'Figurine Evil Ed, édition limitée',
  description: 'Figurine en résine de 20 cm.',
  categorie: 'figurines',
  type: 'don',
} as const;

// Doubles de test : le cas d'usage est vérifié sans base ni broker.
class EmetteurFactice extends EmetteurEvenements {
  readonly emis: EvenementAnnoncePubliee[] = [];
  panne: Error | undefined;
  constructor(private readonly ordre: string[]) {
    super();
  }
  async emettre(evenement: EvenementAnnoncePubliee): Promise<void> {
    this.ordre.push('emettre');
    if (this.panne) throw this.panne;
    this.emis.push(evenement);
  }
}

describe('PublierAnnonce', () => {
  let ordre: string[];
  let depot: DepotEnMemoire;
  let emetteur: EmetteurFactice;
  let casDUsage: PublierAnnonce;

  beforeEach(() => {
    ordre = [];
    depot = new DepotEnMemoire(ordre);
    emetteur = new EmetteurFactice(ordre);
    casDUsage = new PublierAnnonce(depot, emetteur);
  });

  afterEach(() => jest.restoreAllMocks());

  it("enregistre l'annonce au nom de l'auteur, puis émet l'événement", async () => {
    const annonce = await casDUsage.executer(CONTENU, AUTEUR);

    expect(annonce).toMatchObject({ ...CONTENU, statut: 'publiee', auteurId: AUTEUR });
    expect(annonce.id).toMatch(UUID);
    expect(depot.annonces).toEqual([annonce]);
    expect(ordre).toEqual(['enregistrer', 'emettre']);
  });

  it("émet un événement conforme au contrat : version 1, sans la description de l'annonce", async () => {
    const annonce = await casDUsage.executer(CONTENU, AUTEUR);

    expect(emetteur.emis).toEqual([
      {
        id: expect.stringMatching(UUID),
        type: 'annonce.publiee',
        version: 1,
        date: annonce.publieeLe.toISOString(),
        donnees: {
          annonceId: annonce.id,
          titre: CONTENU.titre,
          categorie: 'figurines',
          typeAnnonce: 'don',
          auteurId: AUTEUR,
        },
      },
    ]);
    expect(emetteur.emis[0].id).not.toBe(annonce.id);
  });

  it("n'émet rien quand l'enregistrement échoue", async () => {
    jest.spyOn(depot, 'enregistrer').mockRejectedValue(new Error('base injoignable'));

    await expect(casDUsage.executer(CONTENU, AUTEUR)).rejects.toThrow('base injoignable');
    expect(emetteur.emis).toEqual([]);
  });

  // Limite connue du prototype (architecture, paragraphe 12) : sans le motif « outbox »,
  // un broker injoignable laisse une annonce publiée sans événement. Le défaut est au moins journalisé.
  it("garde l'annonce publiée et journalise le défaut quand l'émission échoue", async () => {
    const journal = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    emetteur.panne = new Error('broker injoignable');

    const annonce = await casDUsage.executer(CONTENU, AUTEUR);

    expect(depot.annonces).toEqual([annonce]);
    expect(journal).toHaveBeenCalledWith(
      expect.objectContaining({ etat: 'evenement-non-emis', annonceId: annonce.id }),
      expect.stringContaining('broker injoignable'),
    );
  });
});
