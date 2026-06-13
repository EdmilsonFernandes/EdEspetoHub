import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Promoção paga de um recurso de destino (hospedagem/chalé, listing/serviço ou destino/cidade).
 * Espelha o ciclo de pagamento de `FeaturedProductRequest` (destaque de produto):
 * status PENDING_PAYMENT -> APPROVED/PAID_WAITING_SLOT -> EXPIRED, com PIX via Mercado Pago.
 *
 * O recurso promovido é polimórfico (resourceType + resourceId) para evitar FKs complexos.
 * No pagamento confirmado, o serviço aplica featured/sort_order no recurso vinculado.
 */
@Entity({ name: 'destination_promotions' })
export class DestinationPromotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'resource_type', type: 'varchar' })
  resourceType!: 'HOSPITALITY_PLACE' | 'DESTINATION_LISTING' | 'DESTINATION';

  @Column({ name: 'resource_id', type: 'varchar' })
  resourceId!: string;

  @Column({ name: 'resource_name', type: 'varchar', nullable: true })
  resourceName?: string | null;

  @Column({ name: 'destination_id', type: 'varchar', nullable: true })
  destinationId?: string | null;

  @Column({ name: 'partner_account_id', type: 'varchar', nullable: true })
  partnerAccountId?: string | null;

  @Column({ type: 'varchar', default: 'PENDING_PAYMENT' })
  status!: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  paymentStatus!: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ name: 'duration_unit', type: 'varchar', default: 'DAY' })
  durationUnit!: 'DAY' | 'WEEK' | 'MONTH';

  /** Ordenação original do recurso antes do boost; restaurada ao expirar. */
  @Column({ name: 'original_sort_order', type: 'int', nullable: true })
  originalSortOrder?: number | null;

  @Column({ name: 'price_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceAmount?: number | null;

  @Column({ name: 'payment_method', type: 'varchar', default: 'PIX' })
  paymentMethod!: string;

  @Column({ name: 'payment_provider', type: 'varchar', nullable: true })
  paymentProvider?: string | null;

  @Column({ name: 'payment_provider_id', type: 'varchar', nullable: true })
  paymentProviderId?: string | null;

  @Column({ name: 'payment_link', type: 'text', nullable: true })
  paymentLink?: string | null;

  @Column({ name: 'payment_qr_code_base64', type: 'text', nullable: true })
  paymentQrCodeBase64?: string | null;

  @Column({ name: 'payment_qr_code_text', type: 'text', nullable: true })
  paymentQrCodeText?: string | null;

  @Column({ name: 'payment_expires_at', type: 'timestamptz', nullable: true })
  paymentExpiresAt?: Date | null;

  @Column({ name: 'payment_paid_at', type: 'timestamptz', nullable: true })
  paymentPaidAt?: Date | null;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date | null;

  @Column({ name: 'approved_by_admin_id', type: 'text', nullable: true })
  approvedByAdminId?: string | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string | null;

  @Column({ name: 'public_note', type: 'text', nullable: true })
  publicNote?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
