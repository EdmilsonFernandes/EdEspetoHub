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
 * Identificadores de uma pessoa (email, CPF, CNPJ, phone). A unicidade
 * (type, value) garante que um identificador aponta para no máximo UM user —
 * base do matching "este email/cpf já tem conta?".
 */
export type UserIdentifierType = 'EMAIL' | 'CPF' | 'CNPJ' | 'PHONE';

@Entity({ name: 'user_identifiers' })
@Index('uq_user_identifiers_type_value', ['type', 'value'], { unique: true })
@Index('idx_user_identifiers_user_id', ['userId'])
export class UserIdentifier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text' })
  type!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
