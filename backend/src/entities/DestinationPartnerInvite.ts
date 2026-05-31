import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DestinationPartnerAccount } from './DestinationPartnerAccount';

@Entity({ name: 'destination_partner_invites' })
export class DestinationPartnerInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DestinationPartnerAccount, (account) => account.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: DestinationPartnerAccount;

  @Column({ name: 'account_id' })
  accountId!: string;

  @Column({ name: 'token_hash', unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
