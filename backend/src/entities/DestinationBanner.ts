import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TravelDestination } from './TravelDestination';

@Entity({ name: 'destination_banners' })
export class DestinationBanner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TravelDestination, (destination) => destination.banners, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destination_id' })
  destination!: TravelDestination;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'action_type', type: 'text', nullable: true })
  actionType?: string | null;

  @Column({ name: 'action_target', type: 'text', nullable: true })
  actionTarget?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
