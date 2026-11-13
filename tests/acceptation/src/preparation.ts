// Exécuté par Jest avant chaque fichier de tests d'acceptation.
// Sur le poste, les mots de passe des comptes de test sont lus dans tests/environnement/.env.
// Ailleurs (pipeline, environnement déployé), ils arrivent déjà par des variables d'environnement.
import { chargerEnvironnementDeTest } from '@epouvante/socle/outils-de-test';

if (!process.env.COMPTE_MEMBRE_A_MOT_DE_PASSE) chargerEnvironnementDeTest();
