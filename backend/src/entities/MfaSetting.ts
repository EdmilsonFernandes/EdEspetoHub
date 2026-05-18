import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MfaOwnerType = 'USER' | 'PLATFORM_ADMIN' | 'CONDOMINIUM_USER';

@Entity({ name: 'mfa_settings' })
@Index('uq_mfa_settings_owner_method', ['ownerType', 'ownerId', 'method'], { unique: true })
export class MfaSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar' })
  ownerType!: MfaOwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ default: 'TOTP' })
  method!: string;

  @Column({ name: 'secret_encrypted', type: 'text' })
  secretEncrypted!: string;

  @Column({ name: 'secret_iv', type: 'text' })
  secretIv!: string;

  @Column({ name: 'secret_auth_tag', type: 'text' })
  secretAuthTag!: string;

  @Column({ default: false })
  enabled!: boolean;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
