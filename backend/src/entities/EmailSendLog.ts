import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'email_send_logs' })
export class EmailSendLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_key', type: 'text', nullable: true })
  templateKey?: string | null;

  @Column({ type: 'text', default: 'transactional' })
  category!: string;

  @Column({ name: 'to_email', type: 'text' })
  toEmail!: string;

  @Column({ type: 'text', nullable: true })
  subject?: string | null;

  @Column({ type: 'text' })
  status!: string;

  @Column({ name: 'provider_message_id', type: 'text', nullable: true })
  providerMessageId?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'suppression_id', type: 'uuid', nullable: true })
  suppressionId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
