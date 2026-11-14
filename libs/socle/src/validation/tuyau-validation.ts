import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { RequeteInvalide, type ChampEnErreur } from '../erreurs/requete-invalide';

/**
 * Validation des entrées par liste blanche (bonne pratique de sécurité n° 2).
 * Seuls les champs décrits par le DTO sont acceptés : tout champ non prévu fait refuser la requête.
 */
export function creerTuyauValidation(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    // Transforme le corps en instance du DTO, et les paramètres d'URL dans leur type déclaré.
    transform: true,
    exceptionFactory: (erreurs) => new RequeteInvalide(erreurs.map(decrire)),
  });
}

function decrire(erreur: ValidationError): ChampEnErreur {
  const contraintes = erreur.constraints ?? {};
  if ('whitelistValidation' in contraintes) return { champ: erreur.property, erreurs: ['Champ non prévu'] };
  const messages = Object.values(contraintes);
  return { champ: erreur.property, erreurs: messages.length > 0 ? messages : ['Valeur invalide'] };
}
