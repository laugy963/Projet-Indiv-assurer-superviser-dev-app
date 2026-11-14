import { ForbiddenException, Logger, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, RouteInterne } from './decorateurs';
import { GardeAcces } from './garde-acces';
import type { Utilisateur } from './utilisateur';
import { JetonRefuse, VerificateurJeton } from './verificateur-jeton';

class ControleurFactice {
  @Roles('membre')
  pourMembre(): void {}

  @Roles('membre', 'moderateur')
  pourLesDeux(): void {}

  @Roles('moderateur')
  pourModerateur(): void {}

  sansRoleDeclare(): void {}

  @RouteInterne()
  interne(): void {}
}

class VerificateurFactice extends VerificateurJeton {
  verifier = jest.fn<Promise<Utilisateur>, [string]>();
}

const MEMBRE: Utilisateur = { id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', roles: ['membre', 'offline_access'] };

describe('GardeAcces', () => {
  let verificateur: VerificateurFactice;
  let garde: GardeAcces;
  let journal: jest.SpyInstance;

  beforeEach(() => {
    verificateur = new VerificateurFactice();
    garde = new GardeAcces(new Reflector(), verificateur);
    journal = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  function appel(methode: keyof ControleurFactice, autorisation?: string, type = 'http') {
    const requete: { headers: Record<string, string>; utilisateur?: Utilisateur } = {
      headers: autorisation === undefined ? {} : { authorization: autorisation },
    };
    const contexte = {
      getType: () => type,
      // eslint-disable-next-line security/detect-object-injection -- nom de méthode typé, écrit dans le test
      getHandler: () => ControleurFactice.prototype[methode],
      getClass: () => ControleurFactice,
      switchToHttp: () => ({ getRequest: () => requete }),
    } as unknown as ExecutionContext;
    return { requete, contexte };
  }

  describe('authentification (401)', () => {
    it('refuse une requête sans en-tête Authorization, sans appeler le vérificateur', async () => {
      const { contexte } = appel('pourMembre');
      await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(verificateur.verifier).not.toHaveBeenCalled();
    });

    it.each(['Basic bWVtYnJlOm1kcA==', 'Bearer', 'Bearer ', 'jeton-sans-prefixe'])(
      'refuse un en-tête qui n’est pas « Bearer <jeton> » : %p',
      async (entete) => {
        const { contexte } = appel('pourMembre', entete);
        await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(verificateur.verifier).not.toHaveBeenCalled();
      },
    );

    it('refuse un jeton que le vérificateur rejette', async () => {
      verificateur.verifier.mockRejectedValue(new JetonRefuse('ERR_JWT_EXPIRED'));
      const { contexte } = appel('pourMembre', 'Bearer jeton-expire');
      await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('écrit le motif du refus dans le journal, jamais dans la réponse', async () => {
      verificateur.verifier.mockRejectedValue(new JetonRefuse('ERR_JWT_EXPIRED'));
      const { contexte } = appel('pourMembre', 'Bearer jeton-expire');

      const erreur = await garde.canActivate(contexte).then(
        () => undefined,
        (e: UnauthorizedException) => e,
      );

      expect(JSON.stringify(erreur?.getResponse())).not.toContain('ERR_JWT_EXPIRED');
      expect(journal).toHaveBeenCalledWith(expect.objectContaining({ etat: 'jeton-refuse', motif: 'ERR_JWT_EXPIRED' }));
    });

    it('refuse aussi quand le vérificateur échoue pour une raison technique', async () => {
      verificateur.verifier.mockRejectedValue(new Error('clés publiques injoignables'));
      const { contexte } = appel('pourMembre', 'Bearer jeton');
      await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('autorisation (403)', () => {
    beforeEach(() => verificateur.verifier.mockResolvedValue(MEMBRE));

    it('laisse passer un membre sur une route réservée aux membres', async () => {
      const { contexte } = appel('pourMembre', 'Bearer jeton-valide');
      await expect(garde.canActivate(contexte)).resolves.toBe(true);
      expect(verificateur.verifier).toHaveBeenCalledWith('jeton-valide');
    });

    it('laisse passer quand un seul des rôles exigés est porté', async () => {
      const { contexte } = appel('pourLesDeux', 'Bearer jeton-valide');
      await expect(garde.canActivate(contexte)).resolves.toBe(true);
    });

    it('refuse un membre sur une route réservée aux modérateurs', async () => {
      const { contexte } = appel('pourModerateur', 'Bearer jeton-valide');
      await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse par défaut une route qui ne déclare aucun rôle', async () => {
      const { contexte } = appel('sansRoleDeclare', 'Bearer jeton-valide');
      await expect(garde.canActivate(contexte)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("range l'utilisateur vérifié dans la requête : l'identité vient du jeton", async () => {
      const { contexte, requete } = appel('pourMembre', 'Bearer jeton-valide');
      await garde.canActivate(contexte);
      expect(requete.utilisateur).toEqual(MEMBRE);
    });
  });

  describe('hors du contrôle par jeton', () => {
    it('laisse passer une route interne (sonde de santé) sans jeton', async () => {
      const { contexte } = appel('interne');
      await expect(garde.canActivate(contexte)).resolves.toBe(true);
      expect(verificateur.verifier).not.toHaveBeenCalled();
    });

    it('laisse passer un message du broker : il ne porte pas de jeton, le broker authentifie le service', async () => {
      const { contexte } = appel('pourMembre', undefined, 'rpc');
      await expect(garde.canActivate(contexte)).resolves.toBe(true);
    });
  });
});
