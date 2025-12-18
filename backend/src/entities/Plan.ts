import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanName = 'monthly' | 'yearly' | 'premium' | string;

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
