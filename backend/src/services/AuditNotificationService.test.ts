import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { AuditNotificationService } from './AuditNotificationService';

describe('AuditNotificationService', () => {
  const originalAuditInbox = env.email.auditInbox;

  beforeEach(() => {
    env.email.auditInbox = 'edmls2008@gmail.com';
  });

  afterEach(() => {
    env.email.auditInbox = originalAuditInbox;
  });

  it('sends a common audit template for account creation events', async () => {
    const service: any = new AuditNotificationService();
    const sent: any[] = [];
    service.emailService = {
      send: async (payload: any) => {
        sent.push(payload);
      },
    };

    await service.notifyUserCreated({
      accountType: 'motoboy_loja',
      user: {
        id: 'user-1',
        fullName: 'Motoboy da Loja',
        email: 'motoboy@example.com',
        phone: '11999998888',
        username: 'moto.loja',
        role: 'MOTOBOY',
      },
      store: {
        id: 'store-1',
        name: 'Loja Teste',
        slug: 'loja-teste',
      },
      metadata: {
        createdByUserId: 'owner-1',
      },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'edmls2008@gmail.com',
      category: 'internal',
      templateKey: 'audit_user_created',
    });
    expect(String(sent[0].subject || '')).toContain('Cadastro de motoboy criado pela loja');
    expect(String(sent[0].text || '')).toContain('Evento: USER_CREATED');
    expect(String(sent[0].html || '')).toContain('Tipo do evento:');
    expect(String(sent[0].html || '')).toContain('USER_CREATED');
    expect(String(sent[0].html || '')).toContain('motoboy@example.com');
    expect(String(sent[0].html || '')).toContain('loja-teste');
    expect(String(sent[0].html || '')).not.toContain('font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;');
  });

  it('includes subscription amount and payment metadata in subscription events', async () => {
    const service: any = new AuditNotificationService();
    const sent: any[] = [];
    service.emailService = {
      send: async (payload: any) => {
        sent.push(payload);
      },
    };

    await service.notifySubscriptionEvent({
      stage: 'confirmed',
      user: {
        id: 'user-2',
        fullName: 'Lojista Teste',
        email: 'lojista@example.com',
        role: 'STORE_OWNER',
      },
      store: {
        id: 'store-2',
        name: 'Espeto Prime',
        slug: 'espeto-prime',
      },
      subscription: {
        paymentId: 'payment-1',
        subscriptionId: 'subscription-1',
        planName: 'Plano Mensal',
        status: 'ACTIVE',
        paymentMethod: 'PIX',
        provider: 'MERCADO_PAGO',
        amount: 29.9,
      },
      metadata: {
        providerId: 'mp-123',
      },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      category: 'internal',
      templateKey: 'audit_subscription_confirmed',
    });
    expect(String(sent[0].subject || '')).toContain('Assinatura confirmada');
    expect(String(sent[0].text || '')).toContain('Assinatura - Pagamento: payment-1');
    expect(String(sent[0].text || '')).toContain('Assinatura - Metodo: PIX');
    expect(String(sent[0].text || '')).toMatch(/29,90/);
    expect(String(sent[0].html || '')).toContain('MERCADO_PAGO');
    expect(String(sent[0].html || '')).toContain('mp-123');
  });
});
