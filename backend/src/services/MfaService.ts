import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { IsNull, MoreThan } from 'typeorm';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { MfaChallenge } from '../entities/MfaChallenge';
import { MfaOwnerType, MfaSetting } from '../entities/MfaSetting';
import { TrustedDevice } from '../entities/TrustedDevice';
import { AppError } from '../errors/AppError';
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from '../utils/totp';

type LoginContext = {
  ownerType: MfaOwnerType;
  ownerId: string;
  role: string;
  accountLabel: string;
  deviceId?: string | null;
  trustedDeviceToken?: string | null;
  deviceLabel?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  response: Record<string, any>;
  tokenPayload: Record<string, any>;
  tokenExpiresIn?: string;
};

type AuthContext = {
  ownerType: MfaOwnerType;
  ownerId: string;
  role?: string | null;
};

type DeviceContext = {
  deviceId?: string | null;
  trustedDeviceToken?: string | null;
  deviceLabel?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

const ISSUER = 'Ja no Caminho';
const MFA_METHOD = 'TOTP';

export class MfaService {
  private settingRepo = () => AppDataSource.getRepository(MfaSetting);
  private challengeRepo = () => AppDataSource.getRepository(MfaChallenge);
  private trustedDeviceRepo = () => AppDataSource.getRepository(TrustedDevice);

  async evaluateLogin(context: LoginContext) {
    if (!env.mfa.enabled) {
      return this.withToken(context);
    }

    const setting = await this.findSetting(context.ownerType, context.ownerId);
    const required = this.isRequiredForRole(context.role);

    if (!setting?.enabled) {
      const response = this.withToken(context);
      if (required) {
        return {
          ...response,
          mfaEnrollmentRequired: true,
          mfaRequiredForRole: true,
        };
      }
      return response;
    }

    const trusted = await this.verifyTrustedDevice({
      ownerType: context.ownerType,
      ownerId: context.ownerId,
      deviceId: context.deviceId,
      trustedDeviceToken: context.trustedDeviceToken,
    });

    if (trusted) {
      return {
        ...this.withToken(context),
        mfaTrustedDevice: true,
      };
    }

    const challenge = await this.createChallenge(context);
    return {
      mfaRequired: true,
      next: 'MFA_REQUIRED',
      method: MFA_METHOD,
      challengeToken: challenge.token,
      expiresAt: challenge.expiresAt,
      account: this.maskAccountLabel(context.accountLabel),
      trustDeviceAvailable: env.mfa.trustedDeviceEnabled,
      trustedDeviceExpirationDays: env.mfa.trustedDeviceExpirationDays,
    };
  }

  async verifyLoginChallenge(input: {
    challengeToken?: string | null;
    code?: string | null;
    trustDevice?: boolean;
    deviceId?: string | null;
    deviceLabel?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const challengeToken = String(input.challengeToken || '').trim();
    const code = String(input.code || '').replace(/\D/g, '');
    if (!challengeToken || code.length !== 6) {
      throw new AppError('MFA-001', 400);
    }

    const challenge = await this.challengeRepo().findOne({
      where: { challengeTokenHash: this.hash(challengeToken) },
    });

    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
      throw new AppError('MFA-002', 401);
    }

    if (challenge.attemptsCount >= 5) {
      throw new AppError('MFA-003', 429);
    }

    const setting = await this.findSetting(challenge.ownerType, challenge.ownerId);
    if (!setting?.enabled) {
      throw new AppError('MFA-004', 400);
    }

    const valid = verifyTotpCode(this.decryptSecret(setting), code, { window: 1 });
    challenge.attemptsCount += 1;
    challenge.lastAttemptAt = new Date();

    if (!valid) {
      await this.challengeRepo().save(challenge);
      throw new AppError(challenge.attemptsCount >= 5 ? 'MFA-003' : 'MFA-005', 401);
    }

    challenge.consumedAt = new Date();
    await this.challengeRepo().save(challenge);
    setting.lastUsedAt = new Date();
    await this.settingRepo().save(setting);

    const session = this.signStoredSession(challenge.sessionPayload);
    if (input.trustDevice && env.mfa.trustedDeviceEnabled && input.deviceId) {
      session.trustedDevice = await this.createTrustedDevice({
        ownerType: challenge.ownerType,
        ownerId: challenge.ownerId,
        deviceId: input.deviceId,
        deviceLabel: input.deviceLabel,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      });
    }

    return session;
  }

  async getStatus(context: AuthContext) {
    const setting = await this.findSetting(context.ownerType, context.ownerId);
    const activeDevices = await this.trustedDeviceRepo().count({
      where: {
        ownerType: context.ownerType,
        ownerId: context.ownerId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    return {
      enabled: Boolean(setting?.enabled),
      required: this.isRequiredForRole(context.role || ''),
      method: MFA_METHOD,
      trustedDeviceEnabled: env.mfa.trustedDeviceEnabled,
      trustedDeviceExpirationDays: env.mfa.trustedDeviceExpirationDays,
      trustedDevicesCount: activeDevices,
      confirmedAt: setting?.confirmedAt || null,
      lastUsedAt: setting?.lastUsedAt || null,
      featureEnabled: env.mfa.enabled,
    };
  }

  async startSetup(context: AuthContext & { accountLabel?: string | null }) {
    if (!env.mfa.enabled) {
      throw new AppError('MFA-006', 400);
    }

    const secret = generateTotpSecret();
    const encrypted = this.encryptSecret(secret);
    const repo = this.settingRepo();
    const existing = await this.findSetting(context.ownerType, context.ownerId);
    const setting = existing || repo.create({
      ownerType: context.ownerType,
      ownerId: context.ownerId,
      method: MFA_METHOD,
    });

    setting.secretEncrypted = encrypted.encrypted;
    setting.secretIv = encrypted.iv;
    setting.secretAuthTag = encrypted.authTag;
    setting.enabled = false;
    setting.confirmedAt = null;
    await repo.save(setting);

    const accountName = String(context.accountLabel || context.ownerId).trim();
    const otpauthUri = buildOtpAuthUri({ issuer: ISSUER, accountName, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

    return {
      method: MFA_METHOD,
      issuer: ISSUER,
      accountName,
      secret,
      otpauthUri,
      qrCodeDataUrl,
    };
  }

  async confirmSetup(context: AuthContext, code: string) {
    const setting = await this.findSetting(context.ownerType, context.ownerId);
    if (!setting) {
      throw new AppError('MFA-004', 400);
    }

    const valid = verifyTotpCode(this.decryptSecret(setting), code, { window: 1 });
    if (!valid) {
      throw new AppError('MFA-005', 401);
    }

    setting.enabled = true;
    setting.confirmedAt = new Date();
    setting.lastUsedAt = new Date();
    await this.settingRepo().save(setting);

    return this.getStatus(context);
  }

  async disable(context: AuthContext, code?: string | null) {
    const setting = await this.findSetting(context.ownerType, context.ownerId);
    if (!setting?.enabled) {
      return this.getStatus(context);
    }

    const valid = verifyTotpCode(this.decryptSecret(setting), String(code || ''), { window: 1 });
    if (!valid) {
      throw new AppError('MFA-005', 401);
    }

    setting.enabled = false;
    setting.confirmedAt = null;
    await this.settingRepo().save(setting);
    await this.revokeAllTrustedDevices(context.ownerType, context.ownerId);
    return this.getStatus(context);
  }

  async listTrustedDevices(context: AuthContext) {
    const devices = await this.trustedDeviceRepo().find({
      where: {
        ownerType: context.ownerType,
        ownerId: context.ownerId,
        revokedAt: IsNull(),
      },
      order: { trustedAt: 'DESC' },
    });

    return devices.map((device) => ({
      id: device.id,
      label: device.label,
      userAgent: device.userAgent,
      trustedAt: device.trustedAt,
      lastUsedAt: device.lastUsedAt,
      expiresAt: device.expiresAt,
      active: !device.revokedAt && device.expiresAt.getTime() > Date.now(),
    }));
  }

  async revokeTrustedDevice(context: AuthContext, deviceId: string) {
    const device = await this.trustedDeviceRepo().findOne({
      where: {
        id: deviceId,
        ownerType: context.ownerType,
        ownerId: context.ownerId,
      },
    });

    if (!device) throw new AppError('MFA-007', 404);
    device.revokedAt = new Date();
    await this.trustedDeviceRepo().save(device);
    return { success: true };
  }

  resolveOwnerFromAuth(auth?: { sub?: string; role?: string }) {
    const ownerId = String(auth?.sub || '').trim();
    if (!ownerId) throw new AppError('AUTH-001', 401);
    const role = String(auth?.role || '').toUpperCase();
    return {
      ownerType: role === 'SUPER_ADMIN' ? 'PLATFORM_ADMIN' as MfaOwnerType : 'USER' as MfaOwnerType,
      ownerId,
      role,
    };
  }

  private async createChallenge(context: LoginContext) {
    const rawToken = this.randomToken();
    const expiresAt = new Date(Date.now() + env.mfa.challengeTtlMinutes * 60 * 1000);
    await this.challengeRepo().save(
      this.challengeRepo().create({
        challengeTokenHash: this.hash(rawToken),
        ownerType: context.ownerType,
        ownerId: context.ownerId,
        purpose: 'LOGIN',
        sessionPayload: {
          response: context.response,
          tokenPayload: context.tokenPayload,
          tokenExpiresIn: context.tokenExpiresIn || '30d',
        },
        expiresAt,
        attemptsCount: 0,
      })
    );

    return { token: rawToken, expiresAt };
  }

  private async verifyTrustedDevice(input: {
    ownerType: MfaOwnerType;
    ownerId: string;
    deviceId?: string | null;
    trustedDeviceToken?: string | null;
  }) {
    if (!env.mfa.trustedDeviceEnabled || !input.deviceId || !input.trustedDeviceToken) return false;

    const device = await this.trustedDeviceRepo().findOne({
      where: {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        deviceIdHash: this.hash(input.deviceId),
        trustTokenHash: this.hash(input.trustedDeviceToken),
        revokedAt: IsNull(),
      },
    });

    if (!device || device.expiresAt.getTime() <= Date.now()) return false;
    device.lastUsedAt = new Date();
    await this.trustedDeviceRepo().save(device);
    return true;
  }

  private async createTrustedDevice(input: DeviceContext & { ownerType: MfaOwnerType; ownerId: string }) {
    const token = this.randomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.mfa.trustedDeviceExpirationDays * 24 * 60 * 60 * 1000);
    const label = String(input.deviceLabel || '').trim().slice(0, 120) || 'Dispositivo confiavel';

    await this.trustedDeviceRepo().save(
      this.trustedDeviceRepo().create({
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        deviceIdHash: this.hash(String(input.deviceId || '')),
        trustTokenHash: this.hash(token),
        label,
        userAgent: input.userAgent || null,
        ipAddress: this.getClientIp(input.ipAddress),
        trustedAt: now,
        expiresAt,
        lastUsedAt: now,
      })
    );

    return {
      token,
      label,
      expiresAt,
    };
  }

  private async revokeAllTrustedDevices(ownerType: MfaOwnerType, ownerId: string) {
    await this.trustedDeviceRepo()
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('owner_type = :ownerType AND owner_id = :ownerId AND revoked_at IS NULL', { ownerType, ownerId })
      .execute();
  }

  private async findSetting(ownerType: MfaOwnerType, ownerId: string) {
    return this.settingRepo().findOne({
      where: {
        ownerType,
        ownerId,
        method: MFA_METHOD,
      },
    });
  }

  private withToken(context: LoginContext) {
    return {
      ...context.response,
      token: this.signToken(context.tokenPayload, context.tokenExpiresIn || '30d'),
    };
  }

  private signStoredSession(payload: Record<string, any>) {
    return {
      ...(payload.response || {}),
      token: this.signToken(payload.tokenPayload || {}, payload.tokenExpiresIn || '30d'),
    };
  }

  private signToken(payload: Record<string, any>, expiresIn: string) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: expiresIn as any });
  }

  private isRequiredForRole(role?: string | null) {
    const normalized = String(role || '').toUpperCase();
    if (normalized === 'SUPER_ADMIN') return env.mfa.requiredForSuperAdmin;
    if (['ADMIN', 'STORE_OWNER', 'OPERATOR', 'LOJISTA'].includes(normalized)) {
      return env.mfa.requiredForStoreAdmin;
    }
    return false;
  }

  private encryptSecret(secret: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  private decryptSecret(setting: MfaSetting) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(setting.secretIv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(setting.secretAuthTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(setting.secretEncrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private encryptionKey() {
    return crypto
      .createHash('sha256')
      .update(env.mfa.secretEncryptionKey || env.jwtSecret || 'mfa-development-key')
      .digest();
  }

  private hash(value: string) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
  }

  private randomToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  private maskAccountLabel(value: string) {
    const raw = String(value || '').trim();
    const [local, domain] = raw.split('@');
    if (!local || !domain) return raw ? `${raw.slice(0, 2)}***` : '';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private getClientIp(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    return raw.includes(',') ? raw.split(',')[0].trim() : raw;
  }
}
