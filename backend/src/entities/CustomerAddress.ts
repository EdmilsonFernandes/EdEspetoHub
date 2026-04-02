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

  @Column({ nullable: true })
  label?: string | null;

  @Column({ name: 'recipient_name', nullable: true })
  recipientName?: string | null;

  @Column({ nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 8 })
  cep!: string;

  @Column()
  street!: string;

  @Column({ nullable: true })
  number?: string | null;

  @Column({ nullable: true })
  complement?: string | null;

  @Column({ nullable: true })
  neighborhood?: string | null;

  @Column()
  city!: string;

  @Column({ type: 'varchar', length: 2 })
  state!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

