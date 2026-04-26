import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'customer_security_blocks' })
export class CustomerSecurityBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'email_snapshot', type: 'text', nullable: true })
  emailSnapshot?: string | null;

  @Column({ name: 'phone_snapshot', type: 'text', nullable: true })
  phoneSnapshot?: string | null;

  @Column({ name: 'block_type', type: 'varchar', length: 40 })
  blockType!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 20, default: 'soft' })
  severity!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'blocked_at', type: 'timestamptz', default: () => 'NOW()' })
  blockedAt!: Date;

  @Column({ name: 'blocked_until', type: 'timestamptz', nullable: true })
  blockedUntil?: Date | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'reviewed_by', type: 'text', nullable: true })
  reviewedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
