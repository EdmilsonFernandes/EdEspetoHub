import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationPartnerAccount } from './DestinationPartnerAccount';
import { DestinationPartnerRequest } from './DestinationPartnerRequest';

@Entity({ name: 'destination_partner_permissions' })
@Unique('uq_destination_partner_permissions_resource', ['accountId', 'resourceType', 'resourceId'])
export class DestinationPartnerPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DestinationPartnerAccount, (account) => account.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: DestinationPartnerAccount;

  @Column({ name: 'account_id' })
  accountId!: string;

  @Column({ name: 'resource_type', type: 'text' })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ type: 'text', default: 'OWNER' })
  permission!: string;

  @Column({ type: 'text', default: 'active' })
  status!: string;

  @ManyToOne(() => DestinationPartnerRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_from_request_id' })
  createdFromRequest?: DestinationPartnerRequest | null;

  @Column({ name: 'created_from_request_id', type: 'uuid', nullable: true })
  createdFromRequestId?: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
