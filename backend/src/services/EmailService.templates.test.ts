import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EMAIL_TEMPLATES } from '../utils/emailTemplateCatalog';
import { EmailService } from './EmailService';

const PLACEHOLDER_PATTERN = /\{\{\{?(\w+)\}?\}\}/g;

const extractPlaceholders = (templateKey: string) => {
  const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) return [];
  return Array.from(
    new Set(
      [template.subject, template.preheader, template.textBody, template.htmlBody].flatMap((value) =>
        Array.from(String(value || '').matchAll(PLACEHOLDER_PATTERN)).map((match) => match[1])
      )
    )
  ).sort();
};

describe('EmailService managed template variables', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes all variables required by managed templates', async () => {
    const sent: Array<{ key: string; variables: Record<string, unknown> }> = [];
    vi.spyOn(EmailService.prototype, 'sendTemplate').mockImplementation(async (_to, key, variables = {}) => {
      sent.push({ key, variables });
    });

    const service = new EmailService();
    await service.sendPasswordReset('cliente@teste.com', 'https://janocaminho.com.br/reset');
    await service.sendEmailVerification('loja@teste.com', 'https://janocaminho.com.br/verify', 'token-123');
    await service.sendMotoboyVerification('motoboy@teste.com', 'https://janocaminho.com.br/motoboy/verify', 'token-456');
    await service.sendActivationEmail('loja@teste.com', 'loja-teste');
    await service.sendCustomerWelcome('cliente@teste.com', 'Cliente Teste');
    await service.sendCustomerVerificationCode('cliente@teste.com', 'Cliente Teste', '1234');
    await service.sendCustomerOrderStatusUpdate({
      email: 'cliente@teste.com',
      customerName: 'Cliente Teste',
      storeName: 'Loja Teste',
      orderId: '1234567890abcdef',
      statusLabel: 'Pedido em preparo',
      statusMessage: 'Loja Teste: Pedido #12345678 está sendo preparado.',
    });
    await service.sendStoreVerificationCode('loja@teste.com', 'Loja Teste', '5678');
    await service.sendSubscriptionReminder('loja@teste.com', 'Loja Teste', 'loja-teste', 3);
    await service.sendPaymentPending('loja@teste.com', {
      id: 'payment-1',
      method: 'PIX',
      amount: 69,
      paymentLink: 'https://janocaminho.com.br/payment/provider',
      qrCodeBase64: 'data:image/png;base64,abc',
    });
    await service.sendCustomerSecurityBlockAlert({
      email: 'cliente@teste.com',
      fullName: 'Cliente Teste',
      phone: '(12) 99999-0000',
      reason: 'Tentativas suspeitas',
      blockType: 'login',
      severity: 'high',
      blockedAt: new Date('2026-05-25T00:00:00.000Z'),
      blockedUntil: new Date('2026-05-26T00:00:00.000Z'),
      metadata: { source: 'test' },
    });
    await service.sendSignupNotification({
      emails: ['admin@teste.com'],
      type: 'lojista',
      storeName: 'Loja Teste',
      ownerName: 'Dono Teste',
      ownerEmail: 'dono@teste.com',
      slug: 'loja-teste',
      createdAt: new Date('2026-05-25T00:00:00.000Z'),
      acquisitionAttribution: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'vip' },
    });
    await service.sendCondominiumAccessRequestNotification({
      to: 'admin@teste.com',
      condominiumName: 'Condominio Teste',
      responsibleName: 'Responsavel Teste',
      responsibleRole: 'Sindico',
      responsibleEmail: 'responsavel@teste.com',
      responsiblePhone: '(12) 98888-0000',
      city: 'Sao Jose dos Campos',
      state: 'SP',
    });
    await service.sendDestinationPartnerRequestNotification({
      to: 'admin@teste.com',
      partnerType: 'SERVICE_PROVIDER',
      resourceName: 'Restaurante Teste',
      destinationName: 'São Bento do Sapucaí',
      responsibleName: 'Responsavel Teste',
      responsibleEmail: 'responsavel@teste.com',
      responsiblePhone: '(12) 97777-0000',
      city: 'São Bento do Sapucaí',
      state: 'SP',
      message: 'Tenho interesse em aparecer no app.',
      requestId: 'request-1',
    });
    await service.sendDestinationStoreClaimPending({
      email: 'loja@teste.com',
      responsibleName: 'Responsavel Teste',
      storeName: 'Loja Teste',
      listingName: 'Restaurante Teste',
      destinationName: 'São Bento do Sapucaí',
      placeNames: ['Chalé Teste'],
      requestId: 'request-claim-pending',
    });
    await service.sendDestinationStoreClaimReviewed({
      email: 'loja@teste.com',
      responsibleName: 'Responsavel Teste',
      storeName: 'Loja Teste',
      listingName: 'Restaurante Teste',
      destinationName: 'São Bento do Sapucaí',
      placeNames: ['Chalé Teste'],
      reviewNote: 'Titularidade conferida.',
      approved: true,
      requestId: 'request-claim-1',
    });
    await service.sendDestinationStoreClaimReviewed({
      email: 'loja@teste.com',
      responsibleName: 'Responsavel Teste',
      storeName: 'Loja Teste',
      listingName: 'Restaurante Teste',
      destinationName: 'São Bento do Sapucaí',
      reviewNote: 'Não foi possível confirmar a titularidade.',
      approved: false,
      requestId: 'request-claim-2',
    });
    await service.sendCondominiumAccessCredentials({
      email: 'condominio@teste.com',
      responsibleName: 'Responsavel Teste',
      condominiumName: 'Condominio Teste',
      username: 'condominio',
      temporaryPassword: 'senha-temporaria',
    });
    await service.sendMotoboyStoreAccessCredentials({
      email: 'motoboy@teste.com',
      fullName: 'Motoboy Teste',
      storeName: 'Loja Teste',
      username: 'motoboy',
      temporaryPassword: 'senha-temporaria',
    });
    await service.sendStoreDeliveryCodeLockAlert({
      to: 'loja@teste.com',
      storeName: 'Loja Teste',
      orderId: '1234567890abcdef',
      customerName: 'Cliente Teste',
      motoboyName: 'Motoboy Teste',
      attempts: 3,
    });

    expect(sent.length).toBeGreaterThan(0);
    for (const item of sent) {
      const requiredVariables = extractPlaceholders(item.key);
      const missingVariables = requiredVariables.filter((variable) => !(variable in item.variables));
      expect(missingVariables, `${item.key} missing variables`).toEqual([]);
    }
  });
});
