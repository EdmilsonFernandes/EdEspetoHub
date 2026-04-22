import QRCode from 'qrcode';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { FeaturedProductRequest } from '../entities/FeaturedProductRequest';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { AppError } from '../errors/AppError';
import { MercadoPagoService } from './MercadoPagoService';

const normalizeStatus = (value?: string) => String(value || '').trim().toUpperCase();
const DURATION_OPTIONS = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
} as const;

type DurationUnit = keyof typeof DURATION_OPTIONS;
type FeaturedPaymentMethod = 'PIX' | 'CREDIT_CARD';

type PricingConfig = {
  dayPrice: number;
  weekPrice: number;
  monthPrice: number;
  maxActiveSlots: number;
};

export class FeaturedProductService {
  private repo = AppDataSource.getRepository(FeaturedProductRequest);
  private mercadoPago = new MercadoPagoService();

  private async resolveStore(storeId: string) {
    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, relations: ['owner'] });
    if (!store) throw new AppError('STORE-001', 404);
    return store;
  }

  private async resolveProduct(storeId: string, productId: string) {
    const product = await AppDataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.id = :productId', { productId })
      .andWhere('store.id = :storeId', { storeId })
      .getOne();
    if (!product) throw new AppError('PROD-002', 400);
    return product;
  }

  private normalizeDurationUnit(input?: string): DurationUnit {
    const value = String(input || '').trim().toUpperCase();
    if (value === 'DAY' || value === 'WEEK' || value === 'MONTH') return value as DurationUnit;
    return 'DAY';
  }

  private normalizePaymentMethod(input?: string): FeaturedPaymentMethod {
    const value = String(input || '').trim().toUpperCase();
    if (value === 'CREDIT_CARD' || value === 'CARD' || value === 'CARTAO' || value === 'CARTÃO') {
      return 'CREDIT_CARD';
    }
    return 'PIX';
  }

  private async loadPricingConfig(): Promise<PricingConfig> {
    const rows = await AppDataSource.query(
      `
        SELECT key, value
        FROM site_settings
        WHERE key IN (
          'hub_sponsored_daily_price',
          'hub_sponsored_weekly_price',
          'hub_sponsored_monthly_price',
          'hub_sponsored_max_active_slots'
        )
      `
    );
    const map = new Map<string, string>();
    (rows || []).forEach((row: any) => map.set(String(row?.key || ''), String(row?.value || '')));
    const toMoney = (raw: string | undefined, fallback: number) => {
      const n = Number(raw || fallback);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Number(n.toFixed(2));
    };
    const toInt = (raw: string | undefined, fallback: number) => {
      const n = Number(raw || fallback);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(1, Math.min(500, Math.trunc(n)));
    };
    return {
      dayPrice: toMoney(map.get('hub_sponsored_daily_price'), 14.9),
      weekPrice: toMoney(map.get('hub_sponsored_weekly_price'), 79.9),
      monthPrice: toMoney(map.get('hub_sponsored_monthly_price'), 249.9),
      maxActiveSlots: toInt(map.get('hub_sponsored_max_active_slots'), 50),
    };
  }

  private priceByDuration(config: PricingConfig, durationUnit: DurationUnit) {
    if (durationUnit === 'WEEK') return config.weekPrice;
    if (durationUnit === 'MONTH') return config.monthPrice;
    return config.dayPrice;
  }

  private async activeSlotsCount(manager = AppDataSource.manager) {
    const raw = await manager.query(
      `
      SELECT COUNT(*)::int AS total
      FROM featured_product_requests
      WHERE status = 'APPROVED'
        AND payment_status = 'PAID'
        AND starts_at IS NOT NULL
        AND starts_at <= NOW()
        AND ends_at IS NOT NULL
        AND ends_at >= NOW()
    `
    );
    return Number(raw?.[0]?.total || 0);
  }

  private async reconcileExpiredAndQueue(config: PricingConfig, manager = AppDataSource.manager) {
    await manager.query(`
      UPDATE featured_product_requests
      SET status = 'EXPIRED'
      WHERE status = 'APPROVED'
        AND payment_status = 'PAID'
        AND (
          starts_at IS NULL
          OR ends_at IS NULL
          OR ends_at < NOW()
        )
    `);

    let active = await this.activeSlotsCount(manager);
    const free = Math.max(0, config.maxActiveSlots - active);
    if (free <= 0) return;

    const waiting = await manager.query(
      `
      SELECT id, duration_days
      FROM featured_product_requests
      WHERE status = 'PAID_WAITING_SLOT'
        AND payment_status = 'PAID'
      ORDER BY payment_paid_at ASC NULLS LAST, created_at ASC
      LIMIT $1
    `,
      [free]
    );

    for (const row of waiting || []) {
      const durationDays = Math.max(1, Number(row?.duration_days || 1));
      await manager.query(
        `
        UPDATE featured_product_requests
        SET status = 'APPROVED',
            starts_at = NOW(),
            ends_at = NOW() + ($2::text || ' days')::interval
        WHERE id = $1
      `,
        [row.id, String(durationDays)]
      );
      active += 1;
      if (active >= config.maxActiveSlots) break;
    }
  }

  async getStorePricingSummary() {
    const config = await this.loadPricingConfig();
    await this.reconcileExpiredAndQueue(config);
    const activeSlots = await this.activeSlotsCount();
    return {
      prices: {
        DAY: config.dayPrice,
        WEEK: config.weekPrice,
        MONTH: config.monthPrice,
      },
      maxActiveSlots: config.maxActiveSlots,
      activeSlots,
      availableSlots: Math.max(0, config.maxActiveSlots - activeSlots),
    };
  }

  async createStoreRequest(
    storeId: string,
    authStoreId: string | undefined,
    userId: string | undefined,
    payload: { productId?: string; durationUnit?: string; paymentMethod?: string; publicNote?: string }
  ) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const productId = String(payload?.productId || '').trim();
    if (!productId) throw new AppError('GEN-001', 400, { message: 'Produto é obrigatório para solicitar destaque.' });

    const durationUnit = this.normalizeDurationUnit(payload?.durationUnit);
    const paymentMethod = this.normalizePaymentMethod(payload?.paymentMethod);
    const durationDays = DURATION_OPTIONS[durationUnit];

    const store = await this.resolveStore(storeId);
    const product = await this.resolveProduct(storeId, productId);
    const user =
      userId
        ? await AppDataSource.getRepository(User).findOne({ where: { id: userId } })
        : null;
    const config = await this.loadPricingConfig();
    const amount = this.priceByDuration(config, durationUnit);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const row = this.repo.create({
      store,
      product,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      durationDays,
      durationUnit,
      requestedSlots: 1,
      priceAmount: amount,
      publicNote: String(payload?.publicNote || '').trim() || null,
      paymentMethod,
      requestedByUser: user || null,
      paymentExpiresAt: expiresAt,
    });
    const created = (await this.repo.save(row)) as FeaturedProductRequest;

    let provider = 'MOCK';
    let providerId: string | null = null;
    let paymentLink: string | null = null;
    let qrCodeBase64: string | null = null;
    let qrCodeText: string | null = null;
    let providerExpiresAt: Date | null = expiresAt;

    const mpEnabled = Boolean(env.mercadoPago.accessToken);
    const payerEmail = String(user?.email || store?.owner?.email || env.email.smtpUser || '').trim();
    const payerName = String(user?.fullName || store?.owner?.fullName || store?.name || 'Cliente').trim();

    if (mpEnabled && payerEmail) {
      try {
        const mp: any = await this.mercadoPago.createPayment({
          amount,
          method: paymentMethod,
          description: `Destaque Hub ${durationUnit} - ${store.name}`,
          externalReference: `featured_request:${created.id}`,
          payer: {
            email: payerEmail,
            name: payerName,
          },
        });
        provider = 'MERCADO_PAGO';
        providerId = String(mp?.providerId || '');
        paymentLink = mp?.paymentLink || null;
        qrCodeBase64 = mp?.qrCodeBase64
          ? (String(mp.qrCodeBase64).startsWith('data:image') ? mp.qrCodeBase64 : `data:image/png;base64,${mp.qrCodeBase64}`)
          : null;
        qrCodeText = mp?.qrCodeText || null;
        if (mp?.expiresAt) {
          const parsed = new Date(mp.expiresAt);
          providerExpiresAt = Number.isFinite(parsed.getTime()) ? parsed : providerExpiresAt;
        }
      } catch {
        // Fallback to mock QR payload below.
      }
    }

    if (paymentMethod === 'PIX' && !qrCodeText) {
      qrCodeText = `PIX DESTAQUE HUB | Store:${store.name} | Amount:${amount.toFixed(2)} | Request:${created.id}`;
    }
    if (paymentMethod === 'PIX' && !qrCodeBase64) {
      const pixPayload = String(qrCodeText || `PIX DESTAQUE HUB | Request:${created.id}`);
      qrCodeBase64 = await QRCode.toDataURL(pixPayload);
      qrCodeText = pixPayload;
    }
    if (paymentMethod === 'CREDIT_CARD' && !paymentLink) {
      paymentLink = `https://pay.janocaminho.com/checkout/featured/${created.id}`;
    }

    created.paymentProvider = provider;
    created.paymentProviderId = providerId;
    created.paymentLink = paymentLink;
    created.paymentQrCodeBase64 = qrCodeBase64;
    created.paymentQrCodeText = qrCodeText;
    created.paymentExpiresAt = providerExpiresAt;
    await this.repo.save(created);

    return created;
  }

  async listByStore(storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const config = await this.loadPricingConfig();
    await this.reconcileExpiredAndQueue(config);
    return this.repo.find({
      where: { store: { id: storeId } as any },
      relations: [ 'product', 'requestedByUser' ],
      order: { createdAt: 'DESC' },
      take: 120,
    });
  }

  async cancelByStore(storeId: string, requestId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const row = await this.repo.findOne({ where: { id: requestId }, relations: [ 'store' ] });
    if (!row || String((row as any)?.store?.id || '') !== storeId) throw new AppError('GEN-001', 404, { message: 'Solicitação não encontrada.' });
    const status = normalizeStatus(row.status);
    if (status === 'APPROVED' && row.endsAt && new Date(row.endsAt).getTime() > Date.now()) {
      throw new AppError('GEN-001', 400, { message: 'Solicitação ativa não pode ser cancelada pela loja.' });
    }
    row.status = 'CANCELLED';
    return this.repo.save(row);
  }

  async refreshPaymentStatusByStore(storeId: string, requestId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const current = await this.repo.findOne({
      where: { id: requestId },
      relations: [ 'store', 'product', 'requestedByUser' ],
    });
    if (!current || String((current as any)?.store?.id || '') !== storeId) {
      throw new AppError('GEN-001', 404, { message: 'Solicitação não encontrada.' });
    }

    const paymentStatus = normalizeStatus(current.paymentStatus);
    if (paymentStatus === 'PAID') return current;

    const provider = normalizeStatus(current.paymentProvider || undefined);
    const providerId = String(current.paymentProviderId || '').trim();
    if (provider !== 'MERCADO_PAGO' || !providerId || !env.mercadoPago.accessToken) {
      return current;
    }

    try {
      const mpPayment: any = await this.mercadoPago.getPayment(providerId);
      const mpStatus = String(mpPayment?.status || '').trim().toLowerCase();
      if (mpStatus === 'approved') {
        await this.markPaidFromWebhook(requestId, mpPayment);
      } else if ([ 'rejected', 'cancelled', 'charged_back', 'refunded', 'failed' ].includes(mpStatus)) {
        await this.markFailedFromWebhook(requestId, mpPayment);
      }
    } catch {
      // Keep current state and return latest row.
    }

    const latest = await this.repo.findOne({
      where: { id: requestId },
      relations: [ 'store', 'product', 'requestedByUser' ],
    });
    return latest || current;
  }

  async markPaidFromWebhook(requestId: string, mpPayment?: any) {
    const config = await this.loadPricingConfig();
    await AppDataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(FeaturedProductRequest)
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :id', { id: requestId })
        .getOne();
      if (!locked) throw new AppError('GEN-001', 404, { message: 'Solicitação de destaque não encontrada.' });
      if (locked.paymentStatus === 'PAID') return;

      locked.paymentStatus = 'PAID';
      locked.paymentPaidAt = new Date();
      locked.paymentProvider = 'MERCADO_PAGO';
      if (mpPayment?.id) locked.paymentProviderId = String(mpPayment.id);
      const mpQr = mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64;
      const mpQrText = mpPayment?.point_of_interaction?.transaction_data?.qr_code;
      const mpLink = mpPayment?.transaction_details?.external_resource_url;
      if (mpQr) {
        locked.paymentQrCodeBase64 = String(mpQr).startsWith('data:image') ? mpQr : `data:image/png;base64,${mpQr}`;
      }
      if (mpQrText) locked.paymentQrCodeText = mpQrText;
      if (mpLink) locked.paymentLink = mpLink;

      await this.reconcileExpiredAndQueue(config, manager);
      const active = await this.activeSlotsCount(manager);
      if (active < config.maxActiveSlots) {
        const durationDays = Math.max(1, Number(locked.durationDays || 1));
        locked.status = 'APPROVED';
        locked.startsAt = new Date();
        locked.endsAt = new Date(locked.startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      } else {
        locked.status = 'PAID_WAITING_SLOT';
        locked.startsAt = null;
        locked.endsAt = null;
      }
      await manager.save(locked);
    });
  }

  async markFailedFromWebhook(requestId: string, mpPayment?: any) {
    const row = await this.repo.findOne({ where: { id: requestId } });
    if (!row) return;
    if (String(row.paymentStatus || '').toUpperCase() === 'PAID') return;
    row.paymentStatus = 'FAILED';
    row.status = 'PAYMENT_FAILED';
    row.paymentProvider = 'MERCADO_PAGO';
    if (mpPayment?.id) row.paymentProviderId = String(mpPayment.id);
    await this.repo.save(row);
  }

  async listForAdmin(filters: { status?: string; storeId?: string; limit?: number }) {
    const qb = this.repo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('request.product', 'product')
      .leftJoinAndSelect('request.requestedByUser', 'requestedByUser')
      .orderBy('request.createdAt', 'DESC');
    const status = normalizeStatus(filters?.status);
    if (status && status !== 'ALL') qb.andWhere('UPPER(request.status) = :status', { status });
    const storeId = String(filters?.storeId || '').trim();
    if (storeId) qb.andWhere('store.id = :storeId', { storeId });
    const limit = Math.max(1, Math.min(300, Number(filters?.limit || 100)));
    qb.take(limit);
    return qb.getMany();
  }

  async reviewByAdmin(
    requestId: string,
    adminId: string | undefined,
    payload: {
      status?: 'APPROVED' | 'REJECTED';
      durationDays?: number;
      startsAt?: string;
      priceAmount?: number;
      paymentStatus?: 'PENDING' | 'PAID';
      adminNote?: string;
    }
  ) {
    const row = await this.repo.findOne({ where: { id: requestId }, relations: [ 'store', 'product' ] });
    if (!row) throw new AppError('GEN-001', 404, { message: 'Solicitação não encontrada.' });
    const status = normalizeStatus(payload?.status);
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('GEN-001', 400, { message: 'Status inválido para revisão.' });
    }
    row.status = status;
    row.adminNote = String(payload?.adminNote || '').trim() || null;
    row.approvedByAdminId = adminId || null;
    if (status === 'APPROVED') {
      const startsAt = payload?.startsAt ? new Date(payload.startsAt) : new Date();
      const durationDays = Math.max(1, Math.min(180, Number(payload?.durationDays || row.durationDays || 7)));
      const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      row.durationDays = durationDays;
      row.startsAt = startsAt;
      row.endsAt = endsAt;
      row.paymentStatus = normalizeStatus(payload?.paymentStatus) === 'PAID' ? 'PAID' : 'PENDING';
      if (payload?.priceAmount != null && Number.isFinite(Number(payload.priceAmount))) {
        row.priceAmount = Number(payload.priceAmount);
      }
    }
    return this.repo.save(row);
  }

  async listActivePublic(limit = 18) {
    const config = await this.loadPricingConfig();
    await this.reconcileExpiredAndQueue(config);
    const rows = await this.repo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('request.product', 'product')
      .where('UPPER(request.status) = :status', { status: 'APPROVED' })
      .andWhere('UPPER(request.paymentStatus) = :paymentStatus', { paymentStatus: 'PAID' })
      .andWhere('request.startsAt IS NOT NULL')
      .andWhere('request.startsAt <= NOW()')
      .andWhere('request.endsAt IS NOT NULL')
      .andWhere('request.endsAt >= NOW()')
      .orderBy('request.startsAt', 'DESC')
      .take(Math.max(1, Math.min(60, Number(limit || 18))))
      .getMany();

    return rows.map((request: any) => {
      const product = request?.product || {};
      const store = request?.store || {};
      const settings = store?.settings || {};
      const unitPrice = Number(
        product?.promoActive && product?.promoPrice != null
          ? product?.promoPrice
          : product?.price || 0
      );
      return {
        id: request.id,
        productId: product?.id,
        productName: product?.name || 'Produto',
        imageUrl: product?.imageUrl || null,
        price: unitPrice,
        storeId: store?.id,
        storeName: store?.name || 'Loja',
        storeSlug: store?.slug || '',
        storeLogoUrl: settings?.logoUrl || null,
        startsAt: request?.startsAt || null,
        endsAt: request?.endsAt || null,
        badge: 'Patrocinado',
      };
    });
  }
}
