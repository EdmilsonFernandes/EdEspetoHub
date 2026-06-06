import { AppDataSource } from '../config/database';
import { EmailTemplate } from '../entities/EmailTemplate';
import { EmailTemplateVersion } from '../entities/EmailTemplateVersion';
import { EmailSendLog } from '../entities/EmailSendLog';
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_BY_KEY,
  EmailTemplateCategory,
  EmailTemplateDefinition,
  normalizeEmailTemplateCategory,
} from '../utils/emailTemplateCatalog';
import { normalizeBrandingContent, renderPremiumEmailLayout } from '../utils/emailTemplateRenderer';
import { SettingsService } from './SettingsService';
import { EmailPreferenceService } from './EmailPreferenceService';
import { EmailHealthService } from './EmailHealthService';

type RenderManagedTemplateInput = {
  key: string;
  variables?: Record<string, string | number | null | undefined>;
  toEmail?: string;
};

type SaveTemplateInput = Partial<Pick<EmailTemplate, 'name' | 'description' | 'subject' | 'preheader' | 'textBody' | 'htmlBody' | 'active' | 'allowUnsubscribe'>> & {
  category?: string;
  variables?: unknown;
};

const normalizeTemplateKey = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_');

const normalizeVariables = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback;
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim().replace(/[^\w]/g, ''))
        .filter(Boolean)
    )
  );
};

const canDeactivateTemplate = (category: EmailTemplateCategory) => category === 'marketing';

export class EmailTemplateService {
  private templateRepository = AppDataSource.getRepository(EmailTemplate);
  private versionRepository = AppDataSource.getRepository(EmailTemplateVersion);
  private sendLogRepository = AppDataSource.getRepository(EmailSendLog);
  private settingsService = new SettingsService();
  private preferenceService = new EmailPreferenceService();
  private healthService = new EmailHealthService();

  private async legacyValue(definition: EmailTemplateDefinition, field: 'subject' | 'text' | 'html', fallback: string) {
    if (!definition.legacySettingPrefix) return fallback;
    try {
      const value = await this.settingsService.getValue(`${definition.legacySettingPrefix}.${field}`);
      return normalizeBrandingContent(value || fallback);
    } catch {
      return normalizeBrandingContent(fallback);
    }
  }

  private async buildDefaultEntity(definition: EmailTemplateDefinition) {
    return this.templateRepository.create({
      key: definition.key,
      name: definition.name,
      category: definition.category,
      description: definition.description,
      subject: await this.legacyValue(definition, 'subject', definition.subject),
      preheader: definition.preheader,
      textBody: await this.legacyValue(definition, 'text', definition.textBody),
      htmlBody: await this.legacyValue(definition, 'html', definition.htmlBody),
      variables: definition.variables,
      active: true,
      allowUnsubscribe: Boolean(definition.allowUnsubscribe),
    });
  }

  async ensureDefaultTemplates() {
    if (!AppDataSource.isInitialized) return;
    for (const definition of DEFAULT_EMAIL_TEMPLATES) {
      const existing = await this.templateRepository.findOne({ where: { key: definition.key } });
      if (!existing) {
        await this.templateRepository.save(await this.buildDefaultEntity(definition));
      }
    }
  }

  private async resolveTemplate(key: string) {
    const normalizedKey = normalizeTemplateKey(key);
    if (AppDataSource.isInitialized) {
      await this.ensureDefaultTemplates();
      const stored = await this.templateRepository.findOne({ where: { key: normalizedKey } });
      if (stored) {
        if (stored.active || !canDeactivateTemplate(normalizeEmailTemplateCategory(stored.category))) return stored;
        throw new Error('email_template_inactive');
      }
    }

    const definition = EMAIL_TEMPLATE_BY_KEY.get(normalizedKey);
    if (!definition) throw new Error('email_template_not_found');
    return this.buildDefaultEntity(definition);
  }

  async listTemplates() {
    await this.ensureDefaultTemplates();
    return this.templateRepository.find({ order: { category: 'ASC', name: 'ASC' } });
  }

  async getTemplate(key: string) {
    await this.ensureDefaultTemplates();
    const template = await this.templateRepository.findOne({ where: { key: normalizeTemplateKey(key) } });
    if (!template) throw new Error('email_template_not_found');
    return template;
  }

  async saveTemplate(key: string, input: SaveTemplateInput, actor?: string | null) {
    await this.ensureDefaultTemplates();
    const normalizedKey = normalizeTemplateKey(key);
    let template = await this.templateRepository.findOne({ where: { key: normalizedKey } });
    if (!template) {
      const definition = EMAIL_TEMPLATE_BY_KEY.get(normalizedKey);
      template = definition ? await this.buildDefaultEntity(definition) : this.templateRepository.create({ key: normalizedKey });
    }

    const nextCategory = normalizeEmailTemplateCategory(input.category || template.category) as EmailTemplateCategory;
    template.name = String(input.name || template.name || normalizedKey).trim();
    template.category = nextCategory;
    template.description = String(input.description ?? template.description ?? '').trim() || null;
    template.subject = normalizeBrandingContent(String(input.subject ?? template.subject ?? '').trim());
    template.preheader = normalizeBrandingContent(String(input.preheader ?? template.preheader ?? '').trim()) || null;
    template.textBody = normalizeBrandingContent(String(input.textBody ?? template.textBody ?? '').trim());
    template.htmlBody = normalizeBrandingContent(String(input.htmlBody ?? template.htmlBody ?? '').trim());
    template.variables = normalizeVariables(input.variables, template.variables || []);
    template.active = canDeactivateTemplate(nextCategory)
      ? input.active == null
        ? Boolean(template.active)
        : Boolean(input.active)
      : true;
    template.allowUnsubscribe = Boolean(input.allowUnsubscribe && nextCategory === 'marketing');
    template.updatedBy = String(actor || '').trim() || null;

    if (!template.subject || !template.textBody || !template.htmlBody) {
      throw new Error('email_template_invalid_payload');
    }

    const saved = await this.templateRepository.save(template);
    await this.createVersion(saved, actor);
    return saved;
  }

  private async createVersion(template: EmailTemplate, actor?: string | null) {
    const latest = await this.versionRepository.findOne({
      where: { templateId: template.id },
      order: { version: 'DESC' },
    });
    const version = this.versionRepository.create({
      templateId: template.id,
      version: Number(latest?.version || 0) + 1,
      key: template.key,
      name: template.name,
      category: template.category,
      description: template.description || null,
      subject: template.subject,
      preheader: template.preheader || null,
      textBody: template.textBody,
      htmlBody: template.htmlBody,
      variables: template.variables || [],
      active: template.active,
      allowUnsubscribe: template.allowUnsubscribe,
      createdBy: String(actor || '').trim() || null,
    });
    await this.versionRepository.save(version);
  }

  async renderManagedTemplate({ key, variables = {}, toEmail = '' }: RenderManagedTemplateInput) {
    const template = await this.resolveTemplate(key);
    const unsubscribeUrl =
      toEmail && template.allowUnsubscribe
        ? this.preferenceService.getUnsubscribeUrl(toEmail, template.category)
        : undefined;
    const rendered = renderPremiumEmailLayout({
      subject: template.subject,
      preheader: template.preheader,
      textBody: template.textBody,
      htmlBody: template.htmlBody,
      variables,
      category: template.category,
      allowUnsubscribe: template.allowUnsubscribe,
      unsubscribeUrl,
    });

    return {
      ...rendered,
      templateKey: template.key,
      category: template.category,
      allowUnsubscribe: template.allowUnsubscribe,
      unsubscribeUrl,
      variables: template.variables || [],
    };
  }

  async previewTemplate(key: string, variables?: Record<string, string | number | null | undefined>) {
    return this.renderManagedTemplate({ key, variables: variables || {} });
  }

  async logSend(input: {
    templateKey?: string | null;
    category?: string | null;
    toEmail: string;
    subject?: string | null;
    status: 'sent' | 'mocked' | 'skipped' | 'failed';
    providerMessageId?: string | null;
    errorMessage?: string | null;
    suppressionId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!AppDataSource.isInitialized) return;
    try {
      await this.sendLogRepository.save(
        this.sendLogRepository.create({
          templateKey: input.templateKey || null,
          category: normalizeEmailTemplateCategory(input.category || 'transactional'),
          toEmail: input.toEmail,
          subject: input.subject || null,
          status: input.status,
          providerMessageId: input.providerMessageId || null,
          errorMessage: input.errorMessage || null,
          suppressionId: input.suppressionId || null,
          metadata: input.metadata || {},
        })
      );
      if (input.status === 'failed') {
        void this.healthService
          .recordFailure({
            templateKey: input.templateKey || null,
            category: input.category || null,
            toEmail: input.toEmail,
            subject: input.subject || null,
            errorMessage: input.errorMessage || null,
          })
          .catch(() => {
            // Falha no monitoramento nunca deve afetar o fluxo de e-mail.
          });
      }
    } catch {
      // E-mail nunca deve falhar apenas porque o log nao gravou.
    }
  }

  getHealthOverview() {
    return this.healthService.getOverview();
  }
}
