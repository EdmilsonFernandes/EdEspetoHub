import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MfaOwnerType } from './MfaSetting';

@Entity({ name: 'trusted_devices' })
@Index('idx_trusted_devices_owner_active', ['ownerType', 'ownerId', 'revokedAt', 'expiresAt'])
export class TrustedDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar' })
  ownerType!: MfaOwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'device_id_hash', type: 'text' })
  deviceIdHash!: string;

  @Column({ name: 'trust_token_hash', type: 'text' })
  trustTokenHash!: string;

  @Column({ type: 'varchar', nullable: true })
  label?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'text', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'trusted_at', type: 'timestamptz' })
  trustedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
