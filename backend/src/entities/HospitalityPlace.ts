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
import { DestinationListing } from './DestinationListing';
import { DestinationListingHospitalityPlace } from './DestinationListingHospitalityPlace';
import { HospitalityPlaceStoreLink } from './HospitalityPlaceStoreLink';
import { TravelDestination } from './TravelDestination';

@Entity({ name: 'hospitality_places' })
export class HospitalityPlace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TravelDestination, (destination) => destination.hospitalityPlaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destination_id' })
  destination!: TravelDestination;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column({ type: 'text', default: 'CHALE' })
  type!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

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

  @Column({ name: 'geo_source', type: 'text', nullable: true, default: 'unknown' })
  geoSource?: string | null;

  @Column({ name: 'geo_precision', type: 'text', nullable: true, default: 'unknown' })
  geoPrecision?: string | null;

  @Column({ name: 'geo_verified', type: 'boolean', default: false })
  geoVerified!: boolean;

  @Column({ name: 'geocoded_at', type: 'timestamptz', nullable: true })
  geocodedAt?: Date | null;

  @Column({ name: 'formatted_address', type: 'text', nullable: true })
  formattedAddress?: string | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  whatsapp?: string | null;

  @Column({ name: 'instagram_url', type: 'text', nullable: true })
  instagramUrl?: string | null;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl?: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl?: string | null;

  @Column({
    name: 'banner_urls',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: string[] | null) => (Array.isArray(value) ? value : []),
      from: (value: string[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  bannerUrls?: string[];

  @Column({
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: string[] | null) => (Array.isArray(value) ? value : []),
      from: (value: string[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  amenities?: string[];

  @Column({ name: 'delivery_instructions', type: 'text', nullable: true })
  deliveryInstructions?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => HospitalityPlaceStoreLink, (link) => link.hospitalityPlace)
  storeLinks!: HospitalityPlaceStoreLink[];

  @OneToMany(() => DestinationListing, (listing) => listing.hospitalityPlace)
  listings!: DestinationListing[];

  @OneToMany(() => DestinationListingHospitalityPlace, (link) => link.hospitalityPlace)
  listingLinks!: DestinationListingHospitalityPlace[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
