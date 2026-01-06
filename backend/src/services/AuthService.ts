import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { env } from '../config/env';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { AppDataSource } from '../config/database';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { PaymentService } from './PaymentService';
import { EmailService } from './EmailService';
import { PaymentMethod } from '../entities/Payment';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';
import { saveBase64Image } from '../utils/imageStorage';
import { sanitizeSocialLinks } from '../utils/socialLinks';
import { PasswordReset } from '../entities/PasswordReset';

export class AuthService
{
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private paymentService = new PaymentService();
  private emailService = new EmailService();

  async register(input: any)
  {
    console.log('🔥 REGISTER ENTRY:', JSON.stringify(input, null, 2));
    const userPayload = input.user ?? {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone,
      address: input.address,
    };

    const normalizedEmail = userPayload.email
      .trim()
      .toLowerCase();

    const storePayload = input.store ?? {
      name: input.storeName,
      logoUrl: input.logoUrl,
      logoFile: input.logoFile,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      socialLinks: input.socialLinks,
    };

    const paymentMethod = ((input.paymentMethod as PaymentMethod) || 'PIX').toUpperCase();
    if (paymentMethod !== 'PIX' && paymentMethod !== 'CREDIT_CARD' && paymentMethod !== 'BOLETO')
    {
      throw new Error('Método de pagamento inválido');
    }

    if (!input.planId)
    {
      throw new Error('Selecione um plano para continuar');
    }

    const result = await AppDataSource.transaction(async (manager) =>
    {
      console.log('🔥 BEFORE TRANSACTION', {
        planId: input.planId,
        paymentMethod: input.paymentMethod,
      });

      const userRepo = manager.getRepository(User);
      const storeRepo = manager.getRepository(Store);
      const planRepo = manager.getRepository(Plan);
      const subscriptionRepo = manager.getRepository(Subscription);

      console.log('🚨 REGISTER CALLED:', normalizedEmail, new Date().toISOString());

      const exists = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (exists)
      {
        throw new Error('E-mail já cadastrado');
      }

      const hashed = await bcrypt.hash(userPayload.password, 10);

      const user = userRepo.create({
        fullName: userPayload.fullName,
        email: normalizedEmail,
        password: hashed,
        phone: userPayload.phone,
        address: userPayload.address,
      });
      await userRepo.save(user);

      const baseSlug = slugify(storePayload.name);
      let slug = baseSlug;
      let counter = 1;
      while (await storeRepo.findOne({ where: { slug } }))
      {
        slug = `${baseSlug}-${counter++}`;
      }

      const logoUrl = await saveBase64Image(storePayload.logoFile, `store-${user.id}`);

      const settings = manager.create(StoreSettings, {
        logoUrl: logoUrl || storePayload.logoUrl,
        primaryColor: storePayload.primaryColor,
        secondaryColor: storePayload.secondaryColor,
        socialLinks: sanitizeSocialLinks(storePayload.socialLinks),
        openingHours: storePayload.openingHours ?? [],
      });

      const store = storeRepo.create({
        name: storePayload.name,
        slug,
        owner: user,
        settings,
        open: true,
      });
      await storeRepo.save(store);

      const plan = await planRepo.findOne({ where: { id: input.planId } });
      if (!plan || !plan.enabled)
      {
        throw new Error('Plano inválido ou indisponível');
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const subscription = subscriptionRepo.create({
        store,
        plan,
        startDate: now,
        endDate: trialEnd,
        status: 'ACTIVE',
        autoRenew: false,
      });
      await subscriptionRepo.save(subscription);

      const payment = await this.paymentService.createPayment(manager, {
        user,
        store,
        subscription,
        plan,
        method: paymentMethod as PaymentMethod,
      });

      return { user, store, subscription, payment };
    });

    this.sendPaymentEmail(result.user.email, result.payment);

    const token = jwt.sign(
      { sub: result.user.id, storeId: result.store.id },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    return {
      success: true,
      user: { id: result.user.id },
      store: {
        id: result.store.id,
        slug: result.store.slug,
      },
      storeStatus: 'ACTIVE',
      subscriptionStatus: result.subscription.status,
      trialExpiresAt: result.subscription.endDate,
      payment: {
        id: result.payment.id,
        method: result.payment.method,
        status: result.payment.status,
        amount: Number(result.payment.amount),
        qrCodeBase64: result.payment.qrCodeBase64,
        paymentLink: result.payment.paymentLink,
        expiresAt: result.payment.expiresAt,
      },
      token,
      redirectUrl: `/payment/${result.payment.id}`,
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

    const sanitizedUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };

    const sanitizedStore = firstStore
      ? {
        id: firstStore.id,
        name: firstStore.name,
        slug: firstStore.slug,
        open: firstStore.open,
        createdAt: firstStore.createdAt,
        settings: firstStore.settings,
      }
      : undefined;

    if (sanitizedStore && !sanitizedStore.open) {
      throw new Error('Pagamento pendente. Sua loja ainda não está ativa.');
    }

    return { user: sanitizedUser, store: sanitizedStore, token };
  }

  async adminLogin(slug: string, password: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new Error('Loja não encontrada');

    const owner = store.owner;
    const valid = await bcrypt.compare(password, owner.password);
    if (!valid) throw new Error('Credenciais inválidas');
    if (!store.open) throw new Error('Pagamento pendente. Sua loja ainda não está ativa.');

    const token = jwt.sign(
      { sub: owner.id, storeId: store.id, role: 'ADMIN' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    const sanitizedOwner = {
      id: owner.id,
      fullName: owner.fullName,
      email: owner.email,
      phone: owner.phone,
      address: owner.address,
      role: 'ADMIN',
    };

    const sanitizedStore = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      open: store.open,
      createdAt: store.createdAt,
      settings: store.settings,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        phone: owner.phone,
      },
    };

    return {
      token,
      user: sanitizedOwner,
      store: sanitizedStore,
    };
  }

  async requestPasswordReset(email: string)
  {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('E-mail obrigatório');

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { message: 'Se o e-mail existir, enviaremos instruções.' };
    }

    const resetRepo = AppDataSource.getRepository(PasswordReset);
    await resetRepo
      .createQueryBuilder()
      .update()
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
      .execute();

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await resetRepo.save(
      resetRepo.create({
        user,
        tokenHash,
        expiresAt,
      })
    );

    const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.emailService.sendPasswordReset(user.email, link);
    return { message: 'Se o e-mail existir, enviaremos instruções.' };
  }

  async resetPassword(token: string, newPassword: string)
  {
    if (!token) throw new Error('Token inválido');
    if (!newPassword || newPassword.length < 6) throw new Error('Senha muito curta');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRepo = AppDataSource.getRepository(PasswordReset);
    const reset = await resetRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!reset || reset.usedAt) throw new Error('Token inválido ou expirado');
    if (reset.expiresAt.getTime() < Date.now()) throw new Error('Token expirado');

    reset.user.password = await bcrypt.hash(newPassword, 10);
    reset.usedAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(reset.user);
      await manager.save(reset);
    });

    return { message: 'Senha atualizada com sucesso' };
  }


  private generateToken(userId: string, storeId?: string)
  {
    return jwt.sign({ sub: userId, storeId }, env.jwtSecret, { expiresIn: '12h' });
  }

  private addDays(date: Date, days: number)
  {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private sendPaymentEmail(email: string, payment: any)
  {
    console.log(
      '📧 Mock payment e-mail',
      JSON.stringify(
        {
          email,
          paymentId: payment.id,
          status: payment.status,
          qrCodeBase64: payment.qrCodeBase64,
        },
        null,
        2
      )
    );
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
