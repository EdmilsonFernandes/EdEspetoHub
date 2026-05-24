import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'email_templates' })
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  key!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', default: 'transactional' })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text' })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  preheader?: string | null;

  @Column({ name: 'text_body', type: 'text' })
  textBody!: string;

  @Column({ name: 'html_body', type: 'text' })
  htmlBody!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  variables!: string[];

  @Column({ name: 'active', default: true })
  active!: boolean;

  @Column({ name: 'allow_unsubscribe', default: false })
  allowUnsubscribe!: boolean;

  @Column({ name: 'updated_by', type: 'text', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
