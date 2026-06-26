import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserIdentifier, UserIdentifierType } from '../entities/UserIdentifier';

/**
 * Camada de identidade unificada: resolve uma pessoa por qualquer identificador
 * (email/CPF/CNPJ/phone) e descreve seus papéis. Base do validador
 * "este email/CPF já tem conta? integrar?".
 */
class UserIdentityService {
  private repo = AppDataSource.getRepository(UserIdentifier);
  private userRepo = AppDataSource.getRepository(User);

  normalizeType(type: string): UserIdentifierType {
    const t = String(type || '').trim().toUpperCase();
    if (t === 'EMAIL' || t === 'CPF' || t === 'CNPJ' || t === 'PHONE') return t;
    throw new Error(`INVALID_IDENTIFIER_TYPE:${type}`);
  }

  /** Normaliza o valor por tipo: email lowercase, CPF/CNPJ/phone só dígitos. */
  normalizeValue(type: UserIdentifierType, value: string): string {
    const v = String(value || '').trim();
    if (type === 'EMAIL') return v.toLowerCase();
    return v.replace(/\D/g, '');
  }

  /** Detecta o tipo a partir de um valor cru (email tem @, CPF 11 dígitos, CNPJ 14). */
  detectType(value: string): UserIdentifierType {
    const v = String(value || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'EMAIL';
    const digits = v.replace(/\D/g, '');
    if (digits.length === 11) return 'CPF';
    if (digits.length === 14) return 'CNPJ';
    if (/^\+?\d{10,15}$/.test(v)) return 'PHONE';
    return 'EMAIL'; // fallback
  }

  /** Adiciona um identificador (idempotente — ignora se já existe). */
  async addIdentifier(userId: string, type: string, value: string, verified = false): Promise<void> {
    if (!userId) return;
    const t = this.normalizeType(type);
    const v = this.normalizeValue(t, value);
    if (!v) return;
    try {
      await this.repo.save(this.repo.create({ userId, type: t, value: v, verified }));
    } catch (error: any) {
      // Violação de UNIQUE(type,value) = identificador já existe (possivelmente de outro user). Ignora.
      if (String(error?.code || '') === '23505') return;
      throw error;
    }
  }

  /** Resolve um user pelo identificador (tipo + valor). Retorna null se não existe. */
  async resolveByIdentifier(type: string, value: string) {
    const t = this.normalizeType(type);
    const v = this.normalizeValue(t, value);
    const identifier = await this.repo.findOne({ where: { type: t, value: v } });
    if (!identifier) return null;
    const user = await this.userRepo.findOne({ where: { id: identifier.userId } });
    if (!user) return null;
    return { user, identifier };
  }

  /** Resolve por valor cru (auto-detecta o tipo). */
  async resolveByAnyValue(value: string) {
    return this.resolveByIdentifier(this.detectType(value), value);
  }

  /**
   * Descreve um user (nome, email, papéis atuais). Na Fase A os papéis vêm do
   * userRole; na Fase C-E virão do whitelabel_users (multi-papel real).
   */
  async describeUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.fullName || user.email,
      email: user.email,
      roles: [user.userRole].filter(Boolean) as string[],
    };
  }
}

export const userIdentityService = new UserIdentityService();
