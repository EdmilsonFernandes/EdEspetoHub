import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

@Entity({ name: 'customer_addresses' })
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', nullable: true })
  label?: string;

  @Column({ name: 'recipient_name', type: 'text', nullable: true })
  recipientName?: string;

  @Column({ type: 'text', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 8 })
  cep!: string;

  @Column()
  street!: string;

  @Column({ type: 'text', nullable: true })
  number?: string;

  @Column({ type: 'text', nullable: true })
  complement?: string;

  @Column({ type: 'text', nullable: true })
  neighborhood?: string;

  @Column()
  city!: string;

  @Column({ type: 'varchar', length: 2 })
  state!: string;

  @Column('decimal', { name: 'lat', precision: 10, scale: 7, nullable: true })
  lat?: number | null;

  @Column('decimal', { name: 'lng', precision: 10, scale: 7, nullable: true })
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

  // Link opcional ao condomínio (FK real, nunca texto livre). Quando presente,
  // este endereço representa uma unidade dentro do condomínio (bloco/apto).
  @Column({ name: 'condominium_id', type: 'uuid', nullable: true })
  condominiumId?: string | null;

  @Column({ name: 'condominium_block', type: 'text', nullable: true })
  condominiumBlock?: string | null;

  @Column({ name: 'condominium_unit', type: 'text', nullable: true })
  condominiumUnit?: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
