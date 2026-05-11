import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HospitalityPlace } from './HospitalityPlace';
import { Store } from './Store';

@Entity({ name: 'destination_store_requests' })
export class DestinationStoreRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id' })
  storeId!: string;

  @ManyToOne(() => HospitalityPlace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospitality_place_id' })
  hospitalityPlace!: HospitalityPlace;

  @Column({ name: 'hospitality_place_id' })
  hospitalityPlaceId!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'delivery_enabled', default: true })
  deliveryEnabled!: boolean;

  @Column({ name: 'pickup_enabled', default: false })
  pickupEnabled!: boolean;

  @Column({ name: 'delivery_fee', type: 'numeric', precision: 10, scale: 2, nullable: true })
  deliveryFee?: number | null;

  @Column({ name: 'estimated_minutes', type: 'int', nullable: true })
  estimatedMinutes?: number | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
