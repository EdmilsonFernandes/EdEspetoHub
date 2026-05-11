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

@Entity({ name: 'hospitality_place_store_links' })
export class HospitalityPlaceStoreLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => HospitalityPlace, (place) => place.storeLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospitality_place_id' })
  hospitalityPlace!: HospitalityPlace;

  @Column({ name: 'hospitality_place_id' })
  hospitalityPlaceId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id' })
  storeId!: string;

  @Column({ name: 'delivery_enabled', default: true })
  deliveryEnabled!: boolean;

  @Column({ name: 'pickup_enabled', default: false })
  pickupEnabled!: boolean;

  @Column({ name: 'delivery_fee', type: 'numeric', precision: 10, scale: 2, nullable: true })
  deliveryFee?: number | null;

  @Column({ name: 'estimated_minutes', type: 'int', nullable: true })
  estimatedMinutes?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ default: false })
  recommended!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
