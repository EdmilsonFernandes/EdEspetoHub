import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './Order';
import { OrderShipmentEvent } from './OrderShipmentEvent';

@Entity({ name: 'order_shipments' })
export class OrderShipment {
  @PrimaryColumn('uuid', { name: 'order_id' })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @OneToMany(() => OrderShipmentEvent, (event) => event.shipment)
  events?: OrderShipmentEvent[];

  @Column({ name: 'provider', type: 'text', nullable: true })
  provider?: string | null;

  @Column({ name: 'service_code', type: 'text', nullable: true })
  serviceCode?: string | null;

  @Column({ name: 'service_name', type: 'text', nullable: true })
  serviceName?: string | null;

  @Column({ name: 'tracking_code', type: 'text', nullable: true })
  trackingCode?: string | null;

  @Column({ name: 'tracking_url', type: 'text', nullable: true })
  trackingUrl?: string | null;

  @Column({ name: 'shipment_status', type: 'text', default: 'pending_posting' })
  shipmentStatus!: string;

  @Column({ name: 'quote_payload', type: 'jsonb', nullable: true })
  quotePayload?: Record<string, any> | null;

  @Column({ name: 'tracking_last_event', type: 'jsonb', nullable: true })
  trackingLastEvent?: Record<string, any> | null;

  @Column({ name: 'tracking_last_at', type: 'timestamptz', nullable: true })
  trackingLastAt?: Date | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt?: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
