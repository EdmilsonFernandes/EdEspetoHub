import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'email_suppressions' })
export class EmailSuppression {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'normalized_email', type: 'text' })
  normalizedEmail!: string;

  @Column({ type: 'text', default: 'marketing' })
  category!: string;

  @Column({ type: 'text', default: 'public_link' })
  source!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
