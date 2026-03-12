import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError';
import { StoreRepository } from '../repositories/StoreRepository';
import { StoreUserRepository } from '../repositories/StoreUserRepository';
import { UserRepository } from '../repositories/UserRepository';

export class StoreUserService {
  private storeRepository = new StoreRepository();
  private storeUserRepository = new StoreUserRepository();
  private userRepository = new UserRepository();

  private ensureStoreAccess(storeId: string, authStoreId?: string) {
    if (!authStoreId || authStoreId !== storeId) {
      throw new AppError('AUTH-003', 403);
    }
  }

  async listByStore(storeId: string, authStoreId?: string) {
    this.ensureStoreAccess(storeId, authStoreId);
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const links = await this.storeUserRepository.listByStoreId(storeId);
    return links.map((entry) => ({
      id: entry.user.id,
      fullName: entry.user.fullName,
      email: entry.user.email,
      phone: entry.user.phone || '',
      role: String(entry.role || 'OPERATOR').toUpperCase(),
      isActive: Boolean(entry.isActive),
      createdAt: entry.createdAt,
    }));
  }

  async createForStore(
    storeId: string,
    input: { fullName?: string; email?: string; password?: string; phone?: string; role?: string },
    authStoreId?: string
  ) {
    this.ensureStoreAccess(storeId, authStoreId);
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const fullName = String(input?.fullName || '').trim();
    const email = String(input?.email || '').trim().toLowerCase();
    const password = String(input?.password || '').trim();
    const phone = String(input?.phone || '').trim();
    const role = String(input?.role || 'OPERATOR').trim().toUpperCase();

    if (!fullName || !email || !password) {
      throw new AppError('GEN-002', 400);
    }
    if (![ 'ADMIN', 'OPERATOR' ].includes(role)) {
      throw new AppError('GEN-002', 400);
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('AUTH-011', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      fullName,
      email,
      password: hashedPassword,
      phone: phone || null,
      userRole: role,
      emailVerified: true,
    } as any);
    const savedUser = await this.userRepository.save(user as any);

    const membership = this.storeUserRepository.create({
      store,
      user: savedUser,
      role,
      isActive: true,
    } as any);
    await this.storeUserRepository.save(membership as any);

    return {
      id: savedUser.id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      phone: savedUser.phone || '',
      role,
      isActive: true,
      createdAt: membership.createdAt,
    };
  }
}
