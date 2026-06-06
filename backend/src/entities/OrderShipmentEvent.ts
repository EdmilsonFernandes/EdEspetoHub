import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderShipment } from './OrderShipment';

@Entity({ name: 'order_shipment_events' })
@Index('idx_order_shipment_events_order_event_at', ['orderId', 'eventAt'])
@Index('idx_order_shipment_events_order_source_status', ['orderId', 'source', 'status'])
export class OrderShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => OrderShipment, (shipment) => shipment.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  shipment?: OrderShipment;

  @Column({ name: 'source', type: 'text' })
  source!: string;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'location', type: 'text', nullable: true })
  location?: string | null;

  @Column({ name: 'event_at', type: 'timestamptz' })
  eventAt!: Date;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
