import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './Store';
import { Product } from './Product';
import { User } from './User';

@Entity({ name: 'featured_product_requests' })
export class FeaturedProductRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser?: User | null;

  @Column({ type: 'varchar', default: 'PENDING_PAYMENT' })
  status!: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  paymentStatus!: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ name: 'duration_unit', type: 'varchar', default: 'DAY' })
  durationUnit!: 'DAY' | 'WEEK' | 'MONTH';

  @Column({ name: 'requested_slots', type: 'int', default: 1 })
  requestedSlots!: number;

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
