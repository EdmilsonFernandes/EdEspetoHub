import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { CustomerAddress } from '../entities/CustomerAddress';
import { CustomerEmailOtp } from '../entities/CustomerEmailOtp';
import { User } from '../entities/User';
import { Order } from '../entities/Order';
import { EmailService } from './EmailService';
import { PushNotificationService } from './PushNotificationService';
import { saveBase64Image } from '../utils/imageStorage';
import { OrderService } from './OrderService';
import { OrderEtaServiceV2 } from './OrderEtaServiceV2';
import { logger } from '../utils/logger';
import { ZipCodeLookupService } from './ZipCodeLookupService';
import { getEmailDomainTypoMessage, isAllowlistedEmail, isAllowlistedEmailDomain, isDisposableEmailDomain } from '../utils/emailRisk';
import { CustomerSecurityService } from './CustomerSecurityService';
import { GeoLocationService } from './GeoLocationService';
import { buildOrderTimelineJson } from '../utils/orderTimeline';
import { AuditNotificationService } from './AuditNotificationService';
import { MfaService } from './MfaService';
import { sameCoordinatePair } from '../utils/geoQuality';
import { OrderReviewService } from './OrderReviewService';

type CustomerMfaLoginOptions = {
  deviceId?: string | null;
  trustedDeviceToken?: string | null;
  deviceLabel?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

type AddressInput = {
  label?: string;
  recipientName?: string;
  phone?: string;
  cep: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  lat?: number | string | null;
  lng?: number | string | null;
  isDefault?: boolean;
  condominiumId?: string | null;
  condominiumBlock?: string | null;
  condominiumUnit?: string | null;
};

type EmailOtpDelivery = {
  emailSent: boolean;
  emailDeliveryStatus: 'sent' | 'failed';
  cooldownSec: number;
};

export class CustomerAccountService {
  private emailService = new EmailService();
  private pushService = new PushNotificationService();
  private orderService = new OrderService();
  private orderEtaService = new OrderEtaServiceV2();
  private zipCodeLookupService = new ZipCodeLookupService();
  private securityService = new CustomerSecurityService();
  private geoLocationService = new GeoLocationService();
  private auditNotificationService = new AuditNotificationService();
  private mfaService = new MfaService();
  private orderReviewService = new OrderReviewService();
  private log = logger.child({ scope: 'CustomerAccountService' });
    /**
   * Executes normalize email business logic.
   *
   * @author Edmilson Lopes
   */
private normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
  }

    /**
   * Executes sanitize phone business logic.
   *
   * @author Edmilson Lopes
   */
private sanitizePhone(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

private parseCoordinate(value?: any): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const parsed = Number(String(value).replace(',', '.').trim());
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

private normalizeAddressPart(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

private normalizeAddressForGeocode(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace(/\s+/g, ' ').trim();
  }

private buildGeocodeAddress(payload: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  }) {
    const parts = [
      this.normalizeAddressForGeocode(payload.street),
      this.normalizeAddressForGeocode(payload.number),
      this.normalizeAddressForGeocode(payload.complement),
      this.normalizeAddressForGeocode(payload.neighborhood),
      this.normalizeAddressForGeocode(payload.city),
      this.normalizeAddressForGeocode(payload.state),
      String(payload.cep || '').replace(/\D/g, '').slice(0, 8) || '',
    ].filter(Boolean);
    return parts.join(', ');
  }

private buildGeocodeCandidates(payload: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  }) {
    const cep = String(payload?.cep || '').replace(/\D/g, '').slice(0, 8);
    const street = this.normalizeAddressForGeocode(payload.street);
    const number = this.normalizeAddressForGeocode(payload.number);
    const complement = this.normalizeAddressForGeocode(payload.complement);
    const neighborhood = this.normalizeAddressForGeocode(payload.neighborhood);
    const city = this.normalizeAddressForGeocode(payload.city);
    const state = this.normalizeAddressForGeocode(payload.state);
    const candidates = [
      this.buildGeocodeAddress({ ...payload, cep }),
      [street, number, neighborhood, city, state].filter(Boolean).join(', '),
      [street, neighborhood, city, state].filter(Boolean).join(', '),
      [cep, city, state].filter(Boolean).join(', '),
      [city, state, 'Brasil'].filter(Boolean).join(', '),
    ];

    return candidates
      .map((value) => value.replace(/\s+/g, ' ').replace(/,\s*,/g, ', ').trim())
      .filter((value, index, values) => value.length >= 5 && values.indexOf(value) === index);
  }

private assertRequiredAddressFields(payload: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    city?: string | null;
    state?: string | null;
  }, options: { requireNumber?: boolean } = {}) {
    const cep = String(payload?.cep || '').replace(/\D/g, '').slice(0, 8);
    const street = String(payload?.street || '').trim();
    const number = String(payload?.number || '').trim();
    const city = String(payload?.city || '').trim();
    const state = String(payload?.state || '').trim().toUpperCase().slice(0, 2);
    // Para endereço de condomínio, a unidade é bloco/apto — o número da rua é opcional.
    const requireNumber = options.requireNumber !== false;
    if (!cep || cep.length !== 8 || !street || (requireNumber && !number) || !city || !state) {
      throw new AppError('ADDR-001', 400);
    }
  }

private assertResolvedAddressCoordinates(lat?: number | null, lng?: number | null) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      throw new AppError('ADDR-002', 400);
    }
  }

private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const normalizedAddress = String(address || '').trim();
    if (!normalizedAddress) return null;
    try {
      const payload = await this.geoLocationService.geocodeAddress(normalizedAddress);
      if (!payload) return null;
      return { lat: Number(payload.lat), lng: Number(payload.lng) };
    } catch (error) {
      this.log.warn('Customer address geocode exception', { address: normalizedAddress, error });
      return null;
    }
  }

private async resolveAddressCoordinates(payload: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  }): Promise<{ lat: number; lng: number } | null> {
    const cep = String(payload?.cep || '').replace(/\D/g, '').slice(0, 8);
    let lookupAddressFallback: Partial<typeof payload> | null = null;
    if (cep.length === 8) {
      try {
        const lookedUp = await this.zipCodeLookupService.lookup(cep);
        if (lookedUp.latitude !== null && lookedUp.longitude !== null) {
          return {
            lat: Number(lookedUp.latitude),
            lng: Number(lookedUp.longitude),
          };
        }
        lookupAddressFallback = {
          cep,
          street: lookedUp.street || payload.street,
          neighborhood: lookedUp.district || payload.neighborhood,
          city: lookedUp.city || payload.city,
          state: lookedUp.state || payload.state,
        };
      } catch {
        // keep address save resilient even when zip providers are unavailable
      }
    }

    const candidates = this.buildGeocodeCandidates({
      ...payload,
      ...(lookupAddressFallback || {}),
      cep,
    });
    for (const candidate of candidates) {
      const coordinates = await this.geocodeAddress(candidate);
      if (coordinates) return coordinates;
    }
    return null;
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
   * Executes generate otp code business logic.
   *
   * @author Edmilson Lopes
   */
private generateOtpCode() {
    return String(crypto.randomInt(1000, 10000));
  }

    /**
   * Executes hash otp code business logic.
   *
   * @author Edmilson Lopes
   */
private hashOtpCode(code: string) {
    return crypto.createHash('sha256').update(String(code || '')).digest('hex');
  }

    /**
   * Executes sanitize otp code business logic.
   *
   * @author Edmilson Lopes
   */
private sanitizeOtpCode(code?: string | null) {
    return String(code || '').replace(/\D/g, '').slice(0, 4);
  }

    /**
   * Executes is otp resend allowed business logic.
   *
   * @author Edmilson Lopes
   */
private async isOtpResendAllowed(userId: string, ipAddress?: string | null) {
    const cooldownSeconds = 60;
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const cooldownThreshold = new Date(now - cooldownSeconds * 1000);
    const safeIp = this.getClientIp(ipAddress);

    const recentByUser = await AppDataSource.query(
      `
      SELECT created_at
      FROM customer_email_otps
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
        FROM customer_email_otps
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
      FROM customer_email_otps
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
   * Sends the current customer email OTP code.
   *
   * @author Edmilson Lopes
   */
private async sendCustomerEmailOtp(user: User, meta?: { ipAddress?: string | null }): Promise<EmailOtpDelivery> {
    const code = this.generateOtpCode();
    const codeHash = this.hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const otpRepo = AppDataSource.getRepository(CustomerEmailOtp);
    const maxCountRows = await AppDataSource.query(
      `SELECT COALESCE(MAX(resend_count), 0) AS max_count FROM customer_email_otps WHERE user_id = $1`,
      [user.id]
    );
    const nextResendCount = Number(maxCountRows?.[0]?.max_count || 0) + 1;

    const otp = await otpRepo.save(
      otpRepo.create({
        user,
        codeHash,
        expiresAt,
        requestIp: this.getClientIp(meta?.ipAddress),
        resendCount: nextResendCount,
        attemptsCount: 0,
        lastSentAt: null,
      })
    );

    try {
      await this.emailService.sendCustomerVerificationCode(user.email, user.fullName || 'Cliente', code);
      await otpRepo
        .createQueryBuilder()
        .update()
        .set({ usedAt: new Date() })
        .where('user_id = :userId AND used_at IS NULL AND id != :otpId', { userId: user.id, otpId: otp.id })
        .execute();
      otp.lastSentAt = new Date();
      await otpRepo.save(otp);
      return { emailSent: true, emailDeliveryStatus: 'sent', cooldownSec: 60 };
    } catch (error) {
      this.log.error('Customer verification email failed after OTP creation', {
        userId: user.id,
        email: user.email,
        error,
      });
      otp.usedAt = new Date();
      await otpRepo.save(otp);
      return { emailSent: false, emailDeliveryStatus: 'failed', cooldownSec: 0 };
    }
  }

    /**
   * Executes create customer token business logic.
   *
   * @author Edmilson Lopes
   */
private createCustomerToken(userId: string) {
    return jwt.sign(
      { sub: userId, role: 'CUSTOMER' as const },
      env.jwtSecret,
      { expiresIn: '30d' }
    );
  }

    /**
   * Executes sanitize user business logic.
   *
   * @author Edmilson Lopes
   */
private sanitizeUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || null,
      profileImageUrl: user.profileImageUrl || null,
      emailVerified: Boolean(user.emailVerified),
      termsAcceptedAt: user.termsAcceptedAt || null,
      lgpdAcceptedAt: user.lgpdAcceptedAt || null,
      role: 'CUSTOMER',
      createdAt: user.createdAt,
    };
  }

    /**
   * Executes map address business logic.
   *
   * @author Edmilson Lopes
   */
private mapAddress(entity: CustomerAddress) {
    return {
      id: entity.id,
      label: entity.label || null,
      recipientName: entity.recipientName || null,
      phone: entity.phone || null,
      cep: entity.cep,
      street: entity.street,
      number: entity.number || null,
      complement: entity.complement || null,
      neighborhood: entity.neighborhood || null,
      city: entity.city,
      state: entity.state,
      lat: this.parseCoordinate(entity.lat) ?? null,
      lng: this.parseCoordinate(entity.lng) ?? null,
      isDefault: Boolean(entity.isDefault),
      condominiumId: entity.condominiumId || null,
      condominiumBlock: entity.condominiumBlock || null,
      condominiumUnit: entity.condominiumUnit || null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  public async ensureAddressCoordinates(address: CustomerAddress) {
    if (!address?.id) return address;
    const currentLat = this.parseCoordinate(address.lat);
    const currentLng = this.parseCoordinate(address.lng);
    if (currentLat !== null && currentLng !== null) {
      return address;
    }
    const geocoded = await this.resolveAddressCoordinates({
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
    });
    if (!geocoded) return address;
    address.lat = geocoded.lat;
    address.lng = geocoded.lng;
    await AppDataSource.getRepository(CustomerAddress).save(address);
    return address;
  }

  public async backfillMissingAddressCoordinates(limit = 100) {
    const safeLimit = Number.isFinite(Number(limit))
      ? Math.max(1, Math.min(5000, Number(limit)))
      : 100;
    const repo = AppDataSource.getRepository(CustomerAddress);
    const addresses = await repo
      .createQueryBuilder('address')
      .where('address.lat IS NULL OR address.lng IS NULL')
      .orderBy('address.created_at', 'ASC')
      .limit(safeLimit)
      .getMany();

    let updated = 0;
    let failed = 0;
    for (const address of addresses) {
      try {
        const next = await this.ensureAddressCoordinates(address);
        const lat = this.parseCoordinate(next?.lat);
        const lng = this.parseCoordinate(next?.lng);
        if (lat !== null && lng !== null) {
          updated += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        this.log.warn('Customer address coordinate backfill failed', {
          addressId: address.id,
          userId: address.userId,
          error,
        });
      }
    }

    return {
      total: addresses.length,
      updated,
      failed,
    };
  }

    /**
   * Creates resources for register.
   *
   * @author Edmilson Lopes
   */
async register(
    input: { fullName: string; email: string; password: string; phone?: string | null; termsAccepted?: boolean; lgpdAccepted?: boolean },
    meta?: { ipAddress?: string | null }
  ) {
    const fullName = String(input?.fullName || '').trim();
    const email = this.normalizeEmail(input?.email || '');
    const password = String(input?.password || '');
    const phone = this.sanitizePhone(input?.phone || null) || undefined;
    const termsAccepted = input?.termsAccepted === true;
    const lgpdAccepted = input?.lgpdAccepted === true;

    if (!fullName || !email || !password) {
      throw new AppError('GEN-002', 400, { message: 'Nome, e-mail e senha são obrigatórios.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
      throw new AppError('GEN-002', 400, { message: 'Informe um e-mail válido.' });
    }
    const emailTypoMessage = getEmailDomainTypoMessage(email);
    if (emailTypoMessage) {
      await this.securityService.recordRiskEvent({
        email,
        phone,
        ipAddress: meta?.ipAddress,
        eventType: 'email_domain_typo_attempt',
        score: 15,
        metadata: { flow: 'customer_register' },
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
        phone,
        ipAddress: meta?.ipAddress,
        eventType: 'disposable_email_attempt',
        score: 45,
        metadata: { flow: 'customer_register' },
      });
      throw new AppError('AUTH-023', 400, {
        message: 'Use um e-mail pessoal ou comercial válido. E-mails temporários ou suspeitos não são aceitos.',
      });
    }
    if (password.length < 6) {
      throw new AppError('GEN-002', 400, { message: 'A senha precisa ter ao menos 6 caracteres.' });
    }
    if (!termsAccepted || !lgpdAccepted) {
      throw new AppError('GEN-002', 400, { message: 'Aceite os termos de uso e a política de privacidade para criar sua conta.' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      if (existing.userRole === 'CUSTOMER' && existing.emailVerified !== true) {
        const delivery = await this.sendCustomerEmailOtp(existing, meta);
        return {
          user: this.sanitizeUser(existing),
          next: 'VERIFY_EMAIL_CODE',
          reason: 'ACCOUNT_PENDING_EMAIL_VERIFICATION',
          email: existing.email,
          emailMasked: this.maskEmail(existing.email),
          cooldownSec: delivery.cooldownSec,
          emailSent: delivery.emailSent,
          emailDeliveryStatus: delivery.emailDeliveryStatus,
        };
      }
      throw new AppError('AUTH-011', 409);
    }

    const user = userRepo.create({
      fullName,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
      emailVerified: false,
      userRole: 'CUSTOMER',
      termsAcceptedAt: new Date(),
      lgpdAcceptedAt: new Date(),
    } as Partial<User>);
    const saved = await userRepo.save(user);
    const delivery = await this.sendCustomerEmailOtp(saved, meta);
    void this.notifySignupAdmin(saved);

    return {
      user: this.sanitizeUser(saved),
      next: 'VERIFY_EMAIL_CODE',
      email: saved.email,
      emailMasked: this.maskEmail(saved.email),
      cooldownSec: delivery.cooldownSec,
      emailSent: delivery.emailSent,
      emailDeliveryStatus: delivery.emailDeliveryStatus,
    };
  }

    /**
   * Executes login business logic.
   *
   * @author Edmilson Lopes
   */
async login(input: { email: string; password: string; deviceId?: string | null; trustedDeviceToken?: string | null; deviceLabel?: string | null }, meta?: CustomerMfaLoginOptions) {
    const email = this.normalizeEmail(input?.email || '');
    const password = String(input?.password || '');
    if (!email || !password) throw new AppError('AUTH-004', 401);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new AppError('AUTH-004', 401);

    if (user.isActive === false) {
      throw new AppError('AUTH-004', 401, { message: 'Esta conta foi desativada.' });
    }

    await this.securityService.assertCustomerAllowed(user.id, 'login');

    const valid = await bcrypt.compare(password, String(user.password || ''));
    if (!valid) throw new AppError('AUTH-004', 401);

    if (!user.emailVerified) {
      throw new AppError('AUTH-005', 401, {
        next: 'VERIFY_EMAIL_CODE',
        email: user.email,
        emailMasked: this.maskEmail(user.email),
        resendCooldownSec: 60,
      });
    }

    return this.mfaService.evaluateLogin({
      ownerType: 'USER',
      ownerId: user.id,
      role: 'CUSTOMER',
      accountLabel: user.email,
      deviceId: input.deviceId || meta?.deviceId,
      trustedDeviceToken: input.trustedDeviceToken || meta?.trustedDeviceToken,
      deviceLabel: input.deviceLabel || meta?.deviceLabel,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      response: {
        user: this.sanitizeUser(user),
      },
      tokenPayload: { sub: user.id, role: 'CUSTOMER' as const },
      tokenExpiresIn: '30d',
    });
  }

    /**
   * Verifies the customer email OTP code.
   *
   * @author Edmilson Lopes
   */
async verifyEmailCode(input: { email?: string; code?: string }) {
    const email = this.normalizeEmail(input?.email || '');
    const code = this.sanitizeOtpCode(input?.code || '');
    if (!email || code.length !== 4) {
      throw new AppError('GEN-002', 400, { message: 'Informe o e-mail e o código de 4 dígitos.' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user || user.userRole !== 'CUSTOMER') {
      throw new AppError('AUTH-004', 401);
    }

    const otpRepo = AppDataSource.getRepository(CustomerEmailOtp);
    const otp = await otpRepo
      .createQueryBuilder('otp')
      .leftJoinAndSelect('otp.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .andWhere('otp.used_at IS NULL')
      .orderBy('otp.created_at', 'DESC')
      .getOne();

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new AppError('GEN-002', 400, { message: 'Seu código expirou. Solicite um novo.' });
    }

    if (otp.attemptsCount >= 5) {
      otp.usedAt = new Date();
      await otpRepo.save(otp);
      throw new AppError('GEN-002', 400, { message: 'Muitas tentativas. Solicite um novo código.' });
    }

    if (otp.codeHash !== this.hashOtpCode(code)) {
      otp.attemptsCount = Number(otp.attemptsCount || 0) + 1;
      if (otp.attemptsCount >= 5) {
        otp.usedAt = new Date();
      }
      await otpRepo.save(otp);
      throw new AppError('GEN-002', 400, {
        message: otp.attemptsCount >= 5
          ? 'Muitas tentativas. Solicite um novo código.'
          : 'Código inválido. Confira os 4 dígitos e tente novamente.',
      });
    }

    user.emailVerified = true;
    otp.usedAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(user);
      await manager.save(otp);
    });

    try {
      await this.emailService.sendCustomerWelcome(user.email, user.fullName || 'Cliente');
    } catch {
      // Customer activation should not fail when the welcome email cannot be delivered.
    }

    return {
      user: this.sanitizeUser(user),
      token: this.createCustomerToken(user.id),
      verified: true,
    };
  }

    /**
   * Resends the customer email OTP code.
   *
   * @author Edmilson Lopes
   */
async resendEmailCode(input: { email?: string }, meta?: { ipAddress?: string | null }) {
    const email = this.normalizeEmail(input?.email || '');
    if (!email) {
      throw new AppError('GEN-002', 400, { message: 'Informe um e-mail válido.' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user || user.userRole !== 'CUSTOMER') {
      return { next: 'VERIFY_EMAIL_CODE', cooldownSec: 60 };
    }
    if (user.emailVerified) {
      return {
        next: 'VERIFY_EMAIL_CODE',
        cooldownSec: 60,
        emailMasked: this.maskEmail(user.email),
      };
    }

    const rate = await this.isOtpResendAllowed(user.id, meta?.ipAddress);
    if (!rate.allowed) {
      return {
        next: 'VERIFY_EMAIL_CODE',
        cooldownSec: rate.cooldownSeconds,
        emailMasked: this.maskEmail(user.email),
      };
    }

    const delivery = await this.sendCustomerEmailOtp(user, meta);
    return {
      next: 'VERIFY_EMAIL_CODE',
      cooldownSec: delivery.cooldownSec,
      emailMasked: this.maskEmail(user.email),
      emailSent: delivery.emailSent,
      emailDeliveryStatus: delivery.emailDeliveryStatus,
    };
  }

    /**
   * Executes me business logic.
   *
   * @author Edmilson Lopes
   */
async me(userId: string) {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);
    return this.sanitizeUser(user);
  }

    /**
   * Updates resources for update me.
   *
   * @author Edmilson Lopes
   */
async updateMe(userId: string, input: { fullName?: string; phone?: string | null; profileImageFile?: string | null }) {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);

    const fullName = String(input?.fullName || '').trim();
    if (fullName) user.fullName = fullName;
    if (input?.phone !== undefined) user.phone = this.sanitizePhone(input.phone) || undefined;
    if (input?.profileImageFile !== undefined) {
      const raw = String(input?.profileImageFile || '').trim();
      if (!raw) {
        user.profileImageUrl = undefined;
      } else {
        const uploaded = await saveBase64Image(raw, `customer-${user.id}`, 'customers');
        if (uploaded) user.profileImageUrl = uploaded;
      }
    }

    const saved = await repo.save(user);
    return this.sanitizeUser(saved);
  }

    /**
   * Executes change password business logic.
   *
   * @author Edmilson Lopes
   */
async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);

    const valid = await bcrypt.compare(String(currentPassword || ''), String(user.password || ''));
    if (!valid) throw new AppError('AUTH-004', 401);

    const next = String(newPassword || '');
    if (next.length < 6) {
      throw new AppError('GEN-002', 400, { message: 'A nova senha precisa ter ao menos 6 caracteres.' });
    }

    user.password = await bcrypt.hash(next, 10);
    await repo.save(user);
    return { ok: true };
  }

  /**
   * Deactivates the customer account (soft delete).
   * 
   * @author Edmilson Lopes
   */
  async deactivate(userId: string) {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);

    user.isActive = false;
    await repo.save(user);
    return { ok: true };
  }

    /**
   * Lists records for list addresses.
   *
   * @author Edmilson Lopes
   */
async listAddresses(userId: string) {
    const rows = await AppDataSource.getRepository(CustomerAddress).find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    const resolvedRows = await Promise.all(
      rows.map((row) =>
        this.ensureAddressCoordinates(row).catch((error) => {
          this.log.warn('Customer address lazy coordinate resolve failed', {
            addressId: row.id,
            userId: row.userId,
            error,
          });
          return row;
        })
      )
    );
    return resolvedRows.map((row) => this.mapAddress(row));
  }

    /**
   * Creates resources for create address.
   *
   * @author Edmilson Lopes
   */
async createAddress(userId: string, input: AddressInput) {
    const cep = String(input?.cep || '').replace(/\D/g, '').slice(0, 8);
    const state = String(input?.state || '').trim().toUpperCase().slice(0, 2);
    const street = String(input?.street || '').trim();
    const number = String(input?.number || '').trim();
    const city = String(input?.city || '').trim();
    const isCondominiumAddress = Boolean(input?.condominiumId);
    this.assertRequiredAddressFields({ cep, street, number, city, state }, { requireNumber: !isCondominiumAddress });

    const requestedLat = this.parseCoordinate(input?.lat);
    const requestedLng = this.parseCoordinate(input?.lng);
    const hasExplicitCoordinates =
      requestedLat !== undefined &&
      requestedLng !== undefined &&
      requestedLat !== null &&
      requestedLng !== null;
    let resolvedLat = hasExplicitCoordinates ? Number(requestedLat) : null;
    let resolvedLng = hasExplicitCoordinates ? Number(requestedLng) : null;
    if (!hasExplicitCoordinates) {
      const coordinates = await this.resolveAddressCoordinates({
        cep,
        street,
        number,
        neighborhood: input?.neighborhood,
        complement: input?.complement,
        city,
        state,
      });
      if (coordinates) {
        resolvedLat = coordinates.lat;
        resolvedLng = coordinates.lng;
      }
    }

    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CustomerAddress);
      const hasAny = await repo.count({ where: { userId } });
      const shouldBeDefault = Boolean(input?.isDefault) || hasAny === 0;

      if (shouldBeDefault) {
        await repo.createQueryBuilder().update(CustomerAddress).set({ isDefault: false }).where('user_id = :userId', { userId }).execute();
      }

      const entity = repo.create({
        userId,
        label: input?.label ? String(input.label).trim() : undefined,
        recipientName: input?.recipientName ? String(input.recipientName).trim() : undefined,
        phone: this.sanitizePhone(input?.phone || null) || undefined,
        cep,
        street,
        number,
        complement: input?.complement ? String(input.complement).trim() : undefined,
        neighborhood: input?.neighborhood ? String(input.neighborhood).trim() : undefined,
        city,
        state,
        lat: resolvedLat,
        lng: resolvedLng,
        isDefault: shouldBeDefault,
        condominiumId: input?.condominiumId ? String(input.condominiumId).trim() || null : null,
        condominiumBlock: input?.condominiumBlock ? String(input.condominiumBlock).trim() || null : null,
        condominiumUnit: input?.condominiumUnit ? String(input.condominiumUnit).trim() || null : null,
      } as Partial<CustomerAddress>);
      const saved = await repo.save(entity);
      return this.mapAddress(saved);
    });
  }

    /**
   * Updates resources for update address.
   *
   * @author Edmilson Lopes
   */
async updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
    // Pré-carrega FORA da transação: geocoding (chamada externa lenta) nunca pode rodar com
    // transação aberta — estourava QueryRunnerAlreadyReleased no save (400 GEN-001).
    const current = await AppDataSource.getRepository(CustomerAddress).findOne({ where: { id: addressId, userId } });
    if (!current) throw new AppError('GEN-001', 404, { message: 'Endereço não encontrado.' });

    // Compara VALORES (não presença): editar sem mudar nada de endereço (ex.: só
    // ajustar bloco/apto do condomínio) NÃO pode disparar re-geocoding no save.
    const addressFieldsChanged =
      (input?.cep !== undefined && String(input.cep || '').replace(/\D/g, '').slice(0, 8) !== String(current.cep || '')) ||
      (input?.street !== undefined && String(input.street || '').trim() !== String(current.street || '').trim()) ||
      (input?.number !== undefined && String(input.number || '').trim() !== String(current.number || '').trim()) ||
      (input?.complement !== undefined && String(input.complement || '').trim() !== String(current.complement || '').trim()) ||
      (input?.neighborhood !== undefined && String(input.neighborhood || '').trim() !== String(current.neighborhood || '').trim()) ||
      (input?.city !== undefined && String(input.city || '').trim() !== String(current.city || '').trim()) ||
      (input?.state !== undefined && String(input.state || '').trim().toUpperCase().slice(0, 2) !== String(current.state || '').trim().toUpperCase().slice(0, 2));
    const hasExplicitLat = input?.lat !== undefined;
    const hasExplicitLng = input?.lng !== undefined;
    const nextLat = this.parseCoordinate(input?.lat);
    const nextLng = this.parseCoordinate(input?.lng);
    const explicitCoordinatesAreStale =
      addressFieldsChanged &&
      hasExplicitLat &&
      hasExplicitLng &&
      sameCoordinatePair(nextLat, nextLng, current.lat, current.lng);
    const shouldUseExplicitLat = hasExplicitLat && !explicitCoordinatesAreStale;
    const shouldUseExplicitLng = hasExplicitLng && !explicitCoordinatesAreStale;

    // Resolve coordenadas FORA da transação com os valores FINAIS dos campos (input > atual).
    let resolvedLat: number | null = null;
    let resolvedLng: number | null = null;
    if (addressFieldsChanged && (!shouldUseExplicitLat || !shouldUseExplicitLng)) {
      const nextText = (key: 'cep' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state') =>
        input?.[key] !== undefined ? String(input[key] || '').trim() : String((current as any)[key] || '').trim();
      const coordinates = await this.resolveAddressCoordinates({
        cep: nextText('cep').replace(/\D/g, '').slice(0, 8),
        street: nextText('street'),
        number: nextText('number'),
        complement: nextText('complement'),
        neighborhood: nextText('neighborhood'),
        city: nextText('city'),
        state: nextText('state').toUpperCase().slice(0, 2),
      });
      if (coordinates) {
        resolvedLat = coordinates.lat;
        resolvedLng = coordinates.lng;
      }
    }

    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CustomerAddress);
      const address = await repo.findOne({ where: { id: addressId, userId } });
      if (!address) throw new AppError('GEN-001', 404, { message: 'Endereço não encontrado.' });

      if (input?.label !== undefined) address.label = input.label ? String(input.label).trim() : undefined;
      if (input?.recipientName !== undefined) {
        address.recipientName = input.recipientName ? String(input.recipientName).trim() : undefined;
      }
      if (input?.phone !== undefined) address.phone = this.sanitizePhone(input.phone) || undefined;
      if (input?.cep !== undefined) {
        const cep = String(input.cep || '').replace(/\D/g, '').slice(0, 8);
        if (cep.length !== 8) throw new AppError('GEN-002', 400, { message: 'CEP inválido.' });
        address.cep = cep;
      }
      if (input?.street !== undefined) address.street = String(input.street || '').trim();
      if (input?.number !== undefined) address.number = input.number ? String(input.number).trim() : undefined;
      if (input?.complement !== undefined) {
        address.complement = input.complement ? String(input.complement).trim() : undefined;
      }
      if (input?.neighborhood !== undefined) {
        address.neighborhood = input.neighborhood ? String(input.neighborhood).trim() : undefined;
      }
      if (input?.city !== undefined) address.city = String(input.city || '').trim();
      if (input?.state !== undefined) address.state = String(input.state || '').trim().toUpperCase().slice(0, 2);
      if (input?.condominiumId !== undefined) {
        address.condominiumId = input.condominiumId ? String(input.condominiumId).trim() || null : null;
      }
      if (input?.condominiumBlock !== undefined) {
        address.condominiumBlock = input.condominiumBlock ? String(input.condominiumBlock).trim() || null : null;
      }
      if (input?.condominiumUnit !== undefined) {
        address.condominiumUnit = input.condominiumUnit ? String(input.condominiumUnit).trim() || null : null;
      }
      if (shouldUseExplicitLat) {
        address.lat = nextLat !== null ? Number(nextLat) : null;
      }
      if (shouldUseExplicitLng) {
        address.lng = nextLng !== null ? Number(nextLng) : null;
      }

      if (input?.isDefault === true && !address.isDefault) {
        await repo.createQueryBuilder().update(CustomerAddress).set({ isDefault: false }).where('user_id = :userId', { userId }).execute();
        address.isDefault = true;
      }

      if (addressFieldsChanged || shouldUseExplicitLat || shouldUseExplicitLng) {
        const isCondominiumAddressUpdate = Boolean(address.condominiumId);
        this.assertRequiredAddressFields({
          cep: address.cep,
          street: address.street,
          number: address.number,
          city: address.city,
          state: address.state,
        }, { requireNumber: !isCondominiumAddressUpdate });
        // Coordenadas já resolvidas FORA da transação — aqui só aplica.
        if (!shouldUseExplicitLat) address.lat = resolvedLat;
        if (!shouldUseExplicitLng) address.lng = resolvedLng;
      }

      const saved = await repo.save(address);
      return this.mapAddress(saved);
    });
  }

    /**
   * Removes resources for delete address.
   *
   * @author Edmilson Lopes
   */
async deleteAddress(userId: string, addressId: string) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CustomerAddress);
      const address = await repo.findOne({ where: { id: addressId, userId } });
      if (!address) return { ok: true };
      const wasDefault = Boolean(address.isDefault);
      await repo.delete({ id: addressId, userId });

      if (wasDefault) {
        const next = await repo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
        if (next) {
          next.isDefault = true;
          await repo.save(next);
        }
      }

      return { ok: true };
    });
  }

    /**
   * Sets state or configuration for set default address.
   *
   * @author Edmilson Lopes
   */
async setDefaultAddress(userId: string, addressId: string) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CustomerAddress);
      const address = await repo.findOne({ where: { id: addressId, userId } });
      if (!address) throw new AppError('GEN-001', 404, { message: 'Endereço não encontrado.' });
      await repo.createQueryBuilder().update(CustomerAddress).set({ isDefault: false }).where('user_id = :userId', { userId }).execute();
      address.isDefault = true;
      const saved = await repo.save(address);
      return this.mapAddress(saved);
    });
  }

    /**
   * Lists records for list orders.
   *
   * @author Edmilson Lopes
   */
  async listOrders(userId: string, { limit = 10, offset = 0 }: { limit?: number; offset?: number } = {}) {
    // Silently cancel awaiting_payment orders whose MP payment already expired
    try {
      const expired = await AppDataSource.query(
        `SELECT op.id, op.order_id FROM order_payments op
         INNER JOIN orders o ON o.id = op.order_id
         WHERE o.customer_user_id = $1
           AND o.status = 'awaiting_payment'
           AND op.payment_status = 'PENDING'
           AND op.expires_at IS NOT NULL
           AND op.expires_at < NOW() - INTERVAL '2 minutes'`,
        [userId]
      );
      for (const row of expired) {
        await AppDataSource.query(
          `UPDATE order_payments SET payment_status = 'FAILED', failed_at = NOW() WHERE id = $1`,
          [row.id]
        );
        await AppDataSource.query(
          `UPDATE orders SET payment_status = 'FAILED', status = 'cancelled',
           canceled_reason = 'Pagamento não confirmado dentro do prazo.',
           status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $2::jsonb
           WHERE id = $1 AND status = 'awaiting_payment'`,
          [row.order_id, buildOrderTimelineJson('cancelled')]
        );
      }
    } catch { /* non-blocking — never break list */ }

    const [rows, total] = await AppDataSource.getRepository(Order).findAndCount({
      where: { customerUserId: userId },
      relations: [ 'store', 'store.settings', 'store.owner', 'items', 'items.product', 'shipment' ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Fetch paymentLink for awaiting_payment orders so the client can show a direct pay button
    const awaitingIds = rows
      .filter((o) => o.status === 'awaiting_payment')
      .map((o) => o.id);
    const paymentLinkMap: Record<string, string> = {};
    if (awaitingIds.length > 0) {
      const paymentRows: { order_id: string; payment_link: string }[] = await AppDataSource.query(
        `SELECT order_id, payment_link FROM order_payments
         WHERE order_id = ANY($1) AND payment_status = 'PENDING' AND payment_link IS NOT NULL`,
        [awaitingIds]
      );
      for (const row of paymentRows) {
        paymentLinkMap[row.order_id] = row.payment_link;
      }
    }


    // Fetch refund status for cancelled orders paid online
    const cancelledIds = rows.filter((o) => o.status === 'cancelled').map((o) => o.id);
    const refundMap: Record<string, { status: string; amount: number | null; reason: string | null }> = {};
    if (cancelledIds.length > 0) {
      const refundRows: { order_id: string; refund_status: string; refund_amount: string | null; refund_reason: string | null }[] = await AppDataSource.query(
        `SELECT order_id, refund_status, refund_amount, refund_reason FROM order_payments WHERE order_id = ANY($1) AND refund_status IS NOT NULL`,
        [cancelledIds]
      );
      for (const row of refundRows) {
        refundMap[row.order_id] = { status: row.refund_status, amount: row.refund_amount ? Number(row.refund_amount) : null, reason: row.refund_reason };
      }
    }

    const storeReviewSummaryMap = await this.orderReviewService.publicSummariesByStoreIds(
      Array.from(new Set(rows.map((order) => order.store?.id).filter(Boolean) as string[]))
    );

    const data = rows.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: order.status,
      canceledAt: order.canceledAt || null,
      canceledReason: order.canceledReason || null,
      customerReceivedAt: (order as any).customerReceivedAt || null,
      customerReceivedConfirmedByUserId: (order as any).customerReceivedConfirmedByUserId || null,
      type: order.type,
      fulfillmentMode: order.fulfillmentMode,
      condominiumId: (order as any).condominiumId || null,
      condominiumEventId: (order as any).condominiumEventId || null,
      condominiumName: (order as any).condominiumName || null,
      condominiumEventTitle: (order as any).condominiumEventTitle || null,
      condominiumFulfillmentMode: (order as any).condominiumFulfillmentMode || null,
      condominiumUnit: (order as any).condominiumUnit || null,
      condominiumPickupLocation: (order as any).condominiumPickupLocation || null,
      condominiumOrder: (order as any).condominiumId
        ? {
            condominiumId: (order as any).condominiumId || null,
            eventId: (order as any).condominiumEventId || null,
            condominiumName: (order as any).condominiumName || null,
            eventTitle: (order as any).condominiumEventTitle || null,
            fulfillmentMode: (order as any).condominiumFulfillmentMode || null,
            unit: (order as any).condominiumUnit || null,
          }
        : null,
      paymentMethod: order.paymentMethod || null,
      paymentStatus: order.paymentStatus || null,
      paymentLink: paymentLinkMap[order.id] || null,
      total: Number(order.total || 0),
      refundStatus: refundMap[order.id]?.status || null,
      refundAmount: refundMap[order.id]?.amount || null,
      refundReason: refundMap[order.id]?.reason || null,
      deliveryFee: order.deliveryFee != null ? Number(order.deliveryFee) : null,
      customerName: order.customerName,
      phone: order.phone || null,
      address: order.address || null,
      table: order.table || null,
      scheduledFor: (order as any).scheduledFor || null,
      partySize: (order as any).partySize != null ? Number((order as any).partySize) : null,
      store: order.store
        ? {
            id: order.store.id,
            name: order.store.name,
            slug: order.store.slug,
            phone: order.store.owner?.phone || null,
            reviewSummary: storeReviewSummaryMap.get(order.store.id) || {
              totalReviews: 0,
              avgStoreRating: 0,
              totalDeliveryReviews: 0,
              avgDeliveryRating: 0,
            },
            settings: order.store.settings
              ? {
                  logoUrl: order.store.settings.logoUrl || null,
                }
              : null,
          }
        : null,
      shipment: order.shipment
        ? {
            provider: order.shipment.provider || null,
            serviceCode: order.shipment.serviceCode || null,
            serviceName: order.shipment.serviceName || null,
            trackingCode: order.shipment.trackingCode || null,
            trackingUrl: order.shipment.trackingUrl || null,
            shipmentStatus: order.shipment.shipmentStatus || null,
            postedAt: order.shipment.postedAt || null,
            deliveredAt: order.shipment.deliveredAt || null,
          }
        : null,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productId: item.product?.id || null,
        name: item.product?.name || '',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        imageUrl: item.product?.imageUrl || null,
      })),
    }));
    return { data, total, hasMore: offset + limit < total };
  }

  /**
   * Cancels a delayed customer order with a user-provided reason.
   *
   * @author Edmilson Lopes
   */
  async cancelOrder(userId: string, orderId: string, input: { reason?: string | null }) {
    const repo = AppDataSource.getRepository(Order);
    const order = await repo.findOne({
      where: { id: orderId, customerUserId: userId },
      relations: [ 'store', 'store.settings', 'items', 'items.product', 'shipment' ],
    });
    if (!order) {
      throw new AppError('ORDER-001', 404, { message: 'Pedido não encontrado.' });
    }

    const normalizedStatus = String(order.status || '').trim().toLowerCase();
    const cancellableStatuses = new Set([ 'pending', 'accepted', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ]);
    if (!cancellableStatuses.has(normalizedStatus)) {
      throw new AppError('ORDER-004', 400, { message: 'Este pedido não pode mais ser cancelado pelo app.' });
    }

    const reason = String(input?.reason || '').trim();
    if (reason.length < 3) {
      throw new AppError('GEN-002', 400, { message: 'Informe um motivo curto para o cancelamento.' });
    }

    const publicPayload = await this.orderService.getPublicById(order.id);
    if (!publicPayload?.order) {
      throw new AppError('ORDER-001', 404, { message: 'Pedido não encontrado.' });
    }

    const eta = await this.orderEtaService.calculateForOrder(publicPayload.order, publicPayload.queuePosition, undefined);
    const etaMinutes = Number(eta?.windowMax || eta?.totalMinutes || eta?.windowMin || 0);
    if (!(etaMinutes > 0)) {
      throw new AppError('ORDER-004', 400, { message: 'Ainda não foi possível validar o prazo do pedido.' });
    }

    const createdAtMs = new Date(order.createdAt).getTime();
    const graceMs = 15 * 60 * 1000;
    const unlockAt = createdAtMs + etaMinutes * 60 * 1000 + graceMs;
    if (Date.now() < unlockAt) {
      throw new AppError('ORDER-004', 400, {
        message: 'O cancelamento pelo app fica disponível apenas quando o pedido ultrapassa o prazo estimado.',
      });
    }

    const saved = await this.orderService.updateStatus(order.id, 'cancelled', undefined, reason);
    return {
      ok: true,
      orderId: saved.id,
      status: saved.status,
      canceledAt: saved.canceledAt || null,
      canceledReason: saved.canceledReason || null,
    };
  }

  /**
   * Confirms that the authenticated customer received the delivered order.
   *
   * @author Edmilson Lopes
   */
  async confirmOrderReceived(userId: string, orderId: string) {
    const result = await AppDataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
          SELECT o.id,
                 o.type,
                 o.status,
                 o.customer_received_at,
                 o.store_id,
                 o.fulfillment_mode,
                 os.shipment_status,
                 os.delivered_at AS shipment_delivered_at,
                 EXISTS (
                   SELECT 1
                     FROM order_shipment_events ose
                    WHERE ose.order_id = o.id
                      AND LOWER(COALESCE(ose.status, '')) = 'delivered'
                 ) AS has_delivered_shipment_event
            FROM orders o
       LEFT JOIN order_shipments os
              ON os.order_id = o.id
           WHERE o.id = $1
             AND o.customer_user_id = $2
           FOR UPDATE OF o
        `,
        [orderId, userId]
      );
      const order = rows?.[0] || null;
      if (!order) {
        throw new AppError('ORDER-001', 404, { message: 'Pedido não encontrado.' });
      }
      if (String(order.type || '').toLowerCase() !== 'delivery') {
        throw new AppError('ORDER-004', 400, { message: 'A confirmação de recebimento só está disponível para pedidos com entrega.' });
      }

      const normalizedStatus = String(order.status || '').trim().toLowerCase();
      const fulfillmentMode = String(order.fulfillment_mode || '').trim().toLowerCase();
      const shipmentStatus = String(order.shipment_status || '').trim().toLowerCase();
      const postalShipmentDelivered =
        fulfillmentMode === 'postal' &&
        (
          shipmentStatus === 'delivered' ||
          Boolean(order.shipment_delivered_at) ||
          Boolean(order.has_delivered_shipment_event)
        );
      const customerReceivedAt = order.customer_received_at ? new Date(order.customer_received_at) : null;
      if (normalizedStatus === 'finished' && customerReceivedAt) {
        return order;
      }
      if (![ 'delivered', 'finished', 'done' ].includes(normalizedStatus) && !postalShipmentDelivered) {
        throw new AppError('ORDER-004', 400, { message: 'Este pedido ainda não está pronto para confirmação de recebimento.' });
      }

      const [saved] = await manager.query(
        `
          UPDATE orders
             SET customer_received_at = COALESCE(customer_received_at, NOW()),
                 customer_received_confirmed_by_user_id = COALESCE(customer_received_confirmed_by_user_id, $2),
                 status = 'finished',
                 updated_at = NOW()
           WHERE id = $1
           RETURNING id,
                     status,
                     customer_received_at AS "customerReceivedAt",
                     customer_received_confirmed_by_user_id AS "customerReceivedConfirmedByUserId",
                     store_id AS "storeId"
        `,
        [orderId, userId]
      );
      try {
        if (postalShipmentDelivered && ![ 'delivered', 'finished', 'done' ].includes(normalizedStatus)) {
          await manager.query(
            "UPDATE orders SET status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $1::jsonb WHERE id = $2",
            [buildOrderTimelineJson('delivered', order.shipment_delivered_at || new Date()), orderId]
          );
        }
        await manager.query(
          "UPDATE orders SET status_timeline = COALESCE(status_timeline, '[]'::jsonb) || $1::jsonb WHERE id = $2",
            [buildOrderTimelineJson('finished', saved?.customerReceivedAt || saved?.customer_received_at || new Date()), orderId]
        );
      } catch {}
      return saved || order;
    });

    const storeId = String((result as any)?.storeId || (result as any)?.store_id || '').trim();
    this.log.info('Customer confirmed order receipt', {
      orderId: String(result?.id || orderId),
      userId,
      storeId: storeId || null,
      status: String(result?.status || '').trim().toLowerCase(),
    });
    if (storeId) {
      const orderDisplayId = `#${String(result.id || '').slice(0, 8)}`;
      void this.pushService
        .notifyStoreUsersOrderDelivered(storeId, {
          title: 'PEDIDO ENTREGUE',
          body: `O cliente confirmou o recebimento do pedido ${orderDisplayId}.`,
          data: {
            url: 'https://janocaminho.com.br/admin/queue',
            orderId: String(result.id),
            status: String(result.status || ''),
            notificationType: 'customer_order_received',
          },
        })
        .catch((error) => {
          this.log.warn('Store delivered push failed after customer confirmation', {
            orderId: String(result.id || orderId),
            storeId,
            error,
          });
        });
    }

    const confirmedAt =
      (result as any).customerReceivedAt ||
      (result as any).customer_received_at ||
      new Date().toISOString();

    return {
      ok: true,
      orderId: result.id,
      status: (result as any).status || 'finished',
      customerReceivedAt: confirmedAt,
    };
  }

  /**
   * Registers a mobile push token for the authenticated customer.
   *
   * @author Edmilson Lopes
   */
  async registerPushToken(
    userId: string,
    input: { token?: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    return this.pushService.registerCustomerToken(userId, {
      token: String(input?.token || ''),
      platform: input?.platform,
      appVersion: input?.appVersion,
      deviceModel: input?.deviceModel,
    });
  }

  /**
   * Unregisters one or all push tokens for the authenticated customer.
   *
   * @author Edmilson Lopes
   */
  async unregisterPushToken(userId: string, input: { token?: string | null }) {
    return this.pushService.unregisterCustomerToken(userId, input?.token || null);
  }

  /**
   * Registers a mobile push token for an anonymous customer session.
   *
   * @author Edmilson Lopes
   */
  async registerGuestPushToken(
    guestId: string,
    input: { token?: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    return this.pushService.registerGuestToken(guestId, {
      token: String(input?.token || ''),
      platform: input?.platform,
      appVersion: input?.appVersion,
      deviceModel: input?.deviceModel,
    });
  }

  /**
   * Unregisters one or all push tokens for an anonymous customer session.
   *
   * @author Edmilson Lopes
   */
  async unregisterGuestPushToken(guestId: string, input: { token?: string | null }) {
    return this.pushService.unregisterGuestToken(guestId, input?.token || null);
  }

  private async notifySignupAdmin(user: { fullName?: string | null; email: string }) {
    await this.auditNotificationService.notifyUserCreated({
      accountType: 'cliente',
      user: {
        fullName: user.fullName || user.email,
        email: user.email,
        role: 'CUSTOMER',
      },
    });
  }
}
