// Émetteur de jetons de test (fiche 0013).
// Il tient le rôle de Keycloak dans les tests unitaires et d'intégration :
// une paire de clés RSA créée à chaque exécution, et la clé publique servie en HTTP,
// comme le fait le point d'accès « certs » d'un royaume Keycloak.
// Ce fichier n'est pas compilé dans les images : il ne sert qu'aux tests.
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';

export const AUDIENCE_DE_TEST = 'api-epouvante';
export const EMETTEUR_DE_TEST = 'http://emetteur-de-test.invalid/realms/epouvante';

export interface OptionsJeton {
  /** Identifiant du membre (revendication « sub »). Par défaut : un UUID tiré au hasard. */
  sujet?: string | null;
  /** Rôles du royaume. Par défaut : aucun. */
  roles?: string[];
  /** Durée de vie en secondes. Une valeur négative donne un jeton déjà expiré. */
  dureeEnSecondes?: number;
  /** Émetteur écrit dans le jeton. Par défaut : l'émetteur de test. */
  emetteur?: string;
  /** Destinataires du jeton. Par défaut : l'audience de l'API, plus « account » comme Keycloak. */
  audience?: string[] | null;
  /** « inconnue » : signe avec une clé que l'émetteur ne publie pas. */
  cle?: 'publiee' | 'inconnue';
}

type ClePrivee = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

export class EmetteurDeTest {
  readonly emetteur = EMETTEUR_DE_TEST;
  readonly audience = AUDIENCE_DE_TEST;

  private constructor(
    private readonly serveur: Server,
    private readonly clePubliee: ClePrivee,
    private readonly cleInconnue: ClePrivee,
    private readonly compteur: { lectures: number },
  ) {}

  /** Nombre de lectures des clés publiques : prouve que la vérification ne les relit pas à chaque requête. */
  get lecturesDesCles(): number {
    return this.compteur.lectures;
  }

  static async demarrer(): Promise<EmetteurDeTest> {
    const publiee = await generateKeyPair('RS256');
    const inconnue = await generateKeyPair('RS256');
    const jwk: JWK = { ...(await exportJWK(publiee.publicKey)), kid: 'cle-de-test', alg: 'RS256', use: 'sig' };

    const compteur = { lectures: 0 };
    const serveur = createServer((_requete, reponse) => {
      compteur.lectures++;
      reponse.writeHead(200, { 'Content-Type': 'application/json' });
      reponse.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret));
    return new EmetteurDeTest(serveur, publiee.privateKey, inconnue.privateKey, compteur);
  }

  /** Adresse où le service lit les clés publiques. */
  get urlCles(): string {
    const { port } = this.serveur.address() as AddressInfo;
    return `http://127.0.0.1:${port}/certs`;
  }

  /** Fabrique un jeton au format de Keycloak : rôles dans « realm_access.roles », identité dans « sub ». */
  async jeton(options: OptionsJeton = {}): Promise<string> {
    const maintenant = Math.floor(Date.now() / 1000);
    const duree = options.dureeEnSecondes ?? 120;
    const sujet = options.sujet === undefined ? randomUUID() : options.sujet;
    const audience = options.audience === undefined ? [this.audience, 'account'] : options.audience;

    const contenu: Record<string, unknown> = {
      typ: 'Bearer',
      azp: 'tests',
      // Keycloak ajoute ses rôles par défaut à ceux du membre.
      realm_access: { roles: [...(options.roles ?? []), 'offline_access', 'uma_authorization', 'default-roles-epouvante'] },
    };
    let jeton = new SignJWT(contenu)
      .setProtectedHeader({ alg: 'RS256', kid: 'cle-de-test', typ: 'JWT' })
      .setIssuer(options.emetteur ?? this.emetteur)
      // Un jeton expiré a aussi été émis dans le passé.
      .setIssuedAt(Math.min(maintenant, maintenant + duree - 60))
      .setExpirationTime(maintenant + duree);
    if (sujet !== null) jeton = jeton.setSubject(sujet);
    if (audience !== null) jeton = jeton.setAudience(audience);
    return jeton.sign(options.cle === 'inconnue' ? this.cleInconnue : this.clePubliee);
  }

  jetonMembre(sujet: string = randomUUID()): Promise<string> {
    return this.jeton({ sujet, roles: ['membre'] });
  }

  jetonModerateur(sujet: string = randomUUID()): Promise<string> {
    return this.jeton({ sujet, roles: ['moderateur'] });
  }

  async arreter(): Promise<void> {
    await new Promise<void>((fin) => this.serveur.close(() => fin()));
  }
}

/** Décode la charge utile d'un jeton, sans rien vérifier. */
export function lireContenu(jeton: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString('utf8'));
}

/**
 * Remplace la charge utile d'un jeton en gardant sa signature d'origine : une falsification.
 * Règle du bac à sable : on vérifie que le jeton obtenu diffère vraiment de l'original.
 */
export function falsifierContenu(jeton: string, modifier: (contenu: Record<string, unknown>) => void): string {
  const [entete, , signature] = jeton.split('.');
  const contenu = lireContenu(jeton);
  modifier(contenu);
  const falsifie = [entete, Buffer.from(JSON.stringify(contenu)).toString('base64url'), signature].join('.');
  if (falsifie === jeton) throw new Error('Falsification sans effet : le jeton est identique à l’original');
  return falsifie;
}

/**
 * Modifie la signature d'un jeton. Le premier caractère est changé, pas le dernier :
 * en base64, les derniers bits du dernier caractère ne sont pas significatifs (difficulté du bac à sable).
 */
export function falsifierSignature(jeton: string): string {
  const [entete, contenu, signature] = jeton.split('.');
  const premier = signature[0] === 'A' ? 'B' : 'A';
  const falsifiee = premier + signature.slice(1);
  if (Buffer.from(falsifiee, 'base64url').equals(Buffer.from(signature, 'base64url'))) {
    throw new Error('Falsification sans effet : la signature décodée est identique à l’originale');
  }
  return [entete, contenu, falsifiee].join('.');
}
