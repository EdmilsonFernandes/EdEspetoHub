import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { EmailSuppression } from '../entities/EmailSuppression';
import { isSuppressibleEmailCategory, normalizeEmailTemplateCategory } from '../utils/emailTemplateCatalog';

type UnsubscribeTokenPayload = {
  v: 1;
  purpose: 'email_unsubscribe';
  email: string;
  category: string;
  exp?: number;
};

export class EmailPreferenceService {
  private repository = AppDataSource.getRepository(EmailSuppression);

  normalizeEmail(value?: string | null) {
    return String(value || '').trim().toLowerCase();
  }

  normalizeCategory(value?: string | null) {
    return normalizeEmailTemplateCategory(value || 'marketing');
  }

  canBeSuppressed(category?: string | null, allowUnsubscribe = false) {
    return Boolean(allowUnsubscribe && isSuppressibleEmailCategory(category));
  }

  private getSigningSecret() {
    return env.jwtSecret || 'janocaminho-email-preferences';
  }

  private signPayload(payload: string) {
    return crypto.createHmac('sha256', this.getSigningSecret()).update(payload).digest('base64url');
  }

  createUnsubscribeToken(email: string, category = 'marketing') {
    const payload: UnsubscribeTokenPayload = {
      v: 1,
      purpose: 'email_unsubscribe',
      email: this.normalizeEmail(email),
      category: this.normalizeCategory(category),
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encoded}.${this.signPayload(encoded)}`;
  }

  parseUnsubscribeToken(token?: string | null) {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature || this.signPayload(encoded) !== signature) {
      throw new Error('email_unsubscribe_invalid_token');
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UnsubscribeTokenPayload;
    if (payload.purpose !== 'email_unsubscribe' || payload.v !== 1) {
      throw new Error('email_unsubscribe_invalid_token');
    }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('email_unsubscribe_expired_token');
    }

    const email = this.normalizeEmail(payload.email);
    if (!email || !email.includes('@')) {
      throw new Error('email_unsubscribe_invalid_email');
    }

    return {
      email,
      category: this.normalizeCategory(payload.category),
    };
  }

  getUnsubscribeUrl(email: string, category = 'marketing') {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    const token = this.createUnsubscribeToken(email, category);
    return `${baseUrl}/email/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  getOneClickUnsubscribeUrl(email: string, category = 'marketing') {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    const token = this.createUnsubscribeToken(email, category);
    return `${baseUrl}/api/public/email/unsubscribe/one-click?token=${encodeURIComponent(token)}`;
  }

  async findSuppression(email: string, category = 'marketing') {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedCategory = this.normalizeCategory(category);
    if (!normalizedEmail || !AppDataSource.isInitialized) return null;
    return this.repository.findOne({
      where: {
        normalizedEmail,
        category: normalizedCategory,
      },
    });
  }

  async shouldSkip(email: string, category: string, allowUnsubscribe = false) {
    if (!this.canBeSuppressed(category, allowUnsubscribe)) return { skip: false, suppression: null as EmailSuppression | null };
    const suppression = await this.findSuppression(email, category);
    return { skip: Boolean(suppression), suppression };
  }

  async suppressEmail(input: {
    email: string;
    category?: string | null;
    source?: string | null;
    reason?: string | null;
    createdBy?: string | null;
  }) {
    const normalizedEmail = this.normalizeEmail(input.email);
    const category = this.normalizeCategory(input.category || 'marketing');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('email_suppression_invalid_email');
    }

    const existing = await this.repository.findOne({ where: { normalizedEmail, category } });
    if (existing) return existing;

    const suppression = this.repository.create({
      email: String(input.email || '').trim(),
      normalizedEmail,
      category,
      source: String(input.source || 'manual').trim() || 'manual',
      reason: String(input.reason || '').trim() || null,
      createdBy: String(input.createdBy || '').trim() || null,
    });
    return this.repository.save(suppression);
  }

  async suppressFromToken(token: string) {
    const payload = this.parseUnsubscribeToken(token);
    return this.suppressEmail({
      ...payload,
      source: 'public_link',
      reason: 'Descadastro solicitado pelo link do e-mail.',
    });
  }

  async listSuppressions(limit = 100) {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: Math.max(1, Math.min(500, Number(limit || 100))),
    });
  }

  async removeSuppression(id: string) {
    const suppression = await this.repository.findOne({ where: { id } });
    if (!suppression) return false;
    await this.repository.remove(suppression);
    return true;
  }
}
