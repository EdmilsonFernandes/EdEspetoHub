import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Order } from './Order';
import { Store } from './Store';

@Entity({ name: 'order_payments' })
export class OrderPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'payment_method', type: 'varchar' })
  paymentMethod!: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  /** Balcão (cobranca-balcao) acrescenta CANCELED (lojista encerrou) e EXPIRED (5min). */
  paymentStatus!: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED';

  @Column({ name: 'amount', type: 'numeric', precision: 10, scale: 2 })
  amount!: number;

  @Column({ name: 'provider', type: 'varchar', default: 'MERCADO_PAGO' })
  /** MANUAL = registro de dinheiro no balcão (sem integração). */
  provider!: 'MERCADO_PAGO' | 'MANUAL';

  @Column({ name: 'provider_id', type: 'varchar', nullable: true })
  providerId?: string | null;

  @Column({ name: 'payment_link', type: 'text', nullable: true })
  paymentLink?: string | null;

  @Column({ name: 'qr_code_base64', type: 'text', nullable: true })
  qrCodeBase64?: string | null;

  @Column({ name: 'qr_code_text', type: 'text', nullable: true })
  qrCodeText?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt?: Date | null;

  @Column({ name: 'provider_payload', type: 'jsonb', nullable: true })
  providerPayload?: Record<string, any> | null;

  /** Id da ORDER do Mercado Pago (Point) — webhook tópico `order` resolve por aqui. */
  @Column({ name: 'provider_order_id', type: 'varchar', nullable: true })
  providerOrderId?: string | null;

  /** Maquininha Point que recebeu a cobrança do balcão. */
  @Column({ name: 'terminal_id', type: 'varchar', nullable: true })
  terminalId?: string | null;

  /** Rastro do balcão: chargeSource, ajuste de valor (original/autor), cash audit. */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ name: 'refund_status', type: 'varchar', nullable: true })
  refundStatus?: string | null;

  @Column({ name: 'refund_amount', type: 'numeric', precision: 10, scale: 2, nullable: true })
  refundAmount?: number | null;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason?: string | null;

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt?: Date | null;

  @Column({ name: 'refund_provider_id', type: 'varchar', nullable: true })
  refundProviderId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
