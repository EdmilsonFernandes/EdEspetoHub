import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError';
import { StoreRepository } from '../repositories/StoreRepository';
import { StoreUserRepository } from '../repositories/StoreUserRepository';
import { UserRepository } from '../repositories/UserRepository';

export class StoreUserService {
  private storeRepository = new StoreRepository();
  private storeUserRepository = new StoreUserRepository();
  private userRepository = new UserRepository();

    /**
   * Executes ensure store access business logic.
   *
   * @author Edmilson Lopes
   */
private ensureStoreAccess(storeId: string, authStoreId?: string) {
    if (!authStoreId || authStoreId !== storeId) {
      throw new AppError('AUTH-003', 403);
    }
  }

    /**
   * Lists records for list by store.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Creates resources for create for store.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Updates resources for update password for store user.
   *
   * @author Edmilson Lopes
   */
async updatePasswordForStoreUser(
    storeId: string,
    userId: string,
    input: { newPassword?: string },
    authStoreId?: string
  ) {
    this.ensureStoreAccess(storeId, authStoreId);
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const targetUserId = String(userId || '').trim();
    if (!targetUserId) throw new AppError('GEN-002', 400);

    const membership = await this.storeUserRepository.findByStoreAndUser(storeId, targetUserId);
    if (!membership || !membership.isActive) {
      throw new AppError('AUTH-003', 403);
    }

    const newPassword = String(input?.newPassword || '').trim();
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('AUTH-008', 400);
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) throw new AppError('AUTH-004', 404);

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user as any);

    return { id: targetUserId, updated: true };
  }

    /**
   * Removes resources for remove for store.
   *
   * @author Edmilson Lopes
   */
async removeForStore(storeId: string, userId: string, authStoreId?: string, authUserId?: string) {
    this.ensureStoreAccess(storeId, authStoreId);
    const store = await this.storeRepository.findByIdWithOwner(storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const targetUserId = String(userId || '').trim();
    if (!targetUserId) throw new AppError('GEN-002', 400);

    if (String(store.owner?.id || '') === targetUserId) {
      throw new AppError('AUTH-003', 403);
    }
    if (String(authUserId || '') === targetUserId) {
      throw new AppError('AUTH-003', 403);
    }

    const membership = await this.storeUserRepository.findByStoreAndUser(storeId, targetUserId);
    if (!membership) {
      return { id: targetUserId, removed: true };
    }

    await this.storeUserRepository.remove(membership as any);
    return { id: targetUserId, removed: true };
  }
}
