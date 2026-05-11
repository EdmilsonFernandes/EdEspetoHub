import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EmailService } from './EmailService';

type AuditUserPayload = {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  role?: string | null;
};

type AuditStorePayload = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

type AuditSubscriptionPayload = {
  paymentId?: string | null;
  subscriptionId?: string | null;
  planName?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  provider?: string | null;
  amount?: number | null;
};

type AuditDetails = {
  title: string;
  eventType: string;
  user?: AuditUserPayload | null;
  store?: AuditStorePayload | null;
  subscription?: AuditSubscriptionPayload | null;
  metadata?: Record<string, unknown> | null;
};

type NotifyUserCreatedInput = {
  accountType: 'cliente' | 'lojista' | 'motoboy' | 'motoboy_loja';
  user: AuditUserPayload;
  store?: AuditStorePayload | null;
  metadata?: Record<string, unknown> | null;
};

type NotifySubscriptionEventInput = {
  stage: 'created' | 'confirmed';
  user: AuditUserPayload;
  store: AuditStorePayload;
  subscription: AuditSubscriptionPayload;
  metadata?: Record<string, unknown> | null;
};

export class AuditNotificationService {
  private emailService = new EmailService();
  private log = logger.child({ scope: 'AuditNotificationService' });

  private parseRecipients(value?: string | null) {
    return String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private getRecipients() {
    return Array.from(new Set(this.parseRecipients(env.email.auditInbox || '')));
  }

  private escapeHtml(value?: unknown) {
    return String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(value?: string | number | Date | null) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  }

  private formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return '-';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '-';
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private normalizeMetadataEntries(metadata?: Record<string, unknown> | null) {
    if (!metadata || typeof metadata !== 'object') return [] as Array<{ label: string; value: string }>;
    return Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== '')
      .map(([key, value]) => ({
        label: key,
        value:
          typeof value === 'object'
            ? JSON.stringify(value)
            : String(value),
      }));
  }

  private buildSection(title: string, entries: Array<{ label: string; value: string }>) {
    if (!entries.length) return '';
    const rows = entries
      .map(
        (entry) =>
          `<tr>
            <td style="padding: 8px 0; color: #64748b; width: 180px; vertical-align: top;">${this.escapeHtml(entry.label)}</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${this.escapeHtml(entry.value)}</td>
          </tr>`
      )
      .join('');

    return `
      <div style="margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; background: #ffffff;">
        <p style="margin: 0 0 10px; color: #153A4C; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">${this.escapeHtml(title)}</p>
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">
          ${rows}
        </table>
      </div>
    `;
  }

  private async sendAuditEmail(details: AuditDetails) {
    const recipients = this.getRecipients();
    if (!recipients.length) return;

    const userEntries = details.user
      ? [
          { label: 'ID', value: String(details.user.id || '-') },
          { label: 'Nome', value: String(details.user.fullName || '-') },
          { label: 'Email', value: String(details.user.email || '-') },
          { label: 'Telefone', value: String(details.user.phone || '-') },
          { label: 'Usuario', value: String(details.user.username || '-') },
          { label: 'Role', value: String(details.user.role || '-') },
        ]
      : [];
    const storeEntries = details.store
      ? [
          { label: 'ID', value: String(details.store.id || '-') },
          { label: 'Loja', value: String(details.store.name || '-') },
          { label: 'Slug', value: String(details.store.slug || '-') },
        ]
      : [];
    const subscriptionEntries = details.subscription
      ? [
          { label: 'Pagamento', value: String(details.subscription.paymentId || '-') },
          { label: 'Assinatura', value: String(details.subscription.subscriptionId || '-') },
          { label: 'Plano', value: String(details.subscription.planName || '-') },
          { label: 'Status', value: String(details.subscription.status || '-') },
          { label: 'Metodo', value: String(details.subscription.paymentMethod || '-') },
          { label: 'Provedor', value: String(details.subscription.provider || '-') },
          { label: 'Valor', value: this.formatCurrency(details.subscription.amount) },
        ]
      : [];
    const metadataEntries = this.normalizeMetadataEntries(details.metadata);
    const occurredAt = this.formatDate(new Date());

    const subject = `[Auditoria] ${details.title}`;
    const textLines = [
      `Evento: ${details.eventType}`,
      `Titulo: ${details.title}`,
      `Ocorrido em: ${occurredAt}`,
      '',
      ...userEntries.map((entry) => `Usuario - ${entry.label}: ${entry.value}`),
      ...storeEntries.map((entry) => `Loja - ${entry.label}: ${entry.value}`),
      ...subscriptionEntries.map((entry) => `Assinatura - ${entry.label}: ${entry.value}`),
      ...metadataEntries.map((entry) => `Metadata - ${entry.label}: ${entry.value}`),
    ].filter(Boolean);

    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 22px; overflow: hidden; background: #ffffff;">
          <div style="padding: 22px 24px; background: linear-gradient(135deg, #153A4C 0%, #336886 100%);">
            <p style="margin: 0; color: rgba(255,255,255,0.78); font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;">Auditoria automatica</p>
            <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 22px; line-height: 1.3;">${this.escapeHtml(details.title)}</h2>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.92); font-size: 14px;">Tipo do evento: ${this.escapeHtml(details.eventType)}</p>
            <p style="margin: 6px 0 0; color: rgba(255,255,255,0.78); font-size: 13px;">Ocorrido em: ${this.escapeHtml(occurredAt)}</p>
          </div>
          <div style="padding: 22px; background: #f8fafc;">
            ${this.buildSection('Usuario', userEntries)}
            ${this.buildSection('Loja', storeEntries)}
            ${this.buildSection('Assinatura', subscriptionEntries)}
            ${this.buildSection('Metadados', metadataEntries)}
          </div>
        </div>
      </div>
    `;

    await Promise.all(
      recipients.map((recipient) =>
        this.emailService.send({
          to: recipient,
          subject,
          text: textLines.join('\n'),
          html,
        })
      )
    );
  }

  async notifyUserCreated(input: NotifyUserCreatedInput) {
    const typeLabels: Record<NotifyUserCreatedInput['accountType'], string> = {
      cliente: 'Cadastro de cliente',
      lojista: 'Cadastro de lojista',
      motoboy: 'Cadastro de motoboy independente',
      motoboy_loja: 'Cadastro de motoboy criado pela loja',
    };

    try {
      await this.sendAuditEmail({
        title: typeLabels[input.accountType],
        eventType: 'USER_CREATED',
        user: input.user,
        store: input.store || null,
        metadata: input.metadata || null,
      });
    } catch (error) {
      this.log.warn('Audit email failed for user creation', {
        accountType: input.accountType,
        userId: input.user?.id || null,
        error,
      });
    }
  }

  async notifySubscriptionEvent(input: NotifySubscriptionEventInput) {
    const stageLabel = input.stage === 'confirmed' ? 'Assinatura confirmada' : 'Assinatura gerada';

    try {
      await this.sendAuditEmail({
        title: stageLabel,
        eventType: input.stage === 'confirmed' ? 'SUBSCRIPTION_CONFIRMED' : 'SUBSCRIPTION_CREATED',
        user: input.user,
        store: input.store,
        subscription: input.subscription,
        metadata: input.metadata || null,
      });
    } catch (error) {
      this.log.warn('Audit email failed for subscription event', {
        stage: input.stage,
        subscriptionId: input.subscription?.subscriptionId || null,
        paymentId: input.subscription?.paymentId || null,
        error,
      });
    }
  }
}
