/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: AuthService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { env } from '../config/env';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { AppDataSource } from '../config/database';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { PaymentService } from './PaymentService';
import { EmailService } from './EmailService';
import { PaymentMethod } from '../entities/Payment';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';
import { saveBase64Image } from '../utils/imageStorage';
import { sanitizeSocialLinks } from '../utils/socialLinks';
import { PasswordReset } from '../entities/PasswordReset';
import { EmailVerification } from '../entities/EmailVerification';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { SubscriptionService } from './SubscriptionService';
import { SettingsService } from './SettingsService';
import { normalizeDocument, validateDocument } from '../utils/documents';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { PlatformAdmin } from '../entities/PlatformAdmin';
import { CondominiumUser } from '../entities/CondominiumUser';
import { getStoreSegmentPreset, sanitizeStoreSegment } from '../utils/storeSegment';
import { resolvePlanFeatures, resolvePlanTier } from '../config/planFeatures';
import { StoreUserRepository } from '../repositories/StoreUserRepository';
import {
  getEmailDomainTypoMessage,
  isAllowlistedEmail,
  isAllowlistedEmailDomain,
  isDisposableEmailDomain,
} from '../utils/emailRisk';
import { CustomerSecurityService } from './CustomerSecurityService';
import { AuditNotificationService } from './AuditNotificationService';
import { MfaService } from './MfaService';
import { resolveFounderVipPromotion } from '../utils/founderVipPromotion';
import { DestinationService } from './DestinationService';

type MfaLoginOptions = {
  deviceId?: string | null;
  trustedDeviceToken?: string | null;
  deviceLabel?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

type VerificationEmailDelivery = {
  emailSent: boolean;
  emailDeliveryStatus: 'sent' | 'failed';
  cooldownSec: number;
};

const sanitizeAttributionStringArray = (value: unknown, limit = 80) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, limit);
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
};

const sanitizeDestinationDeliveryMode = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  return [ 'all', 'selected', 'none' ].includes(normalized) ? normalized : null;
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const raw = String(value).replace(',', '.').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const isUsableBrazilCoordinatePair = (lat: unknown, lng: unknown) => {
  const numericLat = parseOptionalNumber(lat);
  const numericLng = parseOptionalNumber(lng);
  if (numericLat === null || numericLng === null) return false;
  if (Math.abs(numericLat) < 0.000001 && Math.abs(numericLng) < 0.000001) return false;
  return numericLat >= -34 && numericLat <= 6 && numericLng >= -74 && numericLng <= -34;
};

const normalizePostalZip = (value?: unknown) => {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D/g, '').slice(0, 8);
  return digits.length === 8 ? digits : null;
};

const extractPostalZipFromAddress = (address?: unknown) => {
  const match = String(address || '').match(/\b\d{5}-?\d{3}\b/);
  return normalizePostalZip(match?.[0]);
};
/**
 * Provides AuthService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class AuthService
{
  private log = logger.child({ scope: 'AuthService' });
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private paymentService = new PaymentService();
  private emailService = new EmailService();
  private paymentRepository = new PaymentRepository();
  private subscriptionService = new SubscriptionService();
  private settingsService = new SettingsService();
  private storeUserRepository = new StoreUserRepository();
  private securityService = new CustomerSecurityService();
  private auditNotificationService = new AuditNotificationService();
  private mfaService = new MfaService();
  private destinationService = new DestinationService();

  private async resolveStoreSignupPromotion(existingStoresCount: number, fallbackTrialDays: number) {
    const [enabledValue, limitValue, daysValue, labelValue] = await Promise.all([
      this.settingsService.getValue('founder_vip_enabled'),
      this.settingsService.getValue('founder_vip_store_limit'),
      this.settingsService.getValue('founder_vip_days'),
      this.settingsService.getValue('founder_vip_label'),
    ]);

    return resolveFounderVipPromotion({
      enabledValue,
      limitValue,
      daysValue,
      labelValue,
      existingStoresCount,
      fallbackTrialDays,
    });
  }

    /**
   * Executes normalize phone business logic.
   *
   * @author Edmilson Lopes
   */
private normalizePhone(value?: string | null) {
    // A normalização centralizada evita divergência entre busca por telefone e persistência da sessão.
    // Mantém só dígitos para evitar diferenças de máscara em login, cadastro e auditoria.
    return String(value || '').replace(/\D/g, '');
  }

  /**
   * Normalizes username/login alias to a lower-case stable identifier.
   *
   * @author Edmilson Lopes
   */
  private normalizeUsername(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

    /**
   * Executes compare password with legacy business logic.
   *
   * @author Edmilson Lopes
   */
private async comparePasswordWithLegacy(rawPassword: string, user?: User | null) {
    if (!user?.password) return false;
    const stored = String(user.password);
    const isBcryptHash =
      stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');

    if (isBcryptHash) {
      return bcrypt.compare(rawPassword, stored);
    }

    // Legacy fallbacks for old/imported accounts.
    const plainMatch = stored === rawPassword;
    const md5Match =
      /^[a-f0-9]{32}$/i.test(stored) &&
      crypto.createHash('md5').update(rawPassword, 'utf8').digest('hex').toLowerCase() === stored.toLowerCase();
    const sha1Match =
      /^[a-f0-9]{40}$/i.test(stored) &&
      crypto.createHash('sha1').update(rawPassword, 'utf8').digest('hex').toLowerCase() === stored.toLowerCase();

    if (!plainMatch && !md5Match && !sha1Match) return false;

    // Auto-migrate legacy password to bcrypt on successful login.
    user.password = await bcrypt.hash(rawPassword, 10);
    await this.userRepository.save(user);
    return true;
  }

  /**
   * Builds a safe session payload from user data.
   *
   * @author Edmilson Lopes
   */
  private sanitizeSessionUser(user: User, roleOverride?: string) {
    const managedWithoutEmail = String(user.email || '').trim().toLowerCase().endsWith('@store-managed.janocaminho.local');
    return {
      id: user.id,
      fullName: user.fullName,
      email: managedWithoutEmail ? null : user.email,
      username: user.username || null,
      phone: user.phone,
      address: user.address,
      role: roleOverride || user.userRole || 'STORE_OWNER',
      mustChangePassword: Boolean((user as any).mustChangePassword),
      managedWithoutEmail,
    };
  }

    /**
   * Executes mask email business logic.
   *
   * @author Edmilson Lopes
   */
private maskEmail(email: string) {
    const [local = '', domain = ''] = String(email || '').split('@');
    if (!local || !domain) return '';
    const head = local.slice(0, 2);
    const maskedLocal = `${head}${'*'.repeat(Math.max(local.length - head.length, 1))}`;
    return `${maskedLocal}@${domain}`;
  }

    /**
   * Retrieves data for get client ip.
   *
   * @author Edmilson Lopes
   */
private getClientIp(ipAddress?: string | null) {
    const raw = String(ipAddress || '').trim();
    if (!raw) return null;
    if (raw.includes(',')) return raw.split(',')[0].trim();
    return raw;
  }

private generateEmailCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

private hashVerificationValue(value: string) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
  }

private sanitizeEmailCode(value?: string | null) {
    return String(value || '').replace(/\D/g, '').slice(0, 4);
  }

private generatePasswordResetCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

private sanitizePasswordResetCode(value?: string | null) {
    return String(value || '').replace(/\D/g, '').slice(0, 6);
  }

private hashPasswordResetCode(email: string, code: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return this.hashVerificationValue(`${normalizedEmail}:${this.sanitizePasswordResetCode(code)}`);
  }

private resolvePasswordResetAudience(user: User) {
    if (user.userRole === 'CUSTOMER') return 'cliente';
    if (user.userRole === 'MOTOBOY') return 'entregador';
    return 'lojista';
  }

private async registerPasswordResetFailedAttempt(userId: string) {
    const resetRepo = AppDataSource.getRepository(PasswordReset);
    const latest = await resetRepo
      .createQueryBuilder('reset')
      .where('reset.user_id = :userId', { userId })
      .andWhere('reset.used_at IS NULL')
      .orderBy('reset.expires_at', 'ASC')
      .addOrderBy('reset.created_at', 'DESC')
      .getOne();

    if (!latest) return;

    latest.attemptsCount = Number(latest.attemptsCount || 0) + 1;
    if (latest.attemptsCount >= 5) {
      latest.usedAt = new Date();
    }
    await resetRepo.save(latest);
  }

    /**
   * Executes is verification resend allowed business logic.
   *
   * @author Edmilson Lopes
   */
private async isVerificationResendAllowed(userId: string, ipAddress?: string | null) {
    const cooldownSeconds = 60;
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const cooldownThreshold = new Date(now - cooldownSeconds * 1000);
    const safeIp = this.getClientIp(ipAddress);

    const recentByUser = await AppDataSource.query(
      `
      SELECT created_at
      FROM email_verifications
      WHERE user_id = $1
        AND created_at > $2
      ORDER BY created_at DESC
      `,
      [userId, oneHourAgo]
    );

    if (Array.isArray(recentByUser) && recentByUser.length >= 5) {
      return { allowed: false, cooldownSeconds };
    }

    if (safeIp) {
      const recentByIp = await AppDataSource.query(
        `
        SELECT count(*)::int AS count
        FROM email_verifications
        WHERE request_ip = $1
          AND created_at > $2
        `,
        [safeIp, oneHourAgo]
      );
      const totalByIp = Number(recentByIp?.[0]?.count || 0);
      if (totalByIp >= 20) {
        return { allowed: false, cooldownSeconds };
      }
    }

    const cooldownRows = await AppDataSource.query(
      `
      SELECT last_sent_at
      FROM email_verifications
      WHERE user_id = $1
        AND last_sent_at IS NOT NULL
        AND last_sent_at > $2
      ORDER BY last_sent_at DESC
      LIMIT 1
      `,
      [userId, cooldownThreshold]
    );

    if (Array.isArray(cooldownRows) && cooldownRows.length > 0) {
      return { allowed: false, cooldownSeconds };
    }

    return { allowed: true, cooldownSeconds };
  }

    /**
   * Executes ensure phone is available business logic.
   *
   * @author Edmilson Lopes
   */
private async ensurePhoneIsAvailable(manager: any, phone?: string | null) {
    const digits = this.normalizePhone(phone);
    if (!digits) return;
    const rows = await manager.query(
      `
      SELECT id
      FROM users
      WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1
      LIMIT 1
      `,
      [digits]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      throw new AppError('AUTH-016', 409);
    }
  }

  async preflightStoreOwner(input: any) {
    const email = String(input?.email || '').trim().toLowerCase();
    if (!email) {
      throw new AppError('AUTH-006', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('AUTH-006', 400);
    }
    const emailTypoMessage = getEmailDomainTypoMessage(email);
    if (emailTypoMessage) {
      await this.securityService.recordRiskEvent({
        email,
        phone: input?.phone,
        eventType: 'email_domain_typo_attempt',
        score: 15,
        metadata: { flow: 'store_preflight' },
      });
      throw new AppError('GEN-002', 400, { message: emailTypoMessage });
    }
    if (
      isDisposableEmailDomain(email, env.security.disposableEmailDomains) &&
      !isAllowlistedEmail(email, env.security.allowlistedEmails) &&
      !isAllowlistedEmailDomain(email, env.security.allowlistedEmailDomains)
    ) {
      await this.securityService.recordRiskEvent({
        email,
        phone: input?.phone,
        eventType: 'disposable_email_attempt',
        score: 45,
        metadata: { flow: 'store_preflight' },
      });
      throw new AppError('AUTH-023', 400, {
        message: 'Use um e-mail pessoal ou comercial válido. E-mails temporários não são aceitos.',
      });
    }

    const documentType = String(input?.documentType || 'CPF').trim().toUpperCase();
    const normalizedDocument = normalizeDocument(input?.document);
    if (!normalizedDocument || !validateDocument(normalizedDocument, documentType)) {
      throw new AppError('AUTH-009', 400);
    }

    const userRepo = AppDataSource.getRepository(User);
    const existingEmail = await userRepo.findOne({ where: { email } });
    if (existingEmail) {
      throw new AppError('AUTH-011', 409);
    }

    const existingDocument = await userRepo.findOne({ where: { document: normalizedDocument } });
    if (existingDocument) {
      throw new AppError('AUTH-010', 409);
    }

    await this.ensurePhoneIsAvailable(AppDataSource.manager, input?.phone);
    return { ok: true };
  }

  private sanitizeAttribution(input: any) {
    if (!input || typeof input !== 'object') return null;
    const raw = input as Record<string, unknown>;
    const normalized = {
      ts: Number(raw.ts || 0) || null,
      landingPath: String(raw.landingPath || '').trim() || null,
      referrer: String(raw.referrer || '').trim() || null,
      utm_source: String(raw.utm_source || '').trim() || null,
      utm_medium: String(raw.utm_medium || '').trim() || null,
      utm_campaign: String(raw.utm_campaign || '').trim() || null,
      utm_content: String(raw.utm_content || '').trim() || null,
      utm_term: String(raw.utm_term || '').trim() || null,
      gclid: String(raw.gclid || '').trim() || null,
      fbclid: String(raw.fbclid || '').trim() || null,
      source: String(raw.source || '').trim() || null,
      destinationListingId: String(raw.destinationListingId || raw.listingId || '').trim() || null,
      destinationId: String(raw.destinationId || '').trim() || null,
      destinationSlug: String(raw.destinationSlug || '').trim() || null,
      destinationName: String(raw.destinationName || '').trim() || null,
      listingTitle: String(raw.listingTitle || raw.storeName || '').trim() || null,
      destinationDeliveryMode: sanitizeDestinationDeliveryMode(raw.destinationDeliveryMode || raw.deliveryMode),
      destinationHospitalityPlaceIds: sanitizeAttributionStringArray(raw.destinationHospitalityPlaceIds || raw.placeIds),
      destinationHospitalityPlaceNames: sanitizeAttributionStringArray(raw.destinationHospitalityPlaceNames || raw.placeNames),
    };
    const hasUsefulData = Object.entries(normalized).some(([key, value]) => {
      if (key === 'ts') return false;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    });
    return hasUsefulData ? normalized : null;
  }

  private resolveAcquisitionAttribution(input: any) {
    const base =
      input?.acquisitionAttribution && typeof input.acquisitionAttribution === 'object'
        ? { ...input.acquisitionAttribution }
        : {};
    const directListingId = String(input?.destinationListingId || input?.sourceListingId || '').trim();
    if (directListingId && !base.destinationListingId) {
      base.destinationListingId = directListingId;
    }
    return this.sanitizeAttribution(base);
  }

  /**
   * Executes super admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async superAdminLogin(username: string, password: string, mfaOptions?: MfaLoginOptions)
  {
    const normalized = (username || '').trim().toLowerCase();
    if (!normalized || !password)
    {
      throw new AppError('AUTH-004', 401);
    }

    const repo = AppDataSource.getRepository(PlatformAdmin);
    const admin = await repo.findOne({ where: { username: normalized } });

    if (!admin)
    {
      throw new AppError('AUTH-020', 500);
    }

    const matches = await bcrypt.compare(password, admin.passwordHash);
    if (!matches)
    {
      throw new AppError('AUTH-021', 401);
    }

    return this.mfaService.evaluateLogin({
      ownerType: 'PLATFORM_ADMIN',
      ownerId: admin.id,
      role: 'SUPER_ADMIN',
      accountLabel: admin.username,
      ...mfaOptions,
      response: {},
      tokenPayload: { sub: admin.id, role: 'SUPER_ADMIN' },
      tokenExpiresIn: '30d',
    });
  }

  async condominiumLogin(email: string, password: string, mfaOptions?: MfaLoginOptions) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !password) {
      throw new AppError('AUTH-004', 401);
    }

    const repo = AppDataSource.getRepository(CondominiumUser);
    const user = await repo.findOne({
      where: { email: normalized },
      relations: [ 'condominium' ],
    });

    if (!user || user.active === false || user.condominium?.active === false) {
      throw new AppError('AUTH-004', 401);
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new AppError('AUTH-021', 401);
    }

    user.lastLoginAt = new Date();
    await repo.save(user);

    return this.mfaService.evaluateLogin({
      ownerType: 'CONDOMINIUM_USER',
      ownerId: user.id,
      role: 'CONDOMINIUM_ADMIN',
      accountLabel: user.email,
      ...mfaOptions,
      response: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'CONDOMINIUM_ADMIN',
      },
      condominium: {
        id: user.condominium.id,
        name: user.condominium.name,
        slug: user.condominium.slug,
        logoUrl: user.condominium.logoUrl || null,
        bannerUrl: user.condominium.bannerUrl || null,
      },
      },
      tokenPayload: {
        sub: user.id,
        role: 'CONDOMINIUM_ADMIN',
        condominiumId: user.condominiumId,
      },
      tokenExpiresIn: '30d',
    });
  }

  async verifyMfaLoginChallenge(input: any, meta?: MfaLoginOptions) {
    return this.mfaService.verifyLoginChallenge({
      challengeToken: input?.challengeToken,
      code: input?.code,
      trustDevice: Boolean(input?.trustDevice),
      deviceId: input?.deviceId || input?.mfaDeviceId,
      deviceLabel: input?.deviceLabel,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });
  }

  async getMfaStatus(auth: any) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.getStatus(owner);
  }

  async startMfaSetup(auth: any) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.startSetup({
      ...owner,
      accountLabel: await this.getMfaAccountLabel(owner.ownerType, owner.ownerId),
    });
  }

  async confirmMfaSetup(auth: any, code: string) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.confirmSetup(owner, code);
  }

  async disableMfa(auth: any, code: string) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.disable(owner, code);
  }

  async listTrustedDevices(auth: any) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.listTrustedDevices(owner);
  }

  async revokeTrustedDevice(auth: any, deviceId: string) {
    const owner = this.mfaService.resolveOwnerFromAuth(auth);
    return this.mfaService.revokeTrustedDevice(owner, deviceId);
  }

  private async getMfaAccountLabel(ownerType: string, ownerId: string) {
    if (ownerType === 'PLATFORM_ADMIN') {
      const admin = await AppDataSource.getRepository(PlatformAdmin).findOne({ where: { id: ownerId } });
      return admin?.username || ownerId;
    }
    if (ownerType === 'CONDOMINIUM_USER') {
      const user = await AppDataSource.getRepository(CondominiumUser).findOne({ where: { id: ownerId } });
      return user?.email || ownerId;
    }
    const user = await this.userRepository.findById(ownerId);
    return user?.email || ownerId;
  }




  /**
   * Executes register logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async register(input: any, meta?: { ipAddress?: string | null })
  {
    this.log.info('Register start', {
      email: input?.email || input?.user?.email,
      storeName: input?.storeName || input?.store?.name,
      planId: input?.planId,
      paymentMethod: input?.paymentMethod,
    });
    const accountType = (input?.accountType || input?.user?.accountType || 'STORE_OWNER').toString().toUpperCase();
    const userPayload = input.user ?? {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone,
      address: input.address,
      document: input.document,
      documentType: input.documentType,
    };

    const normalizedEmail = userPayload.email
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizedEmail)) {
      throw new AppError('AUTH-006', 400);
    }
    const emailTypoMessage = getEmailDomainTypoMessage(normalizedEmail);
    if (emailTypoMessage) {
      await this.securityService.recordRiskEvent({
        email: normalizedEmail,
        phone: userPayload.phone,
        ipAddress: meta?.ipAddress,
        eventType: 'email_domain_typo_attempt',
        score: 15,
        metadata: { flow: accountType === 'MOTOBOY' ? 'motoboy_register' : 'store_register' },
      });
      throw new AppError('GEN-002', 400, { message: emailTypoMessage });
    }
    if (
      isDisposableEmailDomain(normalizedEmail, env.security.disposableEmailDomains) &&
      !isAllowlistedEmail(normalizedEmail, env.security.allowlistedEmails) &&
      !isAllowlistedEmailDomain(normalizedEmail, env.security.allowlistedEmailDomains)
    ) {
      await this.securityService.recordRiskEvent({
        email: normalizedEmail,
        phone: userPayload.phone,
        ipAddress: meta?.ipAddress,
        eventType: 'disposable_email_attempt',
        score: 45,
        metadata: { flow: accountType === 'MOTOBOY' ? 'motoboy_register' : 'store_register' },
      });
      throw new AppError('AUTH-023', 400, {
        message: 'Use um e-mail pessoal ou comercial válido. E-mails temporários não são aceitos.',
      });
    }

    if (!input.termsAccepted || !input.lgpdAccepted)
    {
      throw new AppError('AUTH-012', 400);
    }

    if (accountType === 'MOTOBOY')
    {
      if (!userPayload.fullName || !userPayload.email || !userPayload.password)
      {
        throw new AppError('AUTH-008', 400);
      }
      const normalizedPhone = this.normalizePhone(userPayload.phone);
      if (normalizedPhone.length < 10) {
        throw new AppError('AUTH-017', 400);
      }

      const result = await AppDataSource.transaction(async (manager) =>
      {
        const userRepo = manager.getRepository(User);

        const exists = await userRepo.findOne({ where: { email: normalizedEmail }, relations: [ 'stores' ] });
        if (exists)
        {
          const isStoreOwner = Array.isArray((exists as any).stores) && (exists as any).stores.length > 0;
          if (isStoreOwner || (exists.userRole && exists.userRole !== 'MOTOBOY'))
          {
            throw new AppError('AUTH-015', 409);
          }
          throw new AppError('AUTH-011', 409);
        }

        // Require CPF for motoboy accounts as well (business compliance).
        const normalizedDocument = normalizeDocument(userPayload.document);
        if (!normalizedDocument || !validateDocument(normalizedDocument, userPayload.documentType || 'CPF'))
        {
          throw new AppError('AUTH-009', 400);
        }

        const existingDocument = await userRepo.findOne({ where: { document: normalizedDocument } });
        if (existingDocument)
        {
          throw new AppError('AUTH-010', 409);
        }

        await this.ensurePhoneIsAvailable(manager, userPayload.phone);
        const profileImageUrl = userPayload.profileImageFile
          ? await saveBase64Image(userPayload.profileImageFile, `motoboy-${normalizedPhone}`, 'motoboys')
          : null;

        const hashed = await bcrypt.hash(userPayload.password, 10);
        const user = userRepo.create({
          fullName: userPayload.fullName,
          email: normalizedEmail,
          password: hashed,
          phone: userPayload.phone,
          address: userPayload.address,
          document: normalizedDocument,
          documentType: (userPayload.documentType || 'CPF').toUpperCase(),
          termsAcceptedAt: new Date(),
          lgpdAcceptedAt: new Date(),
          userRole: 'MOTOBOY',
          profileImageUrl: profileImageUrl || undefined,
        });
        await userRepo.save(user);

        return { user };
      });

      const delivery = await this.sendMotoboyVerificationEmail(result.user, meta?.ipAddress);
      void this.notifySignupAdmin({ type: 'motoboy', user: result.user });
      this.log.info('Register motoboy success', { userId: result.user.id });

      const token = jwt.sign(
        { sub: result.user.id, role: 'MOTOBOY' },
        env.jwtSecret,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        user: { id: result.user.id },
        store: null,
        storeStatus: null,
        subscriptionStatus: null,
        trialExpiresAt: null,
        payment: null,
        token,
        redirectUrl: `/verify-email`,
        next: 'VERIFY_EMAIL',
        emailMasked: this.maskEmail(result.user.email),
        email: result.user.email,
        cooldownSec: delivery.cooldownSec,
        emailSent: delivery.emailSent,
        emailDeliveryStatus: delivery.emailDeliveryStatus,
      };
    }

    const storePayload = input.store ?? {
      name: input.storeName,
      logoUrl: input.logoUrl,
      logoFile: input.logoFile,
      bannerUrl: (input as any).bannerUrl,
      bannerFile: (input as any).bannerFile,
      segment: input.segment,
      city: input.city,
      state: input.state,
      address: input.address,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      description: input.description,
      socialLinks: input.socialLinks,
    };

    const paymentMethod = ((input.paymentMethod as PaymentMethod) || 'PIX').toUpperCase();
    const acquisitionAttribution = this.resolveAcquisitionAttribution(input);

    if (paymentMethod !== 'PIX' && paymentMethod !== 'CREDIT_CARD' && paymentMethod !== 'BOLETO')
    {
      throw new AppError('AUTH-014', 400);
    }

    if (!input.planId)
    {
      throw new AppError('AUTH-013', 400);
    }

    if (!userPayload.document || !userPayload.documentType)
    {
      throw new AppError('AUTH-009', 400);
    }

    const normalizedDocument = normalizeDocument(userPayload.document);
    if (!validateDocument(normalizedDocument, userPayload.documentType))
    {
      throw new AppError('AUTH-009', 400);
    }

    /**
     * Handles result.
     *
     * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
     * @date 2025-12-17
     */
    const result = await AppDataSource.transaction(async (manager) =>
    {
      const userRepo = manager.getRepository(User);
      const storeRepo = manager.getRepository(Store);
      const planRepo = manager.getRepository(Plan);
      const subscriptionRepo = manager.getRepository(Subscription);

      const exists = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (exists)
      {
        throw new AppError('AUTH-011', 409);
      }

      const existingDocument = await userRepo.findOne({ where: { document: normalizedDocument } });
      if (existingDocument)
      {
        throw new AppError('AUTH-010', 409);
      }
      await this.ensurePhoneIsAvailable(manager, userPayload.phone);

      const hashed = await bcrypt.hash(userPayload.password, 10);

      const user = userRepo.create({
        fullName: userPayload.fullName,
        email: normalizedEmail,
        password: hashed,
        phone: userPayload.phone,
        address: userPayload.address,
        document: normalizedDocument,
        documentType: userPayload.documentType,
        termsAcceptedAt: new Date(),
        lgpdAcceptedAt: new Date(),
        userRole: 'STORE_OWNER',
      });
      await userRepo.save(user);

      const baseSlug = slugify(storePayload.name);
      let slug = baseSlug;
      let counter = 1;
      while (await storeRepo.findOne({ where: { slug } }))
      {
        slug = `${baseSlug}-${counter++}`;
      }

      const logoUrl = await saveBase64Image(storePayload.logoFile, `store-${user.id}`);
      const bannerUrl = await saveBase64Image(storePayload.bannerFile, `store-banner-${user.id}`);
      const segment = sanitizeStoreSegment(storePayload.segment);
      const segmentPreset = getStoreSegmentPreset(segment);
      const trimmedCity = storePayload.city?.toString().trim();
      const trimmedState = storePayload.state?.toString().trim().toUpperCase();
      const trimmedAddress = storePayload.address?.toString().trim() || userPayload.address?.toString().trim();
      const requestedLat = parseOptionalNumber((storePayload as any).lat);
      const requestedLng = parseOptionalNumber((storePayload as any).lng);
      const hasUsableCoordinates = isUsableBrazilCoordinatePair(requestedLat, requestedLng);
      const deliveryRadiusKm = parseOptionalNumber((storePayload as any).deliveryRadiusKm);
      const postalOriginZip =
        normalizePostalZip((storePayload as any).postalOriginZip) ||
        extractPostalZipFromAddress(trimmedAddress);
      const baseTrialDays = await this.settingsService.getNumber('trial_days', env.trialDays);
      const existingStoresCount = await storeRepo.count();
      const signupPromotion = await this.resolveStoreSignupPromotion(existingStoresCount, baseTrialDays);
      const attributionWithPromotion = signupPromotion.applies
        ? {
            ...(acquisitionAttribution || {}),
            founderVipPromotion: {
              applied: true,
              label: signupPromotion.label,
              days: signupPromotion.promoDays,
              limit: signupPromotion.limit,
              position: signupPromotion.position,
            },
          }
        : acquisitionAttribution;

      const settings = manager.create(StoreSettings, {
        logoUrl: logoUrl || storePayload.logoUrl,
        bannerUrl: bannerUrl || storePayload.bannerUrl || null,
        description: storePayload.description || segmentPreset.description,
        address: trimmedAddress || null,
        city: trimmedCity || null,
        state: trimmedState || null,
        lat: hasUsableCoordinates ? requestedLat : null,
        lng: hasUsableCoordinates ? requestedLng : null,
        primaryColor: storePayload.primaryColor || segmentPreset.primaryColor,
        secondaryColor: storePayload.secondaryColor || segmentPreset.secondaryColor,
        isOrderingEnabled: storePayload.isOrderingEnabled !== false,
        segment,
        deliveryRadiusKm: deliveryRadiusKm && deliveryRadiusKm > 0 ? deliveryRadiusKm : Number(env.delivery.defaultRadiusKm || 5),
        postalOriginZip,
        socialLinks: sanitizeSocialLinks(storePayload.socialLinks),
        openingHours: storePayload.openingHours ?? [],
        orderTypes: storePayload.orderTypes ?? segmentPreset.orderTypes,
        acquisitionAttribution: attributionWithPromotion,
      });

      const store = storeRepo.create({
        name: storePayload.name,
        slug,
        owner: user,
        settings,
        open: false,
      });
      await storeRepo.save(store);

      let resolvedPlanId = input.planId;
      if (resolvedPlanId === 'test-plan-7days') {
        const preferred = await planRepo.findOne({ where: { name: 'basic_monthly', enabled: true } });
        if (preferred) {
          resolvedPlanId = preferred.id;
        } else {
          const fallback = await planRepo.findOne({
            where: { enabled: true },
            order: { price: 'ASC' },
          });
          resolvedPlanId = fallback?.id;
        }
      }

      const plan = resolvedPlanId
        ? await planRepo.findOne({ where: { id: resolvedPlanId } })
        : null;
      if (!plan || !plan.enabled)
      {
        throw new AppError('SUB-003', 400);
      }

      const now = new Date();
      const trialDays = signupPromotion.trialDays;
      const trialEnd = this.addDays(now, trialDays);
      const subscription = subscriptionRepo.create({
        store,
        plan,
        startDate: now,
        endDate: trialEnd,
        status: 'TRIAL',
        autoRenew: false,
        paymentMethod,
      });
      await subscriptionRepo.save(subscription);

      return { user, store, subscription, acquisitionAttribution: attributionWithPromotion };
    });

    const delivery = await this.sendVerificationEmail(result.user, meta?.ipAddress);
    await this.notifySignup(result.user, result.store, result.acquisitionAttribution);
    this.log.info('Register success', { userId: result.user.id, storeId: result.store.id });

    const isDestinationListingClaimSignup =
      result.acquisitionAttribution &&
      typeof result.acquisitionAttribution === 'object' &&
      String((result.acquisitionAttribution as any).source || '') === 'destination_listing_claim';

    const token = jwt.sign(
      { sub: result.user.id, storeId: result.store.id },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      success: true,
      user: { id: result.user.id },
      store: {
        id: result.store.id,
        slug: result.store.slug,
      },
      storeStatus: isDestinationListingClaimSignup
        ? 'PENDING_REVIEW'
        : result.store.open
          ? 'ACTIVE'
          : 'PENDING_PAYMENT',
      subscriptionStatus: result.subscription.status,
      trialExpiresAt: result.subscription.endDate,
      payment: null,
      token: isDestinationListingClaimSignup ? null : token,
      redirectUrl: `/verify-email`,
      next: 'VERIFY_EMAIL_CODE',
      emailMasked: this.maskEmail(result.user.email),
      email: result.user.email,
      cooldownSec: delivery.cooldownSec,
      emailSent: delivery.emailSent,
      emailDeliveryStatus: delivery.emailDeliveryStatus,
    };
  }




  /**
   * Executes login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async login(identifier: string, password: string, mfaOptions?: MfaLoginOptions)
  {
    const normalizedIdentifier = this.normalizeUsername(identifier);
    if (!normalizedIdentifier) throw new AppError('AUTH-004', 401);

    const user = await this.userRepository.findByLoginIdentifier(normalizedIdentifier);
    if (!user) throw new AppError('AUTH-004', 401);

    const valid = await this.comparePasswordWithLegacy(password, user);
    if (!valid) throw new AppError('AUTH-004', 401);
    if (!user.emailVerified) {
      throw new AppError('AUTH-005', 401, {
        next: 'VERIFY_EMAIL',
        email: user.email,
        emailMasked: this.maskEmail(user.email),
        resendCooldownSec: 60,
      });
    }

    const firstStore = user.stores?.[ 0 ];
    if (firstStore) {
      const destinationClaimBlock = await this.destinationService.getStoreListingClaimAccessBlock(firstStore.id);
      if (destinationClaimBlock) {
        throw new AppError('AUTH-029', 409, destinationClaimBlock);
      }
    }
    const sanitizedUser = this.sanitizeSessionUser(user);

    const sanitizedStore = firstStore
      ? {
        id: firstStore.id,
        name: firstStore.name,
        slug: firstStore.slug,
        open: firstStore.open,
        createdAt: firstStore.createdAt,
        settings: firstStore.settings,
      }
      : undefined;

    let currentSubscription: any = null;
    if (sanitizedStore) {
      currentSubscription = await this.subscriptionService.getCurrentByStore(firstStore.id);
      const isActive = Boolean(firstStore?.settings?.planExempt) || this.subscriptionService.isActiveSubscription(currentSubscription);
      if (!isActive) {
        await this.throwPendingPayment(firstStore.id);
      }
      if (currentSubscription && !firstStore.open) {
        firstStore.open = true;
        await this.storeRepository.save(firstStore);
      }
    }
    const planExempt = Boolean(firstStore?.settings?.planExempt);
    const planTier = resolvePlanTier(currentSubscription?.plan?.name, planExempt);
    const founderVipPromotion =
      firstStore?.settings?.acquisitionAttribution &&
      typeof firstStore.settings.acquisitionAttribution === 'object'
        ? (firstStore.settings.acquisitionAttribution as any).founderVipPromotion || null
        : null;
    const features = resolvePlanFeatures({
      planName: currentSubscription?.plan?.name,
      planExempt,
      subscriptionStatus: currentSubscription?.status,
    });

    const response = {
      user: sanitizedUser,
      store: sanitizedStore,
      mustChangePassword: sanitizedUser.mustChangePassword,
      subscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            plan: currentSubscription.plan,
            endDate: currentSubscription.endDate,
            planExempt,
            founderVipPromotion,
          }
        : null,
      planTier,
      features,
    };

    return this.mfaService.evaluateLogin({
      ownerType: 'USER',
      ownerId: user.id,
      role: sanitizedUser.role,
      accountLabel: user.email,
      ...mfaOptions,
      response,
      tokenPayload: { sub: user.id, storeId: firstStore?.id },
      tokenExpiresIn: '30d',
    });
  }




  /**
   * Executes admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async adminLogin(identifier: string, password: string, mfaOptions?: MfaLoginOptions)
  {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    if (!normalizedIdentifier) throw new AppError('GEN-002', 400);

    let store: any = null;
    let loginUser: any = null;
    let loginRole: 'ADMIN' | 'OPERATOR' = 'ADMIN';
    const candidate = await this.userRepository.findByLoginIdentifier(normalizedIdentifier);
    if (candidate) {
      const valid = await this.comparePasswordWithLegacy(password, candidate);
      if (valid) {
        loginUser = candidate;

        const ownedStore = await this.storeRepository.findByOwnerId(candidate.id);
        if (ownedStore) {
          store = ownedStore;
          loginRole = 'ADMIN';
        } else {
          const memberships = await this.storeUserRepository.findActiveByUserId(candidate.id);
          const membership = memberships?.[0];
          if (!membership?.store?.id) {
            throw new AppError('AUTH-022', 403);
          }
          store = membership.store;
          loginRole = String(membership.role || 'OPERATOR').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
        }
      }
      // If identifier matched a user but password did not match, fallback to slug flow below.
      // This avoids false AUTH-004 when identifier is also a valid store slug.
    }

    if (!store || !loginUser) {
      // Backward compatibility for old flow using store slug.
      store = await this.storeRepository.findBySlugWithOwner(normalizedIdentifier);
      if (!store) throw new AppError('AUTH-004', 401);
      const ownerUser = store.owner;
      const ownerValid = ownerUser ? await this.comparePasswordWithLegacy(password, ownerUser) : false;

      if (ownerValid) {
        loginUser = ownerUser;
        loginRole = 'ADMIN';
      } else {
        // Compatibilidade: slug + senha de usuário vinculado à loja (operador/admin).
        const memberships = await this.storeUserRepository.listByStoreId(store.id);
        let matchedMembership: any = null;
        for (const membership of memberships || []) {
          const memberUser = membership?.user;
          if (!memberUser?.password) continue;
          const valid = await this.comparePasswordWithLegacy(password, memberUser);
          if (!valid) continue;
          matchedMembership = membership;
          break;
        }
        if (!matchedMembership?.user) {
          throw new AppError('AUTH-004', 401);
        }
        loginUser = matchedMembership.user;
        loginRole =
          String(matchedMembership.role || 'OPERATOR').toUpperCase() === 'ADMIN'
            ? 'ADMIN'
            : 'OPERATOR';
      }
    }

    if (!store || !loginUser) throw new AppError('STORE-001', 404);

    if (!loginUser.emailVerified) {
      throw new AppError('AUTH-005', 401, {
        next: 'VERIFY_EMAIL',
        email: loginUser.email,
        emailMasked: this.maskEmail(loginUser.email),
        resendCooldownSec: 60,
      });
    }
    const destinationClaimBlock = await this.destinationService.getStoreListingClaimAccessBlock(store.id);
    if (destinationClaimBlock) {
      throw new AppError('AUTH-029', 409, destinationClaimBlock);
    }
    const currentSubscription = await this.subscriptionService.getCurrentByStore(store.id);
    const isActive = Boolean(store?.settings?.planExempt) || this.subscriptionService.isActiveSubscription(currentSubscription);
    if (!isActive) {
      await this.throwPendingPayment(store.id);
    }
    if (currentSubscription && !store.open) {
      store.open = true;
      await this.storeRepository.save(store);
    }

    const sanitizedOwner = this.sanitizeSessionUser(loginUser, loginRole);

    const sanitizedStore = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      open: store.open,
      createdAt: store.createdAt,
      settings: store.settings,
      owner: {
        id: store.owner?.id,
        fullName: store.owner?.fullName,
        phone: store.owner?.phone,
      },
    };
    const planExempt = Boolean(store?.settings?.planExempt);
    const planTier = resolvePlanTier(currentSubscription?.plan?.name, planExempt);
    const founderVipPromotion =
      store?.settings?.acquisitionAttribution &&
      typeof store.settings.acquisitionAttribution === 'object'
        ? (store.settings.acquisitionAttribution as any).founderVipPromotion || null
        : null;
    const features = resolvePlanFeatures({
      planName: currentSubscription?.plan?.name,
      planExempt,
      subscriptionStatus: currentSubscription?.status,
    });

    const response = {
      user: sanitizedOwner,
      store: sanitizedStore,
      mustChangePassword: sanitizedOwner.mustChangePassword,
      subscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            plan: currentSubscription.plan,
            endDate: currentSubscription.endDate,
            planExempt,
            founderVipPromotion,
          }
        : null,
      planTier,
      features,
    };

    return this.mfaService.evaluateLogin({
      ownerType: 'USER',
      ownerId: loginUser.id,
      role: loginRole,
      accountLabel: loginUser.email,
      ...mfaOptions,
      response,
      tokenPayload: { sub: loginUser.id, storeId: store.id, role: loginRole },
      tokenExpiresIn: '7d',
    });
  }




  /**
   * Executes request password reset logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async requestPasswordReset(email: string, meta?: { ipAddress?: string | null })
  {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new AppError('AUTH-006', 400);

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { code: 'AUTH-S001' };
    }

    const resetRepo = AppDataSource.getRepository(PasswordReset);
    await resetRepo
      .createQueryBuilder()
      .update()
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
      .execute();

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashVerificationValue(token);
    const recoveryCode = this.generatePasswordResetCode();
    const recoveryCodeHash = this.hashPasswordResetCode(normalizedEmail, recoveryCode);
    const now = new Date();
    const linkExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const codeExpiresMinutes = 15;
    const codeExpiresAt = new Date(Date.now() + codeExpiresMinutes * 60 * 1000);
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    const audience = this.resolvePasswordResetAudience(user);
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&perfil=${encodeURIComponent(audience)}`;
    const requestIp = this.getClientIp(meta?.ipAddress);

    await resetRepo.save([
      resetRepo.create({
        user,
        tokenHash,
        resendCount: 1,
        attemptsCount: 0,
        requestIp,
        lastSentAt: now,
        expiresAt: linkExpiresAt,
      }),
      resetRepo.create({
        user,
        tokenHash: recoveryCodeHash,
        resendCount: 1,
        attemptsCount: 0,
        requestIp,
        lastSentAt: now,
        expiresAt: codeExpiresAt,
      }),
    ]);

    await this.emailService.sendPasswordReset(user.email, link, recoveryCode, codeExpiresMinutes);
    return { code: 'AUTH-S001' };
  }

  /**
   * Handles resend verification email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async resendVerificationEmail(email: string, meta?: { ipAddress?: string | null }) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new AppError('AUTH-006', 400);

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { code: 'AUTH-S002', next: 'VERIFY_EMAIL', cooldownSec: 60 };
    }
    const next = user.userRole === 'MOTOBOY' ? 'VERIFY_EMAIL' : 'VERIFY_EMAIL_CODE';
    if (user.emailVerified) {
      return { code: 'AUTH-S002', next, cooldownSec: 60 };
    }

    const rate = await this.isVerificationResendAllowed(user.id, meta?.ipAddress);
    if (!rate.allowed) {
      return { code: 'AUTH-S002', next, cooldownSec: rate.cooldownSeconds };
    }

    const delivery = user.userRole === 'MOTOBOY'
      ? await this.sendMotoboyVerificationEmail(user, meta?.ipAddress)
      : await this.sendVerificationEmail(user, meta?.ipAddress);
    return {
      code: 'AUTH-S002',
      next,
      cooldownSec: delivery.cooldownSec,
      emailMasked: this.maskEmail(user.email),
      emailSent: delivery.emailSent,
      emailDeliveryStatus: delivery.emailDeliveryStatus,
    };
  }

  /**
   * Dispatches a verification email for any supported user role.
   *
   * @author Edmilson Lopes
   */
  async dispatchVerificationEmail(user: User, meta?: { ipAddress?: string | null }) {
    if (user.userRole === 'MOTOBOY') {
      return this.sendMotoboyVerificationEmail(user, meta?.ipAddress);
    }

    return this.sendVerificationEmail(user, meta?.ipAddress);
  }




  /**
   * Executes reset password logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async resetPassword(token: string, newPassword: string)
  {
    if (!token) throw new AppError('AUTH-007', 400);
    if (!newPassword || newPassword.length < 6) throw new AppError('AUTH-008', 400);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRepo = AppDataSource.getRepository(PasswordReset);
    const reset = await resetRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!reset || reset.usedAt) throw new AppError('AUTH-007', 400);
    if (reset.expiresAt.getTime() < Date.now()) throw new AppError('AUTH-007', 400);

    reset.user.password = await bcrypt.hash(newPassword, 10);
    reset.user.mustChangePassword = false;
    const usedAt = new Date();
    reset.usedAt = usedAt;

    await AppDataSource.transaction(async (manager) => {
      await manager.save(reset.user);
      await manager
        .createQueryBuilder()
        .update(PasswordReset)
        .set({ usedAt })
        .where('user_id = :userId AND used_at IS NULL', { userId: reset.user.id })
        .execute();
    });

    return { code: 'AUTH-S003' };
  }

  async resetPasswordWithCode(email: string, code: string, newPassword: string)
  {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const sanitizedCode = this.sanitizePasswordResetCode(code);
    if (!normalizedEmail) throw new AppError('AUTH-006', 400);
    if (sanitizedCode.length !== 6) throw new AppError('AUTH-027', 400);
    if (!newPassword || newPassword.length < 6) throw new AppError('AUTH-008', 400);

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) throw new AppError('AUTH-028', 400);

    const tokenHash = this.hashPasswordResetCode(normalizedEmail, sanitizedCode);
    const resetRepo = AppDataSource.getRepository(PasswordReset);
    const reset = await resetRepo
      .createQueryBuilder('reset')
      .leftJoinAndSelect('reset.user', 'user')
      .where('reset.token_hash = :tokenHash', { tokenHash })
      .andWhere('user.id = :userId', { userId: user.id })
      .orderBy('reset.created_at', 'DESC')
      .getOne();

    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      await this.registerPasswordResetFailedAttempt(user.id);
      throw new AppError('AUTH-028', 400);
    }

    if (Number(reset.attemptsCount || 0) >= 5) {
      reset.usedAt = new Date();
      await resetRepo.save(reset);
      throw new AppError('AUTH-028', 400);
    }

    reset.user.password = await bcrypt.hash(newPassword, 10);
    reset.user.mustChangePassword = false;
    const usedAt = new Date();
    reset.usedAt = usedAt;

    await AppDataSource.transaction(async (manager) => {
      await manager.save(reset.user);
      await manager
        .createQueryBuilder()
        .update(PasswordReset)
        .set({ usedAt })
        .where('user_id = :userId AND used_at IS NULL', { userId: reset.user.id })
        .execute();
    });

    return { code: 'AUTH-S003' };
  }

    /**
   * Executes change password business logic.
   *
   * @author Edmilson Lopes
   */
async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) throw new AppError('AUTH-001', 401);
    if (!currentPassword) throw new AppError('AUTH-006', 400);
    if (!newPassword || newPassword.length < 6) throw new AppError('AUTH-008', 400);

    const user = await this.userRepository.findById(normalizedUserId);
    if (!user) throw new AppError('AUTH-004', 401);

    const matches = await this.comparePasswordWithLegacy(currentPassword, user);
    if (!matches) throw new AppError('AUTH-004', 401);

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepository.save(user as any);
    return { code: 'AUTH-S005' };
  }

  /**
   * Handles verify email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async verifyEmail(input: { token: string; email?: string }) {
    const token = String(input?.token || '');
    const normalizedEmail = input?.email?.trim().toLowerCase();
    if (!token) throw new AppError('AUTH-007', 400);
    const emailCode = this.sanitizeEmailCode(token);
    const isEmailCode = emailCode.length === 4 && token.replace(/\D/g, '').length === 4;
    const tokenHash = this.hashVerificationValue(isEmailCode ? emailCode : token);
    const verificationRepo = AppDataSource.getRepository(EmailVerification);
    let verification = null as EmailVerification | null;
    if (isEmailCode) {
      if (!normalizedEmail) throw new AppError('AUTH-006', 400);
      verification = await verificationRepo
        .createQueryBuilder('verification')
        .leftJoinAndSelect('verification.user', 'user')
        .where('verification.token_hash = :tokenHash', { tokenHash })
        .andWhere('LOWER(user.email) = :email', { email: normalizedEmail })
        .andWhere('user.userRole != :motoboyRole', { motoboyRole: 'MOTOBOY' })
        .andWhere('verification.used_at IS NULL')
        .orderBy('verification.created_at', 'DESC')
        .getOne();
      if (!verification) throw new AppError('AUTH-007', 400);
    } else if (normalizedEmail) {
      verification = await verificationRepo
        .createQueryBuilder('verification')
        .leftJoinAndSelect('verification.user', 'user')
        .where('verification.token_hash = :tokenHash', { tokenHash })
        .andWhere('LOWER(user.email) = :email', { email: normalizedEmail })
        .getOne();
    } else {
      verification = await verificationRepo.findOne({
        where: { tokenHash },
        relations: ['user'],
      });
    }

    let verifiedUser = verification?.user;

    if (!verification && !isEmailCode) {
      try {
        const decoded: any = jwt.verify(token, env.jwtSecret);
        if (!decoded?.sub) throw new AppError('AUTH-007', 400);
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: decoded.sub } });
        if (!user) throw new AppError('AUTH-007', 400);
        if (normalizedEmail && user.email.toLowerCase() !== normalizedEmail) {
          throw new AppError('AUTH-007', 400);
        }
        verifiedUser = user;
      } catch {
        throw new AppError('AUTH-007', 400);
      }
    }

    if (verification?.usedAt) throw new AppError('AUTH-007', 400);
    if (verification?.expiresAt && verification.expiresAt.getTime() < Date.now()) throw new AppError('AUTH-007', 400);

    if (!verifiedUser) throw new AppError('AUTH-007', 400);
    verifiedUser.emailVerified = true;
    if (verification) verification.usedAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(verifiedUser);
      if (verification) {
        await manager.save(verification);
      }
    });

    const store = await this.storeRepository.findByOwnerId(verifiedUser.id);
    if (!store) {
      if (verifiedUser.userRole === 'CUSTOMER') {
        try {
          await this.emailService.sendCustomerWelcome(verifiedUser.email, verifiedUser.fullName || 'Cliente');
        } catch {
          // Customer verification should not fail when the welcome email cannot be delivered.
        }
        return { code: 'AUTH-S004', redirectUrl: '/cliente?mode=login&verified=1' };
      }
      return { code: 'AUTH-S004', redirectUrl: '/' };
    }

    const subscription = await AppDataSource.getRepository(Subscription).findOne({
      where: { store: { id: store.id } },
      relations: ['plan', 'store'],
      order: { createdAt: 'DESC' } as any,
    });

    if (!subscription) {
      return { code: 'AUTH-S004', redirectUrl: '/' };
    }

    if (subscription.status === 'TRIAL') {
      let destinationClaim: any = null;
      try {
        destinationClaim = await this.destinationService.createListingClaimFromVerifiedStore(store.id, {
          fullName: verifiedUser.fullName,
          email: verifiedUser.email,
          phone: verifiedUser.phone,
        });
      } catch (error) {
        this.log.error('Destination listing claim creation failed after store verification', {
          userId: verifiedUser.id,
          storeId: store.id,
          error,
        });
      }
      if (!destinationClaim && !store.open) {
        store.open = true;
        await AppDataSource.getRepository(Store).save(store);
      }
      if (!destinationClaim) {
        void this.emailService.sendActivationEmail(verifiedUser.email, store.slug).catch((error) => {
          this.log.error('Store activation email failed after verification', {
            userId: verifiedUser.id,
            storeId: store.id,
            email: verifiedUser.email,
            error,
          });
        });
      }
      return {
        code: 'AUTH-S004',
        redirectUrl: '/admin',
        destinationClaimStatus: destinationClaim ? 'pending_review' : undefined,
        destinationClaimRequestId: destinationClaim?.id || undefined,
      };
    }

    let latestPayment = await this.paymentRepository.findLatestByStoreId(store.id);
    if (latestPayment?.status === 'PENDING') {
      const now = new Date();
      if (!latestPayment.expiresAt || latestPayment.expiresAt > now) {
        this.sendPaymentEmail(verifiedUser.email, latestPayment);
        return { code: 'AUTH-S004', redirectUrl: `/payment/${latestPayment.id}` };
      }
      latestPayment.status = 'FAILED';
      await this.paymentRepository.save(latestPayment);
    }

    if (!latestPayment || latestPayment.status === 'FAILED') {
      latestPayment = await AppDataSource.transaction(async (manager) => {
        return this.paymentService.createPayment(manager, {
          user: verifiedUser,
          store,
          subscription,
          plan: subscription.plan,
          method: (subscription.paymentMethod || 'PIX') as PaymentMethod,
        });
      });
    }

    if (latestPayment?.id && latestPayment.status === 'PAID') {
      await this.paymentService.confirmPayment(latestPayment.id);
      return { code: 'AUTH-S004', redirectUrl: '/admin' };
    }

    if (latestPayment?.id) {
      this.sendPaymentEmail(verifiedUser.email, latestPayment);
      return { code: 'AUTH-S004', redirectUrl: `/payment/${latestPayment.id}` };
    }

    return { code: 'AUTH-S004', redirectUrl: '/' };
  }





  /**
   * Generates token.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private generateToken(userId: string, storeId?: string)
  {
    return jwt.sign({ sub: userId, storeId }, env.jwtSecret, { expiresIn: '30d' });
  }




  /**
   * Executes add days logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private addDays(date: Date, days: number)
  {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }




  /**
   * Executes throw pending payment logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async throwPendingPayment(storeId: string)
  {
    const store = await this.storeRepository.findById(storeId);
    if (store?.settings?.planExempt) {
      return;
    }
    const payment = await this.paymentRepository.findLatestByStoreId(storeId);
    throw new AppError('PAY-010', 402, {
      paymentUrl: payment?.id ? `${env.appUrl}/payment/${payment.id}` : null,
      paymentLink: payment?.paymentLink || null,
    });
  }




  /**
   * Sends verification email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async sendVerificationEmail(user: User, ipAddress?: string | null): Promise<VerificationEmailDelivery> {
    const code = this.generateEmailCode();
    const tokenHash = this.hashVerificationValue(code);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const verificationRepo = AppDataSource.getRepository(EmailVerification);
    const maxCountRows = await AppDataSource.query(
      `SELECT COALESCE(MAX(resend_count), 0) AS max_count FROM email_verifications WHERE user_id = $1`,
      [user.id]
    );
    const nextResendCount = Number(maxCountRows?.[0]?.max_count || 0) + 1;

    await verificationRepo
      .createQueryBuilder()
      .update()
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
      .execute();

    const verification = await verificationRepo.save(
      verificationRepo.create({
        user,
        tokenHash,
        expiresAt,
        requestIp: this.getClientIp(ipAddress),
        resendCount: nextResendCount,
        lastSentAt: null,
      })
    );

    try {
      await this.emailService.sendStoreVerificationCode(user.email, user.fullName || 'Lojista', code);
      verification.lastSentAt = new Date();
      await verificationRepo.save(verification);
      return { emailSent: true, emailDeliveryStatus: 'sent', cooldownSec: 60 };
    } catch (error) {
      this.log.error('Store verification email failed after token creation', {
        userId: user.id,
        email: user.email,
        error,
      });
      return { emailSent: false, emailDeliveryStatus: 'failed', cooldownSec: 0 };
    }
  }

  /**
   * Sends motoboy verification email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  private async sendMotoboyVerificationEmail(user: User, ipAddress?: string | null): Promise<VerificationEmailDelivery> {
    const token = jwt.sign(
      {
        sub: user.id,
        type: 'email-verify',
        jti: crypto.randomBytes(16).toString('hex'),
      },
      env.jwtSecret,
      { expiresIn: '24h' }
    );
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verificationRepo = AppDataSource.getRepository(EmailVerification);
    const maxCountRows = await AppDataSource.query(
      `SELECT COALESCE(MAX(resend_count), 0) AS max_count FROM email_verifications WHERE user_id = $1`,
      [user.id]
    );
    const nextResendCount = Number(maxCountRows?.[0]?.max_count || 0) + 1;

    await verificationRepo
      .createQueryBuilder()
      .update()
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
      .execute();

    const verification = await verificationRepo.save(
      verificationRepo.create({
        user,
        tokenHash,
        expiresAt,
        requestIp: this.getClientIp(ipAddress),
        resendCount: nextResendCount,
        lastSentAt: null,
      })
    );

    const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await this.emailService.sendMotoboyVerification(user.email, link, token);
      verification.lastSentAt = new Date();
      await verificationRepo.save(verification);
      return { emailSent: true, emailDeliveryStatus: 'sent', cooldownSec: 60 };
    } catch (error) {
      this.log.error('Motoboy verification email failed after token creation', {
        userId: user.id,
        email: user.email,
        error,
      });
      return { emailSent: false, emailDeliveryStatus: 'failed', cooldownSec: 0 };
    }
  }




  /**
   * Executes notify signup logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async notifySignup(user: User, store: Store, acquisitionAttribution?: Record<string, unknown> | null) {
    await this.auditNotificationService.notifyUserCreated({
      accountType: 'lojista',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.userRole,
      },
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      metadata: acquisitionAttribution || null,
    });
  }

  private async notifySignupAdmin({ type, user }: { type: 'lojista' | 'motoboy' | 'cliente'; user: User }) {
    const accountType = type === 'lojista' ? 'lojista' : type === 'cliente' ? 'cliente' : 'motoboy';
    await this.auditNotificationService.notifyUserCreated({
      accountType,
      user: {
        id: user.id,
        fullName: user.fullName || user.email,
        email: user.email,
        phone: user.phone,
        username: user.username || null,
        role: user.userRole,
      },
    });
  }





  /**
   * Sends payment email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private sendPaymentEmail(email: string, payment: any)
  {
    this.emailService.sendPaymentPending(email, payment);
  }




  /**
   * Generates unique slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async generateUniqueSlug(name: string)
  {
    const base = slugify(name);
    let candidate = base;
    let counter = 1;

    while (await this.storeRepository.findBySlug(candidate))
    {
      candidate = `${base}-${counter++}`;
    }

    return candidate;
  }
}
