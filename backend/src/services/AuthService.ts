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
import { isAllowlistedEmail, isDisposableEmailDomain } from '../utils/emailRisk';
import { CustomerSecurityService } from './CustomerSecurityService';
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
      SELECT created_at
      FROM email_verifications
      WHERE user_id = $1
        AND created_at > $2
      ORDER BY created_at DESC
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
    if (
      isDisposableEmailDomain(email, env.security.disposableEmailDomains) &&
      !isAllowlistedEmail(email, env.security.allowlistedEmails)
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
    };
    const hasUsefulData = Object.entries(normalized).some(([key, value]) => key !== 'ts' && Boolean(value));
    return hasUsefulData ? normalized : null;
  }

  /**
   * Executes super admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async superAdminLogin(username: string, password: string)
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

    const token = jwt.sign(
      { sub: admin.id, role: 'SUPER_ADMIN' },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return { token };
  }

  async condominiumLogin(email: string, password: string) {
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

    const token = jwt.sign(
      {
        sub: user.id,
        role: 'CONDOMINIUM_ADMIN',
        condominiumId: user.condominiumId,
      },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      token,
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
    };
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
    if (
      isDisposableEmailDomain(normalizedEmail, env.security.disposableEmailDomains) &&
      !isAllowlistedEmail(normalizedEmail, env.security.allowlistedEmails)
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

      await this.sendMotoboyVerificationEmail(result.user, meta?.ipAddress);
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
    const acquisitionAttribution = this.sanitizeAttribution(input?.acquisitionAttribution);

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

      const settings = manager.create(StoreSettings, {
        logoUrl: logoUrl || storePayload.logoUrl,
        bannerUrl: bannerUrl || storePayload.bannerUrl || null,
        description: storePayload.description || segmentPreset.description,
        address: trimmedAddress || null,
        city: trimmedCity || null,
        state: trimmedState || null,
        primaryColor: storePayload.primaryColor || segmentPreset.primaryColor,
        secondaryColor: storePayload.secondaryColor || segmentPreset.secondaryColor,
        isOrderingEnabled: storePayload.isOrderingEnabled !== false,
        segment,
        socialLinks: sanitizeSocialLinks(storePayload.socialLinks),
        openingHours: storePayload.openingHours ?? [],
        orderTypes: storePayload.orderTypes ?? segmentPreset.orderTypes,
        acquisitionAttribution,
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
      const trialDays = await this.settingsService.getNumber('trial_days', env.trialDays);
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

      return { user, store, subscription };
    });

    await this.sendVerificationEmail(result.user, meta?.ipAddress);
      await this.notifySignup(result.user, result.store, acquisitionAttribution);
    this.log.info('Register success', { userId: result.user.id, storeId: result.store.id });

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
      storeStatus: result.store.open ? 'ACTIVE' : 'PENDING_PAYMENT',
      subscriptionStatus: result.subscription.status,
      trialExpiresAt: result.subscription.endDate,
      payment: null,
      token,
      redirectUrl: `/verify-email`,
      next: 'VERIFY_EMAIL_CODE',
      emailMasked: this.maskEmail(result.user.email),
      email: result.user.email,
    };
  }




  /**
   * Executes login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async login(email: string, password: string)
  {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AppError('AUTH-004', 401);

    const valid = await bcrypt.compare(password, user.password);
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
    const token = this.generateToken(user.id, firstStore?.id);

    const sanitizedUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.userRole || 'STORE_OWNER',
    };

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
    const features = resolvePlanFeatures({
      planName: currentSubscription?.plan?.name,
      planExempt,
      subscriptionStatus: currentSubscription?.status,
    });

    return {
      user: sanitizedUser,
      store: sanitizedStore,
      token,
      subscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            plan: currentSubscription.plan,
            endDate: currentSubscription.endDate,
            planExempt,
          }
        : null,
      planTier,
      features,
    };
  }




  /**
   * Executes admin login logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async adminLogin(identifier: string, password: string)
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
    const currentSubscription = await this.subscriptionService.getCurrentByStore(store.id);
    const isActive = Boolean(store?.settings?.planExempt) || this.subscriptionService.isActiveSubscription(currentSubscription);
    if (!isActive) {
      await this.throwPendingPayment(store.id);
    }
    if (currentSubscription && !store.open) {
      store.open = true;
      await this.storeRepository.save(store);
    }

    const token = jwt.sign(
      { sub: loginUser.id, storeId: store.id, role: loginRole },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    const sanitizedOwner = {
      id: loginUser.id,
      fullName: loginUser.fullName,
      email: loginUser.email,
      phone: loginUser.phone,
      address: loginUser.address,
      role: loginRole,
    };

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
    const features = resolvePlanFeatures({
      planName: currentSubscription?.plan?.name,
      planExempt,
      subscriptionStatus: currentSubscription?.status,
    });

    return {
      token,
      user: sanitizedOwner,
      store: sanitizedStore,
      subscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            plan: currentSubscription.plan,
            endDate: currentSubscription.endDate,
            planExempt,
          }
        : null,
      planTier,
      features,
    };
  }




  /**
   * Executes request password reset logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  async requestPasswordReset(email: string)
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
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await resetRepo.save(
      resetRepo.create({
        user,
        tokenHash,
        expiresAt,
      })
    );

    const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.emailService.sendPasswordReset(user.email, link);
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

    if (user.userRole === 'MOTOBOY') {
      await this.sendMotoboyVerificationEmail(user, meta?.ipAddress);
    } else {
      await this.sendVerificationEmail(user, meta?.ipAddress);
    }
    return {
      code: 'AUTH-S002',
      next,
      cooldownSec: 60,
      emailMasked: this.maskEmail(user.email),
    };
  }

  /**
   * Dispatches a verification email for any supported user role.
   *
   * @author Edmilson Lopes
   */
  async dispatchVerificationEmail(user: User, meta?: { ipAddress?: string | null }) {
    if (user.userRole === 'MOTOBOY') {
      await this.sendMotoboyVerificationEmail(user, meta?.ipAddress);
      return;
    }

    await this.sendVerificationEmail(user, meta?.ipAddress);
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
    reset.usedAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(reset.user);
      await manager.save(reset);
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

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new AppError('AUTH-004', 401);

    user.password = await bcrypt.hash(newPassword, 10);
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
      if (!store.open) {
        store.open = true;
        await AppDataSource.getRepository(Store).save(store);
      }
      await this.emailService.sendActivationEmail(verifiedUser.email, store.slug);
      return { code: 'AUTH-S004', redirectUrl: '/admin' };
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
  private async sendVerificationEmail(user: User, ipAddress?: string | null) {
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

    await verificationRepo.save(
      verificationRepo.create({
        user,
        tokenHash,
        expiresAt,
        requestIp: this.getClientIp(ipAddress),
        resendCount: nextResendCount,
        lastSentAt: new Date(),
      })
    );

    await this.emailService.sendStoreVerificationCode(user.email, user.fullName || 'Lojista', code);
  }

  /**
   * Sends motoboy verification email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  private async sendMotoboyVerificationEmail(user: User, ipAddress?: string | null) {
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

    await verificationRepo.save(
      verificationRepo.create({
        user,
        tokenHash,
        expiresAt,
        requestIp: this.getClientIp(ipAddress),
        resendCount: nextResendCount,
        lastSentAt: new Date(),
      })
    );

    const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.emailService.sendMotoboyVerification(user.email, link, token);
  }




  /**
   * Executes notify signup logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  private async notifySignup(user: User, store: Store, acquisitionAttribution?: Record<string, unknown> | null) {
    const raw = env.email.notifyOnSignup || '';
    const emails = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!emails.length) return;
    await this.emailService.sendSignupNotification({
      emails,
      type: 'lojista',
      storeName: store.name,
      ownerName: user.fullName,
      ownerEmail: user.email,
      slug: store.slug,
      createdAt: new Date(),
      acquisitionAttribution: acquisitionAttribution || null,
    });
  }

  private async notifySignupAdmin({ type, user }: { type: 'lojista' | 'motoboy' | 'cliente'; user: User }) {
    const raw = env.email.notifyOnSignup || '';
    const emails = raw.split(',').map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    await this.emailService.sendSignupNotification({
      emails,
      type,
      ownerName: user.fullName || user.email,
      ownerEmail: user.email,
      createdAt: new Date(),
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
    const baseUrl = env.appUrl?.replace(/\/$/, '') || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment/${payment.id}`;
    const logoUrl = `${baseUrl}/chama-no-espeto.jpeg`;
    const methodLabel =
      payment.method === 'PIX'
        ? 'PIX'
        : payment.method === 'BOLETO'
        ? 'Boleto'
        : 'Cartão de crédito';
    const subject = 'Pagamento pendente - Jano Caminho';
    const text = [
      'Recebemos seu cadastro e o pagamento esta pendente.',
      `Forma: ${methodLabel}`,
      `Acesse o pagamento: ${paymentUrl}`,
      payment.paymentLink ? `Link do provedor: ${payment.paymentLink}` : '',
      payment.method === 'BOLETO'
        ? 'Boletos podem levar ate 3 dias uteis para compensar.'
        : 'A aprovacao costuma ser imediata.',
    ]
      .filter(Boolean)
      .join('\n');
    const qrBlock =
      payment.method === 'PIX' && payment.qrCodeBase64
        ? `<div style="margin-top: 16px; text-align: center;">
            <img src="${payment.qrCodeBase64}" alt="QR Code PIX" style="width: 220px; height: 220px;" />
          </div>`
        : '';
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="${logoUrl}" alt="Jano Caminho" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Pagamento pendente</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Finalize para liberar sua loja</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; color: #475569;">Recebemos seu cadastro. Assim que o pagamento for confirmado, sua loja sera liberada automaticamente.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 6px; color: #0f172a; font-size: 14px;"><strong>Forma:</strong> ${methodLabel}</p>
              <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Valor:</strong> R$ ${Number(payment.amount || 0).toFixed(2)}</p>
            </div>
            <a href="${paymentUrl}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Acessar pagina de pagamento</a>
            ${payment.paymentLink ? `<p style="margin: 14px 0 0; color: #0f172a;"><a href="${payment.paymentLink}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Abrir link do provedor</a></p>` : ''}
            ${payment.method === 'BOLETO' ? '<p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Boletos podem levar ate 3 dias uteis para compensar.</p>' : ''}
            ${qrBlock}
          </div>
        </div>
      </div>
    `;
    this.emailService.send({ to: email, subject, text, html });
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
