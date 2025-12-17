import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { CreateUserDto } from '../dto/CreateUserDto';
import { env } from '../config/env';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { AppDataSource } from '../config/database';
import { PlanService } from './PlanService';
import { SubscriptionService } from './SubscriptionService';

export class AuthService {
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private planService = new PlanService();
  private subscriptionService = new SubscriptionService();

  async register(input: CreateUserDto) {
    const exists = await this.userRepository.findByEmail(input.email);
    if (exists) {
      throw new Error('E-mail já cadastrado');
    }

    const hashed = await bcrypt.hash(input.password, 10);
    const user = this.userRepository.create({
      fullName: input.fullName,
      email: input.email,
      password: hashed,
      phone: input.phone,
      address: input.address,
    });

    const slug = await this.generateUniqueSlug(input.storeName);

    const storeSettings = new StoreSettings();
    storeSettings.logoUrl = input.logoUrl;
    storeSettings.primaryColor = input.primaryColor;
    storeSettings.secondaryColor = input.secondaryColor;

    const store = this.storeRepository.create({
      name: input.storeName,
      slug,
      owner: user,
      settings: storeSettings,
    });

    storeSettings.store = store;

    await AppDataSource.manager.save(user);
    await this.storeRepository.save(store);

    const plans = await this.planService.listEnabled();
    const defaultPlan = plans.find((plan) => plan.name === 'monthly') || plans[0];
    if (defaultPlan) {
      await this.subscriptionService.create({ storeId: store.id, planId: defaultPlan.id });
    }

    const token = this.generateToken(user.id, store.id);
    return { user, store, token };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Credenciais inválidas');

    const firstStore = user.stores?.[0];
    const token = this.generateToken(user.id, firstStore?.id);

    return { user, store: firstStore, token };
  }

  private generateToken(userId: string, storeId?: string) {
    return jwt.sign({ sub: userId, storeId }, env.jwtSecret, { expiresIn: '12h' });
  }

  private async generateUniqueSlug(name: string) {
    const base = slugify(name);
    let candidate = base;
    let counter = 1;

    while (await this.storeRepository.findBySlug(candidate)) {
      candidate = `${base}-${counter++}`;
    }

    return candidate;
  }
}
