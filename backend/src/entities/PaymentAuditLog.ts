import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'payment_audit_logs' })
export class PaymentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ name: 'flow_type', type: 'varchar' })
  flowType!: string;

  @Column({ name: 'event_stage', type: 'varchar' })
  eventStage!: string;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'text' })
  entityId!: string;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'external_reference', type: 'text', nullable: true })
  externalReference?: string | null;

  @Column({ name: 'provider_payment_id', type: 'text', nullable: true })
  providerPaymentId?: string | null;

  @Column({ name: 'provider_status', type: 'text', nullable: true })
  providerStatus?: string | null;

  @Column({ name: 'provider_status_detail', type: 'text', nullable: true })
  providerStatusDetail?: string | null;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload?: Record<string, any> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload?: Record<string, any> | null;

  @Column({ name: 'error_payload', type: 'jsonb', nullable: true })
  errorPayload?: Record<string, any> | null;

  @Column({ name: 'http_status', type: 'int', nullable: true })
  httpStatus?: number | null;

  @Column({ name: 'success', type: 'boolean', nullable: true })
  success?: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
