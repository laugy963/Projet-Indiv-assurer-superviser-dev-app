import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Ligne de la table « annonces » (architecture, paragraphe 7.1). Le domaine ne connaît pas cette classe. */
@Entity({ name: 'annonces' })
export class AnnonceEntite {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  titre!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 30 })
  categorie!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: string;

  @Column({ type: 'varchar', length: 10 })
  statut!: string;

  @Column({ name: 'auteur_id', type: 'uuid' })
  auteurId!: string;

  @Column({ name: 'publiee_le', type: 'timestamptz' })
  publieeLe!: Date;

  @Column({ name: 'retiree_le', type: 'timestamptz', nullable: true })
  retireeLe!: Date | null;

  @Column({ name: 'retiree_par', type: 'uuid', nullable: true })
  retireePar!: string | null;
}
