import { EntityManager } from 'typeorm';
import QRCode from 'qrcode';
import { Payment, PaymentMethod } from '../entities/Payment';
import { Subscription } from '../entities/Subscription';
import { Plan } from '../entities/Plan';
import { User } from '../entities/User';
import { Store } from '../entities/Store';
import { AppDataSource } from '../config/database';
import { MercadoPagoService } from './MercadoPagoService';
import { env } from '../config/env';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { EmailService } from './EmailService';

export class PaymentService {
  private mercadoPago = new MercadoPagoService();
  private paymentEventRepository = new PaymentEventRepository();
  private emailService = new EmailService();
  private normalizeQrCode(qrCode?: string | null) {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:image')) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }
  private async sendActivationEmail(email: string, slug: string) {
    await this.emailService.sendActivationEmail(email, slug);
  }

  async createPayment(
    manager: EntityManager,
    data: {
      user: User;
      store: Store;
      subscription: Subscription;
      plan: Plan;
      method: PaymentMethod;
    }
  ) {
    const paymentRepo = manager.getRepository(Payment);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const mockLinkBase =
      data.method === 'BOLETO'
        ? 'https://pay.chamanoespeto.com/boleto'
        : 'https://pay.chamanoespeto.com/checkout';
    const paymentLink =
      data.method === 'CREDIT_CARD' || data.method === 'BOLETO'
        ? `${mockLinkBase}/${data.subscription.id}`
        : null;

    let payment = paymentRepo.create({
      user: data.user,
      store: data.store,
      subscription: data.subscription,
      method: data.method,
      status: 'PENDING',
      amount: Number(data.plan.price),
      expiresAt,
      qrCodeBase64: null,
      paymentLink,
      provider: 'MOCK',
    } as Payment);

    payment = await paymentRepo.save(payment);

    const planLabel = data.plan.displayName || data.plan.name;
    const description = `Assinatura ${planLabel} - ${data.store.name}`;
    const mercadoPagoEnabled = Boolean(env.mercadoPago.accessToken);

    if (mercadoPagoEnabled) {
      try {
        const mpPayment = await this.mercadoPago.createPayment({
          amount: Number(data.plan.price),
          method: data.method,
          description,
          externalReference: payment.id,
          payer: {
            email: data.user.email,
            name: data.user.fullName,
          },
        });

        if (mpPayment?.paymentLink) {
          payment.paymentLink = mpPayment.paymentLink;
        }

        payment.provider = 'MERCADO_PAGO';
        payment.providerId = mpPayment?.providerId || payment.providerId;

        if (mpPayment?.qrCodeBase64 && payment.method === 'PIX') {
          payment.qrCodeBase64 = this.normalizeQrCode(mpPayment.qrCodeBase64);
        }

        await paymentRepo.save(payment);
        return payment;
      } catch (error) {
        console.error('Mercado Pago erro, usando fallback mock', error);
      }
    }

    if (payment.method === 'PIX') {
      const qrPayload = `PIX FAKE | Store: ${data.store.name} | Amount: ${Number(
        data.plan.price
      ).toFixed(2)} | PaymentId: ${payment.id}`;
      payment.qrCodeBase64 = await QRCode.toDataURL(qrPayload);
      await paymentRepo.save(payment);
    }

    return payment;
  }

  async confirmPayment(paymentId: string) {
    return AppDataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const lockedPayment = await paymentRepo
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id: paymentId })
        .getOne();

      if (!lockedPayment) throw new Error('Pagamento não encontrado');
      if (lockedPayment.status === 'PAID') return lockedPayment;
      if (lockedPayment.status === 'FAILED') throw new Error('Pagamento falhou');

      const payment = await paymentRepo.findOne({
        where: { id: paymentId },
        relations: ['subscription', 'subscription.plan', 'store', 'user'],
      });
      if (!payment) throw new Error('Pagamento não encontrado');

      const subscription = payment.subscription;
      const store = payment.store;
      const plan = subscription.plan;
      const now = new Date();
      const endDate = this.addDays(now, plan.durationDays);

      payment.status = 'PAID';
      subscription.status = 'ACTIVE';
      subscription.startDate = now;
      subscription.endDate = endDate;
      store.open = true;

      await manager.save(subscription);
      await manager.save(store);
      await manager.save(payment);
      await this.sendActivationEmail(payment.user.email, store.slug);

      return payment;
    });
  }

  async confirmMercadoPagoPayment(mercadoPagoPaymentId: string) {
    if (!env.mercadoPago.accessToken) {
      throw new Error('Mercado Pago nao configurado');
    }

    const mpPayment = await this.mercadoPago.getPayment(mercadoPagoPaymentId);
    if (!mpPayment) {
      throw new Error('Pagamento nao encontrado no Mercado Pago');
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }

  async reprocessByPaymentId(paymentId: string, providerId?: string) {
    if (!env.mercadoPago.accessToken) {
      throw new Error('Mercado Pago nao configurado');
    }

    const paymentRepo = AppDataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new Error('Pagamento nao encontrado');
    }

    const mpId = providerId || payment.providerId;
    if (!mpId) {
      throw new Error('providerId ausente');
    }

    const mpPayment = await this.mercadoPago.getPayment(mpId);
    if (!mpPayment) {
      throw new Error('Pagamento nao encontrado no Mercado Pago');
    }

    return this.applyMercadoPagoStatus(mpPayment);
  }

  private async updatePaymentStatus(paymentId: string, providerStatus?: string) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment || payment.status === 'PAID') return;

    const failedStatuses = ['rejected', 'cancelled', 'charged_back', 'refunded', 'failed'];
    if (providerStatus && failedStatuses.includes(providerStatus)) {
      payment.status = 'FAILED';
      await paymentRepo.save(payment);
    }
  }

  private async applyMercadoPagoStatus(mpPayment: any) {
    if (mpPayment.external_reference) {
      const paymentId = String(mpPayment.external_reference);
      await this.paymentEventRepository.save(
        this.paymentEventRepository.create({
          payment: { id: paymentId } as any,
          provider: 'MERCADO_PAGO',
          status: mpPayment.status || 'unknown',
          payload: mpPayment as any,
        })
      );

      const paymentRepo = AppDataSource.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { id: paymentId } });
      if (payment) {
        const qrCode = mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64;
        const paymentLink = mpPayment?.transaction_details?.external_resource_url;
        const providerId = mpPayment?.id ? String(mpPayment.id) : null;

        let hasChanges = false;
        if (payment.provider !== 'MERCADO_PAGO') {
          payment.provider = 'MERCADO_PAGO';
          hasChanges = true;
        }
        if (providerId && !payment.providerId) {
          payment.providerId = providerId;
          hasChanges = true;
        }
        if (qrCode && !payment.qrCodeBase64) {
          payment.qrCodeBase64 = this.normalizeQrCode(qrCode);
          hasChanges = true;
        }
        if (paymentLink && !payment.paymentLink) {
          payment.paymentLink = paymentLink;
          hasChanges = true;
        }
        if (hasChanges) {
          await paymentRepo.save(payment);
        }
      }
    }

    if (mpPayment.status !== 'approved') {
      if (mpPayment.external_reference) {
        await this.updatePaymentStatus(String(mpPayment.external_reference), mpPayment.status);
      }
      return { status: mpPayment.status };
    }

    const internalId = mpPayment.external_reference;
    if (!internalId) {
      throw new Error('Referencia externa ausente');
    }

    return this.confirmPayment(String(internalId));
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async findById(paymentId: string) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    return paymentRepo.findOne({ where: { id: paymentId }, relations: ['store'] });
  }
}
