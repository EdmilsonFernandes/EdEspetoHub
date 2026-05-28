import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationListingHospitalityPlace } from './DestinationListingHospitalityPlace';
import { HospitalityPlace } from './HospitalityPlace';
import { Store } from './Store';
import { TravelDestination } from './TravelDestination';

@Entity({ name: 'destination_listings' })
export class DestinationListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TravelDestination, (destination) => destination.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destination_id' })
  destination!: TravelDestination;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @ManyToOne(() => HospitalityPlace, (place) => place.listings, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hospitality_place_id' })
  hospitalityPlace?: HospitalityPlace | null;

  @Column({ name: 'hospitality_place_id', type: 'uuid', nullable: true })
  hospitalityPlaceId?: string | null;

  @OneToMany(() => DestinationListingHospitalityPlace, (link) => link.listing)
  hospitalityPlaceLinks?: DestinationListingHospitalityPlace[];

  @ManyToOne(() => Store, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_id' })
  store?: Store | null;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ type: 'text', default: 'SERVICO' })
  category!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'address_number', type: 'text', nullable: true })
  addressNumber?: string | null;

  @Column({ type: 'text', nullable: true })
  district?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', nullable: true })
  state?: string | null;

  @Column({ name: 'zip_code', type: 'text', nullable: true })
  zipCode?: string | null;

  @Column('numeric', { precision: 10, scale: 7, nullable: true })
  lat?: number | null;

  @Column('numeric', { precision: 10, scale: 7, nullable: true })
  lng?: number | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  whatsapp?: string | null;

  @Column({ name: 'instagram_url', type: 'text', nullable: true })
  instagramUrl?: string | null;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl?: string | null;

  @Column({ name: 'cta_type', type: 'text', nullable: true })
  ctaType?: string | null;

  @Column({ name: 'cta_url', type: 'text', nullable: true })
  ctaUrl?: string | null;

  @Column({ default: false })
  featured!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
