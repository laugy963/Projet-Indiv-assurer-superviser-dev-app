import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Première migration de la base « notifications » (fiche 0008) : le schéma est versionné, jamais synchronisé. */
export class CreerNotifications1763000000000 implements MigrationInterface {
  name = 'CreerNotifications1763000000000';

  async up(requetes: QueryRunner): Promise<void> {
    await requetes.query(`
      CREATE TABLE centres_interet (
        membre_id uuid        NOT NULL,
        categorie varchar(30) NOT NULL
          CHECK (categorie IN ('figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres')),
        PRIMARY KEY (membre_id, categorie)
      )
    `);
    // Sert la question du consommateur : quels membres ont choisi cette catégorie ?
    await requetes.query('CREATE INDEX centres_interet_par_categorie ON centres_interet (categorie)');

    await requetes.query(`
      CREATE TABLE notifications (
        id            uuid         PRIMARY KEY,
        membre_id     uuid         NOT NULL,
        annonce_id    uuid         NOT NULL,
        titre_annonce varchar(100) NOT NULL,
        categorie     varchar(30)  NOT NULL,
        type_annonce  varchar(10)  NOT NULL,
        creee_le      timestamptz  NOT NULL,
        -- Une seule notification par membre et par annonce : rend le traitement de l'événement idempotent.
        CONSTRAINT notification_unique_par_membre_et_annonce UNIQUE (membre_id, annonce_id)
      )
    `);
    // Sert la liste d'un membre, de la plus récente à la plus ancienne.
    await requetes.query('CREATE INDEX notifications_du_membre ON notifications (membre_id, creee_le DESC)');
  }

  async down(requetes: QueryRunner): Promise<void> {
    await requetes.query('DROP TABLE notifications');
    await requetes.query('DROP TABLE centres_interet');
  }
}
