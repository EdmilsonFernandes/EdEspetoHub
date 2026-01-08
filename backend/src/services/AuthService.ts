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
import { EmailVerification } from '../entities/EmailVerification';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { SubscriptionService } from './SubscriptionService';
import { SettingsService } from './SettingsService';

export class AuthService
{
  private userRepository = new UserRepository();
  private storeRepository = new StoreRepository();
  private paymentService = new PaymentService();
  private emailService = new EmailService();
  private paymentRepository = new PaymentRepository();
  private subscriptionService = new SubscriptionService();
  private settingsService = new SettingsService();

  async register(input: any)
  {
    console.log('🔥 REGISTER ENTRY:', JSON.stringify(input, null, 2));
    const userPayload = input.user ?? {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone,
      address: input.address,
      document: input.document,
      documentType: input.documentType,
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

    if (!input.termsAccepted || !input.lgpdAccepted)
    {
      throw new Error('Aceite os termos de uso e a politica de privacidade para continuar');
    }

    if (!userPayload.document || !userPayload.documentType)
    {
      throw new Error('Informe CPF ou CNPJ para continuar');
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
        document: userPayload.document,
        documentType: userPayload.documentType,
        termsAcceptedAt: new Date(),
        lgpdAcceptedAt: new Date(),
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
        open: false,
      });
      await storeRepo.save(store);

      const plan = await planRepo.findOne({ where: { id: input.planId } });
      if (!plan || !plan.enabled)
      {
        throw new Error('Plano inválido ou indisponível');
      }

      const now = new Date();
      const trialDays = await this.settingsService.getNumber('trial_days', env.trialDays);
      const trialEnd = this.addDays(now, trialDays);
      const subscription = subscriptionRepo.create({
        store,
        plan,
        startDate: now,
        endDate: trialEnd,
        status: 'TRIAL',
        autoRenew: false,
        paymentMethod,
      });
      await subscriptionRepo.save(subscription);

      return { user, store, subscription };
    });

    await this.sendVerificationEmail(result.user);

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
      storeStatus: result.store.open ? 'ACTIVE' : 'PENDING_PAYMENT',
      subscriptionStatus: result.subscription.status,
      trialExpiresAt: result.subscription.endDate,
      payment: null,
      token,
      redirectUrl: `/verify-email`,
    };
  }

  async login(email: string, password: string)
  {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Credenciais inválidas');
    if (!user.emailVerified) throw new Error('E-mail não verificado');

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
    if (!owner.emailVerified) throw new Error('E-mail não verificado');
    const currentSubscription = await this.subscriptionService.getCurrentByStore(store.id);
    if (!store.open && currentSubscription?.status !== 'EXPIRED') {
      throw new Error('Pagamento pendente. Sua loja ainda não está ativa.');
    }

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
      subscription: currentSubscription
        ? {
            id: currentSubscription.id,
            status: currentSubscription.status,
            plan: currentSubscription.plan,
            endDate: currentSubscription.endDate,
          }
        : null,
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

  async resendVerificationEmail(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('E-mail obrigatório');

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { message: 'Se o e-mail existir, enviaremos instruções.' };
    }
    if (user.emailVerified) {
      return { message: 'E-mail já verificado.' };
    }

    await this.sendVerificationEmail(user);
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

  async verifyEmail(token: string) {
    if (!token) throw new Error('Token inválido');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const verificationRepo = AppDataSource.getRepository(EmailVerification);
    let verification = await verificationRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    let verifiedUser = verification?.user;

    if (!verification) {
      try {
        const decoded: any = jwt.verify(token, env.jwtSecret);
        if (!decoded?.sub) throw new Error('Token inválido');
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: decoded.sub } });
        if (!user) throw new Error('Token inválido ou expirado');
        verifiedUser = user;
      } catch {
        throw new Error('Token inválido ou expirado');
      }
    }

    if (verification?.usedAt) throw new Error('Token inválido ou expirado');
    if (verification?.expiresAt && verification.expiresAt.getTime() < Date.now()) throw new Error('Token expirado');

    if (!verifiedUser) throw new Error('Token inválido ou expirado');
    verifiedUser.emailVerified = true;
    if (verification) verification.usedAt = new Date();

    await AppDataSource.transaction(async (manager) => {
      await manager.save(verifiedUser);
      if (verification) {
        await manager.save(verification);
      }
    });

    const store = await this.storeRepository.findByOwnerId(verifiedUser.id);
    if (!store) {
      return { message: 'E-mail verificado', redirectUrl: '/' };
    }

    const subscription = await AppDataSource.getRepository(Subscription).findOne({
      where: { store: { id: store.id } },
      relations: ['plan', 'store'],
      order: { createdAt: 'DESC' } as any,
    });

    if (!subscription) {
      return { message: 'E-mail verificado', redirectUrl: '/' };
    }

    if (subscription.status === 'TRIAL') {
      if (!store.open) {
        store.open = true;
        await AppDataSource.getRepository(Store).save(store);
      }
      return { message: 'E-mail verificado', redirectUrl: '/admin' };
    }

    let latestPayment = await this.paymentRepository.findLatestByStoreId(store.id);

    if (!latestPayment) {
      latestPayment = await AppDataSource.transaction(async (manager) => {
        return this.paymentService.createPayment(manager, {
          user: verifiedUser,
          store,
          subscription,
          plan: subscription.plan,
          method: (subscription.paymentMethod || 'PIX') as PaymentMethod,
        });
      });
    }

    if (latestPayment?.id && latestPayment.status === 'PAID') {
      await this.paymentService.confirmPayment(latestPayment.id);
      return { message: 'E-mail verificado', redirectUrl: '/admin' };
    }

    if (latestPayment?.id) {
      this.sendPaymentEmail(verifiedUser.email, latestPayment);
      return { message: 'E-mail verificado', redirectUrl: `/payment/${latestPayment.id}` };
    }

    return { message: 'E-mail verificado', redirectUrl: '/' };
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

  private async sendVerificationEmail(user: User) {
    const token = jwt.sign(
      {
        sub: user.id,
        type: 'email-verify',
        jti: crypto.randomBytes(16).toString('hex'),
      },
      env.jwtSecret,
      { expiresIn: '24h' }
    );
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verificationRepo = AppDataSource.getRepository(EmailVerification);

    await verificationRepo
      .createQueryBuilder()
      .update()
      .set({ usedAt: new Date() })
      .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
      .execute();

    await verificationRepo.save(
      verificationRepo.create({
        user,
        tokenHash,
        expiresAt,
      })
    );

    const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.emailService.sendEmailVerification(user.email, link);
  }

  private sendPaymentEmail(email: string, payment: any)
  {
    const baseUrl = env.appUrl?.replace(/\/$/, '') || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment/${payment.id}`;
    const logoUrl = `${baseUrl}/chama-no-espeto.jpeg`;
    const methodLabel =
      payment.method === 'PIX'
        ? 'PIX'
        : payment.method === 'BOLETO'
        ? 'Boleto'
        : 'Cartao de credito';
    const subject = 'Pagamento pendente - Chama no Espeto';
    const text = [
      'Recebemos seu cadastro e o pagamento esta pendente.',
      `Forma: ${methodLabel}`,
      `Acesse o pagamento: ${paymentUrl}`,
      payment.paymentLink ? `Link do provedor: ${payment.paymentLink}` : '',
      payment.method === 'BOLETO'
        ? 'Boletos podem levar ate 3 dias uteis para compensar.'
        : 'A aprovacao costuma ser imediata.',
    ]
      .filter(Boolean)
      .join('\n');
    const qrBlock =
      payment.method === 'PIX' && payment.qrCodeBase64
        ? `<div style="margin-top: 16px; text-align: center;">
            <img src="${payment.qrCodeBase64}" alt="QR Code PIX" style="width: 220px; height: 220px;" />
          </div>`
        : '';
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 32px;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);">
            <img src="${logoUrl}" alt="Chama no Espeto" style="width: 96px; height: 96px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.5);" />
            <p style="margin: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">Pagamento pendente</p>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Finalize para liberar sua loja</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px; color: #475569;">Recebemos seu cadastro. Assim que o pagamento for confirmado, sua loja sera liberada automaticamente.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 6px; color: #0f172a; font-size: 14px;"><strong>Forma:</strong> ${methodLabel}</p>
              <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Valor:</strong> R$ ${Number(payment.amount || 0).toFixed(2)}</p>
            </div>
            <a href="${paymentUrl}" style="display: inline-block; padding: 12px 18px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Acessar pagina de pagamento</a>
            ${payment.paymentLink ? `<p style="margin: 14px 0 0; color: #0f172a;"><a href="${payment.paymentLink}" style="color: #dc2626; font-weight: 600; text-decoration: none;">Abrir link do provedor</a></p>` : ''}
            ${payment.method === 'BOLETO' ? '<p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Boletos podem levar ate 3 dias uteis para compensar.</p>' : ''}
            ${qrBlock}
          </div>
        </div>
      </div>
    `;
    this.emailService.send({ to: email, subject, text, html });
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
