import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EmailTemplateCategory, normalizeEmailTemplateCategory } from '../utils/emailTemplateCatalog';
import { escapeHtml, renderPremiumEmailLayout, resolveEmailAssetUrl } from '../utils/emailTemplateRenderer';
import { EmailPreferenceService } from './EmailPreferenceService';
import { EmailTemplateService } from './EmailTemplateService';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: EmailTemplateCategory | string;
  templateKey?: string;
  allowUnsubscribe?: boolean;
  unsubscribeUrl?: string;
  metadata?: Record<string, unknown>;
  includeStandardFooter?: boolean;
};

type TemplateVariables = Record<string, string | number | null | undefined>;

export class EmailService {
  private transporter?: nodemailer.Transporter;
  private log = logger.child({ scope: 'EmailService' });
  private templateService = new EmailTemplateService();
  private preferenceService = new EmailPreferenceService();

  private getSenderAddress() {
    const raw = String(env.email.from || '').trim();
    const match = raw.match(/<([^>]+)>/);
    const email = String(match?.[1] || raw || 'no-reply@janocaminho.com.br').trim();
    return `Já no Caminho <${email}>`;
  }

  private getLogoUrl() {
    return resolveEmailAssetUrl();
  }

  private getSupportEmail() {
    return 'contato@janocaminho.com.br';
  }

  private parseRecipients(value?: string | null) {
    return String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private getNotificationRecipients(primary?: string | null) {
    return Array.from(
      new Set([
        ...this.parseRecipients(primary),
        ...this.parseRecipients(env.email.notifyOnSignup || ''),
        this.getSupportEmail(),
      ])
    );
  }

  private getTransporter() {
    if (!env.email.smtpHost || !env.email.smtpUser || !env.email.smtpPass) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.email.smtpHost,
        port: env.email.smtpPort,
        secure: env.email.smtpSecure,
        auth: {
          user: env.email.smtpUser,
          pass: env.email.smtpPass,
        },
      });
    }
    return this.transporter;
  }

  private withStandardFooter(payload: EmailPayload) {
    if (payload.includeStandardFooter === false) return payload;
    const category = normalizeEmailTemplateCategory(payload.category || 'transactional');
    const allowUnsubscribe = Boolean(payload.allowUnsubscribe && this.preferenceService.canBeSuppressed(category, true));
    const unsubscribeUrl =
      payload.unsubscribeUrl ||
      (allowUnsubscribe ? this.preferenceService.getUnsubscribeUrl(payload.to, category) : undefined);
    const rendered = renderPremiumEmailLayout({
      subject: payload.subject,
      preheader: '',
      textBody: payload.text,
      htmlBody: payload.html || `<p style="margin:0;color:#475569;line-height:1.7;">${payload.text}</p>`,
      variables: {},
      logoUrl: this.getLogoUrl(),
      supportEmail: this.getSupportEmail(),
      category,
      allowUnsubscribe,
      unsubscribeUrl,
    });
    return {
      ...payload,
      text: rendered.text,
      html: rendered.html,
      unsubscribeUrl,
    };
  }

  async send(payload: EmailPayload) {
    const category = normalizeEmailTemplateCategory(payload.category || 'transactional');
    const allowUnsubscribe = Boolean(payload.allowUnsubscribe);
    const skip = await this.preferenceService.shouldSkip(payload.to, category, allowUnsubscribe);
    if (skip.skip) {
      await this.templateService.logSend({
        templateKey: payload.templateKey,
        category,
        toEmail: payload.to,
        subject: payload.subject,
        status: 'skipped',
        suppressionId: skip.suppression?.id || null,
        metadata: payload.metadata,
      });
      this.log.info('Email skipped by suppression', { to: payload.to, category, templateKey: payload.templateKey });
      return;
    }

    const normalizedPayload = this.withStandardFooter({ ...payload, category });
    const transporter = this.getTransporter();
    if (!transporter) {
      this.log.info('Email mock', {
        to: normalizedPayload.to,
        subject: normalizedPayload.subject,
        templateKey: normalizedPayload.templateKey,
      });
      await this.templateService.logSend({
        templateKey: normalizedPayload.templateKey,
        category,
        toEmail: normalizedPayload.to,
        subject: normalizedPayload.subject,
        status: 'mocked',
        metadata: normalizedPayload.metadata,
      });
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (normalizedPayload.unsubscribeUrl && allowUnsubscribe) {
        const oneClickUrl = this.preferenceService.getOneClickUnsubscribeUrl(normalizedPayload.to, category);
        headers['List-Unsubscribe'] = `<${oneClickUrl}>, <${normalizedPayload.unsubscribeUrl}>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }

      const info = await transporter.sendMail({
        from: this.getSenderAddress(),
        replyTo: this.getSupportEmail(),
        to: normalizedPayload.to,
        subject: normalizedPayload.subject,
        text: normalizedPayload.text,
        html: normalizedPayload.html,
        headers,
      });

      await this.templateService.logSend({
        templateKey: normalizedPayload.templateKey,
        category,
        toEmail: normalizedPayload.to,
        subject: normalizedPayload.subject,
        status: 'sent',
        providerMessageId: String((info as any)?.messageId || ''),
        metadata: normalizedPayload.metadata,
      });
    } catch (error: any) {
      await this.templateService.logSend({
        templateKey: normalizedPayload.templateKey,
        category,
        toEmail: normalizedPayload.to,
        subject: normalizedPayload.subject,
        status: 'failed',
        errorMessage: error?.message || String(error || ''),
        metadata: normalizedPayload.metadata,
      });
      this.log.error('Email send failed', {
        to: normalizedPayload.to,
        subject: normalizedPayload.subject,
        templateKey: normalizedPayload.templateKey,
        error,
      });
      throw error;
    }
  }

  async sendTemplate(to: string, key: string, variables: TemplateVariables = {}, metadata?: Record<string, unknown>) {
    const rendered = await this.templateService.renderManagedTemplate({ key, variables, toEmail: to });
    await this.send({
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      templateKey: rendered.templateKey,
      category: rendered.category,
      allowUnsubscribe: rendered.allowUnsubscribe,
      unsubscribeUrl: rendered.unsubscribeUrl,
      metadata,
      includeStandardFooter: false,
    });
  }

  async sendPasswordReset(email: string, link: string) {
    await this.sendTemplate(email, 'password_reset', {
      LINK: link,
      APP_URL: env.appUrl || 'https://janocaminho.com.br',
    });
  }

  async sendEmailVerification(email: string, link: string, token: string) {
    await this.sendTemplate(email, 'store_verification', {
      LINK: link,
      TOKEN: token,
      APP_URL: env.appUrl || 'https://janocaminho.com.br',
    });
  }

  async sendMotoboyVerification(email: string, link: string, token: string) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.sendTemplate(email, 'motoboy_verification', {
      LINK: link,
      TOKEN: token,
      LOGIN_URL: `${baseUrl}/motoboy/login`,
    });
  }

  async sendActivationEmail(email: string, slug: string) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.sendTemplate(email, 'activation', {
      ADMIN_URL: `${baseUrl}/admin`,
      STORE_URL: `${baseUrl}/${slug}`,
      SLUG: slug,
    });
  }

  async sendCustomerWelcome(email: string, fullName: string) {
    await this.sendTemplate(email, 'customer_welcome', {
      NAME: fullName || 'Cliente',
      APP_URL: env.appUrl || 'https://janocaminho.com.br',
    });
  }

  async sendCustomerVerificationCode(email: string, fullName: string, code: string) {
    await this.sendTemplate(email, 'customer_verification', {
      NAME: fullName || 'Cliente',
      CODE: code,
      CODE_SPACED: String(code || '').split('').join(' '),
      APP_URL: env.appUrl || 'https://janocaminho.com.br',
    });
  }

  async sendStoreVerificationCode(email: string, fullName: string, code: string) {
    await this.sendTemplate(email, 'store_verification_code', {
      NAME: fullName || 'Lojista',
      CODE: code,
      CODE_SPACED: String(code || '').split('').join(' '),
      APP_URL: env.appUrl || 'https://janocaminho.com.br',
    });
  }

  async sendSubscriptionReminder(email: string, storeName: string, slug: string, daysLeft: number) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    const message =
      daysLeft <= 0
        ? 'Sua assinatura expira hoje. Renove agora para manter a loja ativa.'
        : `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para sua assinatura expirar.`;
    await this.sendTemplate(email, 'subscription_reminder', {
      STORE_NAME: storeName,
      DAYS_LEFT: String(daysLeft),
      MESSAGE: message,
      ADMIN_URL: `${baseUrl}/admin`,
      STORE_URL: `${baseUrl}/${slug}`,
    });
  }

  async sendPaymentPending(email: string, payment: any) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    const paymentUrl = `${baseUrl}/payment/${payment.id}`;
    const methodLabel =
      payment.method === 'PIX' ? 'PIX' : payment.method === 'BOLETO' ? 'Boleto' : 'Cartão de crédito';
    const amount = Number(payment.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const paymentNote =
      payment.method === 'BOLETO'
        ? 'Boletos podem levar até 3 dias úteis para compensar.'
        : 'A aprovação costuma ser imediata.';
    const qrBlock =
      payment.method === 'PIX' && payment.qrCodeBase64
        ? `<div style="margin-top: 18px; text-align: center;"><img src="${payment.qrCodeBase64}" alt="QR Code PIX" style="width: 220px; height: 220px; border-radius: 18px; border: 1px solid #e2e8f0;" /></div>`
        : '';
    const providerLinkBlock = payment.paymentLink
      ? `<p style="margin: 16px 0 0;"><a href="${payment.paymentLink}" style="color: #153A4C; font-weight: 800; text-decoration: none;">Abrir link do provedor</a></p>`
      : '';

    await this.sendTemplate(email, 'payment_pending', {
      PAYMENT_URL: paymentUrl,
      PROVIDER_URL: payment.paymentLink || '',
      METHOD_LABEL: methodLabel,
      AMOUNT: amount,
      PAYMENT_NOTE: paymentNote,
      QR_BLOCK: qrBlock,
      PROVIDER_LINK_BLOCK: providerLinkBlock,
    });
  }

  async sendCustomerSecurityBlockAlert(payload: {
    email: string;
    fullName: string;
    phone?: string | null;
    reason: string;
    blockType: string;
    severity: string;
    blockedAt: Date;
    blockedUntil?: Date | null;
    metadata?: Record<string, unknown>;
  }) {
    const targets = this.getNotificationRecipients('');
    if (!targets.length) return;
    const metadataText = payload.metadata ? JSON.stringify(payload.metadata, null, 2) : '{}';
    await Promise.all(
      targets.map((target) =>
        this.sendTemplate(target, 'customer_security_block_alert', {
          EMAIL_OR_NAME: payload.email || payload.fullName,
          FULL_NAME: payload.fullName || '-',
          EMAIL: payload.email || '-',
          PHONE: payload.phone || '-',
          BLOCK_TYPE: payload.blockType,
          SEVERITY: payload.severity,
          BLOCKED_AT: payload.blockedAt.toISOString(),
          BLOCKED_UNTIL: payload.blockedUntil ? payload.blockedUntil.toISOString() : 'indeterminado',
          REASON: payload.reason,
          METADATA: metadataText,
        })
      )
    );
  }

  async sendSignupNotification(payload: {
    emails: string[];
    type: 'lojista' | 'motoboy' | 'cliente';
    storeName?: string;
    ownerName: string;
    ownerEmail: string;
    slug?: string;
    createdAt: Date;
    acquisitionAttribution?: Record<string, unknown> | null;
  }) {
    if (!payload.emails.length) return;
    const typeLabel = payload.type === 'lojista' ? 'Novo lojista' : payload.type === 'motoboy' ? 'Novo entregador' : 'Novo cliente';
    const attribution = payload.acquisitionAttribution && typeof payload.acquisitionAttribution === 'object'
      ? payload.acquisitionAttribution : null;
    const extraHtml = payload.type === 'lojista' && payload.storeName
      ? `<div><strong>Loja:</strong> ${escapeHtml(payload.storeName)}</div><div><strong>Slug:</strong> ${escapeHtml(payload.slug || '-')}</div>` : '';
    const attrHtml = attribution
      ? `<div><strong>Origem:</strong> ${escapeHtml(attribution.utm_source || 'direto')}</div><div><strong>Meio:</strong> ${escapeHtml(attribution.utm_medium || '-')}</div><div><strong>Campanha:</strong> ${escapeHtml(attribution.utm_campaign || '-')}</div>`
      : '<div><strong>Origem:</strong> não informada</div>';

    await Promise.all(
      payload.emails.map((email) =>
        this.sendTemplate(email, 'signup_notification', {
          TYPE_LABEL: typeLabel,
          OWNER_NAME: payload.ownerName,
          OWNER_EMAIL: payload.ownerEmail,
          CREATED_AT: payload.createdAt.toLocaleString('pt-BR'),
          EXTRA_LINES: payload.storeName ? `Loja: ${payload.storeName}\nSlug: ${payload.slug || '-'}` : '',
          ATTR_LINES: attribution
            ? `Origem: ${String(attribution.utm_source || 'direto')}\nMeio: ${String(attribution.utm_medium || '-')}\nCampanha: ${String(attribution.utm_campaign || '-')}`
            : 'Origem: não informada',
          EXTRA_HTML: extraHtml,
          ATTR_HTML: attrHtml,
        })
      )
    );
  }

  async sendCondominiumAccessRequestNotification(payload: {
    to?: string;
    condominiumName: string;
    responsibleName: string;
    responsibleRole?: string | null;
    responsibleEmail: string;
    responsiblePhone?: string | null;
    city?: string | null;
    state?: string | null;
    requestId?: string;
  }) {
    const targets = this.getNotificationRecipients(payload.to || '');
    if (!targets.length) return;
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await Promise.all(
      targets.map((target) =>
        this.sendTemplate(target, 'condominium_access_request', {
          CONDOMINIUM_NAME: payload.condominiumName,
          RESPONSIBLE_NAME: payload.responsibleName,
          RESPONSIBLE_ROLE: payload.responsibleRole || '-',
          RESPONSIBLE_EMAIL: payload.responsibleEmail,
          RESPONSIBLE_PHONE: payload.responsiblePhone || '-',
          LOCATION: [payload.city, payload.state].filter(Boolean).join(' - ') || '-',
          ADMIN_URL: `${baseUrl}/superadmin/condominiums`,
        })
      )
    );
  }

  async sendCondominiumAccessCredentials(payload: {
    email: string;
    responsibleName: string;
    condominiumName: string;
    username: string;
    temporaryPassword: string;
  }) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.sendTemplate(payload.email, 'condominium_access_credentials', {
      RESPONSIBLE_NAME: payload.responsibleName,
      CONDOMINIUM_NAME: payload.condominiumName,
      USERNAME: payload.username,
      TEMPORARY_PASSWORD: payload.temporaryPassword,
      LOGIN_URL: `${baseUrl}/condominio/login`,
    });
  }

  async sendMotoboyStoreAccessCredentials(payload: {
    email: string;
    fullName: string;
    storeName: string;
    username: string;
    temporaryPassword: string;
  }) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.sendTemplate(payload.email, 'motoboy_store_access_credentials', {
      FULL_NAME: payload.fullName,
      STORE_NAME: payload.storeName,
      USERNAME: payload.username,
      TEMPORARY_PASSWORD: payload.temporaryPassword,
      LOGIN_URL: `${baseUrl}/motoboy/login`,
    });
  }

  async sendStoreDeliveryCodeLockAlert(payload: {
    to: string;
    storeName: string;
    orderId: string;
    customerName?: string | null;
    motoboyName?: string | null;
    attempts: number;
  }) {
    const baseUrl = (env.appUrl || 'https://janocaminho.com.br').replace(/\/$/, '');
    await this.sendTemplate(payload.to, 'store_delivery_code_lock_alert', {
      STORE_NAME: payload.storeName,
      ORDER_DISPLAY_ID: `#${String(payload.orderId || '').slice(0, 8)}`,
      CUSTOMER_NAME: payload.customerName || '-',
      MOTOBOY_NAME: payload.motoboyName || '-',
      ATTEMPTS: String(payload.attempts),
      ADMIN_URL: `${baseUrl}/admin/queue`,
    });
  }
}
