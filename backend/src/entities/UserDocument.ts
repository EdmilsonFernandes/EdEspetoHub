import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

/**
 * Documentos de KYC (CPF/CNPJ) de uma pessoa, centralizados — válidos para
 * TODAS as contas/papéis do user. UNIQUE(type,value): um documento = um user.
 */
export type UserDocumentType = 'CPF' | 'CNPJ';

@Entity({ name: 'user_documents' })
@Index('uq_user_documents_type_value', ['type', 'value'], { unique: true })
@Index('idx_user_documents_user_id', ['userId'])
export class UserDocument {
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

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
