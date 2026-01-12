import { CreateSubscriptionDto } from '../dto/CreateSubscriptionDto';
import { RenewSubscriptionDto } from '../dto/RenewSubscriptionDto';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { PlanRepository } from '../repositories/PlanRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { env } from '../config/env';
import { EmailService } from './EmailService';
import { AppDataSource } from '../config/database';
import { PaymentService } from './PaymentService';
import { PaymentMethod } from '../entities/Payment';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { logger } from '../utils/logger';

export class SubscriptionService {
  private planRepository = new PlanRepository();
  private storeRepository = new StoreRepository();
  private subscriptionRepository = new SubscriptionRepository();
  private emailService = new EmailService();
  private paymentService = new PaymentService();
  private paymentRepository = new PaymentRepository();
  private log = logger.child({ scope: 'SubscriptionService' });

  async create(input: CreateSubscriptionDto) {
    this.log.info('Create subscription', { storeId: input.storeId, planId: input.planId });
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new Error('Loja não encontrada');

    const plan = await this.planRepository.findById(input.planId);
    const resolvedPlan = plan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
    if (!resolvedPlan) throw new Error('Plano inválido');

    if (!resolvedPlan.enabled) {
      throw new Error('Plano indisponível para assinatura');
    }

    const now = input.startDate || new Date();
    const endDate = input.endDate || this.addDays(now, resolvedPlan.durationDays);

    const subscription = this.subscriptionRepository.create({
      store,
      plan: resolvedPlan,
      startDate: now,
      endDate,
      status: input.status || 'ACTIVE',
      autoRenew: input.autoRenew ?? false,
    } as Subscription);

    return this.subscriptionRepository.save(subscription);
  }

  async getCurrentByStore(storeId: string) {
    const subscription = await this.subscriptionRepository.findLatestByStoreId(storeId);
    if (!subscription) return null;

    const status = this.resolveStatus(subscription);
    if (status !== subscription.status) {
      subscription.status = status;
      await this.subscriptionRepository.save(subscription);
    }

    const isActive = this.isSubscriptionActive(subscription);

    if (isActive && subscription.store && !subscription.store.open) {
      subscription.store.open = true;
      await this.storeRepository.save(subscription.store);
    }

    if (!isActive && subscription.store?.open) {
      subscription.store.open = false;
      await this.storeRepository.save(subscription.store);
    }

    return subscription;
  }

  async getCurrentByStoreSlug(slug: string) {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) return null;
    return this.getCurrentByStore(store.id);
  }

  async renew(subscriptionId: string, input: RenewSubscriptionDto) {
    this.log.info('Renew subscription', { subscriptionId, planId: input.planId });
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new Error('Assinatura não encontrada');

    if (subscription.status === 'SUSPENDED') {
      throw new Error('Assinatura suspensa. Entre em contato com o suporte.');
    }

    let plan = subscription.plan;
    if (input.planId && input.planId !== subscription.plan.id) {
      const otherPlan = await this.planRepository.findById(input.planId);
      const resolved = otherPlan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
      if (!resolved || !resolved.enabled) throw new Error('Plano inválido para renovação');
      plan = resolved;
    }

    const now = new Date();
    const baseDate = subscription.endDate > now ? subscription.endDate : now;
    subscription.startDate = now;
    subscription.endDate = this.addDays(baseDate, plan.durationDays);
    subscription.status = 'ACTIVE';
    subscription.autoRenew = input.autoRenew ?? subscription.autoRenew;
    subscription.plan = plan;
    subscription.reminderStage = 0;

    return this.subscriptionRepository.save(subscription);
  }

  async createRenewalPayment(storeId: string, input: RenewSubscriptionDto, authStoreId?: string) {
    this.log.info('Create renewal payment', { storeId, planId: input.planId, paymentMethod: input.paymentMethod });
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new Error('Loja não encontrada');
    if (authStoreId && store.id !== authStoreId) throw new Error('Sem permissão para acessar esta loja');

    const now = new Date();
    const existingPending = await this.paymentRepository.findLatestPendingByStoreId(storeId);
    if (existingPending) {
      if (!existingPending.expiresAt || existingPending.expiresAt > now) {
        return existingPending;
      }
      existingPending.status = 'FAILED';
      await this.paymentRepository.save(existingPending);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.paymentRepository.countRecentByStoreId(storeId, since);
    if (recentCount >= 3) {
      throw new Error('Limite de tentativas de pagamento atingido. Tente novamente mais tarde.');
    }

    const plan = input.planId
      ? await this.planRepository.findById(input.planId)
      : null;
    const resolvedPlan =
      plan || (await this.planRepository.findAll()).find((p) => p.id === input.planId);
    if (!resolvedPlan || !resolvedPlan.enabled) throw new Error('Plano inválido para renovação');

    const paymentMethod = (input.paymentMethod || 'PIX') as PaymentMethod;

    return AppDataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(Subscription);
      const subscription = subscriptionRepo.create({
        store,
        plan: resolvedPlan,
        startDate: now,
        endDate: now,
        status: 'PENDING',
        autoRenew: false,
        paymentMethod,
      } as Subscription);
      await subscriptionRepo.save(subscription);

      return this.paymentService.createPayment(manager, {
        user: store.owner,
        store,
        subscription,
        plan: resolvedPlan,
        method: paymentMethod,
      });
    });
  }

  async updateStatusesForAll() {
    const subscriptions = await this.subscriptionRepository.findAll();
    const updates: Subscription[] = [];
    const pendingCutoff = new Date(Date.now() - env.pendingSignupTtlDays * 24 * 60 * 60 * 1000);

    for (const sub of subscriptions) {
      const endDate = new Date(sub.endDate);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (sub.status === 'PENDING' && sub.createdAt < pendingCutoff) {
        sub.status = 'CANCELLED';
        updates.push(sub);
        if (sub.store?.open) {
          sub.store.open = false;
          await this.storeRepository.save(sub.store);
        }
        continue;
      }

      const status = this.resolveStatus(sub);
      if (status !== sub.status) {
        sub.status = status;
        updates.push(sub);
      }
      if (!this.isSubscriptionActive(sub) && sub.store?.open) {
        sub.store.open = false;
        await this.storeRepository.save(sub.store);
      }

      if (sub.store?.owner?.email && sub.status !== 'PENDING' && sub.status !== 'CANCELLED' && sub.status !== 'SUSPENDED') {
        const nextStage =
          diffDays <= 0 ? 3 : diffDays <= 1 ? 2 : diffDays <= 3 ? 1 : 0;
        if (nextStage > 0 && sub.reminderStage < nextStage) {
          await this.emailService.sendSubscriptionReminder(
            sub.store.owner.email,
            sub.store.name,
            sub.store.slug,
            diffDays <= 0 ? 0 : diffDays
          );
          sub.reminderStage = nextStage;
          updates.push(sub);
        }
      }
    }

    if (updates.length) {
      await Promise.all(updates.map((s) => this.subscriptionRepository.save(s)));
      this.log.info('Subscription statuses updated', { total: updates.length });
    }

    return updates;
  }

  async suspend(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new Error('Assinatura não encontrada');
    subscription.status = 'SUSPENDED';
    return this.subscriptionRepository.save(subscription);
  }

  async activate(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new Error('Assinatura não encontrada');
    subscription.status = this.resolveStatus(subscription);
    return this.subscriptionRepository.save(subscription);
  }

  async assertStoreIsActive(storeId: string) {
    const subscription = await this.getCurrentByStore(storeId);
    return subscription ? this.isSubscriptionActive(subscription) : false;
  }

  isActiveSubscription(subscription?: Subscription | null) {
    return subscription ? this.isSubscriptionActive(subscription) : false;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private resolveStatus(subscription: Subscription): SubscriptionStatus {
    if (subscription.status === 'PENDING') return 'PENDING';
    if (subscription.status === 'SUSPENDED') return 'SUSPENDED';
    if (subscription.status === 'CANCELLED') return 'CANCELLED';

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (now > endDate) return 'EXPIRED';

    if (subscription.status === 'TRIAL') return 'TRIAL';

    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 5) return 'EXPIRING';

    return 'ACTIVE';
  }

  private isSubscriptionActive(subscription: Subscription) {
    const now = new Date();
    return (
      new Date(subscription.endDate).getTime() >= now.getTime() &&
      subscription.status !== 'PENDING' &&
      subscription.status !== 'EXPIRED' &&
      subscription.status !== 'CANCELLED'
    );
  }
}
