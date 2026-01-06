import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Store } from './Store';
import { Subscription } from './Subscription';

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type PaymentProvider = 'MERCADO_PAGO' | 'MOCK';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Store, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @ManyToOne(() => Subscription, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription;

  @Column({ type: 'varchar' })
  method!: PaymentMethod;

  @Column({ type: 'varchar' })
  status!: PaymentStatus;

  @Column('numeric', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ name: 'qr_code_base64', type: 'text', nullable: true })
  qrCodeBase64?: string | null;

  @Column({ name: 'payment_link', type: 'text', nullable: true })
  paymentLink?: string | null;

  @Column({ name: 'provider', type: 'varchar', default: 'MOCK' })
  provider!: PaymentProvider;

  @Column({ name: 'provider_id', type: 'varchar', nullable: true })
  providerId?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
