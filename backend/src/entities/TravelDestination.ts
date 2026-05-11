import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationBanner } from './DestinationBanner';
import { DestinationListing } from './DestinationListing';
import { HospitalityPlace } from './HospitalityPlace';

@Entity({ name: 'travel_destinations' })
export class TravelDestination {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', nullable: true })
  state?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'hero_title', type: 'text', nullable: true })
  heroTitle?: string | null;

  @Column({ name: 'hero_subtitle', type: 'text', nullable: true })
  heroSubtitle?: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl?: string | null;

  @Column('numeric', { precision: 10, scale: 7, nullable: true })
  lat?: number | null;

  @Column('numeric', { precision: 10, scale: 7, nullable: true })
  lng?: number | null;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => DestinationBanner, (banner) => banner.destination)
  banners!: DestinationBanner[];

  @OneToMany(() => HospitalityPlace, (place) => place.destination)
  hospitalityPlaces!: HospitalityPlace[];

  @OneToMany(() => DestinationListing, (listing) => listing.destination)
  listings!: DestinationListing[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
