import { env } from '../config/env';
import { isSuppressibleEmailCategory } from './emailTemplateCatalog';

export type RenderEmailTemplateInput = {
  subject: string;
  preheader?: string | null;
  textBody: string;
  htmlBody: string;
  variables?: Record<string, string | number | null | undefined>;
  logoUrl?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  category?: string;
  allowUnsubscribe?: boolean;
};

const DEFAULT_EMAIL_PUBLIC_BASE_URL = 'https://janocaminho.com.br';
export const DEFAULT_EMAIL_LOGO_PATH = '/janocaminho.jpg';

export const normalizeBrandingContent = (content: string) =>
  String(content || '')
    .replace(/Chama no Espeto/g, 'Já no Caminho')
    .replace(/chama no espeto/g, 'já no caminho')
    .replace(/Jano Caminho/g, 'Já no Caminho')
    .replace(/www\.chamanoespeto\.com\.br/g, 'www.janocaminho.com.br')
    .replace(/chamanoespeto\.com\.br/g, 'janocaminho.com.br')
    .replace(/\/chama-no-espeto\.jpeg/g, '/janocaminho.jpg')
    .replace(/chama-no-espeto\.jpeg/g, 'janocaminho.jpg');

const getEmailPublicBaseUrl = () => {
  const configured = String(env.appUrl || '').trim().replace(/\/+$/, '');
  if (!configured) return DEFAULT_EMAIL_PUBLIC_BASE_URL;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)) {
    return DEFAULT_EMAIL_PUBLIC_BASE_URL;
  }
  return configured;
};

export const resolveEmailAssetUrl = (value?: string | null, fallbackPath = DEFAULT_EMAIL_LOGO_PATH) => {
  const raw = normalizeBrandingContent(String(value || fallbackPath || '').trim());
  if (!raw) return `${getEmailPublicBaseUrl()}${DEFAULT_EMAIL_LOGO_PATH}`;
  if (/^data:image\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getEmailPublicBaseUrl()}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeVariables = (variables?: Record<string, string | number | null | undefined>) => {
  const normalized: Record<string, string> = {};
  Object.entries(variables || {}).forEach(([key, value]) => {
    normalized[key] = value == null ? '' : String(value);
  });
  return normalized;
};

export const renderTextTemplate = (template: string, variables?: Record<string, string | number | null | undefined>) => {
  const vars = normalizeVariables(variables);
  return normalizeBrandingContent(String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? ''));
};

export const renderHtmlTemplate = (template: string, variables?: Record<string, string | number | null | undefined>) => {
  const vars = normalizeVariables(variables);
  const rawRendered = String(template || '').replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => vars[key] ?? '');
  return normalizeBrandingContent(rawRendered.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? '')));
};

export const renderPremiumEmailLayout = ({
  subject,
  preheader,
  textBody,
  htmlBody,
  variables,
  logoUrl,
  supportEmail = 'contato@janocaminho.com.br',
  unsubscribeUrl,
  category,
  allowUnsubscribe,
}: RenderEmailTemplateInput) => {
  const renderedSubject = renderTextTemplate(subject, variables);
  const renderedPreheader = renderTextTemplate(preheader || '', variables);
  const renderedText = renderTextTemplate(textBody, variables);
  const renderedBody = renderHtmlTemplate(htmlBody, variables);
  const resolvedLogoUrl = resolveEmailAssetUrl(logoUrl);
  const canUnsubscribe = Boolean(allowUnsubscribe && unsubscribeUrl && isSuppressibleEmailCategory(category));
  const footerText = canUnsubscribe
    ? `\n\n---\nJá no Caminho\nAjuda: ${supportEmail}\nCancelar comunicações comerciais: ${unsubscribeUrl}`
    : `\n\n---\nJá no Caminho\nAjuda: ${supportEmail}\nMensagem operacional ou de segurança enviada para manter sua conta e atendimento funcionando.`;

  const footerHtml = canUnsubscribe
    ? `<p style="margin: 8px 0 0; color: #64748b;">Se não quiser receber comunicações comerciais, <a href="${escapeHtml(unsubscribeUrl)}" style="color: #153A4C; font-weight: 800; text-decoration: none;">cancele aqui</a>.</p>`
    : '<p style="margin: 8px 0 0; color: #64748b;">Mensagem operacional ou de segurança enviada para manter sua conta e atendimento funcionando.</p>';

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(renderedSubject)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #eef4f3; font-family: Arial, Helvetica, sans-serif;">
        <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">${escapeHtml(renderedPreheader)}</span>
        <div style="padding: 28px 14px; background: radial-gradient(circle at top left, rgba(95,211,90,0.18), transparent 28%), linear-gradient(180deg, #eef4f3 0%, #f8fafc 100%);">
          <div style="max-width: 620px; margin: 0 auto;">
            <div style="padding: 26px 28px; border-radius: 30px 30px 0 0; background: linear-gradient(135deg, #153A4C 0%, #336886 72%, #5FD35A 145%); color: #ffffff; box-shadow: 0 22px 60px rgba(15, 58, 76, 0.18);">
              <img src="${escapeHtml(resolvedLogoUrl)}" alt="Já no Caminho" style="width: 72px; height: 72px; object-fit: cover; border-radius: 22px; border: 2px solid rgba(255,255,255,0.35); box-shadow: 0 12px 28px rgba(15,23,42,0.24);" />
              <p style="margin: 18px 0 0; font-size: 12px; font-weight: 800; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.76);">Já no Caminho</p>
              <p style="margin: 8px 0 0; max-width: 420px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.88);">${escapeHtml(renderedPreheader || 'Comunicação oficial da plataforma.')}</p>
            </div>
            <div style="padding: 28px; background: rgba(255,255,255,0.97); border: 1px solid rgba(226,232,240,0.92); border-top: 0; border-radius: 0 0 30px 30px; box-shadow: 0 22px 60px rgba(15,23,42,0.09);">
              ${renderedBody}
              <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.7;">
                <p style="margin: 0; font-weight: 800; color: #0f172a;">Já no Caminho</p>
                <p style="margin: 8px 0 0;">Precisa de ajuda? <a href="mailto:${escapeHtml(supportEmail)}" style="color: #153A4C; font-weight: 800; text-decoration: none;">${escapeHtml(supportEmail)}</a></p>
                ${footerHtml}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: renderedSubject,
    preheader: renderedPreheader,
    text: `${renderedText.trimEnd()}${footerText}`,
    html,
  };
};
