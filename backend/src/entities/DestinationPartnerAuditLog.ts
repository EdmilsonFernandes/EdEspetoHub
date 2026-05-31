import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DestinationPartnerAccount } from './DestinationPartnerAccount';

@Entity({ name: 'destination_partner_audit_logs' })
export class DestinationPartnerAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DestinationPartnerAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'account_id' })
  account?: DestinationPartnerAccount | null;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string | null;

  @Column({ type: 'text' })
  action!: string;

  @Column({ name: 'resource_type', type: 'text', nullable: true })
  resourceType?: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string | null;

  @Column({ name: 'before_json', type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  beforeJson?: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  afterJson?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  metadata?: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'text', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
