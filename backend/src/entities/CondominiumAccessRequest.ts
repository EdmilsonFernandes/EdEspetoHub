import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Condominium } from './Condominium';

@Entity({ name: 'condominium_access_requests' })
export class CondominiumAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'condominium_name' })
  condominiumName!: string;

  @Column({ type: 'text', nullable: true })
  slug?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'text', nullable: true })
  state?: string | null;

  @Column({ name: 'zip_code', type: 'text', nullable: true })
  zipCode?: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl?: string | null;

  @Column({ name: 'responsible_name' })
  responsibleName!: string;

  @Column({ name: 'responsible_role', type: 'text', nullable: true })
  responsibleRole?: string | null;

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

  @ManyToOne(() => Condominium, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_condominium_id' })
  createdCondominium?: Condominium | null;

  @Column({ name: 'created_condominium_id', type: 'uuid', nullable: true })
  createdCondominiumId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
