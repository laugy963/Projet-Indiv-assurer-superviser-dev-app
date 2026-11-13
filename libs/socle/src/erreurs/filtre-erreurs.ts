import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { RequeteInvalide } from './requete-invalide';

// Un libellé fixe par code : la réponse ne peut pas recopier un message technique (critère CA-03).
const LIBELLES = new Map<number, string>([
  [400, 'Requête invalide'],
  [401, 'Jeton absent ou invalide'],
  [403, 'Rôle insuffisant'],
  [404, 'Ressource absente'],
]);

interface ReponseHttp {
  status(code: number): ReponseHttp;
  json(corps: unknown): void;
}

/**
 * Filtre appliqué à toutes les routes : traduit toute erreur en un code HTTP et un message lisible.
 * Le détail d'une erreur inattendue (requête SQL, chemin de fichier, trace) part dans le journal, pas dans la réponse.
 */
@Catch()
export class FiltreErreurs implements ExceptionFilter {
  private readonly journal = new Logger(FiltreErreurs.name);

  catch(erreur: unknown, hote: ArgumentsHost): void {
    // Hors HTTP, le consommateur de messages décide lui-même du sort du message.
    if (hote.getType() !== 'http') throw erreur;

    const http = hote.switchToHttp();
    const reponse = http.getResponse<ReponseHttp>();

    if (erreur instanceof RequeteInvalide) {
      reponse.status(400).json({ code: 400, message: LIBELLES.get(400), champs: erreur.champs });
      return;
    }

    if (erreur instanceof HttpException && erreur.getStatus() < 500) {
      const code = erreur.getStatus();
      reponse.status(code).json({ code, message: LIBELLES.get(code) ?? 'Requête refusée' });
      return;
    }

    const requete = http.getRequest<{ method?: string; url?: string }>();
    this.journal.error(
      { etat: 'erreur-inattendue', methode: requete.method, chemin: requete.url },
      erreur instanceof Error ? erreur.stack : String(erreur),
    );
    reponse.status(500).json({ code: 500, message: 'Erreur interne' });
  }
}
