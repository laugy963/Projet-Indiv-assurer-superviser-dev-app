import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Ligne de la table « centres_interet » (architecture, paragraphe 7.2). Le domaine ne connaît pas ces classes. */
@Entity({ name: 'centres_interet' })
export class CentreInteretEntite {
  @PrimaryColumn({ name: 'membre_id', type: 'uuid' })
  membreId!: string;

  @PrimaryColumn({ type: 'varchar', length: 30 })
  categorie!: string;
}

/** Ligne de la table « notifications ». */
@Entity({ name: 'notifications' })
export class NotificationEntite {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'membre_id', type: 'uuid' })
  membreId!: string;

  @Column({ name: 'annonce_id', type: 'uuid' })
  annonceId!: string;

  @Column({ name: 'titre_annonce', type: 'varchar', length: 100 })
  titreAnnonce!: string;

  @Column({ type: 'varchar', length: 30 })
  categorie!: string;

  @Column({ name: 'type_annonce', type: 'varchar', length: 10 })
  typeAnnonce!: string;

  @Column({ name: 'creee_le', type: 'timestamptz' })
  creeeLe!: Date;
}
