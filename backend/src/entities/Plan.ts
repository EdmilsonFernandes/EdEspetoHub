import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanName =
  | 'basic_monthly'
  | 'pro_monthly'
  | 'premium_monthly'
  | 'basic_yearly'
  | 'pro_yearly'
  | 'premium_yearly'
  | 'monthly'
  | 'yearly'
  | string;

@Entity({ name: 'plans' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: PlanName;

  @Column('numeric', { precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
