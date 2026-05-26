import { describe, expect, it } from 'vitest';
import { DEFAULT_EMAIL_TEMPLATES } from './emailTemplateCatalog';
import { renderPremiumEmailLayout } from './emailTemplateRenderer';

const PLACEHOLDER_PATTERN = /\{\{\{?(\w+)\}?\}\}/g;

const extractPlaceholders = (...values: string[]) =>
  Array.from(
    new Set(
      values.flatMap((value) =>
        Array.from(String(value || '').matchAll(PLACEHOLDER_PATTERN)).map((match) => match[1])
      )
    )
  ).sort();

const buildSampleVariables = (variables: string[]) =>
  Object.fromEntries(
    variables.map((variable) => [
      variable,
      variable.endsWith('_URL') || variable === 'LINK' || variable === 'CTA_URL'
        ? `https://janocaminho.com.br/teste/${variable.toLowerCase()}`
        : `valor-${variable}`,
    ])
  );

describe('emailTemplateCatalog', () => {
  it('declares every placeholder used by the default templates', () => {
    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      const declaredVariables = new Set(template.variables);
      const placeholders = extractPlaceholders(
        template.subject,
        template.preheader,
        template.textBody,
        template.htmlBody
      );
      const missingVariables = placeholders.filter((placeholder) => !declaredVariables.has(placeholder));

      expect(missingVariables, `${template.key} has undeclared placeholders`).toEqual([]);
    }
  });

  it('renders every default template without unresolved placeholders', () => {
    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      const rendered = renderPremiumEmailLayout({
        subject: template.subject,
        preheader: template.preheader,
        textBody: template.textBody,
        htmlBody: template.htmlBody,
        variables: buildSampleVariables(template.variables),
        category: template.category,
        allowUnsubscribe: template.allowUnsubscribe,
        unsubscribeUrl: template.allowUnsubscribe
          ? 'https://janocaminho.com.br/email/unsubscribe?token=teste'
          : undefined,
      });

      expect(rendered.subject, `${template.key} subject`).not.toMatch(PLACEHOLDER_PATTERN);
      expect(rendered.preheader, `${template.key} preheader`).not.toMatch(PLACEHOLDER_PATTERN);
      expect(rendered.text, `${template.key} text`).not.toMatch(PLACEHOLDER_PATTERN);
      expect(rendered.html, `${template.key} html`).not.toMatch(PLACEHOLDER_PATTERN);
    }
  });

  it('keeps password reset code copy-friendly in email clients', () => {
    const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === 'password_reset_code');

    expect(template?.htmlBody).toContain('{{CODE}}');
    expect(template?.htmlBody).not.toContain('{{CODE_SPACED}}');
    expect(template?.variables).not.toContain('CODE_SPACED');
    expect(template?.htmlBody).toContain('white-space: nowrap');
    expect(template?.textBody).toContain('Copie os 6 números juntos');
  });
});
