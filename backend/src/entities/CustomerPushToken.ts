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

/**
 * Stores customer mobile push tokens for Android/iOS app notifications.
 *
 * @author Edmilson Lopes
 */
@Entity({ name: 'customer_push_tokens' })
export class CustomerPushToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'text', default: 'android' })
  platform!: string;

  @Column({ name: 'app_version', type: 'text', nullable: true })
  appVersion?: string | null;

  @Column({ name: 'device_model', type: 'text', nullable: true })
  deviceModel?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

