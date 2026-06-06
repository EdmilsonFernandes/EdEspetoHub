import { apiClient } from '../config/apiClient';

export type EmailTemplateCategory = 'transactional' | 'security' | 'account' | 'marketing' | 'internal';

export type EmailTemplatePayload = {
  id?: string;
  key: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  subject: string;
  preheader: string;
  textBody: string;
  htmlBody: string;
  variables: string[];
  active: boolean;
  allowUnsubscribe: boolean;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EmailSuppressionPayload = {
  id: string;
  email: string;
  normalizedEmail: string;
  category: EmailTemplateCategory;
  source: string;
  reason?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
};

export type EmailHealthPayload = {
  status: 'healthy' | 'warning' | 'degraded';
  severity: 'ok' | 'warning' | 'critical';
  sentLastHour: number;
  failedLastHour: number;
  failedLast15Min: number;
  latest?: {
    templateKey?: string | null;
    toEmail?: string | null;
    status?: string | null;
    errorMessage?: string | null;
    createdAt?: string | null;
  } | null;
  lastAlert?: Record<string, unknown>;
  suggestedAction?: string;
};

export type RenderedEmailPayload = {
  subject: string;
  preheader?: string;
  text: string;
  html: string;
  templateKey: string;
  category: EmailTemplateCategory;
  allowUnsubscribe: boolean;
  unsubscribeUrl?: string;
  variables: string[];
};

export const EMAIL_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  transactional: 'Transacional',
  security: 'Segurança',
  account: 'Conta',
  marketing: 'Marketing',
  internal: 'Interno',
};

const normalizeTemplate = (template: any): EmailTemplatePayload => ({
  id: String(template?.id || ''),
  key: String(template?.key || ''),
  name: String(template?.name || ''),
  category: String(template?.category || 'transactional') as EmailTemplateCategory,
  description: String(template?.description || ''),
  subject: String(template?.subject || ''),
  preheader: String(template?.preheader || ''),
  textBody: String(template?.textBody || ''),
  htmlBody: String(template?.htmlBody || ''),
  variables: Array.isArray(template?.variables) ? template.variables.map((item: any) => String(item || '')).filter(Boolean) : [],
  active: Boolean(template?.active),
  allowUnsubscribe: Boolean(template?.allowUnsubscribe),
  updatedBy: template?.updatedBy || null,
  createdAt: template?.createdAt || null,
  updatedAt: template?.updatedAt || null,
});

export const emailTemplateService = {
  async getHealth() {
    const payload = await apiClient.get('/admin/email/health', { authMode: 'superadmin' });
    return (payload?.health || {
      status: 'healthy',
      severity: 'ok',
      sentLastHour: 0,
      failedLastHour: 0,
      failedLast15Min: 0,
    }) as EmailHealthPayload;
  },

  async listTemplates() {
    const payload = await apiClient.get('/admin/email/templates', { authMode: 'superadmin' });
    return Array.isArray(payload?.templates) ? payload.templates.map(normalizeTemplate) : [];
  },

  async getTemplate(key: string) {
    const payload = await apiClient.get(`/admin/email/templates/${encodeURIComponent(key)}`, { authMode: 'superadmin' });
    return normalizeTemplate(payload?.template);
  },

  async saveTemplate(key: string, template: EmailTemplatePayload) {
    const payload = await apiClient.put(`/admin/email/templates/${encodeURIComponent(key)}`, template, { authMode: 'superadmin' });
    return normalizeTemplate(payload?.template);
  },

  async previewTemplate(key: string, variables: Record<string, string>) {
    return apiClient.post(
      `/admin/email/templates/${encodeURIComponent(key)}/preview`,
      { variables },
      { authMode: 'superadmin' }
    ) as Promise<RenderedEmailPayload>;
  },

  async sendTest(key: string, to: string, variables: Record<string, string>) {
    return apiClient.post(
      `/admin/email/templates/${encodeURIComponent(key)}/test`,
      { to, variables },
      { authMode: 'superadmin' }
    );
  },

  async listSuppressions() {
    const payload = await apiClient.get('/admin/email/suppressions?limit=200', { authMode: 'superadmin' });
    return Array.isArray(payload?.suppressions) ? payload.suppressions as EmailSuppressionPayload[] : [];
  },

  async createSuppression(email: string, category: EmailTemplateCategory, reason: string) {
    return apiClient.post('/admin/email/suppressions', { email, category, reason }, { authMode: 'superadmin' });
  },

  async removeSuppression(id: string) {
    return apiClient.delete(`/admin/email/suppressions/${encodeURIComponent(id)}`, { authMode: 'superadmin' });
  },

  async previewUnsubscribe(token: string) {
    return apiClient.get(`/public/email/unsubscribe/preview?token=${encodeURIComponent(token)}`, { authMode: 'none' });
  },

  async confirmUnsubscribe(token: string) {
    return apiClient.post('/public/email/unsubscribe', { token }, { authMode: 'none' });
  },
};
