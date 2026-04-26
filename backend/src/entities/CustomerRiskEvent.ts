import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customer_risk_events' })
export class CustomerRiskEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'email_snapshot', type: 'text', nullable: true })
  emailSnapshot?: string | null;

  @Column({ name: 'phone_snapshot', type: 'text', nullable: true })
  phoneSnapshot?: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 60 })
  eventType!: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  score!: number;

  @Column({ name: 'ip_address', type: 'text', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
