import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './Store';

@Entity({ name: 'promo_pushes' })
export class PromoPush {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'title', type: 'varchar' })
  title!: string;

  @Column({ name: 'body', type: 'varchar' })
  body!: string;

  // PENDING_PAYMENT | PENDING_APPROVAL | APPROVED | REJECTED | SENT | CANCELLED
  @Column({ name: 'status', type: 'varchar', default: 'PENDING_PAYMENT' })
  status!: string;

  @Column({ name: 'price_amount', type: 'decimal', precision: 10, scale: 2, default: 4.90 })
  priceAmount!: number;

  @Column({ name: 'payment_method', type: 'varchar', default: 'PIX' })
  paymentMethod!: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  paymentStatus!: string;

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

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ name: 'sent_count', type: 'int', nullable: true })
  sentCount?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
