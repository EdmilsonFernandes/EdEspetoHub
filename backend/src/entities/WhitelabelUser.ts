import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

/**
 * Registro de papéis de uma pessoa (Fase C). Um user pode ter vários papéis
 * (CUSTOMER, STORE_OWNER, MOTOBOY, PARTNER, CONDOMINIUM…), cada um apontando
 * opcionalmente a um perfil (Store/Motoboy/PartnerAccount…).
 *
 *   Sem perfil (ex: CUSTOMER)     -> único por (user_id, role)
 *   Com perfil (ex: PARTNER+chalé) -> único por (user_id, role, profile_id)
 *
 * É o fundamento do login multi-papel (Fase E): entra 1x, escolhe o contexto.
 */
@Entity({ name: 'whitelabel_users' })
@Index('uq_whitelabel_users_user_role_noprofile', ['userId', 'role'], { unique: true, where: 'profile_id IS NULL' })
@Index('uq_whitelabel_users_user_role_profile', ['userId', 'role', 'profileId'], { unique: true, where: 'profile_id IS NOT NULL' })
@Index('idx_whitelabel_users_user_id', ['userId'])
export class WhitelabelUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text' })
  role!: string;

  @Column({ name: 'profile_type', type: 'text', nullable: true })
  profileType?: string | null;

  @Column({ name: 'profile_id', type: 'uuid', nullable: true })
  profileId?: string | null;

  @Column({ type: 'text', default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
