import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { DestinationListing } from '../entities/DestinationListing';
import { DestinationPartnerAccount } from '../entities/DestinationPartnerAccount';
import { DestinationPartnerAuditLog } from '../entities/DestinationPartnerAuditLog';
import { DestinationPartnerInvite } from '../entities/DestinationPartnerInvite';
import { DestinationPartnerPermission } from '../entities/DestinationPartnerPermission';
import { HospitalityPlace } from '../entities/HospitalityPlace';
import { User } from '../entities/User';
import { AppError } from '../errors/AppError';
import { isApproximateGeoPrecision, sameCoordinatePair } from '../utils/geoQuality';
import {
  MAX_HOSPITALITY_BANNER_IMAGES,
  mergeHospitalityBannerSlots,
  normalizeHospitalityBannerSlots,
  normalizeHospitalityBannerUrls,
} from '../utils/hospitalityMedia';
import { saveBase64Image } from '../utils/imageStorage';
import { logger } from '../utils/logger';
import { normalizeExternalUrl, normalizeInstagramUrl } from '../utils/socialUrl';
import { userIdentityService } from './UserIdentityService';
import { EmailService } from './EmailService';

export const RESOURCE_HOSPITALITY_PLACE = 'HOSPITALITY_PLACE';
export const RESOURCE_DESTINATION_LISTING = 'DESTINATION_LISTING';
const ACTIVE_PERMISSION = 'active';

type PartnerResourceType = typeof RESOURCE_HOSPITALITY_PLACE | typeof RESOURCE_DESTINATION_LISTING;

type PartnerRequestLike = {
  id?: string;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  name?: string | null;
  userId?: string | null;
};

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const normalizeEmail = (value?: string | null) => String(value || '').trim().toLowerCase();

const toOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim();
  return text || null;
};

const normalizeZipCode = (value: unknown) => {
  if (value === undefined) return undefined;
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  return digits || null;
};

const toNullableNumber = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const publicUrl = (path?: string | null) => {
  const value = String(path || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

export class DestinationPartnerPortalService {
  private log = logger.child({ scope: 'DestinationPartnerPortalService' });
  private accountRepository = AppDataSource.getRepository(DestinationPartnerAccount);
  private inviteRepository = AppDataSource.getRepository(DestinationPartnerInvite);
  private permissionRepository = AppDataSource.getRepository(DestinationPartnerPermission);
  private auditRepository = AppDataSource.getRepository(DestinationPartnerAuditLog);
  private placeRepository = AppDataSource.getRepository(HospitalityPlace);
  private listingRepository = AppDataSource.getRepository(DestinationListing);
  private userRepository = AppDataSource.getRepository(User);
  private emailService = new EmailService();

  private hashToken(value: string) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
  }

  private generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  private buildActivationUrl(activationToken: string) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    return `${baseUrl}/parceiro/ativar?token=${encodeURIComponent(activationToken)}`;
  }

  private buildSession(account: DestinationPartnerAccount, resources?: any[]) {
    const token = jwt.sign(
      {
        sub: account.id,
        role: 'DESTINATION_PARTNER',
      },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      token,
      partner: this.toPublicAccount(account),
      resources: resources || [],
    };
  }

  private async createInvite(account: DestinationPartnerAccount, createdBy?: string | null) {
    await this.inviteRepository
      .createQueryBuilder()
      .update(DestinationPartnerInvite)
      .set({ usedAt: new Date() })
      .where('account_id = :accountId', { accountId: account.id })
      .andWhere('used_at IS NULL')
      .execute();

    const token = this.generateToken();
    const invite = await this.inviteRepository.save(
      this.inviteRepository.create({
        accountId: account.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdBy: createdBy || null,
      })
    );
    return { invite, token };
  }

  private async sendInviteEmail(account: DestinationPartnerAccount, activationToken: string, resourceName?: string | null) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.emailService.sendDestinationPartnerInvite({
      email: account.email,
      name: account.name,
      resourceName: resourceName || 'seu cadastro',
      activationUrl: this.buildActivationUrl(activationToken),
      loginUrl: `${baseUrl}/parceiro`,
    });
  }

  private async ensureAccount(request: PartnerRequestLike) {
    const email = normalizeEmail(request.responsibleEmail);
    if (!email) throw new AppError('DPARTNER-001', 400);

    const actorUserId = request.userId ? String(request.userId) : null;

    // Cliente logado: reusa/cria conta de parceiro VINCULADA ao users. O parceiro
    // autentica com a credencial de cliente — sem conta/senha própria e sem invite.
    if (actorUserId) {
      const linked = await this.accountRepository.findOne({ where: { userId: actorUserId } as any });
      if (linked) {
        if (linked.status !== 'active') {
          linked.status = 'active';
          linked.activatedAt = linked.activatedAt || new Date();
          linked.mustChangePassword = false;
          await this.accountRepository.save(linked);
        }
        return { account: linked, isNew: false };
      }
      // Conta legada com o mesmo email: vincula ao user em vez de criar nova.
      const byEmail = await this.accountRepository.findOne({ where: { email } });
      if (byEmail) {
        byEmail.userId = actorUserId;
        byEmail.status = 'active';
        byEmail.activatedAt = byEmail.activatedAt || new Date();
        byEmail.mustChangePassword = false;
        await this.accountRepository.save(byEmail);
        return { account: byEmail, isNew: false };
      }
      const created = await this.accountRepository.save(
        this.accountRepository.create({
          userId: actorUserId,
          name: String(request.responsibleName || request.name || email).trim(),
          email,
          phone: String(request.responsiblePhone || '').trim() || null,
          status: 'active',
          activatedAt: new Date(),
          mustChangePassword: false,
        })
      );
      return { account: created, isNew: true };
    }

    let account = await this.accountRepository.findOne({ where: { email } });
    if (!account) {
      account = await this.accountRepository.save(
        this.accountRepository.create({
          name: String(request.responsibleName || request.name || email).trim(),
          email,
          phone: String(request.responsiblePhone || '').trim() || null,
          status: 'invited',
          invitedAt: new Date(),
          mustChangePassword: true,
        })
      );
      return { account, isNew: true };
    }

    account.name = String(account.name || request.responsibleName || request.name || email).trim();
    account.phone = account.phone || String(request.responsiblePhone || '').trim() || null;
    if (account.status !== 'active') {
      account.status = 'invited';
      account.invitedAt = account.invitedAt || new Date();
    }
    await this.accountRepository.save(account);
    return { account, isNew: false };
  }

  async ensureAccessForApprovedRequest(input: {
    request: PartnerRequestLike;
    resourceType: PartnerResourceType;
    resourceId: string;
    resourceName?: string | null;
    reviewedBy?: string | null;
  }) {
    const { account, isNew } = await this.ensureAccount(input.request);
    const existingOwner = await this.permissionRepository.findOne({
      where: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: ACTIVE_PERMISSION,
      },
    });

    if (existingOwner && existingOwner.accountId !== account.id) {
      throw new AppError('DPARTNER-011', 409, {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      });
    }

    const existingPermission = await this.permissionRepository.findOne({
      where: {
        accountId: account.id,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    });

    const permission = existingPermission || this.permissionRepository.create({
      accountId: account.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
    permission.status = ACTIVE_PERMISSION;
    permission.permission = permission.permission || 'OWNER';
    permission.createdFromRequestId = input.request.id || permission.createdFromRequestId || null;
    permission.createdBy = input.reviewedBy || permission.createdBy || null;
    await this.permissionRepository.save(permission);

    let activationToken: string | null = null;
    let inviteSent = false;
    // Conta vinculada (userId) não precisa de invite — o parceiro autentica via users.
    if (!account.userId && (!account.passwordHash || account.status !== 'active')) {
      const inviteResult = await this.createInvite(account, input.reviewedBy);
      activationToken = inviteResult.token;
      // Dispara o e-mail de convite em segundo plano: um SMTP lento (Zoho) não
      // pode segurar a resposta da aprovação, senão o botão do Super Admin fica
      // "travado" e o operador acha que precisa clicar de novo.
      inviteSent = true;
      void this.sendInviteEmail(account, activationToken, input.resourceName).catch((error) => {
        this.log.warn('Destination partner invite email failed', { accountId: account.id, error });
      });
    }

    await this.auditRepository.save(
      this.auditRepository.create({
        accountId: account.id,
        action: isNew ? 'account_created_from_request' : 'permission_granted_from_request',
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: {
          requestId: input.request.id || null,
          inviteSent,
        },
      })
    );

    // Identidade unificada: registra o papel PARTNER no whitelabel (vinculado ao user).
    if (account.userId) {
      void userIdentityService.addRole(account.userId, 'PARTNER', { type: 'DESTINATION_PARTNER_ACCOUNT', id: account.id });
    }

    return {
      accountId: account.id,
      inviteSent,
      activationToken: env.nodeEnv !== 'production' ? activationToken : undefined,
    };
  }

  async resendInviteForApprovedRequest(input: {
    accountId: string;
    request?: PartnerRequestLike | null;
    resourceName?: string | null;
    reviewedBy?: string | null;
  }) {
    const account = await this.accountRepository.findOne({ where: { id: input.accountId } });
    if (!account) throw new AppError('DPARTNER-001', 404);

    if (account.status === 'active' && account.passwordHash) {
      return {
        accountId: account.id,
        inviteSent: false,
        alreadyActive: true,
        loginUrl: `${(env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '')}/parceiro`,
      };
    }

    account.status = 'invited';
    account.invitedAt = new Date();
    account.mustChangePassword = true;
    await this.accountRepository.save(account);

    const inviteResult = await this.createInvite(account, input.reviewedBy);
    let inviteSent = false;
    try {
      await this.sendInviteEmail(account, inviteResult.token, input.resourceName || input.request?.name || null);
      inviteSent = true;
    } catch (error) {
      this.log.warn('Destination partner invite resend email failed', { accountId: account.id, error });
    }

    await this.auditRepository.save(
      this.auditRepository.create({
        accountId: account.id,
        action: 'invite_resent_by_admin',
        resourceType: null,
        resourceId: null,
        metadata: {
          requestId: input.request?.id || null,
          inviteSent,
        },
      })
    );

    return {
      accountId: account.id,
      inviteSent,
      alreadyActive: false,
      activationToken: env.nodeEnv !== 'production' ? inviteResult.token : undefined,
      activationUrl: this.buildActivationUrl(inviteResult.token),
      expiresAt: inviteResult.invite.expiresAt.toISOString(),
    };
  }

  async activate(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    if (!tokenHash || !password || String(password).length < 6) {
      throw new AppError('DPARTNER-002', 400);
    }

    const invite = await this.inviteRepository.findOne({
      where: { tokenHash },
      relations: [ 'account' ],
    });

    if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now() || !invite.account) {
      throw new AppError('DPARTNER-003', 400);
    }

    invite.usedAt = new Date();
    invite.account.passwordHash = await bcrypt.hash(password, 10);
    invite.account.status = 'active';
    invite.account.mustChangePassword = false;
    invite.account.activatedAt = invite.account.activatedAt || new Date();
    invite.account.lastLoginAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(invite.account);
      await manager.save(invite);
    });

    const resources = await this.listResourcesForAccount(invite.account.id);
    return this.buildSession(invite.account, resources);
  }

  async login(email: string, password: string) {
    const account = await this.accountRepository.findOne({ where: { email: normalizeEmail(email) } });
    if (!account || account.status !== 'active') {
      throw new AppError('DPARTNER-004', 401);
    }

    // Conta vinculada (userId): autentica contra users (credencial de cliente).
    if (account.userId) {
      const user = await this.userRepository.findOne({ where: { id: account.userId } });
      if (!user || user.isActive === false || !user.password) {
        throw new AppError('DPARTNER-004', 401);
      }
      const matches = await bcrypt.compare(String(password || ''), user.password);
      if (!matches) throw new AppError('DPARTNER-004', 401);
      account.lastLoginAt = new Date();
      await this.accountRepository.save(account);
      const resources = await this.listResourcesForAccount(account.id);
      return this.buildSession(account, resources);
    }

    // Fluxo legado: senha própria da conta de parceiro.
    if (!account.passwordHash) {
      throw new AppError('DPARTNER-004', 401);
    }

    const matches = await bcrypt.compare(String(password || ''), account.passwordHash);
    if (!matches) throw new AppError('DPARTNER-004', 401);

    account.lastLoginAt = new Date();
    await this.accountRepository.save(account);
    const resources = await this.listResourcesForAccount(account.id);
    return this.buildSession(account, resources);
  }

  async me(accountId: string) {
    const account = await this.requireAccount(accountId);
    const resources = await this.listResourcesForAccount(account.id);
    return {
      partner: this.toPublicAccount(account),
      resources,
    };
  }

  async updateHospitalityPlace(accountId: string, placeId: string, payload: any, meta?: RequestMeta) {
    await this.requirePermission(accountId, RESOURCE_HOSPITALITY_PLACE, placeId);
    const place = await this.placeRepository.findOne({ where: { id: placeId }, relations: [ 'destination' ] });
    if (!place) throw new AppError('DPARTNER-006', 404);
    const before = this.toPublicPlace(place);
    const patch = await this.sanitizePlacePayload(payload, place);
    Object.assign(place, patch);
    const saved = await this.placeRepository.save(place);
    await this.audit(accountId, 'hospitality_place_updated', RESOURCE_HOSPITALITY_PLACE, placeId, before, this.toPublicPlace(saved), meta);
    return this.toPublicPlace(saved);
  }

  async updateListing(accountId: string, listingId: string, payload: any, meta?: RequestMeta) {
    await this.requirePermission(accountId, RESOURCE_DESTINATION_LISTING, listingId);
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: [ 'destination', 'hospitalityPlace' ],
    });
    if (!listing) throw new AppError('DPARTNER-006', 404);
    const before = this.toPublicListing(listing);
    const patch = await this.sanitizeListingPayload(payload, listing);
    Object.assign(listing, patch);
    const saved = await this.listingRepository.save(listing);
    await this.audit(accountId, 'destination_listing_updated', RESOURCE_DESTINATION_LISTING, listingId, before, this.toPublicListing(saved), meta);
    return this.toPublicListing(saved);
  }

  private async requireAccount(accountId: string) {
    const account = await this.accountRepository.findOne({ where: { id: accountId } });
    if (!account || account.status !== 'active') throw new AppError('DPARTNER-005', 401);
    return account;
  }

  private async requirePermission(accountId: string, resourceType: PartnerResourceType, resourceId: string) {
    const permission = await this.permissionRepository.findOne({
      where: {
        accountId,
        resourceType,
        resourceId,
        status: ACTIVE_PERMISSION,
      },
    });
    if (!permission) throw new AppError('DPARTNER-007', 403);
    return permission;
  }

  private async listResourcesForAccount(accountId: string) {
    const permissions = await this.permissionRepository.find({
      where: { accountId, status: ACTIVE_PERMISSION },
      order: { createdAt: 'ASC' },
    });

    const resources = [];
    for (const permission of permissions) {
      if (permission.resourceType === RESOURCE_HOSPITALITY_PLACE) {
        const place = await this.placeRepository.findOne({
          where: { id: permission.resourceId },
          relations: [ 'destination' ],
        });
        if (place) {
          resources.push({
            permissionId: permission.id,
            resourceType: RESOURCE_HOSPITALITY_PLACE,
            permission: permission.permission,
            item: this.toPublicPlace(place),
          });
        }
      }

      if (permission.resourceType === RESOURCE_DESTINATION_LISTING) {
        const listing = await this.listingRepository.findOne({
          where: { id: permission.resourceId },
          relations: [ 'destination', 'hospitalityPlace' ],
        });
        if (listing) {
          resources.push({
            permissionId: permission.id,
            resourceType: RESOURCE_DESTINATION_LISTING,
            permission: permission.permission,
            item: this.toPublicListing(listing),
          });
        }
      }
    }
    return resources;
  }

  private addressChangedFromPayload(payload: any, current: any) {
    const checks: Array<[string, unknown]> = [
      ['address', current?.address ?? null],
      ['addressNumber', current?.addressNumber ?? null],
      ['district', current?.district ?? null],
      ['city', current?.city ?? null],
      ['state', current?.state ?? null],
      ['zipCode', current?.zipCode ?? null],
    ];
    return checks.some(([key, currentValue]) => {
      if (!Object.prototype.hasOwnProperty.call(payload || {}, key)) return false;
      const nextValue = key === 'state'
        ? (String(payload[key] || '').trim().toUpperCase().slice(0, 2) || null)
        : key === 'zipCode'
          ? normalizeZipCode(payload[key])
          : toOptionalText(payload[key]);
      return nextValue !== (currentValue ?? null);
    });
  }

  private applyGeoQualityForPartnerPatch<T extends Partial<HospitalityPlace | DestinationListing>>(
    patch: T,
    payload: any,
    current: HospitalityPlace | DestinationListing
  ) {
    const hasLatInput = Object.prototype.hasOwnProperty.call(payload || {}, 'lat');
    const hasLngInput = Object.prototype.hasOwnProperty.call(payload || {}, 'lng');
    const addressChanged = this.addressChangedFromPayload(payload, current);
    const submittedLat = hasLatInput ? (patch as any).lat : (current as any).lat;
    const submittedLng = hasLngInput ? (patch as any).lng : (current as any).lng;
    const submittedExistingCoordinate = sameCoordinatePair(submittedLat, submittedLng, (current as any).lat, (current as any).lng);

    if (addressChanged && (!hasLatInput || !hasLngInput || submittedExistingCoordinate)) {
      // Endereço mudou mas o parceiro não reposicionou o pin: mantemos as
      // coordenadas anteriores (em vez de zerar) para a distância entre chalé e
      // serviço continuar disponível, apenas sinalizando que precisa revalidar.
      // Locais com o mesmo CEP continuam com coordenadas próprias (geocode usa
      // rua + número, não só CEP).
      (patch as any).lat = (current as any).lat;
      (patch as any).lng = (current as any).lng;
      (patch as any).geoSource = (current as any).geoSource || 'unknown';
      (patch as any).geoPrecision = 'unknown';
      (patch as any).geoVerified = false;
      (patch as any).geocodedAt = (current as any).geocodedAt || null;
      (patch as any).formattedAddress = null;
      return patch;
    }

    if ((hasLatInput || hasLngInput) && (patch as any).lat != null && (patch as any).lng != null) {
      (patch as any).geoSource = 'manual_pin';
      (patch as any).geoPrecision = 'exact';
      (patch as any).geoVerified = true;
      (patch as any).geocodedAt = new Date();
      (patch as any).formattedAddress = null;
    }

    if ((hasLatInput || hasLngInput) && ((patch as any).lat == null || (patch as any).lng == null)) {
      (patch as any).geoSource = 'unknown';
      (patch as any).geoPrecision = 'unknown';
      (patch as any).geoVerified = false;
      (patch as any).geocodedAt = null;
      (patch as any).formattedAddress = null;
    }

    return patch;
  }

  private async sanitizePlacePayload(payload: any, place: HospitalityPlace) {
    const patch: Partial<HospitalityPlace> = {};
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'name')) {
      const name = String(payload.name || '').trim();
      if (!name) throw new AppError('DPARTNER-008', 400);
      patch.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'description')) patch.description = toOptionalText(payload.description) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'address')) patch.address = toOptionalText(payload.address) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'addressNumber')) patch.addressNumber = toOptionalText(payload.addressNumber) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'district')) patch.district = toOptionalText(payload.district) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'city')) patch.city = toOptionalText(payload.city) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'state')) patch.state = (String(payload.state || '').trim().toUpperCase().slice(0, 2) || null) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'zipCode')) patch.zipCode = normalizeZipCode(payload.zipCode) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'lat')) patch.lat = toNullableNumber(payload.lat) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'lng')) patch.lng = toNullableNumber(payload.lng) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'phone')) patch.phone = toOptionalText(payload.phone) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'whatsapp')) patch.whatsapp = toOptionalText(payload.whatsapp) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'instagramUrl')) patch.instagramUrl = normalizeInstagramUrl(payload.instagramUrl) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'websiteUrl')) patch.websiteUrl = normalizeExternalUrl(payload.websiteUrl) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'deliveryInstructions')) patch.deliveryInstructions = toOptionalText(payload.deliveryInstructions) as any;
    if (Array.isArray(payload?.amenities)) {
      patch.amenities = payload.amenities.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, 24);
    }
    const hasBannerGalleryInput =
      Object.prototype.hasOwnProperty.call(payload || {}, 'bannerUrls') ||
      Object.prototype.hasOwnProperty.call(payload || {}, 'bannerFiles');
    if (hasBannerGalleryInput) {
      const uploadedBannerSlots = await this.savePartnerBannerImages(payload?.bannerFiles, place.id);
      const submittedBannerSlots = mergeHospitalityBannerSlots(payload?.bannerUrls, uploadedBannerSlots);
      patch.bannerUrls = normalizeHospitalityBannerUrls(submittedBannerSlots);
    }
    this.applyGeoQualityForPartnerPatch(patch, payload, place);
    const logoUrl = await saveBase64Image(payload?.logoFile, `partner-place-logo-${place.id}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `partner-place-banner-${place.id}`, 'destinations');
    if (logoUrl) patch.logoUrl = logoUrl;
    if (bannerUrl) patch.bannerUrl = bannerUrl;
    return patch;
  }


  private async savePartnerBannerImages(files: unknown, placeId: string) {
    const slots = normalizeHospitalityBannerSlots(files);
    const uploaded = normalizeHospitalityBannerSlots([]);
    for (let index = 0; index < Math.min(slots.length, MAX_HOSPITALITY_BANNER_IMAGES); index += 1) {
      const imageFile = slots[index];
      if (!imageFile) continue;
      const imageUrl = await saveBase64Image(imageFile, `partner-place-banner-${placeId}-${index + 1}`, 'destinations');
      if (imageUrl) uploaded[index] = imageUrl;
    }
    return uploaded;
  }

  private async sanitizeListingPayload(payload: any, listing: DestinationListing) {
    const patch: Partial<DestinationListing> = {};
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'title')) {
      const title = String(payload.title || '').trim();
      if (!title) throw new AppError('DPARTNER-009', 400);
      patch.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'description')) patch.description = toOptionalText(payload.description) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'address')) patch.address = toOptionalText(payload.address) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'addressNumber')) patch.addressNumber = toOptionalText(payload.addressNumber) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'district')) patch.district = toOptionalText(payload.district) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'city')) patch.city = toOptionalText(payload.city) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'state')) patch.state = (String(payload.state || '').trim().toUpperCase().slice(0, 2) || null) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'zipCode')) patch.zipCode = normalizeZipCode(payload.zipCode) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'lat')) patch.lat = toNullableNumber(payload.lat) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'lng')) patch.lng = toNullableNumber(payload.lng) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'phone')) patch.phone = toOptionalText(payload.phone) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'whatsapp')) patch.whatsapp = toOptionalText(payload.whatsapp) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'instagramUrl')) patch.instagramUrl = normalizeInstagramUrl(payload.instagramUrl) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'websiteUrl')) patch.websiteUrl = normalizeExternalUrl(payload.websiteUrl) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'ctaType')) patch.ctaType = toOptionalText(payload.ctaType) as any;
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'ctaUrl')) patch.ctaUrl = toOptionalText(payload.ctaUrl) as any;
    this.applyGeoQualityForPartnerPatch(patch, payload, listing);
    const imageUrl = await saveBase64Image(payload?.imageFile, `partner-listing-image-${listing.id}`, 'destinations');
    if (imageUrl) patch.imageUrl = imageUrl;
    return patch;
  }

  private async audit(
    accountId: string,
    action: string,
    resourceType: PartnerResourceType,
    resourceId: string,
    beforeJson: any,
    afterJson: any,
    meta?: RequestMeta
  ) {
    await this.auditRepository.save(
      this.auditRepository.create({
        accountId,
        action,
        resourceType,
        resourceId,
        beforeJson,
        afterJson,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
      })
    );
  }

  private toPublicAccount(account: DestinationPartnerAccount) {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone || null,
      status: account.status,
      mustChangePassword: Boolean(account.mustChangePassword),
    };
  }

  private toPublicDestination(destination: any) {
    if (!destination) return null;
    return {
      id: destination.id,
      name: destination.name,
      slug: destination.slug,
      city: destination.city || null,
      state: destination.state || null,
    };
  }

  private toPublicPlace(place: HospitalityPlace) {
    return {
      id: place.id,
      resourceType: RESOURCE_HOSPITALITY_PLACE,
      destinationId: place.destinationId,
      destination: this.toPublicDestination((place as any).destination),
      name: place.name,
      slug: place.slug,
      type: place.type || 'CHALE',
      description: place.description || null,
      address: place.address || null,
      addressNumber: place.addressNumber || null,
      district: place.district || null,
      city: place.city || null,
      state: place.state || null,
      zipCode: place.zipCode || null,
      lat: place.lat != null ? Number(place.lat) : null,
      lng: place.lng != null ? Number(place.lng) : null,
      geoSource: place.geoSource || 'unknown',
      geoPrecision: place.geoPrecision || 'unknown',
      geoVerified: place.geoVerified === true,
      geoApproximate: isApproximateGeoPrecision(place.geoPrecision),
      geocodedAt: place.geocodedAt || null,
      formattedAddress: place.formattedAddress || null,
      phone: place.phone || null,
      whatsapp: place.whatsapp || null,
      instagramUrl: place.instagramUrl || null,
      websiteUrl: place.websiteUrl || null,
      logoUrl: publicUrl(place.logoUrl),
      bannerUrl: publicUrl(place.bannerUrl),
      bannerUrls: Array.isArray(place.bannerUrls) ? place.bannerUrls : [],
      amenities: Array.isArray(place.amenities) ? place.amenities : [],
      deliveryInstructions: place.deliveryInstructions || null,
      active: place.active !== false,
    };
  }

  private toPublicListing(listing: DestinationListing) {
    return {
      id: listing.id,
      resourceType: RESOURCE_DESTINATION_LISTING,
      destinationId: listing.destinationId,
      destination: this.toPublicDestination((listing as any).destination),
      hospitalityPlaceId: listing.hospitalityPlaceId || null,
      hospitalityPlace: (listing as any).hospitalityPlace ? {
        id: (listing as any).hospitalityPlace.id,
        name: (listing as any).hospitalityPlace.name,
        slug: (listing as any).hospitalityPlace.slug,
      } : null,
      storeId: listing.storeId || null,
      category: listing.category || 'SERVICO',
      title: listing.title,
      description: listing.description || null,
      imageUrl: publicUrl(listing.imageUrl),
      address: listing.address || null,
      addressNumber: listing.addressNumber || null,
      district: listing.district || null,
      city: listing.city || null,
      state: listing.state || null,
      zipCode: listing.zipCode || null,
      lat: listing.lat != null ? Number(listing.lat) : null,
      lng: listing.lng != null ? Number(listing.lng) : null,
      geoSource: listing.geoSource || 'unknown',
      geoPrecision: listing.geoPrecision || 'unknown',
      geoVerified: listing.geoVerified === true,
      geoApproximate: isApproximateGeoPrecision(listing.geoPrecision),
      geocodedAt: listing.geocodedAt || null,
      formattedAddress: listing.formattedAddress || null,
      phone: listing.phone || null,
      whatsapp: listing.whatsapp || null,
      instagramUrl: listing.instagramUrl || null,
      websiteUrl: listing.websiteUrl || null,
      ctaType: listing.ctaType || null,
      ctaUrl: listing.ctaUrl || null,
      featured: listing.featured === true,
      active: listing.active !== false,
    };
  }
}
