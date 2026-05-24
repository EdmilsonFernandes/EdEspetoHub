import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'email_template_versions' })
export class EmailTemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'text' })
  key!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
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

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
