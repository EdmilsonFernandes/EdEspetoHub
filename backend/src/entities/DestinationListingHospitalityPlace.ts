import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DestinationListing } from './DestinationListing';
import { HospitalityPlace } from './HospitalityPlace';

@Entity({ name: 'destination_listing_hospitality_places' })
@Unique('uq_destination_listing_hospitality_places_listing_place', ['listingId', 'hospitalityPlaceId'])
export class DestinationListingHospitalityPlace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DestinationListing, (listing) => listing.hospitalityPlaceLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: DestinationListing;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @ManyToOne(() => HospitalityPlace, (place) => place.listingLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospitality_place_id' })
  hospitalityPlace!: HospitalityPlace;

  @Column({ name: 'hospitality_place_id', type: 'uuid' })
  hospitalityPlaceId!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
