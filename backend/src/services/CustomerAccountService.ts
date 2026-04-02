import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { CustomerAddress } from '../entities/CustomerAddress';
import { User } from '../entities/User';
import { Order } from '../entities/Order';

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
  isDefault?: boolean;
};

export class CustomerAccountService {
  private normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
  }

  private sanitizePhone(value?: string | null) {
    return String(value || '').replace(/\D/g, '');
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || null,
      role: 'CUSTOMER',
      createdAt: user.createdAt,
    };
  }

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
      isDefault: Boolean(entity.isDefault),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async register(input: { fullName: string; email: string; password: string; phone?: string | null }) {
    const fullName = String(input?.fullName || '').trim();
    const email = this.normalizeEmail(input?.email || '');
    const password = String(input?.password || '');
    const phone = this.sanitizePhone(input?.phone || null) || undefined;

    if (!fullName || !email || !password) {
      throw new AppError('GEN-002', 400, { message: 'Nome, e-mail e senha são obrigatórios.' });
    }
    if (password.length < 6) {
      throw new AppError('GEN-002', 400, { message: 'A senha precisa ter ao menos 6 caracteres.' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) throw new AppError('AUTH-011', 409);

    const user = userRepo.create({
      fullName,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
      emailVerified: true,
      userRole: 'CUSTOMER',
    } as Partial<User>);
    const saved = await userRepo.save(user);

    const token = jwt.sign(
      { sub: saved.id, role: 'CUSTOMER' as const },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: this.sanitizeUser(saved),
      token,
    };
  }

  async login(input: { email: string; password: string }) {
    const email = this.normalizeEmail(input?.email || '');
    const password = String(input?.password || '');
    if (!email || !password) throw new AppError('AUTH-004', 401);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new AppError('AUTH-004', 401);

    const valid = await bcrypt.compare(password, String(user.password || ''));
    if (!valid) throw new AppError('AUTH-004', 401);

    const token = jwt.sign(
      { sub: user.id, role: 'CUSTOMER' as const },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async me(userId: string) {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);
    return this.sanitizeUser(user);
  }

  async updateMe(userId: string, input: { fullName?: string; phone?: string | null }) {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) throw new AppError('AUTH-004', 401);

    const fullName = String(input?.fullName || '').trim();
    if (fullName) user.fullName = fullName;
    if (input?.phone !== undefined) user.phone = this.sanitizePhone(input.phone) || undefined;

    const saved = await repo.save(user);
    return this.sanitizeUser(saved);
  }

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

  async listAddresses(userId: string) {
    const rows = await AppDataSource.getRepository(CustomerAddress).find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((row) => this.mapAddress(row));
  }

  async createAddress(userId: string, input: AddressInput) {
    const cep = String(input?.cep || '').replace(/\D/g, '').slice(0, 8);
    const state = String(input?.state || '').trim().toUpperCase().slice(0, 2);
    const street = String(input?.street || '').trim();
    const city = String(input?.city || '').trim();
    if (!cep || cep.length !== 8 || !street || !city || !state) {
      throw new AppError('GEN-002', 400, { message: 'Preencha CEP, rua, cidade e estado corretamente.' });
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
        label: input?.label ? String(input.label).trim() : null,
        recipientName: input?.recipientName ? String(input.recipientName).trim() : null,
        phone: this.sanitizePhone(input?.phone || null) || null,
        cep,
        street,
        number: input?.number ? String(input.number).trim() : null,
        complement: input?.complement ? String(input.complement).trim() : null,
        neighborhood: input?.neighborhood ? String(input.neighborhood).trim() : null,
        city,
        state,
        isDefault: shouldBeDefault,
      });
      const saved = await repo.save(entity);
      return this.mapAddress(saved);
    });
  }

  async updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CustomerAddress);
      const address = await repo.findOne({ where: { id: addressId, userId } });
      if (!address) throw new AppError('GEN-001', 404, { message: 'Endereço não encontrado.' });

      if (input?.label !== undefined) address.label = input.label ? String(input.label).trim() : null;
      if (input?.recipientName !== undefined) {
        address.recipientName = input.recipientName ? String(input.recipientName).trim() : null;
      }
      if (input?.phone !== undefined) address.phone = this.sanitizePhone(input.phone) || null;
      if (input?.cep !== undefined) {
        const cep = String(input.cep || '').replace(/\D/g, '').slice(0, 8);
        if (cep.length !== 8) throw new AppError('GEN-002', 400, { message: 'CEP inválido.' });
        address.cep = cep;
      }
      if (input?.street !== undefined) address.street = String(input.street || '').trim();
      if (input?.number !== undefined) address.number = input.number ? String(input.number).trim() : null;
      if (input?.complement !== undefined) {
        address.complement = input.complement ? String(input.complement).trim() : null;
      }
      if (input?.neighborhood !== undefined) {
        address.neighborhood = input.neighborhood ? String(input.neighborhood).trim() : null;
      }
      if (input?.city !== undefined) address.city = String(input.city || '').trim();
      if (input?.state !== undefined) address.state = String(input.state || '').trim().toUpperCase().slice(0, 2);

      if (input?.isDefault === true && !address.isDefault) {
        await repo.createQueryBuilder().update(CustomerAddress).set({ isDefault: false }).where('user_id = :userId', { userId }).execute();
        address.isDefault = true;
      }

      const saved = await repo.save(address);
      return this.mapAddress(saved);
    });
  }

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

  async listOrders(userId: string) {
    const rows = await AppDataSource.getRepository(Order).find({
      where: { customerUserId: userId },
      relations: [ 'store', 'items', 'items.product', 'shipment' ],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return rows.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: order.status,
      type: order.type,
      fulfillmentMode: order.fulfillmentMode,
      paymentMethod: order.paymentMethod || null,
      paymentStatus: order.paymentStatus || null,
      total: Number(order.total || 0),
      deliveryFee: order.deliveryFee != null ? Number(order.deliveryFee) : null,
      customerName: order.customerName,
      phone: order.phone || null,
      address: order.address || null,
      table: order.table || null,
      store: order.store
        ? {
            id: order.store.id,
            name: order.store.name,
            slug: order.store.slug,
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
      })),
    }));
  }
}
