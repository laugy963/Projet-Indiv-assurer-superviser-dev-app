import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Première migration de la base « annonces » (fiche 0008) : le schéma est versionné, jamais synchronisé. */
export class CreerAnnonces1763000000000 implements MigrationInterface {
  name = 'CreerAnnonces1763000000000';

  async up(requetes: QueryRunner): Promise<void> {
    await requetes.query(`
      CREATE TABLE annonces (
        id          uuid         PRIMARY KEY,
        titre       varchar(100) NOT NULL,
        description text         NOT NULL,
        categorie   varchar(30)  NOT NULL
          CHECK (categorie IN ('figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres')),
        type        varchar(10)  NOT NULL CHECK (type IN ('troc', 'don')),
        statut      varchar(10)  NOT NULL CHECK (statut IN ('publiee', 'retiree')),
        auteur_id   uuid         NOT NULL,
        publiee_le  timestamptz  NOT NULL,
        retiree_le  timestamptz,
        retiree_par uuid
      )
    `);
    // Sert la liste des annonces publiées, de la plus récente à la plus ancienne (US-05).
    await requetes.query(`CREATE INDEX annonces_publiees ON annonces (publiee_le DESC) WHERE statut = 'publiee'`);
  }

  async down(requetes: QueryRunner): Promise<void> {
    await requetes.query('DROP TABLE annonces');
  }
}
