import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MfaOwnerType } from './MfaSetting';

@Entity({ name: 'mfa_challenges' })
export class MfaChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_mfa_challenges_token_hash', { unique: true })
  @Column({ name: 'challenge_token_hash', type: 'text' })
  challengeTokenHash!: string;

  @Column({ name: 'owner_type', type: 'varchar' })
  ownerType!: MfaOwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ default: 'LOGIN' })
  purpose!: string;

  @Column({ name: 'session_payload', type: 'jsonb' })
  sessionPayload!: Record<string, any>;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt?: Date | null;

  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attemptsCount!: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
