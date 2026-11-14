import { createSecretKey } from 'node:crypto';
import { SignJWT } from 'jose';
import { EmetteurDeTest, falsifierContenu, falsifierSignature, lireContenu } from '../../outils-de-test';
import { JetonRefuse } from './verificateur-jeton';
import { VerificateurJetonOidc } from './verificateur-jeton-oidc';

// Le vérificateur est testé face à un émetteur de test local, qui publie ses clés en HTTP comme Keycloak.
describe('VerificateurJetonOidc', () => {
  const SUJET = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
  let emetteur: EmetteurDeTest;
  let verificateur: VerificateurJetonOidc;

  beforeAll(async () => {
    emetteur = await EmetteurDeTest.demarrer();
    verificateur = new VerificateurJetonOidc({
      emetteur: emetteur.emetteur,
      urlCles: emetteur.urlCles,
      audience: emetteur.audience,
    });
  });

  afterAll(() => emetteur.arreter());

  async function motifDuRefus(jeton: string): Promise<string> {
    const erreur = await verificateur.verifier(jeton).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(erreur).toBeInstanceOf(JetonRefuse);
    return (erreur as JetonRefuse).motif;
  }

  it("accepte un jeton valide : l'identité vient de « sub », les rôles de « realm_access.roles »", async () => {
    const utilisateur = await verificateur.verifier(await emetteur.jeton({ sujet: SUJET, roles: ['membre'] }));

    expect(utilisateur.id).toBe(SUJET);
    expect(utilisateur.roles).toContain('membre');
    expect(utilisateur.roles).not.toContain('moderateur');
  });

  it('refuse un jeton signé par une clé que l’émetteur ne publie pas', async () => {
    const jeton = await emetteur.jeton({ sujet: SUJET, roles: ['membre'], cle: 'inconnue' });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
  });

  it('refuse un jeton dont la signature a été modifiée', async () => {
    const jeton = falsifierSignature(await emetteur.jetonMembre(SUJET));
    expect(await motifDuRefus(jeton)).toBe('ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
  });

  it("refuse un jeton dont le contenu a été modifié pour s'attribuer le rôle « moderateur »", async () => {
    const original = await emetteur.jetonMembre(SUJET);
    const falsifie = falsifierContenu(original, (contenu) => {
      (contenu.realm_access as { roles: string[] }).roles.push('moderateur');
    });
    // Le jeton falsifié porte bien le rôle usurpé : le refus vient de la signature, pas d'un jeton illisible.
    expect((lireContenu(falsifie).realm_access as { roles: string[] }).roles).toContain('moderateur');

    expect(await motifDuRefus(falsifie)).toBe('ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
  });

  it('refuse un jeton expiré', async () => {
    const jeton = await emetteur.jeton({ sujet: SUJET, roles: ['membre'], dureeEnSecondes: -30 });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWT_EXPIRED');
  });

  it('refuse un jeton d’un autre émetteur', async () => {
    const jeton = await emetteur.jeton({ sujet: SUJET, roles: ['membre'], emetteur: 'http://autre-emetteur.invalid/realms/epouvante' });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
  });

  it('refuse un jeton destiné à une autre application (audience)', async () => {
    const jeton = await emetteur.jeton({ sujet: SUJET, roles: ['membre'], audience: ['account', 'autre-application'] });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
  });

  it('refuse un jeton sans audience', async () => {
    const jeton = await emetteur.jeton({ sujet: SUJET, roles: ['membre'], audience: null });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
  });

  it('refuse un jeton signé avec un autre algorithme que RS256', async () => {
    const jeton = await new SignJWT({ realm_access: { roles: ['moderateur'] } })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(emetteur.emetteur)
      .setAudience(emetteur.audience)
      .setSubject(SUJET)
      .setExpirationTime('2m')
      .sign(createSecretKey(Buffer.from('secret-partage-de-32-octets-minimum!')));
    expect(await motifDuRefus(jeton)).toBe('ERR_JOSE_ALG_NOT_ALLOWED');
  });

  it('refuse un jeton non signé (algorithme « none »)', async () => {
    const [, contenu] = (await emetteur.jetonModerateur(SUJET)).split('.');
    const entete = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    await motifDuRefus(`${entete}.${contenu}.`);
  });

  it('refuse un jeton sans identité (« sub »)', async () => {
    const jeton = await emetteur.jeton({ sujet: null, roles: ['membre'] });
    expect(await motifDuRefus(jeton)).toBe('ERR_JWT_CLAIM_VALIDATION_FAILED');
  });

  it("refuse un jeton dont l'identité n'est pas un UUID", async () => {
    const jeton = await emetteur.jeton({ sujet: "1' OR '1'='1", roles: ['membre'] });
    expect(await motifDuRefus(jeton)).toBe('SUJET_INVALIDE');
  });

  it('refuse une chaîne qui n’est pas un jeton', async () => {
    await motifDuRefus('ceci-n-est-pas-un-jeton');
  });

  it('garde les clés publiques en cache : une seule lecture pour plusieurs vérifications', async () => {
    const autre = await EmetteurDeTest.demarrer();
    try {
      const local = new VerificateurJetonOidc({ emetteur: autre.emetteur, urlCles: autre.urlCles, audience: autre.audience });
      for (let i = 0; i < 3; i++) await local.verifier(await autre.jetonMembre());
      expect(autre.lecturesDesCles).toBe(1);
    } finally {
      await autre.arreter();
    }
  });
});
