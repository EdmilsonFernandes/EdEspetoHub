import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SettingsService } from './SettingsService';

type EmailHealthFailureInput = {
  templateKey?: string | null;
  category?: string | null;
  toEmail: string;
  subject?: string | null;
  errorMessage?: string | null;
};

const HEALTH_SETTING_KEY = 'ops.email_health';
const ALERT_SETTING_KEY = 'ops.email_health_last_webhook_at';

const CRITICAL_ERROR_PATTERNS = [
  /unusual sending activity/i,
  /unblockme/i,
  /550\s+5\.4\.6/i,
  /sender.*blocked/i,
  /blocked/i,
  /quota/i,
  /rate.?limit/i,
  /too many/i,
];

const sanitizeErrorMessage = (value?: string | null) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);

const maskEmail = (email: string) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return email;
  const prefix = local.slice(0, 2);
  return `${prefix}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
};

const parseDateMs = (value?: string | null) => {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export class EmailHealthService {
  private settingsService = new SettingsService();
  private log = logger.child({ scope: 'EmailHealthService' });

  private isCriticalError(message: string) {
    return CRITICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
  }

  private suggestedAction(message: string) {
    if (/zoho|unblockme|unusual sending activity|550\s+5\.4\.6/i.test(message)) {
      return 'Entrar no Zoho com a conta remetente e validar o desbloqueio em https://mail.zoho.com/UnblockMe. Em seguida, reenviar o código pelo app.';
    }
    if (/quota|rate.?limit|too many/i.test(message)) {
      return 'Verificar limite diário/horário do provedor SMTP e aguardar ou trocar para provedor transacional.';
    }
    return 'Verificar credenciais SMTP, provedor de envio e últimos logs em email_send_logs.';
  }

  private async shouldSendWebhook() {
    const webhookUrl = String(env.ops?.alertWebhookUrl || '').trim();
    if (!webhookUrl) return false;
    const lastSentAt = await this.settingsService.getValue(ALERT_SETTING_KEY);
    const throttleMs = Math.max(1, Number(env.ops?.emailAlertThrottleMinutes || 30)) * 60 * 1000;
    return Date.now() - parseDateMs(lastSentAt) > throttleMs;
  }

  private async sendWebhook(payload: Record<string, unknown>) {
    const webhookUrl = String(env.ops?.alertWebhookUrl || '').trim();
    if (!webhookUrl || typeof fetch !== 'function') return;
    if (!(await this.shouldSendWebhook())) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Alerta de e-mail Já no Caminho: ${payload.severity} - ${payload.lastErrorMessage}`,
          ...payload,
        }),
      });
      await this.settingsService.setValue(ALERT_SETTING_KEY, new Date().toISOString());
    } catch (error) {
      this.log.warn('Email health webhook failed', { error });
    }
  }

  async recordFailure(input: EmailHealthFailureInput) {
    if (!AppDataSource.isInitialized) return;
    const errorMessage = sanitizeErrorMessage(input.errorMessage);
    const failuresRows: Array<{ count: string | number }> = await AppDataSource.query(
      `
      SELECT COUNT(*) AS count
      FROM email_send_logs
      WHERE status = 'failed'
        AND created_at > NOW() - INTERVAL '15 minutes'
      `
    );
    const failuresLast15Min = Number(failuresRows?.[0]?.count || 0);
    const critical = this.isCriticalError(errorMessage);
    const payload = {
      status: critical || failuresLast15Min >= 3 ? 'degraded' : 'warning',
      severity: critical ? 'critical' : 'warning',
      reason: critical ? 'smtp_provider_blocked_or_limited' : 'email_delivery_failure',
      checkedAt: new Date().toISOString(),
      failuresLast15Min,
      lastTemplateKey: input.templateKey || null,
      lastCategory: input.category || null,
      lastToEmail: maskEmail(input.toEmail),
      lastSubject: input.subject || null,
      lastErrorMessage: errorMessage,
      suggestedAction: this.suggestedAction(errorMessage),
    };

    await this.settingsService.setValue(HEALTH_SETTING_KEY, JSON.stringify(payload));
    if (payload.status === 'degraded') {
      void this.sendWebhook(payload).catch((error) => this.log.warn('Email health webhook schedule failed', { error }));
    }
  }

  async getOverview() {
    const [healthRaw, recentRows, latestRows] = await Promise.all([
      this.settingsService.getValue(HEALTH_SETTING_KEY),
      AppDataSource.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '1 hour') AS sent_last_hour,
          COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour') AS failed_last_hour,
          COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '15 minutes') AS failed_last_15_min
        FROM email_send_logs
        `
      ),
      AppDataSource.query(
        `
        SELECT template_key, to_email, status, error_message, created_at
        FROM email_send_logs
        ORDER BY created_at DESC
        LIMIT 1
        `
      ),
    ]);

    let stored: Record<string, unknown> = {};
    try {
      stored = healthRaw ? JSON.parse(healthRaw) : {};
    } catch {
      stored = {};
    }

    const recent = recentRows?.[0] || {};
    const latest = latestRows?.[0] || null;
    const failedLast15Min = Number(recent.failed_last_15_min || 0);
    const latestStatus = String(latest?.status || '').trim();
    const latestError = sanitizeErrorMessage(latest?.error_message);
    const criticalLatest = latestStatus === 'failed' && this.isCriticalError(latestError);
    const status =
      criticalLatest || failedLast15Min >= 3
        ? 'degraded'
        : failedLast15Min > 0
          ? 'warning'
          : 'healthy';

    return {
      status,
      severity: status === 'degraded' ? 'critical' : status === 'warning' ? 'warning' : 'ok',
      sentLastHour: Number(recent.sent_last_hour || 0),
      failedLastHour: Number(recent.failed_last_hour || 0),
      failedLast15Min,
      latest: latest
        ? {
            templateKey: latest.template_key || null,
            toEmail: maskEmail(String(latest.to_email || '')),
            status: latest.status,
            errorMessage: latestError || null,
            createdAt: latest.created_at,
          }
        : null,
      lastAlert: stored,
      suggestedAction:
        status === 'healthy'
          ? 'Envio de e-mails operando sem falhas recentes.'
          : this.suggestedAction(latestError || String(stored.lastErrorMessage || '')),
    };
  }
}
