import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Store } from './Store';
import { OrderItem } from './OrderItem';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_name' })
  customerName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ default: 'delivery' })
  type!: string;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total!: number;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
