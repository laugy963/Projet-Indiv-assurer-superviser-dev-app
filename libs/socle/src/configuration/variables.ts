/**
 * Lit une variable d'environnement obligatoire.
 * Un réglage absent arrête le service au démarrage, plutôt qu'à la première requête.
 * Les secrets (mots de passe) arrivent par ce canal, depuis un objet Secret : jamais depuis le code.
 */
export function lireVariable(nom: string, environnement: Record<string, string | undefined> = process.env): string {
  // eslint-disable-next-line security/detect-object-injection -- le nom vient du code, jamais d'une requête
  const valeur = environnement[nom];
  if (valeur === undefined || valeur === '') {
    throw new Error(`Variable d'environnement obligatoire absente : ${nom}`);
  }
  return valeur;
}
