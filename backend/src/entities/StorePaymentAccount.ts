import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './Store';

@Entity({ name: 'store_payment_accounts' })
export class StorePaymentAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ type: 'varchar' })
  provider!: 'MERCADO_PAGO';

  @Column({ type: 'varchar', default: 'CONNECTED' })
  status!: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

  @Column({ name: 'provider_user_id', type: 'varchar', nullable: true })
  providerUserId?: string | null;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted!: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text', nullable: true })
  refreshTokenEncrypted?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
