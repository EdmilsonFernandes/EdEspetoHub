import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { FeaturedProductRequest } from '../entities/FeaturedProductRequest';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';

const normalizeStatus = (value?: string) => String(value || '').trim().toUpperCase();

export class FeaturedProductService {
  private repo = AppDataSource.getRepository(FeaturedProductRequest);

  private async resolveStore(storeId: string) {
    const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId } });
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

  async createStoreRequest(
    storeId: string,
    authStoreId: string | undefined,
    userId: string | undefined,
    payload: { productId?: string; durationDays?: number; requestedSlots?: number; publicNote?: string }
  ) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    const productId = String(payload?.productId || '').trim();
    if (!productId) throw new AppError('GEN-001', 400, { message: 'Produto é obrigatório para solicitar destaque.' });

    const durationDays = Math.max(1, Math.min(180, Number(payload?.durationDays || 7)));
    const requestedSlots = Math.max(1, Math.min(10, Number(payload?.requestedSlots || 1)));

    const store = await this.resolveStore(storeId);
    const product = await this.resolveProduct(storeId, productId);

    const row = this.repo.create({
      store,
      product,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      durationDays,
      requestedSlots,
      publicNote: String(payload?.publicNote || '').trim() || null,
      requestedByUser: userId ? ({ id: userId } as any) : null,
    } as any);
    return this.repo.save(row);
  }

  async listByStore(storeId: string, authStoreId: string | undefined) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);
    return this.repo.find({
      where: { store: { id: storeId } as any },
      relations: [ 'product', 'requestedByUser' ],
      order: { createdAt: 'DESC' },
      take: 100,
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
    await AppDataSource.query(`
      UPDATE featured_product_requests
      SET status = 'EXPIRED'
      WHERE status = 'APPROVED'
        AND ends_at IS NOT NULL
        AND ends_at < NOW()
    `);
    const rows = await this.repo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('request.product', 'product')
      .where('UPPER(request.status) = :status', { status: 'APPROVED' })
      .andWhere('(request.endsAt IS NULL OR request.endsAt >= NOW())')
      .orderBy('request.createdAt', 'DESC')
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
