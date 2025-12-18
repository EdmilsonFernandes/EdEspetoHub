import bcrypt from 'bcryptjs';
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
import { PaymentMethod } from '../entities/Payment';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';

export class AuthService
{
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private paymentService = new PaymentService();

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
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
    };

    const paymentMethod = ((input.paymentMethod as PaymentMethod) || 'PIX').toUpperCase();
    if (paymentMethod !== 'PIX' && paymentMethod !== 'CREDIT_CARD')
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

      const settings = manager.create(StoreSettings, {
        logoUrl: storePayload.logoUrl,
        primaryColor: storePayload.primaryColor,
        secondaryColor: storePayload.secondaryColor,
      });

      const store = storeRepo.create({
        name: storePayload.name,
        slug,
        owner: user,
        settings,
        open: false,
      });
      await storeRepo.save(store);

      const plan = await planRepo.findOne({ where: { id: input.planId } });
      if (!plan || !plan.enabled)
      {
        throw new Error('Plano inválido ou indisponível');
      }

      const now = new Date();
      const endDate = this.addDays(now, plan.durationDays);

      const subscription = subscriptionRepo.create({
        store,
        plan,
        startDate: now,
        endDate,
        status: 'PENDING',
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
      storeStatus: 'PENDING_PAYMENT',
      subscriptionStatus: result.subscription.status,
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

    return { user, store: firstStore, token };
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
