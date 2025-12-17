import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { env } from '../config/env';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { PlanService } from './PlanService';
import { SubscriptionService } from './SubscriptionService';
import { AppDataSource } from '../config/database';
import { Store } from '../entities/Store';
import { User } from '../entities/User';

export class AuthService
{
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private planService = new PlanService();
  private subscriptionService = new SubscriptionService();

  async register(input: any)
  {
    /** ===============================
     * 1️⃣ TRANSACTION → USER + STORE
     * =============================== */
    const result = await AppDataSource.transaction(async (manager) =>
    {
      const userRepo = manager.getRepository(User);
      const storeRepo = manager.getRepository(Store);

      // 🔒 valida email
      const exists = await userRepo.findOne({ where: { email: input.email } });
      if (exists)
      {
        throw new Error('E-mail já cadastrado');
      }

      // 🔐 hash
      const hashed = await bcrypt.hash(input.password, 10);

      // 👤 USER
      const user = userRepo.create({
        fullName: input.fullName,
        email: input.email,
        password: hashed,
        phone: input.phone,
        address: input.address,
      });
      await userRepo.save(user);

      // 🏪 STORE
      const slug = slugify(input.storeName);

      const settings = manager.create(StoreSettings, {
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
      });

      const store = storeRepo.create({
        name: input.storeName,
        slug,
        owner: user,
        settings,
      });
      await storeRepo.save(store);

      return {
        userId: user.id,
        storeId: store.id,
        storeSlug: store.slug,
      };
    });

    /** ===============================
     * 2️⃣ FORA DA TRANSACTION → SUBSCRIPTION
     * =============================== */
    try
    {
      const plans = await this.planService.listEnabled();
      const defaultPlan =
        plans.find((p) => p.name === 'monthly') || plans[ 0 ];

      if (defaultPlan)
      {
        await this.subscriptionService.create({
          storeId: result.storeId,
          planId: defaultPlan.id,
        });
      }
    } catch (err)
    {
      // ⚠️ NÃO quebra cadastro
      console.error(
        '⚠️ Falha ao criar subscription. Cadastro preservado.',
        err
      );
    }

    /** ===============================
     * 3️⃣ TOKEN
     * =============================== */
    const token = jwt.sign(
      { sub: result.userId, storeId: result.storeId },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    return {
      user: { id: result.userId },
      store: {
        id: result.storeId,
        slug: result.storeSlug,
      },
      token,
      redirectUrl: `/chamanoespeto/${result.storeSlug}`,
    };
  }

  async login(email: string, password: string)
  {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Credenciais inválidas');

    const firstStore = user.stores?.[ 0 ];
    const token = this.generateToken(user.id, firstStore?.id);

    return { user, store: firstStore, token };
  }

  private generateToken(userId: string, storeId?: string)
  {
    return jwt.sign({ sub: userId, storeId }, env.jwtSecret, { expiresIn: '12h' });
  }

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
