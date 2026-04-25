import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'zip_code_cache' })
export class ZipCodeCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'zip_code', type: 'varchar', length: 8, unique: true })
  zipCode!: string;

  @Column({ type: 'text', nullable: true })
  street?: string | null;

  @Column({ type: 'text', nullable: true })
  district?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  state?: string | null;

  @Column({ name: 'ibge_code', type: 'text', nullable: true })
  ibgeCode?: string | null;

  @Column('decimal', { name: 'latitude', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column('decimal', { name: 'longitude', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  provider?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
