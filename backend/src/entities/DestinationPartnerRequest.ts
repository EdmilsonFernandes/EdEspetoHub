import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationListing } from './DestinationListing';
import { HospitalityPlace } from './HospitalityPlace';
import { TravelDestination } from './TravelDestination';

@Entity({ name: 'destination_partner_requests' })
export class DestinationPartnerRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TravelDestination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destination_id' })
  destination!: TravelDestination;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @Column({ name: 'partner_type', type: 'text', default: 'HOSPITALITY' })
  partnerType!: string;

  @Column({ name: 'place_type', type: 'text', nullable: true })
  placeType?: string | null;

  @Column({ type: 'text', nullable: true })
  category?: string | null;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  slug?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', nullable: true })
  state?: string | null;

  @Column({ name: 'zip_code', type: 'text', nullable: true })
  zipCode?: string | null;

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

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'delivery_instructions', type: 'text', nullable: true })
  deliveryInstructions?: string | null;

  @Column({ name: 'responsible_name' })
  responsibleName!: string;

  @Column({ name: 'responsible_email' })
  responsibleEmail!: string;

  @Column({ name: 'responsible_phone', type: 'text', nullable: true })
  responsiblePhone?: string | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ type: 'text', default: 'pending' })
  status!: string;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @ManyToOne(() => HospitalityPlace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_hospitality_place_id' })
  createdHospitalityPlace?: HospitalityPlace | null;

  @Column({ name: 'created_hospitality_place_id', type: 'uuid', nullable: true })
  createdHospitalityPlaceId?: string | null;

  @ManyToOne(() => DestinationListing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_listing_id' })
  createdListing?: DestinationListing | null;

  @Column({ name: 'created_listing_id', type: 'uuid', nullable: true })
  createdListingId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
