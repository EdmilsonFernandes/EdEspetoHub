import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserDocument, UserDocumentType } from '../entities/UserDocument';
import { WhitelabelUser } from '../entities/WhitelabelUser';
import { UserIdentifier, UserIdentifierType } from '../entities/UserIdentifier';

/**
 * Camada de identidade unificada: resolve uma pessoa por qualquer identificador
 * (email/CPF/CNPJ/phone) e descreve seus papéis. Base do validador
 * "este email/CPF já tem conta? integrar?".
 */
class UserIdentityService {
  private repo = AppDataSource.getRepository(UserIdentifier);
  private docRepo = AppDataSource.getRepository(UserDocument);
  private wlRepo = AppDataSource.getRepository(WhitelabelUser);
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
   * Descreve um user (nome, email, papéis). Papéis vêm do whitelabel_users
   * (multi-papel); cai no userRole se não houver registro (compat retroativa).
   */
  async describeUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    const roles = await this.listRolesForUser(userId);
    return {
      id: user.id,
      name: user.fullName || user.email,
      email: user.email,
      roles: roles.length ? roles : ([user.userRole].filter(Boolean) as string[]),
    };
  }

  // ─── Whitelabel (registro de papéis) — multi-papel ───

  /** Lista os papéis ativos de um user (do whitelabel_users). */
  async listRolesForUser(userId: string): Promise<string[]> {
    if (!userId) return [];
    const rows = await this.wlRepo.find({ where: { userId, status: 'active' } });
    const roles = Array.from(new Set(rows.map((r) => String(r.role || '').trim()).filter(Boolean)));
    return roles;
  }

  /** Adiciona um papel ao user (idempotente). profile = perfil vinculado (opcional). */
  async addRole(userId: string, role: string, profile?: { type: string; id: string }): Promise<void> {
    if (!userId || !role) return;
    const profileType = profile?.type || null;
    const profileId = profile?.id || null;
    const existing = await this.wlRepo.findOne({ where: { userId, role, profileType: profileType as any, profileId: profileId as any } });
    if (existing) return;
    await this.wlRepo.save(this.wlRepo.create({ userId, role, profileType, profileId, status: 'active' }));
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    if (!userId || !role) return false;
    const count = await this.wlRepo.count({ where: { userId, role, status: 'active' } });
    return count > 0;
  }

  // ─── Documentos (CPF/CNPJ) — KYC centralizado ───

  normalizeDocType(type: string): UserDocumentType {
    const t = String(type || '').trim().toUpperCase();
    if (t === 'CPF' || t === 'CNPJ') return t;
    throw new Error(`INVALID_DOCUMENT_TYPE:${type}`);
  }

  /** Adiciona um documento (CPF/CNPJ) ao user — idempotente. */
  async addDocument(userId: string, type: string, value: string, fileUrl?: string | null, verified = false): Promise<void> {
    if (!userId) return;
    const t = this.normalizeDocType(type);
    const v = this.normalizeValue(t, value);
    if (!v) return;
    try {
      await this.docRepo.save(this.docRepo.create({ userId, type: t, value: v, fileUrl: fileUrl || null, verified }));
    } catch (error: any) {
      if (String(error?.code || '') === '23505') return; // já existe
      throw error;
    }
  }

  async getDocuments(userId: string): Promise<UserDocument[]> {
    if (!userId) return [];
    return this.docRepo.find({ where: { userId } });
  }

  /** Resolve um user por documento (CPF/CNPJ). */
  async resolveByDocument(type: string, value: string) {
    const t = this.normalizeDocType(type);
    const v = this.normalizeValue(t, value);
    const doc = await this.docRepo.findOne({ where: { type: t, value: v } });
    if (!doc) return null;
    const user = await this.userRepo.findOne({ where: { id: doc.userId } });
    return user ? { user, document: doc } : null;
  }
}

export const userIdentityService = new UserIdentityService();
