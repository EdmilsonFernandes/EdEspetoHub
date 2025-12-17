import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './Store';
import { Plan } from './Plan';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED';

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, (store) => store.subscriptions, { eager: true })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @ManyToOne(() => Plan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'varchar' })
  status!: SubscriptionStatus;

  @Column({ name: 'auto_renew', default: false })
  autoRenew!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
